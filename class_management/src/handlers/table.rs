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

pub async fn create_classroom_table_handler(
    Path(classroom_id): Path<Uuid>,
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
        &classroom_id,
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
