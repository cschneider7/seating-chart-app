use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct ClassroomModel {
    pub id: Uuid,
    pub subject: String,
    pub period: i16,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct StudentModel {
    pub id: Uuid,
    pub classroom_id: Option<Uuid>,
    pub student_id: i32,
    pub name: String,
    pub created_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct TableModel {
    pub id: Uuid,
    pub classroom_id: Uuid,
    pub table_number: i32,
    pub rows: i16,
    pub cols: i16,
    pub x_pos: i32,
    pub y_pos: i32,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct SeatModel {
    pub id: Uuid,
    pub table_id: Uuid,
    pub student_id: Option<Uuid>,
    pub seat_number: i16,
}
