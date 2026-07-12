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

pub async fn create_table_seat_handler(
    Path(table_id): Path<Uuid>,
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
        &table_id,
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

    let updated_seat = sqlx::query_as!(
        SeatModel,
        r#"UPDATE seats SET
            student_id = $1
        WHERE id = $2
        RETURNING *"#,
        body.student_id.as_ref(),
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
