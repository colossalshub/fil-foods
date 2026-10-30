# Meal Service Specification Traceability Plan

Source of truth: [updated User Story Specification](../.github/Meal_Service_User_Stories_AI_Agent_Handoff.md).

## Baseline audit

Audited on 2026-10-30 before implementation changes.

- The client is an Expo 58 JavaScript app using React Navigation, not Expo Router.
- All application data is held in [`frontend/src/data/mockStore.js`](../frontend/src/data/mockStore.js); [`backend/`](../backend/) has no implementation.
- Supabase migrations `20261030131000`, `20261030140000`, and `20261030142000` are applied to project `jmayfxgpxzgyilyvnbju`; the `login-by-username` Edge Function is deployed and responding.
- Existing unit tests pass: 91/91.
- `npm run lint` fails in [`frontend/src/components/VerificationFlow.js`](../frontend/src/components/VerificationFlow.js) because of a state update inside an effect, plus two unused variables.
- Existing code includes plan/biometric/demo features that are not in USR-01–USR-42 and must not become dependencies of the client stories.

The current tests validate local service behavior, not production security, persistence, concurrency, provider delivery, or cross-client isolation.

## Traceability matrix

Status values: **Partial** means a local prototype exists but one or more acceptance criteria or production boundaries are missing; **Missing** means there is no usable implementation; **Blocked** means the client cannot satisfy the criterion without the backend/provider decision identified below.

