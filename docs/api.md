# API reference

All endpoints live under `/api`, exchange JSON and (except the auth endpoints marked "anyone") require a session. The live OpenAPI specification is at `/v3/api-docs` and Swagger UI at `/swagger-ui.html` (not in `prod`). The typed TypeScript facade over this API is `packages/api-client/src/index.ts`.

## Conventions

### Session and CSRF

- Authentication is a server session: HttpOnly cookie `ZWF_SESSION` (`Secure` in `prod`, `SameSite=Lax`). Send requests with `credentials: "include"`; no tokens are exposed to JavaScript.
- Every unsafe request (POST, PUT, PATCH, DELETE) needs the header `X-XSRF-TOKEN` equal to the `XSRF-TOKEN` cookie. Any first request (or `GET /api/auth/csrf`) issues the cookie; it is rotated on sign-in and sign-out.
- Sessions last 12 hours of inactivity, or 30 days with `rememberMe`. The session id changes on sign-in.

### Errors

Errors are RFC 9457 Problem Details (`application/problem+json`) with a machine `code` and, for field errors, `errors: {field: code}`. The frontend translates codes; `detail` is for developers.

```json
{ "status": 400, "detail": "Request validation failed", "code": "VALIDATION_FAILED",
  "errors": { "email": "Email", "name": "NotBlank" } }
```

