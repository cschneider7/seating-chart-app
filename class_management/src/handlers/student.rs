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
                    "message": format!("Student with ID: {} not found", id)
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
                    "message": format!("Student with ID: {} not found", id)
                })),
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "message": format!("{:?}", e)
                })),
            ),
        })?;

    let new_student_id = body.student_id.unwrap_or(student.student_id);
    let new_name = body.name.as_ref().unwrap_or(&student.name);
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
                "message": format!("Student with ID: {} not found", id)
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
        "data": json!(student),
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
    use crate::routes::create_router;

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

    async fn insert_student(
        pool: &sqlx::PgPool,
        student_id: i32,
        name: &str,
        classroom_id: Option<Uuid>,
        seat_id: Option<Uuid>,
    ) -> StudentModel {
        sqlx::query_as!(
            StudentModel,
            r#"INSERT INTO students (student_id, name, classroom_id, seat_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *"#,
            student_id,
            name,
            classroom_id,
            seat_id
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    async fn fetch_student(pool: &sqlx::PgPool, id: Uuid) -> Option<StudentModel> {
        sqlx::query_as!(StudentModel, r#"SELECT * FROM students WHERE id = $1"#, id)
            .fetch_optional(pool)
            .await
            .unwrap()
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn create_student_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({
            "student_id": 1,
            "name": "Bob Burger",
            "classroom_id": null,
            "seat_id": null,
        });

        let response = app
            .oneshot(json_request("POST", "/api/v1/students", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["student_id"], 1);
        assert_eq!(json["data"]["name"], "Bob Burger");
        assert!(json["data"]["classroom_id"].is_null());

        Ok(())
    }

    // `student_id` has no uniqueness constraint, so duplicates are accepted.
    #[sqlx::test(migrations = "../migrations")]
    async fn create_student_allows_duplicate_student_id(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body =
            json!({"student_id": 42, "name": "First", "classroom_id": null, "seat_id": null});
        let first = app
            .clone()
            .oneshot(json_request("POST", "/api/v1/students", body))
            .await
            .unwrap();
        assert_eq!(first.status(), StatusCode::CREATED);

        let body =
            json!({"student_id": 42, "name": "Second", "classroom_id": null, "seat_id": null});
        let second = app
            .oneshot(json_request("POST", "/api/v1/students", body))
            .await
            .unwrap();
        assert_eq!(second.status(), StatusCode::CREATED);

        Ok(())
    }

    // No FK constraint on `classroom_id`, so a nonexistent one is accepted.
    #[sqlx::test(migrations = "../migrations")]
    async fn create_student_allows_nonexistent_classroom_id(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let app = app(pool);
        let fake_classroom_id = Uuid::new_v4();
        let body = json!({
            "student_id": 1,
            "name": "Bob Burger",
            "classroom_id": fake_classroom_id,
            "seat_id": null,
        });

        let response = app
            .oneshot(json_request("POST", "/api/v1/students", body))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        let json = body_json(response).await;
        assert_eq!(json["data"]["classroom_id"], fake_classroom_id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_student_partial_leaves_other_fields_unchanged(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let existing = insert_student(&pool, 7, "Original Name", None, None).await;
        let app = app(pool);

        let body = json!({"name": "Updated Name"});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/students/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["name"], "Updated Name");
        assert_eq!(json["data"]["student_id"], existing.student_id);
        assert!(json["data"]["classroom_id"].is_null());
        assert!(json["data"]["seat_id"].is_null());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_student_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);
        let body = json!({"name": "Doesn't Matter"});

        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/students/{}", Uuid::new_v4()),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let json = body_json(response).await;
        assert!(json["message"].is_string());

        Ok(())
    }

    // Double-Option deserialization: omitted keeps, explicit null clears.
    #[sqlx::test(migrations = "../migrations")]
    async fn update_student_omitted_classroom_id_keeps_existing_value(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom_id = Uuid::new_v4();
        let existing = insert_student(&pool, 1, "Bob", Some(classroom_id), None).await;
        let app = app(pool);

        let body = json!({"name": "Bob Updated"});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/students/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["classroom_id"], classroom_id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_student_explicit_null_classroom_id_clears_value(
        pool: sqlx::PgPool,
    ) -> sqlx::Result<()> {
        let classroom_id = Uuid::new_v4();
        let existing = insert_student(&pool, 1, "Bob", Some(classroom_id), None).await;
        let app = app(pool);

        let body = json!({"classroom_id": null});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/students/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert!(json["data"]["classroom_id"].is_null());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn update_student_new_classroom_id_sets_value(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let existing = insert_student(&pool, 1, "Bob", None, None).await;
        let new_classroom_id = Uuid::new_v4();
        let app = app(pool);

        let body = json!({"classroom_id": new_classroom_id});
        let response = app
            .oneshot(json_request(
                "PATCH",
                &format!("/api/v1/students/{}", existing.id),
                body,
            ))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["classroom_id"], new_classroom_id.to_string());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_student_success(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let existing = insert_student(&pool, 1, "Bob", None, None).await;
        let app = app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/students/{}", existing.id))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let json = body_json(response).await;
        assert_eq!(json["data"]["id"], existing.id.to_string());

        assert!(fetch_student(&pool, existing.id).await.is_none());

        Ok(())
    }

    #[sqlx::test(migrations = "../migrations")]
    async fn delete_student_nonexistent_id_returns_404(pool: sqlx::PgPool) -> sqlx::Result<()> {
        let app = app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/v1/students/{}", Uuid::new_v4()))
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
