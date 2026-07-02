use serde::{Deserialize, Serialize};

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
    pub classroom_id: Option<i64>,
    pub seat_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateStudentSchema {
    pub student_id: Option<i32>,
    pub name: Option<String>,
    pub classroom_id: Option<i64>,
    pub seat_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TableSchema {
    pub classroom_id: i64,
    pub max_seats: i16,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateTableSchema {
    pub max_seats: i16,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SeatSchema {
    pub table_id: i64,
    pub position: i16,
}