| Status | Typical codes |
|---|---|
| 400 | `VALIDATION_FAILED` (field codes: `NotNull`, `NotBlank`, `Size`, `Email`, `Positive`, `Digits`, `Range`, `INVALID`, `NOT_ALLOWED`, `IN_FUTURE`, `BEFORE_PURCHASE`, `EXCEEDS_REMAINING`…), `PASSWORD_POLICY`, `INVALID_RESET_TOKEN`, `INVALID_INVITE`, `MALFORMED_REQUEST` |
| 401 | `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, or no session |
| 403 | `FORBIDDEN` (role), `INVITE_EMAIL_MISMATCH`, CSRF |
| 404 | `PRODUCT_NOT_FOUND`, `RECIPE_NOT_FOUND`, … — another household's object looks exactly like a missing one |
| 409 | `EMAIL_TAKEN`, `PRODUCT_CLOSED`, `STORE_EXISTS`, `INVITE_EXISTS`, `ALREADY_MEMBER`, `LAST_OWNER` |
| 422 | `NO_RECIPE` |

### Data formats

- Dates are calendar dates `YYYY-MM-DD`; instants are ISO-8601 UTC. "Today" (for `daysLeft`, reminders, statistics) is computed in `ZWF_TIME_ZONE`, not in the server's UTC.
- Codes of categories, zones and units are lowercase (`dairy`, `door`, `kg`); statuses and outcomes are uppercase (`ACTIVE`, `WASTED`).
- Quantities have up to 3 decimals. A quantity and its unit are given together or not at all.
- PATCH: an absent field is left unchanged, `null` clears it.
- Everything is scoped to the current user's household.

## Auth and profile

| Method and path | Access | Response |
|---|---|---|
| `GET /api/auth/csrf` | anyone | 204 + `XSRF-TOKEN` cookie |
| `POST /api/auth/register` `{name, email, password, rememberMe?}` | anyone | 201 + profile. Creates the household "Сім'я <surname>" with role `OWNER` and signs in · 409 `EMAIL_TAKEN` · 400 `PASSWORD_POLICY` |
| `POST /api/auth/login` `{email, password, rememberMe}` | anyone | 200 + profile · 401 `INVALID_CREDENTIALS` (same for unknown email and wrong password) |
| `POST /api/auth/logout` | anyone | 204 |
| `GET /api/auth/me` | session | profile `{id, name, email, avatarUrl, householdId, householdName, role, theme}` |
| `POST /api/auth/password/forgot` `{email}` | anyone | always 202; email with `…/lms/reset-password?token=…` (one per minute) |
| `POST /api/auth/password/reset` `{token, password}` | anyone | 204; all user sessions end · 400 `INVALID_RESET_TOKEN` |
| `PUT /api/me/theme` `{theme: "light" \| "dark" \| "system"}` | session | 204 |

Passwords: 8+ characters, at most 72 bytes UTF-8. Reset tokens: 256 bits, single-use, 1 hour, stored as SHA-256.

## Fridge

| Method and path | Response |
|---|---|
| `GET /api/products?q=&category=&freshness=&status=&sort=&page=&size=` | `{items, page, size, total, totalPages, categoryCounts}`. `category` and `freshness` (`expired`, `today`, `soon`, `fresh`) repeat; `status` defaults to `ACTIVE`; `sort`: `expiry` (default), `name`, `added`, `category`; `page` from 1, `size` up to 100 |
| `POST /api/products` | 201 + product. Required: `name`, `category`, `quantity`, `unit`, `expiresAt`; `zone` defaults to the category's, `remindBeforeDays` to 2 |
| `GET /api/products/{id}` | product |
| `PATCH /api/products/{id}` | product · 409 `PRODUCT_CLOSED` for a written-off product |
| `POST /api/products/{id}/write-off` `{outcome, quantity?, addToShoppingList?}` | `{product, writtenOff, addedToShoppingList}`. `outcome`: `EATEN`, `COOKED`, `WASTED`; `quantity`: `"all"` (default) or a number |
| `GET /api/products/summary` | `{total, addedThisWeek, soon, today, expired}` |
| `GET /api/tips/today` | `{date, kind, products, hint}` — tip of the day |
| `GET /api/dictionaries` | categories, zones with temperatures, units, reminder options, opened-package rules |

A product has `effectiveExpiresAt = min(expiresAt, openedAt + days after opening)` and `daysLeft`, `freshness` computed from it. "Soon" means within 48 hours.

## Recipes and statistics

| Method and path | Response |
|---|---|
| `GET /api/recipes/recommended?sort=critical\|match\|time\|kcal&limit=6` | cards `{id, title, imageUrl, minutes, kcal, servings, difficulty, source, matchPercent, criticalCount, fromFridge[], missing[]}`, critical (≤ 48 h) first |
| `POST /api/recipes/generate` `{productIds: [3..4]}` | recipe detail. With a DeepSeek key — an AI recipe saved for the household (`source: "AI"`); otherwise or on failure — the best catalog recipe (`"CATALOG"`) · 400 `productIds: Size / INVALID` · 422 `NO_RECIPE` |
| `GET /api/recipes/{id}` | `{…card, description, savingsUah, pantry[], steps[{title, text}]}` matched against the current fridge |
| `POST /api/recipes/{id}/cook` `{portions?: 1..12, productIds?}` | `{recipeId, portions, cooked[{productId, name, quantity, unit, closed}]}` — `COOKED` write-offs scaled to portions (g ↔ kg, ml ↔ l; otherwise the whole product). All or nothing |
| `GET /api/stats/saved?period=month` | `{period, from, to, saved, wasted}` — distinct products this month |
| `GET /api/stats/overview?months=1..12` | `{from, to, months[{month, saved, wasted}], current{saved, wasted, saveRate, savedKg, wastedKg, co2SavedKg, co2WastedKg}, byCategory[], topWasted[{name, times, quantity, unit}], members[{userId, name, saved}]}` (default 6 months) |

`fromFridge[]` items: `{productId, name, quantity, unit, note, daysLeft, available, availableUnit}`; `missing[]`: `{name, quantity, unit, note, substitutes[]}`.

## Shopping list

| Method and path | Response |
|---|---|
| `GET /api/shopping-list?store=&fromFridge=` | `{toBuy, bought}` |
| `POST /api/shopping-list` `{name, quantity?, unit?, category?, priority?, priceEstimate?, storeId?}` | 201 + item |
| `PATCH /api/shopping-list/{id}` | item |
| `DELETE /api/shopping-list/{id}` | 204 |
| `POST /api/shopping-list/{id}/toggle` | item (bought ↔ to buy, with `boughtBy`) |
| `DELETE /api/shopping-list/bought` | `{deleted}` |
| `POST /api/shopping-list/move-to-fridge` `{items?: [{id, expiresAt?, zone?, category?}]}` | `{moved, products}`; without `items` — all bought. All or nothing |
| `GET / PUT /api/shopping-list/settings` `{autoRefill, excludedCategories}` | Smart Sync settings |
| `GET / POST / DELETE /api/shopping-list/stores` | household stores · 409 `STORE_EXISTS` |
| `GET /api/shopping-list/summary` | `{bought, total, estimatedTotal, autoCount}` |

## Family

`OWNER` can do everything; `MEMBER` works with the fridge, recipes, shopping list and notifications but cannot manage members. A forbidden action is 403 `FORBIDDEN`.

| Method and path | Who | Response |
|---|---|---|
| `GET /api/household` | all | `{id, name, memberCount, role, permissions}` |
| `PATCH /api/household` `{name}` | owner | renamed household |
| `DELETE /api/household` `{password}` | owner | deletes the household and its data; every member gets a new empty one |
| `GET /api/household/members` | all | members with role and last activity |
| `PATCH /api/household/members/{userId}` `{role}` | owner | 409 `LAST_OWNER` for the last owner |
| `DELETE /api/household/members/{userId}` | owner or the member | remove / leave |
| `GET /api/household/activity?before=&limit=` | all | activity feed, cursor `nextBefore` |
| `POST /api/household/invites` `{email, role?}` | owner | email with `/lms/join?invite=…` (7 days, only for that email) · 409 `INVITE_EXISTS` / `ALREADY_MEMBER` |
| `GET /api/household/invites` · `DELETE /api/household/invites/{id}` | all · owner | pending invites · cancel |
| `GET / POST /api/household/invites/code` | owner | family code `ZWF-XXXX-XX` (7 days); POST issues a new one |
| `POST /api/household/join` `{code}` or `{invite}` | all | join · 400 `INVALID_INVITE`, 403 `INVITE_EMAIL_MISMATCH`, 409 `LAST_OWNER` |

A user always belongs to exactly one household. Joining from a household where you were alone moves your products and shopping list along.

## Notifications and realtime

| Method and path | Response |
|---|---|
| `GET /api/notifications?limit=` | `{items, unread}`, unread first |
| `GET /api/notifications/unread-count` | `{count}` |
| `POST /api/notifications/{id}/read` · `POST /api/notifications/read-all` | 204 · `{updated}` |
| `GET / PUT /api/me/notification-settings` | `{inApp, emailDigest, push, digestTime: "HH:mm", quietHours: {from, to} \| null}` |
| `GET /api/me/push/public-key` | `{publicKey}` (`null` — push disabled on the server) |
| `POST / DELETE /api/me/push-subscriptions` | browser subscription `{endpoint, keys: {p256dh, auth}}` |
| `GET /api/household/stream` | Server-Sent Events, see below |
| `GET / POST /api/household/presence` | who is online · `{shoppingAt}` — "I'm in the store" |

**Live updates stream** (`text/event-stream`):

| Event | Data | Meaning |
|---|---|---|
| `changed` | `{topic, actor}` | `topic`: `products`, `shopping-list` or `household` changed — refetch it |
| `presence` | `{online: [{id, name, shoppingAt}]}` | who is online and where they shop |
| `notifications` | `{userId}` | new notifications for that user |

A comment ping is sent every `ZWF_REALTIME_HEARTBEAT` (25 s).

**Schedules:** expiry reminders run hourly (minute 5): a product whose `effectiveExpiresAt − remindBeforeDays ≤ today` gets one notification per expiry date for each member with the bell or push on. The daily digest checks every minute and sends one email per day at or after each user's `digestTime` when something is expired or expires today or tomorrow. Push respects quiet hours.

## Health

| Path | Response |
|---|---|
| `/actuator/health` | `{"status":"UP"}` |
| `/actuator/health/liveness`, `/actuator/health/readiness` | probes for orchestrators |
