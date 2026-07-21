#![cfg(test)]

use std::sync::Arc;

use axum::{Router, body::Body, http::Request, response::Response};
use http_body_util::BodyExt;
use serde_json::Value;

use crate::{AppState, model::ClassroomModel, routes::create_router};

pub fn app(pool: sqlx::PgPool) -> Router {
    create_router(Arc::new(AppState { db: pool }))
}

pub async fn body_json(response: Response) -> Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

pub fn json_request(method: &str, uri: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

pub async fn insert_classroom(pool: &sqlx::PgPool, subject: &str, period: i16) -> ClassroomModel {
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
