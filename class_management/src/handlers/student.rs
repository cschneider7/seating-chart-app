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
    model::StudentModel,
    schema::{StudentSchema, UpdateStudentSchema}
};

pub async fn student_list_handler(
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let students = sqlx::query_as!(
        StudentModel,
        r#"SELECT * FROM students ORDER by name"#
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
        "count": students.len(),
        "notes": students
    });
    Ok(Json(response))
}

pub async fn get_student_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        StudentModel,
        r#"SELECT * FROM students WHERE uuid = $1"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await;

    match query_result {
        Ok(student) => {
            let response = json!({
                "status": "success",
                "data": json!({"student": student}),
            });
            Ok(Json(response))
        }
        Err(sqlx::Error::RowNotFound) => {
            let error_response = json!({
                "status": "fail",
                "message": format!("Student with UUID: {} not found", uuid)
            });
            Err((StatusCode::NOT_FOUND, Json(error_response)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status": "error", "message": format!("{:?}", e)})),
        ))
    }
}

pub async fn create_student_handler(
    State(data): State<Arc<AppState>>,
    Json(body): Json<StudentSchema>
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
    .map_err(|e| e.to_string());

    if let Err(err) = student {
        if err.to_string().contains("duplicate key value") {
            let error_response = json!({
                "status": "error",
                "message": "Student already exists",
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
        "data": json!({"student": student}),
    });
    Ok(Json(response))
}

pub async fn update_student_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
    Json(body): Json<UpdateStudentSchema>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        StudentModel,
        r#"SELECT * FROM students WHERE uuid = $1"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await;

    let student = match query_result {
        Ok(student) => student,
        Err(sqlx::Error::RowNotFound) => {
            let error_response = serde_json::json!({
                "status": "error",
                "message": format!("student with UUID: {} not found", uuid)
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

    let new_student_id = body.student_id.unwrap_or(student.student_id);
    let new_name = body.name.as_ref().unwrap_or(&student.name);
    let new_classroom_id = match body.classroom_id {
        Some(classroom_id) => Some(classroom_id),
        _ => student.classroom_id
    };
    let new_seat_id = match body.seat_id {
        Some(seat_id) => Some(seat_id),
        _ => student.seat_id
    };

    let updated_student = sqlx::query_as!(
        StudentModel,
        r#"UPDATE students SET
            student_id = $1,
            name = $2,
            classroom_id = COALESCE($3, classroom_id),
            seat_id = COALESCE($4, seat_id)
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
                "status": "error",
                "message": format!("{:?}", e)
            })),
        )
    })?;

    let response = json!({
        "status": "success",
        "data": json!({"student": updated_student})
    });
    Ok(Json(response))
}

pub async fn delete_student_handler(
    Path(uuid): Path<Uuid>,
    State(data): State<Arc<AppState>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let query_result = sqlx::query_as!(
        StudentModel,
        r#"DELETE FROM students WHERE uuid = $1 RETURNING *"#,
        &uuid
    )
    .fetch_one(&data.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "status": "error",
                "message": "Student not found"
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
        "message": "Student deleted successfully",
        "data": { "deleted_student": query_result }
    });
    Ok(Json(response))
}