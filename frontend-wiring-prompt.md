# Wire the Taskflow frontend to the real backend (REST + WebSocket)

This is the final integration step: replace every mock-data function in `src/services/` with real calls to the live Spring Boot API, and wire in the STOMP WebSocket layer. This document supersedes any earlier wiring prompt — endpoint paths, controller behavior, and the WebSocket event list below were extracted directly from the actual backend source (controllers, services, security config), not inferred, so treat this as ground truth over anything discussed previously.

---

## 0. Read this before touching any code — real backend gaps you must design around

These are not hypothetical edge cases. They are confirmed by reading the backend source, and each one will actively break the integration if ignored.

### 0.1 — CORS is now configured (resolved). Frontend origin must match exactly.
`SecurityConfig` now has a `corsConfigurationSource()` bean allowing `http://localhost:3000` with `allowCredentials(true)`, and `WebSocketConfig`'s STOMP endpoint is scoped to the same origin (`setAllowedOrigins("http://localhost:3000")`). This is no longer a blocker — but it does mean the frontend must be served from exactly `http://localhost:3000` in local dev (not `127.0.0.1:3000`, not a different port) or the browser will reject requests regardless of anything the frontend code does. Because `allowCredentials(true)` is set, every call to `/auth/*` endpoints still needs `credentials: 'include'` (fetch) / `withCredentials: true` (axios) on the frontend side — the backend allowing credentials doesn't make the frontend send them automatically.
**When deploying to production, both `SecurityConfig.corsConfigurationSource()` and `WebSocketConfig.registerStompEndpoints()` need the production frontend URL added to their allowed-origins lists — this is a backend-side change, not something the frontend deployment can work around.**

### 0.2 — `UserDto` (returned on login/register/refresh) has no `id` field. This is intentional, not a gap.
```java
public class UserDto {
    private String fullName;
    private String email;
    private String avatarUrl;
}
```
`UserDto` is only ever used in the auth response (register/login/refresh) and is never mapped or compared against anything else in the app — so it has no need to carry an ID. If the frontend ever does need the current user's ID (e.g. to compare against `TaskDto.assigneeId` or `CommentDto.authorId`), the access token's JWT payload has a `sub` claim containing it as a string (confirmed in `JwtService.getSubject`). Decode the access token client-side (base64-decode the middle segment of the JWT — no verification needed, this is just for reading a claim, not trusting it for security) rather than expecting `UserDto` to supply it.

### 0.3 — `PUT /tasks/{id}/labels` is a bulk replace, not an additive "add this label" call.
```java
task.getLabels().clear();
task.getLabels().addAll(labels);
```
Tasks and labels are a genuine many-to-many relationship, but this endpoint does not add one label to whatever a task already has — it **wipes the task's entire label set and replaces it with exactly the IDs you send**. This has a real frontend implication: the label picker here does **add and remove** as two separate UI actions (not a toggle) — but regardless of which action the user takes, either one still needs to read the task's *current* full label list (already available on `TaskDto.labels`), compute the new desired full set (existing labels plus the one being added, or minus the one being removed), and send that complete set on every call. Sending just the added/removed label alone will silently wipe every other label not included. This applies identically to `TASK_LABELS_CHANGED`'s WebSocket payload below — it's always the full new set, never a delta.

### 0.4 — `TASK_LABELS_CHANGED` WebSocket event now carries `taskId` (fixed backend-side).
The payload was originally just `LabelDto[]` with no way to identify which task it belonged to — this has been fixed. It's now a dedicated DTO:
```java
public record TaskLabelsChangedPayload(UUID taskId, List<LabelDto> labels) {}
```
Dispatch this the same way as `TASK_CREATED`/`TASK_UPDATED` — match on `payload.taskId` and replace that task's label array with `payload.labels` (remembering, per §0.3, that `labels` is always the complete new set, not a delta).

