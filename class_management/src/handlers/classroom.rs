use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    AppState,
    error::AppError,
    model::ClassroomModel,
    schema::{ClassroomSchema, SeatingChartSchema, TableSchema, UpdateClassroomSchema},
};

pub async fn classroom_list_handler(
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let classrooms = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms ORDER by period"#
    )
    .fetch_all(&data.db)
    .await?;

    Ok((StatusCode::OK, Json(json!({"data": classrooms}))))
}

pub async fn get_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE id = $1"#,
        &id
    )
    .fetch_one(&data.db)
    .await?;

    Ok((StatusCode::OK, Json(json!({"data": classroom}))))
}

pub async fn create_classroom_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<ClassroomSchema>,
) -> Result<impl IntoResponse, AppError> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"INSERT INTO classrooms (
            subject,
            period
        )
        VALUES ($1, $2)
        RETURNING *"#,
        &body.subject,
        body.period,
    )
    .fetch_one(&data.db)
    .await?;

    Ok((StatusCode::CREATED, Json(json!({"data": classroom}))))
}

pub async fn update_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateClassroomSchema>,
) -> Result<impl IntoResponse, AppError> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE id = $1"#,
        &id
    )
    .fetch_one(&data.db)
    .await?;

    let new_subject = body.subject.as_ref().unwrap_or(&classroom.subject);
    let new_period = body.period.unwrap_or(classroom.period);

    let updated_classroom = sqlx::query_as!(
        ClassroomModel,
        r#"UPDATE classrooms SET
            subject = $1,
            period = $2
        WHERE id = $3
        RETURNING *"#,
        &new_subject,
        new_period,
        &classroom.id
    )
    .fetch_one(&data.db)
    .await?;

    Ok((StatusCode::OK, Json(json!({"data": updated_classroom}))))
}

pub async fn delete_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"DELETE FROM classrooms WHERE id = $1 RETURNING *"#,
        &id
    )
    .fetch_one(&data.db)
    .await?;

    Ok((StatusCode::OK, Json(json!({"data": classroom}))))
}

