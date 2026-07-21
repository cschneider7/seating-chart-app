# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A seating chart / classroom management app with two independent halves that run as separate processes:

- **Frontend** (repo root): React Router 8 (framework mode, SSR) + Tailwind CSS v4 + shadcn (`base-rhea` style, via `@base-ui/react`), served from `app/`.
- **Backend** (`class_management/`): Rust Axum API backed by Postgres via `sqlx`, serving JSON at `/api/v1/*` on port 3000. The Cargo workspace root is defined in the top-level `Cargo.toml` with `class_management` as its only member.

The frontend calls the backend directly over HTTP at hardcoded `http://localhost:3000` URLs, all funneled through `app/lib/api.ts` — there is no shared client/server code or generated API types between the two halves, so `app/lib/types.ts`/`app/lib/schemas.ts` (frontend) and `model.rs`/`schema.rs` (backend) must be kept in sync manually when the API shape changes.

## Commands

### Frontend (run from repo root)

```bash
npm run dev         # start Vite dev server with HMR at http://localhost:5173
npm run build       # production build -> build/client and build/server
npm run start       # serve the production build (react-router-serve)
npm run typecheck   # regenerate route types (react-router typegen) then run tsc
npm test            # run vitest (route loader/action + pure state-module unit tests, single run, no watch)
```

There is no lint script. Prettier is configured (`.prettierrc`: no semicolons, double quotes off/`singleQuote: false`, `prettier-plugin-tailwindcss` for class sorting) but not wired to an npm script — run `npx prettier --write .` directly if needed.

### Backend (run from `class_management/`, or use `cargo <cmd> -p class_management` from repo root)

```bash
cargo run                                  # start the API server on 0.0.0.0:3000
cargo test --all-features                  # run tests (matches CI)
cargo clippy -- -D warnings                # lint (matches CI, warnings fail the build)
cargo fmt                                  # format
cargo fmt --check                          # format check (matches CI)
```

The backend requires a running Postgres instance and a `DATABASE_URL` env var (loaded via `dotenv` from `.env`). `docker-compose.yaml` runs Postgres 18 using the same `.env` file. Migrations live in `migrations/*.sql` (plain `.up.sql`/`.down.sql` pairs, applied with the `sqlx` CLI, e.g. `sqlx migrate run`).

`sqlx::query_as!` macros are compile-time checked against the database (or against `.sqlx/` cached query metadata when `SQLX_OFFLINE=true`, which is how CI runs). **After changing any SQL in a handler, regenerate the cache** with `cargo sqlx prepare --workspace` (requires a live DB matching the migrations) so `.sqlx/*.json` stays in sync — otherwise `SQLX_OFFLINE` builds (CI) will fail even though local builds against a live DB succeed.

### Running a single Rust test

```bash
cargo test -p class_management <test_name>
```

## Architecture

### Backend (`class_management/src/`)

- `main.rs` — entry point; loads `.env`, builds a `PgPool` (max 10 connections), constructs `AppState { db }` wrapped in `Arc`, builds the router, and serves on `0.0.0.0:3000`.
- `routes.rs` — single `create_router` function wiring every `/api/v1/*` route to a handler. All routes take `Arc<AppState>` as shared state.
- `handlers/` — one file per resource (`classroom.rs`, `student.rs`), each generally exposing `{resource}_list_handler`, `get_{resource}_handler`, `create_{resource}_handler`, `update_{resource}_handler`, `delete_{resource}_handler`. This CRUD-per-file pattern is the template for a new resource, but it's a default, not a requirement — tables/seats have no per-resource CRUD or dedicated handler file at all; they're only ever read/written as a unit via the seating-chart endpoints in `classroom.rs` (see below). There is no `table.rs`/`seat.rs` handler file and no tables/seats REST endpoint.
- `model.rs` — `sqlx::FromRow` structs (`TableModel`, `SeatModel`) mapping directly to DB rows. Both are `#[allow(dead_code)]` — the actual handlers never deserialize into them; `get_seating_chart_handler`'s join query deserializes straight into `TableSchema` instead. These models mainly exist as a typed reference for the shape of each table (used by test helpers in `classroom.rs`'s test module via `RETURNING *`/`SELECT *`).
- `schema.rs` — separate `*Schema`/`Update*Schema` structs for request bodies (create takes required fields; update takes all-`Option` fields for partial updates, with a `deserialize_some` helper distinguishing "field omitted" from "field explicitly `null`" for nullable columns like `classroom_id`). `SeatingChartSchema`/`TableSchema` are the exception to the per-resource CRUD shape: they model the *entire* seating chart as one nested payload (`{ tables: [{ table_number, rows, cols, x_pos, y_pos, seat_assignments: [student_uuid | null, ...] }] }`), where a seat's position in the `seat_assignments` array *is* its `seat_number` column — there's no separate seat schema. `rows`/`cols` (each `CHECK`-constrained 1-15 in the DB) describe the table's seat grid shape; total seat count is `rows * cols`, and there's no separate `seat_count` column.
- Lookups by resource use the public-facing `uuid` (not the internal `id`/`i64` primary key) in URL paths, e.g. `/api/v1/students/{uuid}`. Update handlers fetch the existing row first, merge in any provided fields over the existing values, then issue the `UPDATE`.
- Every handler returns `Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)>` with an explicit `StatusCode` and a `{"data"|"message": ...}` envelope (no `"status"` field in the body — the HTTP status code carries that) — follow this shape for new handlers rather than introducing a new response convention.

