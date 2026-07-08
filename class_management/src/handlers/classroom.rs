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
    schema::{ClassroomSchema, UpdateClassroomSchema},
};

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
                "status": "fail",
                "message": format!("Database error: {}", e),
            })),
        )
    })?;

    let response = json!({
        "status": "success",
        "data": json!(classrooms)
    });
    Ok(Json(response))
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
                "status": "fail",
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "fail",
                "message": format!("{:?}", e)
            })),
        ),
    })?;

    let response = json!({
        "status": "success",
        "data": json!(classroom),
    });
    Ok(Json(response))
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
                "status": "error",
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "status": "success",
        "data": json!(classroom),
    });
    Ok(Json(response))
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
                "status": "fail",
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "fail",
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
                "status": "fail",
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "status": "success",
        "data": json!(updated_classroom)
    });
    Ok(Json(response))
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
                "status": "fail",
                "message": format!("Classroom with ID: {} not found", id)
            })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "fail",
                "message": format!("{:?}", e)
            })),
        ),
    })?;

    let response = json!({
        "status": "success",
        "message": "Classroom deleted successfully",
        "data": json!(classroom),
    });
    Ok(Json(response))
}
