use std::sync::Arc;

use axum::{
    Router,
    routing::{delete, get, patch, post, put},
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
            "/api/v1/students/{student_id}",
            get(handlers::student::get_student_handler),
        )
        .route(
            "/api/v1/students/{student_id}",
            patch(handlers::student::update_student_handler),
        )
        .route(
            "/api/v1/students/{student_id}",
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
            "/api/v1/classrooms/{classroom_id}",
            get(handlers::classroom::get_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{classroom_id}",
            patch(handlers::classroom::update_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{classroom_id}",
            delete(handlers::classroom::delete_classroom_handler),
        )
        .route(
            "/api/v1/classrooms/{classroom_id}/seating-chart",
            get(handlers::classroom::get_seating_chart_handler),
        )
        .route(
            "/api/v1/classrooms/{classroom_id}/seating-chart",
            put(handlers::classroom::update_seating_chart_handler),
        )
        .with_state(app_state)
}
