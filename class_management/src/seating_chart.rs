use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::TableSchema;

pub const MAX_TABLE_DIMENSION: i16 = 15;
const GRID_STEP: i32 = 20;
const TABLES_PER_ROW: i32 = 4;
const TABLE_SPACING: i32 = GRID_STEP * 13; // 260
const TABLE_OFFSET: i32 = GRID_STEP * 2; // 40
const SEAT_PADDING: i32 = 6;
const SEAT_NODE_SIZE: i32 = 91;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TableGeometry {
    pub rows: i16,
    pub cols: i16,
    pub x_pos: i32,
    pub y_pos: i32,
}

fn table_pixel_size(rows: i16, cols: i16) -> (i32, i32) {
    let dim = |n: i32| n * (SEAT_NODE_SIZE + SEAT_PADDING) + SEAT_PADDING;
    (dim(cols as i32), dim(rows as i32))
}

fn table_grid_position(index: i32) -> (i32, i32) {
    (
        TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
        TABLE_OFFSET + (index / TABLES_PER_ROW) * TABLE_SPACING,
    )
}

fn overlaps(a_pos: (i32, i32), a_size: (i32, i32), b_pos: (i32, i32), b_size: (i32, i32)) -> bool {
    a_pos.0 < b_pos.0 + b_size.0
        && a_pos.0 + a_size.0 > b_pos.0
        && a_pos.1 < b_pos.1 + b_size.1
        && a_pos.1 + a_size.1 > b_pos.1
}

fn empty_table(rows: i16, cols: i16, x_pos: i32, y_pos: i32) -> TableSchema {
    TableSchema {
        table_number: 0, // corrected once the final table order is known
        rows,
        cols,
        x_pos,
        y_pos,
        seat_assignments: vec![None; rows as usize * cols as usize],
    }
}

