use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;
use uuid::Uuid;

use crate::{AppState, model::TableModel};

pub async fn get_classroom_tables_handler(
    Path(classroom_id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let tables = sqlx::query_as!(
        TableModel,
        r#"SELECT * FROM tables WHERE classroom_id = $1 ORDER BY table_number"#,
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
    use serde_json::Value;
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
        table_number: i32,
        seat_count: i16,
        x_pos: i32,
        y_pos: i32,
    ) -> TableModel {
        sqlx::query_as!(
            TableModel,
            r#"INSERT INTO tables (classroom_id, table_number, seat_count, x_pos, y_pos)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *"#,
            classroom_id,
            table_number,
            seat_count,
            x_pos,
            y_pos
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn get_classroom_tables_returns_only_that_classrooms_tables(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom_a = insert_classroom(&pool, "Math 2", 3).await;
        let classroom_b = insert_classroom(&pool, "History", 1).await;
        let table_a = insert_table(&pool, classroom_a.id, 0, 4, 0, 0).await;
        insert_table(&pool, classroom_b.id, 0, 4, 0, 0).await;
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
    async fn get_classroom_tables_returns_them_in_insertion_order(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom = insert_classroom(&pool, "Math 2", 3).await;
        // x_pos/y_pos deliberately sort the opposite of table_number order, so
        // the response order can only be right if it's driven by
        // table_number and not accidentally by position or id.
        let first = insert_table(&pool, classroom.id, 0, 4, 100, 100).await;
        let second = insert_table(&pool, classroom.id, 1, 4, 0, 0).await;
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri(format!("/api/v1/classrooms/{}/tables", classroom.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        let tables = json["data"].as_array().unwrap();
        assert_eq!(tables.len(), 2);
        assert_eq!(tables[0]["id"], first.id.to_string());
        assert_eq!(tables[1]["id"], second.id.to_string());

        Ok(())
    }
}