### 0.5 — Two different error response shapes exist. Don't assume `ProblemDetail` everywhere.
- **Bean validation failures** (`@Valid` rejecting a request body — missing required field, string too long, bad pattern, etc.) return **`400`** with a **flat JSON object of `fieldName -> errorMessage`**, e.g.:
  ```json
  { "name": "Board name is required", "taskPrefix": "Task prefix must be 2-6 uppercase letters" }
  ```
- **Every other backend error** (not found, forbidden, conflict, etc. — thrown as custom exceptions and caught by `GlobalExceptionHandler`) returns Spring's **`ProblemDetail`** shape:
  ```json
  { "type": "about:blank", "title": "Not Found", "status": 404, "detail": "...", "instance": "/boards/..." }
  ```
Your error-handling wrapper needs to branch on which shape it received (a quick heuristic: `ProblemDetail` responses always have a `status` and `detail` key; validation errors are a flat map with no such keys) rather than assuming one consistent error format across all endpoints.

---

## 1. Ground rules

- The `services/` abstraction already exists for exactly this purpose. Don't restructure components — every screen already calls functions like `getBoards()`, `createTask()`, etc. Only the implementation inside each service file changes, from returning mock data to making a real `fetch`/axios call.
- If any component is found calling `mock-data.ts` directly rather than going through a service function, fix that first.
- **Base URL**: read from an environment variable (`NEXT_PUBLIC_API_URL` or similar), not hardcoded — default to `http://localhost:8080` for local dev.
- Remove `mock-data.ts` entirely once every service function is wired to real calls — don't leave it half-used as a fallback.
- **Controller method/Java naming does not matter to you** — only the HTTP method + path + request/response shape matters, and those are all given explicitly below, copied directly from the actual `@RequestMapping`/`@GetMapping`/etc. annotations in the source. Do not guess or infer a path from a similarly-named one elsewhere in this document; each is listed exactly as it appears in the code.

## 2. Auth mechanics — exact, not approximate

- **Access token**: returned in the JSON response body on `register`/`login`/`refresh` as `accessToken` (string). Store it in memory (React context or state manager), **not** `localStorage`.
- **Every authenticated request** must include `Authorization: Bearer <accessToken>` — centralize this in a shared fetch wrapper.
- **Refresh token**: never appears in any JSON body. It is set by the backend as an `HttpOnly` cookie named exactly `refreshToken`, scoped to path `/auth` (so the browser only sends it automatically on requests under `/auth/*`, not on every request). Because of this cookie scoping:
  - Every `fetch`/axios call to `/auth/*` endpoints must include `credentials: 'include'` (fetch) or `withCredentials: true` (axios) for the browser to send/receive this cookie. Non-auth API calls do not need this, since the cookie is never sent to them anyway (path-scoped to `/auth`).
- **401 handling**: build a single interceptor/wrapper that, on receiving a `401`, calls `POST /auth/refresh` once (no body needed — the refresh token comes from the cookie automatically), and if that succeeds, retries the original request with the new access token from the response. If refresh also fails, log the user out and redirect to login.
- **`POST /auth/change-password` revokes every refresh token for that user, including the current session's**, and the backend clears the refresh cookie as part of the response. Treat a successful change-password call as an automatic logout — clear local auth state and redirect to login immediately after, don't expect the current session to keep working.
- Field names for auth request bodies (validated with Bean Validation — see §0.4 for what a validation failure looks like):
  - `RegisterRequest`: `{ fullName, email, password }` — password must be 6–25 chars.
  - `LoginRequest`: `{ email, password }`.
  - `ChangePasswordRequest`: `{ oldPassword, newPassword }` — newPassword must be 6–25 chars.

## 3. REST endpoints — exact paths, verbatim from the controllers

Every path below is copied exactly from the `@RequestMapping`/`@GetMapping`/`@PostMapping`/etc. annotations. Where a controller has a class-level `@RequestMapping`, it's folded into the full path shown.

