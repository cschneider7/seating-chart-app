use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post}
};

use crate::{
    AppState,
    handler::{
        create_student_handler,
        delete_student_handler,
        get_student_handler,
        student_list_handler,
        update_student_handler
    }
};

pub fn create_router(app_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/v1/students", get(student_list_handler))
        .route("/api/v1/students", post(create_student_handler))
        .route(
            "/api/v1/students/{id}",
            get(get_student_handler)
                .patch(update_student_handler)
                .delete(delete_student_handler)
        )
        .with_state(app_state)
}