| Story | Existing implementation | Required changes | Tests to add or update | Status |
|---|---|---|---|---|
| USR-01 Registration | `CreateAccountScreen`, `registration.js`, bcrypt-backed mock users, terms modal | Move registration and uniqueness checks to Auth/API; persist acceptance and unverified state server-side; exact labels and text show/hide control; real profile-completion transition | Registration acceptance matrix, database plaintext-password negative test, duplicate race test | Partial / Blocked by backend |
| USR-02 Login | `LoginScreen`, local fallback, and deployed `login-by-username` Edge Function | Add configured Auth secrets and execute five-failure, rate-limit, active/verified, session, and audit integration tests | API tests for five failures, ten-per-minute device limit, concurrent attempts, audit event | Partial / Integration tests pending |
| USR-03 Keep logged in | `sessionPolicy`, AsyncStorage persistence | Secure session storage, inactivity expiry, password-reset session revocation across devices | Persistence, close/reopen, inactivity, revocation tests | Partial |
| USR-04 Forgot password | `ForgotPasswordScreen`, local lookup and code service | Provider-backed SMS/email reset request, no account enumeration beyond exact required messages, server-side rate limits | Reset lookup/provider failure/Google-only scenarios | Partial / Blocked by provider |
| USR-05 New password | `NewPasswordScreen`, local grant and bcrypt replacement | Server-issued one-time reset grant, invalidate every active session, clear lockout server-side | Grant replay, session revocation, same-password and validation tests | Partial / Blocked by backend |
| USR-06 Logout | Profile logout and local audit-like auth events | Server session revocation and durable logout audit; exact confirmation flow on every logout surface | Logout confirmation, durable event, revoked-token test | Partial |
| USR-07 View profile | `ProfileScreen`, `profileService.getProfile` | Persist and fetch all fields through authorized API; add explicit empty guardian message and full private-data gate | Profile field rendering and unauthorized access tests | Partial / Blocked by backend |
| USR-08 Edit personal info | Profile modal, pending contact verification | Atomic profile update; verify new contact/email separately; unsaved-navigation guard; durable change history | Validation, duplicate, wrong-code rollback, dirty-back tests | Partial |
| USR-09 Health conditions | Profile modal and local arrays | Consent/privacy enforcement, server persistence, staff active-order authorization, history/audit entries | CRUD, last-updated, staff scope, cross-client RLS tests | Partial / Blocked by backend |
| USR-10 Dietary restrictions | Profile modal and local arrays | Server persistence and meal matching/highlighting semantics; audit history | CRUD, highlighting, RLS/history tests | Partial |
| USR-11 Food allergies | Profile modal and local tags/notes | Ingredient/component-aware server check, staff active-order scope, history/audit | Notes, manual allergen, nested ingredient conflict, RLS tests | Partial |
| USR-12 Meal preferences | Profile modal and local ranking fields | Persist preferences, exact ranking inputs, refresh Home/catalog after save | Preference CRUD and ranking fixture tests | Partial |
| USR-13 Nutritional preferences | Profile modal and sort helper | Persist/filter behavior and connect to daily-target flow without claiming suitability | Preference filtering and incomplete-nutrition tests | Partial |
| USR-14 Guardian | Profile modal/local guardian | Required edit/remove confirmation, authorized Admin/guardian view only, server persistence | Validation, edit/remove, authorization tests | Partial / Blocked by backend |
| USR-15 Terms and consent | Terms modal and acceptance timestamp | Store versioned terms acceptance plus explicit health-data consent; show from Account/Profile | Version/timestamp/consent tests | Partial |
| USR-16 Meal browse/search/filter | `MealsScreen`, local fuzzy search and filters | Catalog API, exact `No meals found.`, AND semantics for category/restriction/allergen-free/nutrition, available-only loading | Search threshold/ranking and combined-filter tests | Partial |
| USR-17 Meal details | `MealDetailScreen`, local nutrition/allergen display | Catalog details from API, nested components and unavailable server state, exact warning text | Full ingredient/component conflict and unavailable tests | Partial |
| USR-18 Quantity | `CartContext`, quantity parser and running line totals | Remove non-spec plan discounts, server-side quantity/price validation, read-only computed totals | Quantity edge cases and tamper-resistant total tests | Partial |
| USR-19 Fulfillment/schedule | `OrderScreen`, hard-coded 24-hour/Monday-Saturday rules, delivery-fee summary row | Admin settings API, timezone-safe Asia/Manila validation, delivery fee/address persistence, date-time picker UX | Boundary timezone, lead-time, kitchen-hour, pickup/delivery tests | Partial |
| USR-20 Summary/confirm | Local fallback plus Supabase-backed checkout path using stable request UUID and deployed hardened `place_order` RPC | Run authenticated concurrent retry, rollback, and server allergen integration tests | Concurrent retry/rollback/idempotency and server allergen recheck tests | Partial / Integration tests pending |
| USR-21 Orders list | `TrackingScreen`, local filtering/sorting | Persisted client-scoped query, exact empty state, status/date filters | API/RLS/filter ordering tests | Partial |
| USR-22 Order details | `OrderDetailScreen`, local status history, delivery-fee row | Persisted detail endpoint with client authorization and full fulfillment/history data | Missing/foreign order and history tests | Partial |
| USR-23 Status flow | Status labels/badge and local constants | Enforce forward-only fulfillment-specific transitions in DB/RPC; actor and timestamp history | Transition matrix, skipped/reverted/foreign actor tests | Partial / Blocked by backend |
| USR-24 Live tracking | Four-second local polling fallback plus deployed Supabase Realtime order/notification subscription path | Surface connection state and run reconnect/offline tests | Realtime event, reconnect, offline UI tests | Partial / Integration tests pending |
| USR-25 Notifications | Local notifications/announcements and read state | Durable notification transaction/trigger, confirmed/status/cancelled/issue events, realtime delivery target | Trigger, unread/read persistence and announcement tests | Partial / Blocked by backend |
| USR-26 Help/accessibility | `HelpScreen`, help data, guide, shared `HelpButton` | Put labeled Help control on every auth/main screen, remove icon-only header use, exact 16px/200% checks | Screen reachability and accessibility snapshot/manual checklist | Partial |
| USR-27 FAQ | FAQ groups/search/expand in `HelpScreen` | Preserve exact content and empty message; expose through Account/relevant screens | Group/search/toggle tests (partially present) | Partial |
| USR-28 Navigation guide | `AppGuidePanel`, `HelpGuideGate` | Include Help step and labeled screen references; first-login persistence server/device-safe | First-login/reopen/reference tests | Partial |
| USR-29 Contact | Static `helpContent` and `Linking` | Admin-configured settings API for phone/email/hours; robust dialer error handling | Settings override and link tests | Partial / Blocked by backend |
| USR-30 Google sign-in | Mock `googleAuthService` and demo outcome picker | Replace demo with Expo-compatible OAuth/provider integration, verified identity, picker/cancel/error/inactive handling | Provider adapter contract and no-duplicate tests | Partial / Blocked by provider |
| USR-31 Google profile completion | `CompleteProfileScreen`, local completion | Persist contact/terms/consent, block ordering until complete, duplicate contact transaction | Completion/relogin/order-gate tests | Partial |
| USR-32 Username/password alternative | Existing password flow and Google linking | Keep both flows on common server account model; remove unrelated plan assumptions | Cross-provider parity/linking/reset tests | Partial |
| USR-33 Verification codes | `verificationService`, `VerificationFlow`, fixed `123456` always | Hash codes at rest, test-only sender gated by `APP_ENV=test`, real SMS/email interfaces, 60s/five-hour/expiry/one-use rules server-side | Hashed-code, provider, replay, resend and limits tests | Partial / Blocked by provider |
| USR-34 Google linking | Local link flow and lockout | Verify Google token, bind one subject transactionally, enforce email/account match and server lockout | Link/cancel/already-linked/concurrent tests | Partial / Blocked by provider |
| USR-35 Home recommendations | No signed-in Home screen in `MainTabs`; recommendations are on Meals | Add Home tab with up to five safe suggestions, reasons, disclaimer, active-order shortcut and notification label | Home empty/profile/recommendation navigation tests | Missing |
| USR-36 Home shortcuts | No required signed-in Home surface | Add exact Browse Meals/My Orders/My Account shortcuts and destination consistency | Shortcut navigation tests | Missing |
| USR-37 Four-item navigation/guest gate | `MainTabs` has five items (`Meals`, `Order`, `Tracking`, `Alerts`, `Profile`); visitor tabs differ | Refactor to Home/Meal/Orders/Account; move Help/notifications under screens; preserve intended destination after login; server gate private data | Navigation and unauthenticated gate tests | Partial |
| USR-38 Change history | Local profile history has add/remove summaries only | Store actor, old value, new value, timestamp; append-only durable history; own-record query | Old/new/note changes, ordering, tamper and authorization tests | Partial |
| USR-39 Suggestions/daily targets | Local ranking and `nutritionService` one-per-slot solver | Exact disclaimer/empty-profile text, full exclusion rules, Home integration, configurable constraints and incomplete-data handling | Ranking fixture, exclusions, refresh, closest/no-exact solver tests | Partial |
| USR-40 Password security | `bcryptjs` local hash and tests | Move verifier to Supabase Auth/server; never expose or log credentials; revoke all sessions on reset | Integration password-storage and session-revocation tests | Partial / Blocked by backend |
| USR-41 RBAC/privacy | Local role helpers plus Supabase role enum and deny-by-default RLS foundation | Apply policies, add staff/guardian scopes, and run two-client forged-ID integration tests | Supabase policy tests with two clients and forged IDs | Partial / Deployment and scope tests pending |
| USR-42 Auditability | Local hash chain helper plus durable append-only audit table and `verify_audit_chain()` foundation | Apply migration, add all required event producers, and run tamper/delete/alter integration tests | Chain tamper/delete/alter tests and event coverage | Partial / Blocked by configured backend |