### Auth (no `Authorization` header required on these four; all require `credentials: include` for the cookie)
| Method | Path | Request body | Response |
|---|---|---|---|
| POST | `/auth/register` | `RegisterRequest` | `201` `AuthResponse { accessToken, user: UserDto }` + sets refresh cookie |
| POST | `/auth/login` | `LoginRequest` | `200` `AuthResponse` + sets refresh cookie |
| POST | `/auth/refresh` | — (refresh token from cookie) | `200` `AuthResponse` + rotates refresh cookie |
| POST | `/auth/logout` | — (refresh token from cookie) | `204` + clears refresh cookie |
| POST | `/auth/change-password` | `ChangePasswordRequest` | `204` + clears refresh cookie (see §2) — **requires** `Authorization` header |

### Boards
| Method | Path | Notes |
|---|---|---|
| POST | `/boards` | body: `CreateBoardRequest { name, description?, accentColor, taskPrefix }` (taskPrefix: 2–6 uppercase letters) → `201 BoardDto` |
| GET | `/boards` | → `200 BoardDto[]` (all boards for current user) |
| GET | `/boards/{id}` | → `200 BoardDto` |
| PATCH | `/boards/{id}` | body: `UpdateBoardRequest { name?, description?, accentColor?, taskPrefix? }` — **all fields optional; only send what changed, this is a partial update** → `200 BoardDto` |
| DELETE | `/boards/{id}` | → `204` |

