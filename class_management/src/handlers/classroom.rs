use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    AppState,
    model::ClassroomModel,
    schema::{ClassroomSchema, UpdateClassroomSchema}
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
        let error_response = json!({
            "status": "error",
            "message": format!("Database error: {}", e),
        });
        (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response))
    })?;

    let response = json!({
        "status": "ok",
        "count": classrooms.len(),
        "notes": classrooms
    });
    Ok(Json(response))
}

pub async fn get_classroom_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE uuid = $1"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await;

    match query_result {
        Ok(classroom) => {
            let response = json!({
                "status": "success",
                "data": json!({"classroom": classroom}),
            });
            Ok(Json(response))
        }
        Err(sqlx::Error::RowNotFound) => {
            let error_response = json!({
                "status": "fail",
                "message": format!("Classroom with UUID: {} not found", uuid)
            });
            Err((StatusCode::NOT_FOUND, Json(error_response)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status": "error", "message": format!("{:?}", e)})),
        ))
    }
}

pub async fn create_classroom_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<ClassroomSchema>
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
    .map_err(|e| e.to_string());

    if let Err(err) = classroom {
        if err.to_string().contains("duplicate key value") {
            let error_response = json!({
                "status": "error",
                "message": "Classroom already exists",
            });
            return Err((StatusCode::CONFLICT, Json(error_response)));
        }

        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status": "error", "message": format!("{:?}", err)})),
        ));
    }
    
    let response = json!({
        "status": "success",
        "data": json!({"classroom": classroom}),
    });
    Ok(Json(response))
}

pub async fn update_classroom_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateClassroomSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        ClassroomModel,
        r#"SELECT * FROM classrooms WHERE uuid = $1"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await;

    let classroom = match query_result {
        Ok(classroom) => classroom,
        Err(sqlx::Error::RowNotFound) => {
            let error_response = serde_json::json!({
                "status": "error",
                "message": format!("classroom with UUID: {} not found", uuid)
            });
            return Err((StatusCode::NOT_FOUND, Json(error_response)));
        }
        Err(e) => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status": "error",
                    "message": format!("{:?}",e)
                })),
            ));
        }
    };

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
        classroom.id
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
        "data": json!({"classroom": updated_classroom})
    });
    Ok(Json(response))
}

pub async fn delete_classroom_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        ClassroomModel,
        r#"DELETE FROM classrooms WHERE uuid = $1 RETURNING *"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "status": "error",
                "message": "Classroom not found"
            }))
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "status": "error",
                "message": format!("{:?}", e)
            }))
        )
    })?;

    let response = json!({
        "status": "success",
        "message": "Classroom deleted successfully",
        "data": { "deleted_classroom": query_result }
    });
    Ok(Json(response))
}