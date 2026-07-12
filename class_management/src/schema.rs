use serde::{Deserialize, Deserializer, Serialize};
use uuid::Uuid;

/// Distinguishes a field that is missing from the request body (keep the
/// existing value) from one explicitly set to `null` (clear it)
fn deserialize_some<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClassroomSchema {
    pub subject: String,
    pub period: i16,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateClassroomSchema {
    pub subject: Option<String>,
    pub period: Option<i16>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StudentSchema {
    pub classroom_id: Option<Uuid>,
    pub student_id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateStudentSchema {
    #[serde(default, deserialize_with = "deserialize_some")]
    pub classroom_id: Option<Option<Uuid>>,
    pub student_id: Option<i32>,
    pub name: Option<String>,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct TableSchema {
    pub classroom_id: Uuid,
    pub seat_count: i16,
    pub x_pos: i32,
    pub y_pos: i32,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateTableSchema {
    pub seat_count: Option<i16>,
    pub x_pos: Option<i32>,
    pub y_pos: Option<i32>,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct SeatSchema {
    pub table_id: Uuid,
    pub student_id: Option<Uuid>,
    pub position: i16,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateSeatSchema {
    pub student_id: Option<Uuid>,
}