/// Builds a proposed seating chart: kept tables augmented with just enough
/// new tables to seat every student, then students shuffled in at random.
pub fn build_randomized_chart(
    students: Vec<Uuid>,
    keep_existing_tables: bool,
    existing_tables: Vec<TableGeometry>,
    new_table_rows: i16,
    new_table_cols: i16,
) -> Vec<TableSchema> {
    let mut table_pool: Vec<TableSchema> = if keep_existing_tables {
        existing_tables
            .iter()
            .map(|t| empty_table(t.rows, t.cols, t.x_pos, t.y_pos))
            .collect()
    } else {
        Vec::new()
    };

    let kept_capacity: i64 = table_pool
        .iter()
        .map(|t| t.rows as i64 * t.cols as i64)
        .sum();

    let seats_per_new_table = new_table_rows as i64 * new_table_cols as i64;
    let deficit = students.len() as i64 - kept_capacity;
    let needed_new_tables = if deficit > 0 && seats_per_new_table > 0 {
        (deficit + seats_per_new_table - 1) / seats_per_new_table
    } else {
        0
    };

    let mut cursor: i32 = 0;
    for _ in 0..needed_new_tables {
        let candidate_size = table_pixel_size(new_table_rows, new_table_cols);
        let (x_pos, y_pos) = loop {
            let candidate_pos = table_grid_position(cursor);
            let collides = table_pool.iter().any(|t| {
                overlaps(
                    candidate_pos,
                    candidate_size,
                    (t.x_pos, t.y_pos),
                    table_pixel_size(t.rows, t.cols),
                )
            });
            if collides {
                cursor += 1;
            } else {
                break candidate_pos;
            }
        };
        cursor += 1;
        table_pool.push(empty_table(new_table_rows, new_table_cols, x_pos, y_pos));
    }

    let mut shuffled_students = students;
    shuffled_students.shuffle(&mut rand::rng());
    let mut shuffled_students = shuffled_students.into_iter();

    for table in table_pool.iter_mut() {
        for seat in table.seat_assignments.iter_mut() {
            *seat = shuffled_students.next();
        }
    }

    for (index, table) in table_pool.iter_mut().enumerate() {
        table.table_number = index as i32;
    }

    table_pool
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    fn students(n: usize) -> Vec<Uuid> {
        (0..n).map(|_| Uuid::new_v4()).collect()
    }

    fn geometry(tables: &[TableSchema]) -> Vec<(i16, i16, i32, i32)> {
        tables
            .iter()
            .map(|t| (t.rows, t.cols, t.x_pos, t.y_pos))
            .collect()
    }

    fn assigned_ids(tables: &[TableSchema]) -> Vec<Uuid> {
        tables
            .iter()
            .flat_map(|t| t.seat_assignments.iter().filter_map(|s| *s))
            .collect()
    }

    #[test]
    fn no_existing_tables_seats_every_student_exactly_once() {
        let roster = students(5);
        let tables = build_randomized_chart(roster.clone(), false, vec![], 2, 2);

        let capacity: usize = tables.iter().map(|t| t.seat_assignments.len()).sum();
        assert!(capacity >= roster.len());

        let assigned: HashSet<Uuid> = assigned_ids(&tables).into_iter().collect();
        assert_eq!(assigned, roster.into_iter().collect());
    }

    #[test]
    fn sufficient_kept_capacity_creates_no_new_tables() {
        let existing = vec![TableGeometry {
            rows: 2,
            cols: 2,
            x_pos: 40,
            y_pos: 40,
        }];
        let tables = build_randomized_chart(students(4), true, existing.clone(), 2, 2);

        assert_eq!(tables.len(), 1);
        assert_eq!(
            geometry(&tables),
            vec![(
                existing[0].rows,
                existing[0].cols,
                existing[0].x_pos,
                existing[0].y_pos
            )]
        );
    }

    #[test]
    fn insufficient_capacity_creates_expected_new_table_count_with_remainder() {
        // 9 students, 2x2 (4-seat) new tables, no kept capacity -> ceil(9/4) = 3, not 2.
        let tables = build_randomized_chart(students(9), false, vec![], 2, 2);
        assert_eq!(tables.len(), 3);
    }

    #[test]
    fn zero_students_creates_no_new_tables_and_leaves_kept_seats_empty() {
        let existing = vec![TableGeometry {
            rows: 2,
            cols: 2,
            x_pos: 40,
            y_pos: 40,
        }];
        let tables = build_randomized_chart(vec![], true, existing, 2, 2);

        assert_eq!(tables.len(), 1);
        assert!(tables[0].seat_assignments.iter().all(|s| s.is_none()));
    }

    #[test]
    fn keep_true_with_no_existing_tables_behaves_like_keep_false() {
        let with_keep = build_randomized_chart(students(5), true, vec![], 2, 2);
        let without_keep = build_randomized_chart(students(5), false, vec![], 2, 2);

        assert_eq!(geometry(&with_keep), geometry(&without_keep));
    }

    #[test]
    fn new_tables_avoid_overlapping_a_kept_table() {
        let existing = vec![TableGeometry {
            rows: 2,
            cols: 2,
            x_pos: 40,
            y_pos: 40,
        }];
        // Kept capacity 4, 5 students -> exactly one new 2x2 table needed.
        let tables = build_randomized_chart(students(5), true, existing, 2, 2);

        assert_eq!(tables.len(), 2);
        assert_ne!((tables[1].x_pos, tables[1].y_pos), (40, 40));
    }

    #[test]
    fn new_tables_avoid_overlapping_each_other_from_an_empty_pool() {
        // 3x3 tables (pixel size 297) are larger than TABLE_SPACING (260), so
        // the naive next grid slot would still overlap the first table.
        let tables = build_randomized_chart(students(10), false, vec![], 3, 3);

        assert_eq!(tables.len(), 2);
        let naive_next_slot = table_grid_position(1);
        assert_ne!((tables[1].x_pos, tables[1].y_pos), naive_next_slot);
    }

    #[test]
    fn no_duplicate_assignments_across_kept_and_new_tables() {
        let existing = vec![TableGeometry {
            rows: 2,
            cols: 2,
            x_pos: 40,
            y_pos: 40,
        }];
        let roster = students(10);
        let tables = build_randomized_chart(roster.clone(), true, existing, 2, 2);

        let assigned = assigned_ids(&tables);
        let unique: HashSet<Uuid> = assigned.iter().copied().collect();
        assert_eq!(assigned.len(), unique.len());
        assert_eq!(unique, roster.into_iter().collect());
    }
}
