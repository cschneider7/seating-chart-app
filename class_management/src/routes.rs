use std::sync::Arc;

use axum::{
    Router,
    routing::{delete, get, patch, post},
};

use crate::{AppState, handlers};

pub fn create_router(app_state: Arc<AppState>) -> Router {
    Router::new()
        .route(
            "/api/v1/students",
            get(handlers::student::student_list_handler),
        )
        .route(
            "/api/v1/students",
            post(handlers::student::create_student_handler),
        )
        .route(
            "/api/v1/students/{id}",
            get(handlers::student::get_student_handler),
        )
        .route(
            "/api/v1/students/{id}",
            patch(handlers::student::update_student_handler),
        )
        .route(
            "/api/v1/students/{id}",
            delete(handlers::student::delete_student_handler),
        )
        .route(
            "/api/v1/classrooms",
            get(handlers::classroom::classroom_list_handler),
        )
        .route(
            "/api/v1/classrooms",
            post(handlers::classroom::create_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{id}",
            get(handlers::classroom::get_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{id}",
            patch(handlers::classroom::update_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{id}",
            delete(handlers::classroom::delete_classroom_handler),
        )
        .with_state(app_state)
}