pub async fn get_seating_chart_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let tables = sqlx::query_as!(
        TableSchema,
        r#"SELECT
            t.table_number,
            t.rows,
            t.cols,
            t.x_pos,
            t.y_pos,
            ARRAY_AGG(s.student_id ORDER BY s.seat_number) as "seat_assignments!: Vec<Option<Uuid>>"
        FROM tables t
        INNER JOIN seats s ON (t.id = s.table_id)
        WHERE t.classroom_id = $1
        GROUP BY t.table_number, t.rows, t.cols, t.x_pos, t.y_pos
        "#,
        &classroom_id
    )
    .fetch_all(&data.db)
    .await?;

    let response = json!({
        "data": {
            "classroom_id": classroom_id,
            "tables": tables
        }
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn update_seating_chart_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<SeatingChartSchema>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = data.db.begin().await?;

    sqlx::query!(
        r#"DELETE FROM tables WHERE classroom_id = $1"#,
        &classroom_id
    )
    .execute(&mut *tx)
    .await?;

    let mut chart_tables: Vec<TableSchema> = Vec::new();
    for (index, table) in body.tables.iter().enumerate() {
        let table_number = index as i32;

        let table_id = sqlx::query_scalar!(
            r#"INSERT INTO tables (classroom_id, table_number, rows, cols, x_pos, y_pos)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id"#,
            &classroom_id,
            table_number,
            table.rows,
            table.cols,
            table.x_pos,
            table.y_pos,
        )
        .fetch_one(&mut *tx)
        .await?;

        for (index, student_id) in table.seat_assignments.iter().enumerate() {
            let seat_number = index as i16;

            sqlx::query!(
                r#"INSERT INTO seats (table_id, student_id, seat_number)
                VALUES ($1, $2, $3)"#,
                table_id,
                student_id.as_ref(),
                seat_number,
            )
            .execute(&mut *tx)
            .await?;
        }

        let chart_table = TableSchema {
            table_number,
            rows: table.rows,
            cols: table.cols,
            x_pos: table.x_pos,
            y_pos: table.y_pos,
            seat_assignments: table.seat_assignments.clone(),
        };
        chart_tables.push(chart_table);
    }

    tx.commit().await?;

    let response = json!({
        "data": {
            "classroom_id": classroom_id,
            "tables": chart_tables
        }
    });
    Ok((StatusCode::OK, Json(response)))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use serde_json::json;
    use tower::ServiceExt;
    use uuid::Uuid;

    use super::*;
    use crate::{
        model::{SeatModel, TableModel},
        test_support::{app, body_json, insert_classroom, json_request},
    };

    async fn fetch_classroom(pool: &sqlx::PgPool, id: Uuid) -> Option<ClassroomModel> {
        sqlx::query_as!(
            ClassroomModel,
            r#"SELECT * FROM classrooms WHERE id = $1"#,
            id
        )
        .fetch_optional(pool)
        .await
        .unwrap()
    }

    async fn insert_table(
        pool: &sqlx::PgPool,
        classroom_id: Uuid,
        table_number: i32,
        rows: i16,
        cols: i16,
        x_pos: i32,
        y_pos: i32,
    ) -> TableModel {
        sqlx::query_as!(
            TableModel,
            r#"INSERT INTO tables (classroom_id, table_number, rows, cols, x_pos, y_pos)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *"#,
            classroom_id,
            table_number,
            rows,
            cols,
            x_pos,
            y_pos
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    async fn insert_seat(
        pool: &sqlx::PgPool,
        table_id: Uuid,
        student_id: Option<Uuid>,
        seat_number: i16,
    ) -> SeatModel {
        sqlx::query_as!(
            SeatModel,
            r#"INSERT INTO seats (table_id, student_id, seat_number)
            VALUES ($1, $2, $3)
            RETURNING *"#,
            table_id,
            student_id,
            seat_number
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    async fn insert_student(pool: &sqlx::PgPool, student_id: i32, name: &str) -> Uuid {
        sqlx::query_scalar!(
            r#"INSERT INTO students (classroom_id, student_id, name)
            VALUES (NULL, $1, $2)
            RETURNING id"#,
            student_id,
            name
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    async fn fetch_tables_for_classroom(
        pool: &sqlx::PgPool,
        classroom_id: Uuid,
    ) -> Vec<TableModel> {
        sqlx::query_as!(
            TableModel,
            r#"SELECT * FROM tables WHERE classroom_id = $1 ORDER BY table_number"#,
            classroom_id
        )
        .fetch_all(pool)
        .await
        .unwrap()
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_classroom_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"subject": "Math 2", "period": 3});

        let response = app
            .oneshot(json_request("POST", "/api/v1/classrooms", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["subject"], "Math 2");
        assert_eq!(json["data"]["period"], 3);

        Ok(())
    }

    // No uniqueness constraint on (subject, period), so duplicates are accepted.
    #[sqlx::test(migrations = "../migrations")]
    async fn create_classroom_allows_duplicate_subject_and_period(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"subject": "Math 2", "period": 3});
        let first = app
            .clone()
            .oneshot(json_request("POST", "/api/v1/classrooms", body))
            .await
            .unwrap();
        assert_eq!(first.status(), StatusCode::CREATED);

        let body = json!({"subject": "Math 2", "period": 3});
        let second = app
            .oneshot(json_request("POST", "/api/v1/classrooms", body))
            .await
            .unwrap();
        assert_eq!(second.status(), StatusCode::CREATED);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_classroom_partial_leaves_other_fields_unchanged(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let existing = insert_classroom(&pool, "Math 2", 3).await;
        let app = app(pool);

        let body = json!({"subject": "Algebra"});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/classrooms/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["subject"], "Algebra");
        assert_eq!(json["data"]["period"], existing.period);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_classroom_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"subject": "Doesn't Matter"});

        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/classrooms/{}", Uuid::new_v4()),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let json = body_json(response).await;
        assert!(json["message"].is_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_classroom_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let existing = insert_classroom(&pool, "Math 2", 3).await;
        let app = app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/classrooms/{}", existing.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], existing.id.to_string());

        assert!(fetch_classroom(&pool, existing.id).await.is_none());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_classroom_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/classrooms/{}", Uuid::new_v4()))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let json = body_json(response).await;
        assert!(json["message"].is_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seating_chart_replaces_existing_tables_and_seats(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let old_table = insert_table(&pool, classroom.id, 0, 2, 2, 0, 0).await;
        insert_seat(&pool, old_table.id, None, 0).await;
        let app = app(pool.clone());

        let student_id = insert_student(&pool, 1, "Bob").await;
        let body = json!({
            "tables": [
                { "table_number": 0, "rows": 1, "cols": 2, "x_pos": 20, "y_pos": 40, "seat_assignments": [student_id, null] },
            ]
        });
        let response = app
            .oneshot(json_request(
                "PUT",
                &format!("/api/v1/classrooms/{}/seating-chart", classroom.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let tables = fetch_tables_for_classroom(&pool, classroom.id).await;
        assert_eq!(tables.len(), 1);
        assert_ne!(tables[0].id, old_table.id);
        assert_eq!(tables[0].rows, 1);
        assert_eq!(tables[0].cols, 2);
        assert_eq!(tables[0].x_pos, 20);
        assert_eq!(tables[0].y_pos, 40);

        let seats = sqlx::query_as!(
            SeatModel,
            r#"SELECT * FROM seats WHERE table_id = $1 ORDER BY seat_number"#,
            tables[0].id
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(seats.len(), 2);
        assert_eq!(seats[0].seat_number, 0);
        assert_eq!(seats[0].student_id, Some(student_id));
        assert_eq!(seats[1].seat_number, 1);
        assert_eq!(seats[1].student_id, None);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seating_chart_assigns_table_number_from_request_index(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let app = app(pool.clone());

        // x_pos deliberately doesn't match the intended table_number order,
        // so the assertion below only passes if table_number is driven by
        // request array index and not incidentally by x_pos or insert order.
        let body = json!({
            "tables": [
                { "table_number": 0, "rows": 1, "cols": 1, "x_pos": 900, "y_pos": 0, "seat_assignments": [] },
                { "table_number": 1, "rows": 1, "cols": 1, "x_pos": 100, "y_pos": 0, "seat_assignments": [] },
                { "table_number": 2, "rows": 1, "cols": 1, "x_pos": 500, "y_pos": 0, "seat_assignments": [] },
            ]
        });
        let response = app
            .oneshot(json_request(
                "PUT",
                &format!("/api/v1/classrooms/{}/seating-chart", classroom.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let tables = fetch_tables_for_classroom(&pool, classroom.id).await;
        assert_eq!(tables.len(), 3);
        assert_eq!(tables[0].table_number, 0);
        assert_eq!(tables[0].x_pos, 900);
        assert_eq!(tables[1].table_number, 1);
        assert_eq!(tables[1].x_pos, 100);
        assert_eq!(tables[2].table_number, 2);
        assert_eq!(tables[2].x_pos, 500);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seating_chart_with_no_tables_clears_everything(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        insert_table(&pool, classroom.id, 0, 2, 2, 0, 0).await;
        let app = app(pool.clone());

        let body = json!({ "tables": [] });
        let response = app
            .oneshot(json_request(
                "PUT",
                &format!("/api/v1/classrooms/{}/seating-chart", classroom.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        assert!(
            fetch_tables_for_classroom(&pool, classroom.id)
                .await
                .is_empty()
        );

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_seating_chart_returns_only_assigned_seats(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let table = insert_table(&pool, classroom.id, 0, 2, 2, 0, 0).await;
        let student_id = insert_student(&pool, 1, "Bob").await;
        insert_seat(&pool, table.id, Some(student_id), 0).await;
        insert_seat(&pool, table.id, None, 1).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/classrooms/{}/seating-chart", classroom.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["tables"][0]["rows"], 2);
        assert_eq!(json["data"]["tables"][0]["cols"], 2);
        let assignments = json["data"]["tables"][0]["seat_assignments"]
            .as_array()
            .unwrap();
        assert_eq!(assignments[0], student_id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_seating_chart_groups_assignments_in_table_insertion_order(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        // x_pos/y_pos deliberately sort the opposite of insertion order, so
        // the response order can only be right if it's driven by
        // table_number and not accidentally by position or id.
        let first_table = insert_table(&pool, classroom.id, 0, 2, 2, 100, 100).await;
        let second_table = insert_table(&pool, classroom.id, 1, 2, 2, 0, 0).await;
        let student_a = insert_student(&pool, 1, "Alice").await;
        let student_b = insert_student(&pool, 2, "Bob").await;
        insert_seat(&pool, second_table.id, Some(student_b), 0).await;
        insert_seat(&pool, first_table.id, Some(student_a), 0).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/classrooms/{}/seating-chart", classroom.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        let tables = json["data"]["tables"].as_array().unwrap();
        assert_eq!(tables.len(), 2);
        assert_eq!(tables[0]["seat_assignments"][0], student_a.to_string());
        assert_eq!(tables[1]["seat_assignments"][0], student_b.to_string());
        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_seating_chart_with_no_tables_returns_empty_list(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/classrooms/{}/seating-chart", classroom.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert!(json["data"]["tables"].as_array().unwrap().is_empty());

        Ok(())
    }
}