### Seating chart persistence (`GET`/`PUT /api/v1/classrooms/{classroom_id}/seating-chart`)

Tables and seats are **not** individually addressable via REST — the entire chart is read/written as one document, matching how the frontend canvas treats it as a single piece of state:

- `PUT` (`update_seating_chart_handler`, `classroom.rs`) is a full replace inside one transaction: delete every `tables` row for the classroom (cascades to `seats`), then re-insert every table (assigning `table_number` from array index, storing the request's `rows`/`cols` as-is) and every seat (assigning `seat_number` from its index within that table's `seat_assignments` array, including empty seats as `NULL` `student_id` rows). There is no diffing — moving one table round-trips the whole chart. The handler is agnostic of how `seat_assignments`' flat index maps onto a `(row, col)` grid position — that row-major convention lives entirely on the frontend (see below).
- `GET` (`get_seating_chart_handler`) joins `tables`/`seats` and returns each table's `rows`, `cols`, `x_pos`, `y_pos`, and a dense `seat_assignments` array (`ARRAY_AGG` ordered by `seat_number`, one entry per seat including unoccupied ones as `null`), ordered by `table_number`.

### Database schema (`migrations/0001_create_tables.up.sql`)

Four tables: `classrooms`, `students`, `tables`, `seats`. Students optionally reference a `classroom_id`; seats belong to tables (`ON DELETE CASCADE`) and optionally reference a student (`ON DELETE SET NULL`, `UNIQUE` — a student can occupy at most one seat); tables belong to classrooms. `tables.x_pos`/`y_pos` are canvas coordinates (integers, one `GRID_STEP` unit apart); `tables.rows`/`cols` (each `SMALLINT`, `CHECK`-constrained to 1-15) describe the table's seat grid shape — there's no `seat_count` column, since total seats is always `rows * cols`; `seats.seat_number` is a seat's index within its table's `seat_assignments` array, not a coordinate.

### Frontend (`app/`)

