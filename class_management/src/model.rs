use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct ClassroomModel {
    pub id: i64,
    pub uuid: Uuid,
    pub subject: String,
    pub period: i16,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct StudentModel {
    pub id: i64,
    pub uuid: Uuid,
    pub student_id: i32,
    pub name: String,
    pub classroom_id: Option<i64>,
    pub seat_id: Option<i64>,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct TableModel {
    pub id: i64,
    pub classroom_id: i64,
    pub max_seats: i16,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct SeatModel {
    pub id: i64,
    pub table_id: i64,
    pub position: i16,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>
}