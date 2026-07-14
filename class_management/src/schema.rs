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

#[derive(Serialize, Deserialize, Debug)]
pub struct SeatingChartTableSchema {
    pub x_pos: i32,
    pub y_pos: i32,
    /// index = position (0-indexed); seat_count is derived from `seats.len()`
    pub seats: Vec<Option<Uuid>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SeatingChartSchema {
    pub tables: Vec<SeatingChartTableSchema>,
}
