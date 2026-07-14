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
    model::ClassroomModel,
    schema::{ClassroomSchema, SeatingChartSchema, UpdateClassroomSchema},
};

#[derive(serde::Serialize)]
struct SeatAssignmentRow {
    table_id: Uuid,
    position: i16,
    student_id: Uuid,
}

pub async fn classroom_list_handler(
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let classrooms = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms ORDER by period"#
    )
    .fetch_all(&data.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("Database error: {}", e),
            })),
        )
    })?;

    let response = json!({
        "data": json!(classrooms)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE id = $1"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        ),
    })?;

    let response = json!({
        "data": json!(classroom),
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create_classroom_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<ClassroomSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
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
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "data": json!(classroom),
    });
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn update_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateClassroomSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE id = $1"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        ),
    })?;

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
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "data": json!(updated_classroom)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn delete_classroom_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let classroom = sqlx::query_as!(
        ClassroomModel,
        r#"DELETE FROM classrooms WHERE id = $1 RETURNING *"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        ),
    })?;

    let response = json!({
        "data": json!(classroom),
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn update_seating_chart_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<SeatingChartSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let mut tx = data.db.begin().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    sqlx::query!(
        r#"DELETE FROM tables WHERE classroom_id = $1"#,
        &classroom_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    for table in &body.tables {
        let seat_count = table.seats.len() as i16;
        let table_id = sqlx::query_scalar!(
            r#"INSERT INTO tables (classroom_id, seat_count, x_pos, y_pos)
            VALUES ($1, $2, $3, $4)
            RETURNING id"#,
            &classroom_id,
            seat_count,
            table.x_pos,
            table.y_pos,
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "message": format!("{:?}", e)
                })),
            )
        })?;

        for (position, student_id) in table.seats.iter().enumerate() {
            sqlx::query!(
                r#"INSERT INTO seats (table_id, student_id, position)
                VALUES ($1, $2, $3)"#,
                table_id,
                student_id.as_ref(),
                position as i16,
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "message": format!("{:?}", e)
                    })),
                )
            })?;
        }
    }

    tx.commit().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "message": "Seating chart updated successfully"
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_seating_chart_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let assignments = sqlx::query_as!(
        SeatAssignmentRow,
        r#"SELECT
            t.id as "table_id!",
            s.position,
            s.student_id as "student_id!"
        FROM tables t
        INNER JOIN seats s ON (t.id = s.table_id)
        WHERE t.classroom_id = $1 AND s.student_id IS NOT NULL
        ORDER BY t.id, s.position
        "#,
        &classroom_id
    )
    .fetch_all(&data.db)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "data": json!(assignments)
    });
    Ok((StatusCode::OK, Json(response)))
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use axum::{
        Router,
        body::Body,
        http::{Request, StatusCode},
        response::Response,
    };
    use http_body_util::BodyExt;
    use serde_json::{Value, json};
    use tower::ServiceExt;
    use uuid::Uuid;

    use super::*;
    use crate::{
        model::{SeatModel, TableModel},
        routes::create_router,
    };

    fn app(pool: sqlx::PgPool) -> Router {
        create_router(Arc::new(AppState { db: pool }))
    }

    async fn body_json(response: Response) -> Value {
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&bytes).unwrap()
    }

    fn json_request(method: &str, uri: &str, body: Value) -> Request<Body> {
        Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    }

    async fn insert_classroom(pool: &sqlx::PgPool, subject: &str, period: i16) -> ClassroomModel {
        sqlx::query_as!(
            ClassroomModel,
            r#"INSERT INTO classrooms (subject, period) VALUES ($1, $2) RETURNING *"#,
            subject,
            period
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

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
        seat_count: i16,
        x_pos: i32,
        y_pos: i32,
    ) -> TableModel {
        sqlx::query_as!(
            TableModel,
            r#"INSERT INTO tables (classroom_id, seat_count, x_pos, y_pos)
            VALUES ($1, $2, $3, $4)
            RETURNING *"#,
            classroom_id,
            seat_count,
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
        position: i16,
    ) -> SeatModel {
        sqlx::query_as!(
            SeatModel,
            r#"INSERT INTO seats (table_id, student_id, position)
            VALUES ($1, $2, $3)
            RETURNING *"#,
            table_id,
            student_id,
            position
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
            r#"SELECT * FROM tables WHERE classroom_id = $1 ORDER BY x_pos"#,
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
        let old_table = insert_table(&pool, classroom.id, 4, 0, 0).await;
        insert_seat(&pool, old_table.id, None, 0).await;
        let app = app(pool.clone());

        let student_id = insert_student(&pool, 1, "Bob").await;
        let body = json!({
            "tables": [
                { "x_pos": 20, "y_pos": 40, "seats": [student_id, null] },
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
        assert_eq!(tables[0].seat_count, 2);
        assert_eq!(tables[0].x_pos, 20);
        assert_eq!(tables[0].y_pos, 40);

        let seats = sqlx::query_as!(
            SeatModel,
            r#"SELECT * FROM seats WHERE table_id = $1 ORDER BY position"#,
            tables[0].id
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(seats.len(), 2);
        assert_eq!(seats[0].position, 0);
        assert_eq!(seats[0].student_id, Some(student_id));
        assert_eq!(seats[1].position, 1);
        assert_eq!(seats[1].student_id, None);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seating_chart_with_no_tables_clears_everything(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        insert_table(&pool, classroom.id, 4, 0, 0).await;
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
        let table = insert_table(&pool, classroom.id, 4, 0, 0).await;
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
        let assignments = json["data"].as_array().unwrap();
        assert_eq!(assignments.len(), 1);
        assert_eq!(assignments[0]["table_id"], table.id.to_string());
        assert_eq!(assignments[0]["position"], 0);
        assert_eq!(assignments[0]["student_id"], student_id.to_string());

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
        assert!(json["data"].as_array().unwrap().is_empty());

        Ok(())
    }
}
