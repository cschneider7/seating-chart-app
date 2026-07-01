use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct StudentSchema {
    pub name: String,
    pub classroom_id: Option<Uuid>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateStudentSchema {
    pub name: Option<String>,
    pub classroom_id: Option<Uuid>
}