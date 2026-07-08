# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A seating chart / classroom management app with two independent halves that run as separate processes:

- **Frontend** (repo root): React Router 8 (framework mode, SSR) + Tailwind CSS v4 + shadcn (`base-rhea` style, via `@base-ui/react`), served from `app/`.
- **Backend** (`class_management/`): Rust Axum API backed by Postgres via `sqlx`, serving JSON at `/api/v1/*` on port 3000. The Cargo workspace root is defined in the top-level `Cargo.toml` with `class_management` as its only member.

The frontend calls the backend directly over HTTP at hardcoded `http://localhost:3000` URLs (see "Known inconsistencies" below) — there is no shared client/server code or generated API types between the two halves.

## Commands

### Frontend (run from repo root)

```bash
npm run dev         # start Vite dev server with HMR at http://localhost:5173
npm run build       # production build -> build/client and build/server
npm run start       # serve the production build (react-router-serve)
npm run typecheck   # regenerate route types (react-router typegen) then run tsc
npm test            # run vitest (loader/action unit tests, single run, no watch)
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
- `handlers/` — one file per resource (`classroom.rs`, `student.rs`), each exposing `{resource}_list_handler`, `get_{resource}_handler`, `create_{resource}_handler`, `update_{resource}_handler`, `delete_{resource}_handler`. This CRUD-per-file pattern is the template to follow when adding a new resource (e.g. tables/seats, whose models and schemas already exist but have no handlers/routes yet — see `model.rs`/`schema.rs` `#[allow(dead_code)]` structs).
- `model.rs` — `sqlx::FromRow` structs mapping directly to DB rows (returned as-is in JSON responses).
- `schema.rs` — separate `*Schema`/`Update*Schema` structs for request bodies (create takes required fields; update takes all-`Option` fields for partial updates).
- Lookups by resource use the public-facing `uuid` (not the internal `id`/`i64` primary key) in URL paths, e.g. `/api/v1/students/{uuid}`. Update handlers fetch the existing row first, merge in any provided fields over the existing values, then issue the `UPDATE`.
- Every handler returns `Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)>` with an explicit `StatusCode` and a `{"data"|"message": ...}` envelope (no `"status"` field in the body — the HTTP status code carries that) — follow this shape for new handlers rather than introducing a new response convention.

### Database schema (`migrations/0001_create_tables.up.sql`)

Four tables: `classrooms`, `students`, `tables`, `seats`. Students optionally reference a `classroom_id` and `seat_id`; seats belong to tables; tables belong to classrooms. Only `classrooms` and `students` currently have API handlers/routes — `tables`/`seats` are modeled in Rust but not yet wired up.

### Frontend (`app/`)

- Routes are declared explicitly in `app/routes.ts` using `@react-router/dev/routes` helpers (`index`, `route`, `layout`, `prefix`) — this is the single source of truth for the route tree, not filesystem-based routing. When adding a page, add its entry here.
- Each route file under `app/routes/{students,classrooms}/` typically exports a `loader` (GET data, used by index/detail pages) and/or an `action` (form POST/DELETE mutations, used by create/delete pages), following React Router's data APIs.
- `app/lib/db.ts` holds typed fetch wrappers (`getStudent`, `getStudents`, `createStudent`, `getClassroom`, `getClassrooms`) used by loaders — but **not all API calls go through it**: several route `action`s (e.g. `create-classroom.tsx`, `delete-classroom.tsx`) call `fetch("http://localhost:3000/api/v1/...")` inline instead. When adding new mutations, prefer extending `db.ts` for consistency rather than adding another inline fetch.
- `app/lib/types.ts` defines frontend-side `Student`/`Classroom` types independently from the Rust models/schemas — keep them in sync manually when the API shape changes.
- UI components in `app/components/ui/` are shadcn-generated (style `base-rhea`, Tailwind v4, path aliases configured in `components.json` — `~/components`, `~/lib`, `~/hooks`, etc., matching the `~/*` → `./app/*` tsconfig path). Use the shadcn CLI conventions (Base UI primitives via `render` prop, e.g. `<Button render={<Link .../>} />`) rather than hand-rolling new primitives.
- `app/root.tsx` defines the document `Layout`, a `HydrateFallback` spinner, and a top-level `ErrorBoundary`; theme is currently hardcoded to `"light"` even though a `ThemeProvider`/`theme-toggle` exist.

## Testing

### Backend (`class_management/src/handlers/*.rs`)

- Tests are colocated `#[cfg(test)] mod tests` blocks at the bottom of each handler file. There is no `lib.rs` (binary-only crate), so tests live inside the crate rather than in a separate `class_management/tests/` integration-test target — that's what lets them see private items like `AppState.db`.
- Each test uses `#[sqlx::test(migrations = "../migrations")]` for an isolated, freshly-migrated database, and drives the real `Router` (from `routes::create_router`) via `tower::ServiceExt::oneshot`. Dev-dependencies: `tower` (`util` feature) and `http-body-util`; `sqlx::test` needs no extra sqlx feature beyond the already-default `macros` feature.
- Migrations live at the repo root, not `class_management/migrations/` — every `#[sqlx::test]` must pass `migrations = "../migrations"` explicitly or it silently can't find the tables.
- Running tests needs a live Postgres reachable via `DATABASE_URL` (the local `docker-compose.yaml` instance works); `SQLX_OFFLINE` only affects compile-time macro checking, not what `#[sqlx::test]` needs at runtime.
- If you add a new `sqlx::query!`/`query_as!` call inside a test, regenerate the cache with `cargo sqlx prepare --workspace -- --tests` — the trailing `-- --tests` is required, or test-only queries are silently dropped from `.sqlx/` and `SQLX_OFFLINE` CI builds break. The local `.git/hooks/pre-commit` (not tracked in the repo) runs this same command before every commit.

### Frontend (`app/routes/**/*.test.ts`)

- Vitest, configured via a dedicated `vitest.config.ts` at the repo root rather than extending `vite.config.ts` (whose `reactRouter()` plugin does SSR/route-manifest work that isn't needed for plain function tests), plus `vite-tsconfig-paths` for the `~/*` alias.
- Scope is loader/action logic only, not component rendering — no `@testing-library/react`, `jsdom`, or MSW. Tests call the exported `action`/`loader` functions directly with a constructed `Request`/`params`, mocking `fetch` via `vi.stubGlobal("fetch", vi.fn())` and resolving real `Response` objects (matches `db.ts`'s `response.ok`/`.json()` usage).
- Colocated as `*.test.ts` next to each route file, e.g. `app/routes/students/create-student.test.ts`.

## CI (`.github/workflows/`)

- `node.js.yml`: `npm ci` + `npm run build --if-present` + `npm test`, on Node 22.x and 26.x.
- `rust.yml`: two jobs. `test` spins up a `postgres:18` service (with `DATABASE_URL` pointed at it) and runs `cargo test --all-features` under workflow-level `SQLX_OFFLINE=true` — compilation checks queries against `.sqlx/`, then `#[sqlx::test]` uses the live service DB at runtime. `formatting` runs `cargo fmt --check` and `cargo clippy -- -D warnings`. Any handler SQL change (production or test-only) must have matching `.sqlx/` cache files committed (see Testing section above) or the `test` job's compile step fails independently of local runs.
