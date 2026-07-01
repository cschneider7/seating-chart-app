use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct StudentModel {
    pub id: Uuid,
    pub name: String,
    pub classroom_id: Option<Uuid>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}