## Dependency-aware implementation batches

1. **Foundation and contract cleanup:** exact message catalog, Expo/React Native architecture decision, four-tab navigation, Help reachability, lint cleanup, shared validators and test fixtures.
2. **Backend/security foundation:** Supabase schema, roles, RLS, settings, audit chain, Auth/session model, test seed and dev-only status simulator.
3. **Authentication:** USR-01–06, USR-30–34, USR-40, including real provider interfaces and session revocation.
4. **Profile/privacy:** USR-07–15, USR-31, USR-38, USR-41–42, including consent and staff/guardian scopes.
5. **Catalog/recommendations:** USR-16–17, USR-35, USR-39 and the daily-target screen.
6. **Ordering:** USR-18–20 with one atomic RPC and server-side ingredient checks.
7. **Orders/notifications:** USR-21–25 with Realtime and status enforcement.
8. **Help/navigation/accessibility:** USR-26–29, USR-36–37, followed by full acceptance and RLS verification.

## Blockers requiring configuration, not invented behavior

- Supabase project URL/anon key and deployment environment are not present.
- SMS, email, Google OAuth, and Admin-configured settings providers are not present.
- The specification requires Admin/Kitchen/Delivery behavior for authorization and status simulation, but no staff API exists.
- The specification says Expo Router in project guidance while the current app uses React Navigation. This plan preserves the existing navigation until the migration is implemented deliberately; no mixed routing architecture should be introduced.
- Existing plan/biometric/demo behavior is outside USR-01–USR-42. It will not be used to satisfy stories; removal or retention must be decided when the corresponding UI surfaces are refactored.
