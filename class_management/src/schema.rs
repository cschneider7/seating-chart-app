use serde::{Deserialize, Deserializer, Serialize};
use uuid::Uuid;

/// Distinguishes a field that is missing from the request body (keep the
/// existing value) from one explicitly set to `null` (clear it). Missing
/// fields fall back to `#[serde(default)]` giving `None`; a present `null`
/// deserializes here into `Some(None)`.
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
    pub student_id: i32,
    pub name: String,
    pub classroom_id: Option<Uuid>,
    pub seat_id: Option<Uuid>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateStudentSchema {
    pub student_id: Option<i32>,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub classroom_id: Option<Option<Uuid>>,
    #[serde(default, deserialize_with = "deserialize_some")]
    pub seat_id: Option<Option<Uuid>>,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct TableSchema {
    pub classroom_id: Uuid,
    pub max_seats: i16,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateTableSchema {
    pub max_seats: i16,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize, Debug)]
pub struct SeatSchema {
    pub table_id: Uuid,
    pub position: i16,
}
