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
    model::StudentModel,
    schema::{StudentSchema, UpdateStudentSchema},
};

pub async fn student_list_handler(
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let students = sqlx::query_as!(StudentModel, r#"SELECT * FROM students ORDER by name"#)
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
        "data": json!(students)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn get_student_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let student = sqlx::query_as!(StudentModel, r#"SELECT * FROM students WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "status": "fail",
                    "message": format!("Student with ID: {} not found", id)
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
        "data": json!(student),
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn create_student_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<StudentSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let student = sqlx::query_as!(
        StudentModel,
        r#"INSERT INTO students (
            student_id,
            name,
            classroom_id,
            seat_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *"#,
        body.student_id,
        &body.name,
        body.classroom_id,
        body.seat_id
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
        "data": json!(student),
    });
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn update_student_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateStudentSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let student = sqlx::query_as!(StudentModel, r#"SELECT * FROM students WHERE id = $1"#, &id)
        .fetch_one(&data.db)
        .await
        .map_err(|e| match e {
            sqlx::Error::RowNotFound => (
                StatusCode::NOT_FOUND,
                Json(json!({
                    "status": "fail",
                    "message": format!("Student with ID: {} not found", id)
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

    let new_student_id = body.student_id.unwrap_or(student.student_id);
    let new_name = body.name.as_ref().unwrap_or(&student.name);
    // classroom_id/seat_id are present-but-null when the client explicitly
    // unassigns the student, vs. absent when the field wasn't touched at all.
    let new_classroom_id = body.classroom_id.unwrap_or(student.classroom_id);
    let new_seat_id = body.seat_id.unwrap_or(student.seat_id);

    let updated_student = sqlx::query_as!(
        StudentModel,
        r#"UPDATE students SET
            student_id = $1,
            name = $2,
            classroom_id = $3,
            seat_id = $4
        WHERE id = $5
        RETURNING *"#,
        new_student_id,
        &new_name,
        new_classroom_id,
        new_seat_id,
        student.id
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
        "data": json!(updated_student)
    });
    Ok((StatusCode::OK, Json(response)))
}

pub async fn delete_student_handler(
    Path(id): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let student = sqlx::query_as!(
        StudentModel,
        r#"DELETE FROM students WHERE id = $1 RETURNING *"#,
        &id
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "status": "fail",
                "message": format!("Student with ID: {} not found", id)
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
        "data": json!(student),
    });
    Ok((StatusCode::OK, Json(response)))
}
