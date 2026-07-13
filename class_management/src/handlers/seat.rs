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
    model::SeatModel,
    schema::{SeatSchema, UpdateSeatSchema},
};

pub async fn get_table_seats_handler(
    Path(table_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let seats = sqlx::query_as!(
        SeatModel,
        r#"SELECT * FROM seats WHERE table_id = $1 ORDER BY position"#,
        &table_id
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
        "data": json!(seats)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create_seat_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<SeatSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let seat = sqlx::query_as!(
        SeatModel,
        r#"INSERT INTO seats (
            table_id,
            student_id,
            position
        )
        VALUES ($1, $2, $3)
        RETURNING *"#,
        &body.table_id,
        body.student_id.as_ref(),
        body.position,
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
        "data": json!(seat),
    });
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn get_seat_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let seat = sqlx::query_as!(SeatModel, r#"SELECT * FROM seats WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "message": format!("Seat with ID: {} not found", id)
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
        "data": json!(seat),
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn update_seat_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateSeatSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let seat = sqlx::query_as!(SeatModel, r#"SELECT * FROM seats WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "message": format!("Seat with ID: {} not found", id)
                })),
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "message": format!("{:?}", e)
                })),
            ),
        })?;

    let new_student_id = body.student_id.unwrap_or(seat.student_id);

    let updated_seat = sqlx::query_as!(
        SeatModel,
        r#"UPDATE seats SET
            student_id = $1
        WHERE id = $2
        RETURNING *"#,
        new_student_id,
        &seat.id
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
        "data": json!(updated_seat)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn delete_seat_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let seat = sqlx::query_as!(
        SeatModel,
        r#"DELETE FROM seats WHERE id = $1 RETURNING *"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "message": format!("Seat with ID: {} not found", id)
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
        "message": "Seat deleted successfully",
        "data": json!(seat),
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
        model::{ClassroomModel, StudentModel, TableModel},
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

    async fn insert_student(pool: &sqlx::PgPool, student_id: i32, name: &str) -> StudentModel {
        sqlx::query_as!(
            StudentModel,
            r#"INSERT INTO students (classroom_id, student_id, name)
            VALUES (NULL, $1, $2)
            RETURNING *"#,
            student_id,
            name
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

    async fn fetch_seat(pool: &sqlx::PgPool, id: Uuid) -> Option<SeatModel> {
        sqlx::query_as!(SeatModel, r#"SELECT * FROM seats WHERE id = $1"#, id)
            .fetch_optional(pool)
            .await
            .unwrap()
    }

    async fn setup_table(pool: &sqlx::PgPool) -> TableModel {
        let classroom = insert_classroom(pool, "Math 2", 3).await;
        insert_table(pool, classroom.id, 4, 0, 0).await
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_seat_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let app = app(pool);

        let body = json!({"table_id": table.id, "student_id": null, "position": 1});
        let response = app
            .oneshot(json_request("POST", "/api/v1/seats", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["table_id"], table.id.to_string());
        assert!(json["data"]["student_id"].is_null());
        assert_eq!(json["data"]["position"], 1);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_seat_with_student_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let student = insert_student(&pool, 1, "Bob").await;
        let app = app(pool);

        let body = json!({"table_id": table.id, "student_id": student.id, "position": 1});
        let response = app
            .oneshot(json_request("POST", "/api/v1/seats", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["student_id"], student.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_seat_rejects_nonexistent_table_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let fake_table_id = Uuid::new_v4();

        let body = json!({"table_id": fake_table_id, "student_id": null, "position": 1});
        let response = app
            .oneshot(json_request("POST", "/api/v1/seats", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_seat_rejects_nonexistent_student_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let app = app(pool);
        let fake_student_id = Uuid::new_v4();

        let body = json!({"table_id": table.id, "student_id": fake_student_id, "position": 1});
        let response = app
            .oneshot(json_request("POST", "/api/v1/seats", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_seat_rejects_duplicate_student_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let student = insert_student(&pool, 1, "Bob").await;
        insert_seat(&pool, table.id, Some(student.id), 1).await;
        let app = app(pool);

        let body = json!({"table_id": table.id, "student_id": student.id, "position": 2});
        let response = app
            .oneshot(json_request("POST", "/api/v1/seats", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_table_seats_returns_only_that_tables_seats_ordered_by_position(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let table_a = insert_table(&pool, classroom.id, 4, 0, 0).await;
        let table_b = insert_table(&pool, classroom.id, 4, 0, 0).await;
        let seat_a2 = insert_seat(&pool, table_a.id, None, 2).await;
        let seat_a1 = insert_seat(&pool, table_a.id, None, 1).await;
        insert_seat(&pool, table_b.id, None, 1).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/tables/{}/seats", table_a.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        let seats = json["data"].as_array().unwrap();
        assert_eq!(seats.len(), 2);
        assert_eq!(seats[0]["id"], seat_a1.id.to_string());
        assert_eq!(seats[1]["id"], seat_a2.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_seat_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let seat = insert_seat(&pool, table.id, None, 1).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/seats/{}", seat.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], seat.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_seat_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/seats/{}", Uuid::new_v4()))
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
    async fn update_seat_sets_student_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let student = insert_student(&pool, 1, "Bob").await;
        let seat = insert_seat(&pool, table.id, None, 1).await;
        let app = app(pool);

        let body = json!({"student_id": student.id});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/seats/{}", seat.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["student_id"], student.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seat_explicit_null_clears_student_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let student = insert_student(&pool, 1, "Bob").await;
        let seat = insert_seat(&pool, table.id, Some(student.id), 1).await;
        let app = app(pool);

        let body = json!({"student_id": null});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/seats/{}", seat.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert!(json["data"]["student_id"].is_null());

        Ok(())
    }

    // Double-Option deserialization: omitting `student_id` keeps the existing assignment,
    // matching `update_student_handler`'s handling of `classroom_id`.
    #[sqlx::test(migrations = "../migrations")]
    async fn update_seat_omitted_student_id_keeps_existing_value(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let student = insert_student(&pool, 1, "Bob").await;
        let seat = insert_seat(&pool, table.id, Some(student.id), 1).await;
        let app = app(pool);

        let body = json!({});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/seats/{}", seat.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["student_id"], student.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_seat_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"student_id": null});

        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/seats/{}", Uuid::new_v4()),
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
    async fn delete_seat_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let table = setup_table(&pool).await;
        let seat = insert_seat(&pool, table.id, None, 1).await;
        let app = app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/seats/{}", seat.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], seat.id.to_string());

        assert!(fetch_seat(&pool, seat.id).await.is_none());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_seat_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/seats/{}", Uuid::new_v4()))
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
}