### Board membership (all under `/boards`)
| Method | Path | Notes |
|---|---|---|
| GET | `/boards/{id}/members` | → `200 BoardMemberDto[]` |
| GET | `/boards/{id}/invites/pending` | → `200 BoardInviteDto[]` |
| POST | `/boards/{id}/invites` | body: `InviteMemberRequest { email, role }` → `200 BoardInviteDto` |
| POST | `/boards/invites/{id}/accept` | (`{id}` = invite ID) → `200 BoardMemberDto` |
| POST | `/boards/invites/{id}/decline` | → `204` |
| DELETE | `/boards/invites/{id}` | revoke an invite → `204` |
| PATCH | `/boards/{boardId}/members/{userId}` | body: `UpdateMemberRoleRequest { role }` → `200 BoardMemberDto` |
| DELETE | `/boards/{boardId}/members/{userId}` | → `204` |
| DELETE | `/boards/{id}/leave` | current user leaves the board → `204` (note: returns `204`, not `200 BoardMemberDto` despite the method's declared return type) |

### Task lists
| Method | Path | Notes |
|---|---|---|
| POST | `/boards/{id}/lists` | body: `CreateTaskListRequest { title }` → `200 TaskListDto` |
| GET | `/boards/{id}/lists` | → `200 TaskListDto[]` |
| PATCH | `/lists/{id}` | body: `UpdateTaskListRequest { title? }` → `200 TaskListDto` |
| DELETE | `/lists/{id}` | → `204` |
| PATCH | `/lists/{id}/reorder` | body: `ReorderTaskListRequest { position }` (required, Double) → `200 TaskListDto` |

### Tasks
| Method | Path | Notes |
|---|---|---|
| POST | `/lists/{id}/tasks` | (`{id}` = task list ID — **note this is not under `/boards`**) body: `CreateTaskRequest { title, description?, dueDate?, priority?, assigneeId? }` → `200 TaskDto` |
| GET | `/tasks/{id}` | → `200 TaskDto` |
| GET | `/boards/{id}/tasks` | paginated (see §5) → `200 Page<TaskDto>` |
| GET | `/lists/{id}/tasks` | (`{id}` = task list ID) not paginated → `200 TaskDto[]` |
| PATCH | `/tasks/{id}` | body: `UpdateTaskRequest { title?, description?, dueDate?, priority?, assigneeId? }` → `200 TaskDto` |
| DELETE | `/tasks/{id}` | → `204` |
| PATCH | `/tasks/{id}/move` | body: `MoveTaskRequest { taskListId, position }` (both required) → `200 TaskDto` |

`TaskDto` includes a `labels: LabelDto[]` field directly — no separate per-task labels call needed for display.

### Labels
| Method | Path | Notes |
|---|---|---|
| POST | `/boards/{id}/labels` | body: `CreateLabelRequest { name, color }` → `200 LabelDto` |
| GET | `/boards/{id}/labels` | → `200 LabelDto[]` |
| PATCH | `/labels/{id}` | body: `UpdateLabelRequest { name?, color? }` → `200 LabelDto` |
| DELETE | `/labels/{id}` | → `204` |
| PUT | `/tasks/{id}/labels` | body: `AssignLabelsRequest { labelIds: UUID[] }` — **full replace, send the complete desired set every time, not incremental** → `204` |

### Comments
| Method | Path | Notes |
|---|---|---|
| POST | `/tasks/{id}/comments` | body: `CreateCommentRequest { content }` → `200 CommentDto` |
| GET | `/tasks/{id}/comments` | → `200 CommentDto[]` |
| PATCH | `/comments/{id}` | body: `UpdateCommentRequest { content }` → `200 CommentDto` |
| DELETE | `/comments/{id}` | → `204` |

### Attachments
| Method | Path | Notes |
|---|---|---|
| POST | `/tasks/{id}/attachments` | multipart form data, field name `file` → `200 AttachmentDto` |
| GET | `/tasks/{id}/attachments` | → `200 AttachmentDto[]` |
| GET | `/attachments/{id}/download` | returns raw bytes with `Content-Disposition: attachment; filename="..."` — trigger a browser download, don't parse as JSON |
| DELETE | `/attachments/{id}` | → `204` |

### Activity log
| Method | Path | Notes |
|---|---|---|
| GET | `/boards/{id}/activity` | paginated (see §5) → `200 Page<ActivityLogDto>` |
| GET | `/tasks/{id}/activity` | not paginated → `200 ActivityLogDto[]` |

### Notifications (all under `/notifications`)
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | paginated (see §5) → `200 Page<NotificationDto>` |
| PATCH | `/notifications/{id}/read` | → `204` |
| PATCH | `/notifications/read-all` | → `204` |
| GET | `/notifications/unread-count` | → `200` (raw number, `Long`, not wrapped in an object) |
| DELETE | `/notifications/clear-all` | → `204` |

## 4. Response DTO field reference

Use these exact field names when typing your API responses — several have non-obvious shapes:

```ts
BoardDto: { id, name, description, accentColor, ownerId, createdAt, updatedAt }
BoardMemberDto: { id, userId, userFullName, userEmail, role, joinedAt }  // role is an enum string: OWNER | ADMIN | MEMBER | VIEWER (4 roles — confirm exact casing/values with backend)
BoardInviteDto: { id, boardId, email, role, status, createdAt }          // role/status are plain strings here, not enums
TaskListDto: { id, boardId, title, position, createdAt, updatedAt }
TaskDto: { id, boardId, taskListId, shortCode, title, description, position, priority, dueDate, assigneeId, createdBy, labels: LabelDto[], createdAt, updatedAt }
LabelDto: { id, boardId, name, color }
CommentDto: { id, taskId, authorId, authorFullName, content, createdAt, updatedAt }
AttachmentDto: { id, taskId, uploadedBy, fileName, contentType, fileSizeBytes, createdAt }
ActivityLogDto: { id, boardId, taskId, actorId, actorFullName, actionType, metadata: Record<string, unknown>, createdAt }
NotificationDto: { id, recipientId, type, payload: Record<string, unknown>, isRead, createdAt }
UserDto: { fullName, email, avatarUrl }   // NO id — see §0.2
```

`metadata`/`payload` on `ActivityLogDto`/`NotificationDto` are free-form JSON objects whose keys vary by `actionType`/`type` — don't assume a fixed shape, render defensively (e.g. a generic key/value fallback for unrecognized action types).

## 5. Pagination

Paginated endpoints (`GET /boards/{id}/tasks`, `GET /boards/{id}/activity`, `GET /notifications`) use standard Spring `Pageable` binding via query params: `?page=0&size=20&sort=createdAt,desc`. The response is a Spring `Page<T>` object:
```ts
{ content: T[], totalElements, totalPages, number /* current page, 0-indexed */, size, ... }
```
Wire pagination controls to `page`/`size` query params if the UI has them; otherwise default to a large `size` (e.g. `size=200`) to approximate "fetch everything" without building pagination UI.

**Notifications specifically use a "load more" pattern, not numbered-page navigation** — the UI shows an initial batch and a "see previous notifications" button to fetch older ones, rather than page-number links. Wire this as: fetch `page=0` on initial load, append (not replace) the results of `page=1`, `page=2`, etc. to the existing in-memory list each time the button is clicked, and use the response's `totalPages`/`number` fields to know when to hide the button (i.e. `number + 1 >= totalPages`, no more pages left). Don't reset the list on each load — this is an accumulating list, not a page-replace.

## 6. WebSocket layer (STOMP)

### Connection
- Endpoint: `ws://localhost:8080/ws` (or `wss://` in production) — **not SockJS**, connect directly.
- Library: `@stomp/stompjs`.
- **Critical — authentication is not automatic.** The backend's `WebSocketAuthInterceptor` reads an `Authorization` header **on the STOMP CONNECT frame itself**, not from any cookie or the HTTP upgrade request. You must pass it via `connectHeaders` when constructing the STOMP client:
  ```ts
  const client = new Client({
    brokerURL: `${WS_BASE_URL}/ws`,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 5000,
  });
  ```
  If the access token refreshes while a WebSocket connection is open, the existing connection keeps whatever token it connected with — the backend does not re-validate mid-connection. Plan to reconnect the STOMP client (deactivate + reactivate with the new token in `connectHeaders`) whenever the access token is refreshed, not just on network drops.

### Lifecycle
- Activate the client and subscribe to `/topic/boards/{boardId}` when a user opens a specific board's page — not globally on app load.
- Unsubscribe (and deactivate, or just unsubscribe if reused across boards) when the user navigates away.
- On reconnect (network drop, tab wake), re-subscribe to whatever board is currently open in the `onConnect` callback each time — `reconnectDelay` handles the reconnect itself, but the subscription must be re-established manually each time `onConnect` fires.

### Message envelope
Every message: `{ "eventType": string, "payload": ... }`. Build a single dispatcher keyed on `eventType`, with a default case that **ignores unrecognized types silently** (no throw, no console.error) — the backend will keep adding event types over time.

### Complete event list — all 23, from the actual service code (not a partial list)

| eventType | payload shape | fires from |
|---|---|---|
| `TASK_CREATED` | `TaskDto` | creating a task |
| `TASK_UPDATED` | `TaskDto` | editing a task's fields |
| `TASK_DELETED` | `TaskDto` (the deleted task, pre-deletion state) | deleting a task |
| `TASK_MOVED` | `TaskDto` | moving a task between/within lists |
| `LIST_CREATED` | `TaskListDto` | creating a list |
| `LIST_RENAMED` | `TaskListDto` | renaming a list |
| `LIST_DELETED` | `TaskListDto` | deleting a list |
| `LIST_REORDERED` | `TaskListDto` | reordering a list's position |
| `COMMENT_ADDED` | `CommentDto` | adding a comment |
| `COMMENT_UPDATED` | `CommentDto` | editing a comment |
| `COMMENT_DELETED` | `CommentDto` (pre-deletion state) | deleting a comment |
| `LABEL_CREATED` | `LabelDto` | creating a board label |
| `LABEL_UPDATED` | `LabelDto` | editing a label |
| `LABEL_DELETED` | `LabelDto` | deleting a label |
| `TASK_LABELS_CHANGED` | `TaskLabelsChangedPayload { taskId, labels: LabelDto[] }` — **`labels` is always the complete new set for that task, never a delta, see §0.3** | replacing a task's label set |
| `MEMBER_INVITED` | `BoardInviteDto` | inviting someone to the board |
| `MEMBER_ADDED` | `BoardMemberDto` | an invite is accepted |
| `MEMBER_ROLE_CHANGED` | `BoardMemberDto` | changing a member's role |
| `MEMBER_REMOVED` | `BoardMemberDto` | removing a member, or a member leaving |
| `BOARD_UPDATED` | `BoardDto` | editing board settings |
| `BOARD_DELETED` | `BoardDto` | deleting the board |
| `ATTACHMENT_ADDED` | `AttachmentDto` | uploading an attachment |
| `ATTACHMENT_REMOVED` | `AttachmentDto` | deleting an attachment |

### Specific UI behaviors worth calling out
- **`MEMBER_ROLE_CHANGED` affecting the current user**: if `payload.userId` matches the logged-in user's own ID (see §0.2 for how to get it), update their local permission state immediately — buttons/actions gated by role should appear/disappear live, not just after a refresh. There are **4 roles** (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) — make sure the frontend's role-permission logic (`ROLE_PERMISSIONS` or equivalent) actually branches on all four, not just three; `VIEWER` in particular likely means read-only (no create/edit/delete actions visible), so confirm the UI correctly hides mutation controls for that role both on initial load and on a live `MEMBER_ROLE_CHANGED` event.
- **`BOARD_DELETED`**: when received for the currently open board, redirect the user to the boards dashboard with a clear message ("This board was deleted") — don't leave them looking at a board that no longer exists.
- **`MEMBER_REMOVED` affecting the current user**: if `payload.userId` matches the current user and they're viewing that board, redirect them out — they've lost access.
- **Optimistic UI vs. incoming events**: since actions the current user performs already update local state immediately via the REST response, the matching WebSocket event will arrive moments later and should be treated as an idempotent no-op upsert (matching by `id`), not cause a duplicate or flicker.
- **`TASK_LABELS_CHANGED`**: upsert by `payload.taskId`, replacing that task's local `labels` array wholesale with `payload.labels` — never merge/append, since the payload is always the complete set (§0.3).

## 7. Endpoints to wire, grouped for a two-pass approach

**Pass 1** (core kanban experience): auth, boards, board membership, task lists, tasks, labels.
**Pass 2**: comments, attachments, activity log, notifications, then the full WebSocket layer above.

## 8. Verification checklist

Go through every screen one at a time and confirm it shows real data from the actual backend (a real registered user, real boards/tasks created through the UI), not the old mock dataset. Pay particular attention to:
- The assignee dropdown — populated from real board members (`GET /boards/{id}/members`), not mock users.
- The label picker — real board labels (`GET /boards/{id}/labels`).
- The activity feed — real logged events (`GET /boards/{id}/activity`), not sample data.
- The label picker specifically — confirm both the "add label" and "remove label" actions read the task's current full label set first and send the complete desired set (§0.3), rather than sending just the added/removed label and silently wiping the rest.
- The notifications "load more" flow — confirm clicking it appends older notifications to the existing list rather than replacing it, and that the button correctly disappears once the last page is reached (§5).
- Two browser tabs, two accounts (or the same account twice), same board open in both: perform an action in one tab (move a task, add a comment) and confirm it appears in the other within ~1 second, no manual refresh.
- If any request unexpectedly fails outright before your code even gets a response, check the Network tab for a CORS-specific error first (§0.1) — a mismatched origin (e.g. frontend running on a different port than `3000`) will look like "nothing happens" and is easy to mistake for a frontend logic bug.