- Routes are declared explicitly in `app/routes.ts` using `@react-router/dev/routes` helpers (`index`, `route`, `layout`, `prefix`) — this is the single source of truth for the route tree, not filesystem-based routing. When adding a page, add its entry here.
- Each route file under `app/routes/{students,classrooms}/` typically exports a `loader` (GET data, used by index/detail pages) and/or an `action` (form POST/DELETE mutations, used by create/delete pages), following React Router's data APIs.
- `app/lib/api.ts` holds typed fetch wrappers for every backend call (`getStudent(s)`, `create/update/deleteStudent`, `getClassroom(s)`, `create/update/deleteClassroom`, `getClassroomSeatingChart`, `updateClassroomSeatingChart`) — all routes go through it; there are no inline `fetch("http://localhost:3000/...")` calls left in route files, and there is no tables/seats-specific fetch wrapper since those aren't separately addressable (see Backend section above). Extend `api.ts` rather than adding an inline fetch.
- `app/lib/schemas.ts` defines zod schemas per resource (`Create*Schema`/`Update*Schema`, plus `SeatingChartSchema`) used both for frontend form validation and as the `z.infer<...>` types passed to `api.ts`'s mutation functions.
- `app/lib/types.ts` defines frontend-side `Student`/`Classroom`/`Table`/`Seat` types independently from the Rust models/schemas (see note in Project overview above about keeping these in sync); `Table` is only actually consumed via `createCanvasTable`'s return value (see below), not threaded further into the canvas itself.
- UI components in `app/components/ui/` are shadcn-generated (style `base-rhea`, Tailwind v4, path aliases configured in `components.json` — `~/components`, `~/lib`, `~/hooks`, etc., matching the `~/*` → `./app/*` tsconfig path). Use the shadcn CLI conventions (Base UI primitives via `render` prop, e.g. `<Button render={<Link .../>} />`) rather than hand-rolling new primitives. `app/components/base-node.tsx`, `base-handle.tsx`, and `labeled-handle.tsx` are the analogous scaffold for the React Flow canvas (from the React Flow component registry, not shadcn) — leave these alone the same way you would shadcn output, even if a given prop/export looks unused.
- `app/root.tsx` defines the document `Layout`, a `HydrateFallback` spinner, and a top-level `ErrorBoundary`; theme is currently hardcoded to `"light"` even though a `ThemeProvider`/`theme-toggle` exist. The root layout (`App`) is a `h-dvh overflow-hidden` flex column (nav `shrink-0`, routed content `flex-1 min-h-0`) so that pages needing full-height layout (like the seating chart) can stretch to the bottom of the window without producing a page-level scrollbar — extend that `flex-1 min-h-0` chain (it must be unbroken at every nesting level, since a flex item's default `min-height: auto` otherwise lets its content force it taller than available space) rather than introducing a second height strategy.
- The classroom detail page (`app/routes/classrooms/classroom.tsx`) implements an interactive seating chart on **React Flow** (`@xyflow/react`). Tables, seats, and students are all React Flow nodes (`type: "table" | "seat" | "student"`, see `nodeTypes` in `app/components/seating-chart-canvas.tsx`, rendered by `app/components/nodes/table-node.tsx` / `seat-node.tsx` / `student-node.tsx`); there are no `Edge`s at all. A seat assignment is modeled purely by a student node's `parentId` pointing at a seat node's id (`parentId` unset means the student is unassigned/floating on the canvas); a seat node is itself parented to its table via its own `parentId`. `useNodesState` (React Flow's own hook, driving `onNodesChange`) holds canvas state directly (no reducer, no separate edges state); the `loader` builds the initial nodes once via `buildInitialNodes` (memoized with an empty dep array — deliberately not reactive to `loaderData` changes after mount), and `Save` calls `buildSeatingChartPayload` to convert nodes back into a `SeatingChartSchema` payload and submits it via `useFetcher`.
- Each table has a `rows`/`cols` grid shape (`TableNodeData`, capped at `MAX_TABLE_DIMENSION` each) rather than a fixed seat count; a seat's identity is its `(row, col)` coordinate (`SeatNodeData`, seat id from `getSeatId(tableId, row, col)`), not a flat index — growing/shrinking one dimension only adds/removes the seats on that outer edge, so existing occupants never get reshuffled. `getSeatPosition(row, col)` and `getTableNodeSize(rows, cols)` derive pixel position/size from a fixed per-seat cell size, so a table grows physically bigger as rows/cols increase rather than shrinking its seats to fit. `TableNode` renders a `NodeToolbar` with row/column +/- steppers and the table's delete button, relying on `NodeToolbar`'s own default visibility (shown only when its node is selected) rather than a manual `isVisible` check — this is safe because `elementsSelectable={!locked}` (`seating-chart-canvas.tsx`) already prevents selecting a node while the chart is locked, and both `Save`/`Cancel` explicitly clear selection before re-locking. All the toolbar's handlers mutate canvas state via `useReactFlow().setNodes()` directly from within the node component — this is the pattern to follow for any other per-node action button, rather than threading callbacks through props.
- All of this pure, framework-free geometry/id logic (constants like `GRID_STEP`/`SEAT_NODE_SIZE`/`MAX_TABLE_DIMENSION`, node shape types, `buildInitialNodes`, `buildSeatingChartPayload`, `getSeatPosition`/`getTableNodeSize`, seat-id helpers) lives in `app/lib/seating-chart-utils.ts`, tested directly in `app/lib/seating-chart-utils.test.ts` — this is the template for any other local, non-persisted-shape UI logic: keep it out of components and out of `api.ts`/`types.ts` (which model actual API-backed shapes).
- Drag/drop uses React Flow's `getIntersectingNodes` for exact overlap hit-testing (not a distance/proximity threshold): dragging a student node over an unoccupied seat highlights it (`highlight`/`highlight-rejected` className depending on whether the seat is already occupied) and drops it onto that seat on drag-stop by setting `parentId`; dragging a seated student off any seat clears its `parentId` back to `undefined`, positioning it at its last absolute canvas position via `getInternalNode`. The roster panel's unassigned students use native HTML5 drag-and-drop (`draggable`, `onDragStart`/`onDrop`, a custom `application/x-student-id` `dataTransfer` type) to drop new students onto the canvas, landing on a seat if dropped on one or floating freely otherwise.

## Testing

### Backend (`class_management/src/handlers/*.rs`)

- Tests are colocated `#[cfg(test)] mod tests` blocks at the bottom of each handler file. There is no `lib.rs` (binary-only crate), so tests live inside the crate rather than in a separate `class_management/tests/` integration-test target — that's what lets them see private items like `AppState.db`.
- Each test uses `#[sqlx::test(migrations = "../migrations")]` for an isolated, freshly-migrated database, and drives the real `Router` (from `routes::create_router`) via `tower::ServiceExt::oneshot`. Dev-dependencies: `tower` (`util` feature) and `http-body-util`; `sqlx::test` needs no extra sqlx feature beyond the already-default `macros` feature.
- Migrations live at the repo root, not `class_management/migrations/` — every `#[sqlx::test]` must pass `migrations = "../migrations"` explicitly or it silently can't find the tables.
- Running tests needs a live Postgres reachable via `DATABASE_URL` (the local `docker-compose.yaml` instance works); `SQLX_OFFLINE` only affects compile-time macro checking, not what `#[sqlx::test]` needs at runtime.
- If you add a new `sqlx::query!`/`query_as!` call inside a test, regenerate the cache with `cargo sqlx prepare --workspace -- --tests` — the trailing `-- --tests` is required, or test-only queries are silently dropped from `.sqlx/` and `SQLX_OFFLINE` CI builds break. The local `.git/hooks/pre-commit` (not tracked in the repo) runs this same command before every commit.

### Frontend (`app/routes/**/*.test.ts`)

- Vitest, configured via a dedicated `vitest.config.ts` at the repo root rather than extending `vite.config.ts` (whose `reactRouter()` plugin does SSR/route-manifest work that isn't needed for plain function tests), plus `vite-tsconfig-paths` for the `~/*` alias.
- Scope is route loader/action logic and colocated pure state modules — not component rendering — no `@testing-library/react`, `jsdom`, or MSW (`vitest.config.ts` uses `environment: "node"`). Route tests call the exported `action`/`loader` functions directly with a constructed `Request`/`params`, mocking `fetch` via `vi.stubGlobal("fetch", vi.fn())` and resolving real `Response` objects (matches `api.ts`'s `response.ok`/`.json()` usage); for a `loader` made of parallel fetches (e.g. `Promise.all([...])`), `mockResolvedValueOnce` calls queue in *call order*, which is deterministic even though the underlying promises resolve out of order.
- Non-route pure-logic modules (e.g. `seating-chart-utils.ts`'s node/geometry helpers) are tested directly as plain functions — no fetch mocking or route-args scaffolding needed, just call them.
- Colocated as `*.test.ts` next to the file under test, e.g. `app/routes/students/create-student.test.ts` (action), `app/routes/classrooms/classroom.test.ts` (loader), `app/lib/seating-chart-utils.test.ts` (pure geometry/node-building helpers).

## CI (`.github/workflows/`)

- `node.js.yml`: `npm ci` + `npm run build --if-present` + `npm test`, on Node 22.x and 26.x.
- `rust.yml`: two jobs. `test` spins up a `postgres:18` service (with `DATABASE_URL` pointed at it) and runs `cargo test --all-features` under workflow-level `SQLX_OFFLINE=true` — compilation checks queries against `.sqlx/`, then `#[sqlx::test]` uses the live service DB at runtime. `formatting` runs `cargo fmt --check` and `cargo clippy -- -D warnings`. Any handler SQL change (production or test-only) must have matching `.sqlx/` cache files committed (see Testing section above) or the `test` job's compile step fails independently of local runs.
