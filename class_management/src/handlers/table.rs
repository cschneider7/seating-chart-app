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
    model::TableModel,
    schema::{TableSchema, UpdateTableSchema},
};

pub async fn get_classroom_tables_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let tables = sqlx::query_as!(
        TableModel,
        r#"SELECT * FROM tables WHERE classroom_id = $1 ORDER BY id"#,
        &classroom_id
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
        "data": json!(tables)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create_table_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<TableSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let table = sqlx::query_as!(
        TableModel,
        r#"INSERT INTO tables (
            classroom_id,
            seat_count,
            x_pos,
            y_pos
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *"#,
        &body.classroom_id,
        body.seat_count,
        body.x_pos,
        body.y_pos,
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
        "data": json!(table),
    });
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn get_table_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let table = sqlx::query_as!(TableModel, r#"SELECT * FROM tables WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "message": format!("Table with ID: {} not found", id)
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
        "data": json!(table),
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn update_table_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateTableSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let table = sqlx::query_as!(TableModel, r#"SELECT * FROM tables WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "message": format!("Table with ID: {} not found", id)
                })),
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "message": format!("{:?}", e)
                })),
            ),
        })?;

    let new_seat_count = body.seat_count.unwrap_or(table.seat_count);
    let new_x_pos = body.x_pos.unwrap_or(table.x_pos);
    let new_y_pos = body.y_pos.unwrap_or(table.y_pos);

    let updated_table = sqlx::query_as!(
        TableModel,
        r#"UPDATE tables SET
            seat_count = $1,
            x_pos = $2,
            y_pos = $3
        WHERE id = $4
        RETURNING *"#,
        new_seat_count,
        new_x_pos,
        new_y_pos,
        &table.id
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
        "data": json!(updated_table)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn delete_table_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let table = sqlx::query_as!(
        TableModel,
        r#"DELETE FROM tables WHERE id = $1 RETURNING *"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "message": format!("Table with ID: {} not found", id)
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
        "message": "Table deleted successfully",
        "data": json!(table),
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
    use crate::{model::ClassroomModel, routes::create_router};

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

    async fn fetch_table(pool: &sqlx::PgPool, id: Uuid) -> Option<TableModel> {
        sqlx::query_as!(TableModel, r#"SELECT * FROM tables WHERE id = $1"#, id)
            .fetch_optional(pool)
            .await
            .unwrap()
    }

    async fn fetch_seats_for_table(pool: &sqlx::PgPool, table_id: Uuid) -> Vec<Uuid> {
        sqlx::query_scalar!(r#"SELECT id FROM seats WHERE table_id = $1"#, table_id)
            .fetch_all(pool)
            .await
            .unwrap()
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_table_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let app = app(pool);

        let body = json!({
            "classroom_id": classroom.id,
            "seat_count": 4,
            "x_pos": 10,
            "y_pos": 20,
        });
        let response = app
            .oneshot(json_request("POST", "/api/v1/tables", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["classroom_id"], classroom.id.to_string());
        assert_eq!(json["data"]["seat_count"], 4);
        assert_eq!(json["data"]["x_pos"], 10);
        assert_eq!(json["data"]["y_pos"], 20);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_table_rejects_nonexistent_classroom_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let fake_classroom_id = Uuid::new_v4();
        let body = json!({
            "classroom_id": fake_classroom_id,
            "seat_count": 4,
            "x_pos": 10,
            "y_pos": 20,
        });

        let response = app
            .oneshot(json_request("POST", "/api/v1/tables", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_classroom_tables_returns_only_that_classrooms_tables(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom_a = insert_classroom(&pool, "Math 2", 3).await;
        let classroom_b = insert_classroom(&pool, "History", 1).await;
        let table_a = insert_table(&pool, classroom_a.id, 4, 0, 0).await;
        insert_table(&pool, classroom_b.id, 4, 0, 0).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/classrooms/{}/tables", classroom_a.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        let tables = json["data"].as_array().unwrap();
        assert_eq!(tables.len(), 1);
        assert_eq!(tables[0]["id"], table_a.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_table_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let table = insert_table(&pool, classroom.id, 4, 0, 0).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/tables/{}", table.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], table.id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_table_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/tables/{}", Uuid::new_v4()))
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
    async fn update_table_partial_leaves_other_fields_unchanged(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let existing = insert_table(&pool, classroom.id, 4, 10, 20).await;
        let app = app(pool);

        let body = json!({"x_pos": 99});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/tables/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["x_pos"], 99);
        assert_eq!(json["data"]["seat_count"], existing.seat_count);
        assert_eq!(json["data"]["y_pos"], existing.y_pos);

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_table_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"x_pos": 99});

        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/tables/{}", Uuid::new_v4()),
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
    async fn delete_table_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let existing = insert_table(&pool, classroom.id, 4, 0, 0).await;
        let app = app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/tables/{}", existing.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], existing.id.to_string());

        assert!(fetch_table(&pool, existing.id).await.is_none());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_table_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/tables/{}", Uuid::new_v4()))
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
    async fn delete_table_cascades_to_seats(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        let table = insert_table(&pool, classroom.id, 4, 0, 0).await;
        sqlx::query!(
            r#"INSERT INTO seats (table_id, student_id, position) VALUES ($1, $2, $3)"#,
            table.id,
            None::<Uuid>,
            1i16,
        )
        .execute(&pool)
        .await
        .unwrap();
        let app = app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/tables/{}", table.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        assert!(fetch_seats_for_table(&pool, table.id).await.is_empty());

        Ok(())
    }
}
