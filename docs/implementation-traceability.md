# Meal Service Specification Traceability Plan

Source of truth: [User Module Requirements (USR-01 through USR-50)](../.github/Meal_Service_User_Stories_AI_Agent_Handoff.md), transcribed from the supplied 61-page PDF on 2026-11-14.

The supplied PDF supersedes the older USR-01–USR-42 specification. It adds USR-43–USR-50 and revises earlier requirements, including signup, family-recipient data, account deletion, accessibility, and versioned Terms and Conditions.

## Historical baseline audit

The following baseline was audited on 2026-10-30 against the previous 42-story specification, before later implementation changes. It is historical evidence only, not current compliance verification against the supplied PDF.

- The client is an Expo 58 JavaScript app using React Navigation, not Expo Router.
- All application data is held in [`frontend/src/data/mockStore.js`](../frontend/src/data/mockStore.js). The server schema is in [`supabase/`](../supabase/).
- Supabase migrations `20261030131000`, `20261030140000`, and `20261030142000` are applied to project `jmayfxgpxzgyilyvnbju`; the `login-by-username` Edge Function is deployed and responding.
- Existing unit tests pass: 91/91.
- `npm run lint` fails in [`frontend/src/components/VerificationFlow.js`](../frontend/src/components/VerificationFlow.js) because of a state update inside an effect, plus two unused variables.
- Existing code includes plan/biometric/demo features that are not in USR-01–USR-42 and must not become dependencies of the client stories.

The tests at that time validated local service behavior, not production security, persistence, concurrency, provider delivery, or cross-client isolation.

## Historical story-level traceability matrix

The statuses below refer to that older specification and are not criterion-level verification. Re-audit every acceptance criterion in the current PDF before claiming a story is complete.

Status values in this historical table: **Partial** means a local prototype existed but one or more acceptance criteria or production boundaries were missing; **Missing** means there was no usable implementation; **Blocked** means the client could not satisfy the criterion without the backend/provider decision identified below.

| Story | Existing implementation | Required changes | Tests to add or update | Status |
|---|---|---|---|---|
| USR-01 Registration | `CreateAccountScreen`, `registration.ts`, bcrypt-backed mock users, terms modal; account-purpose choice and recipient onboarding in `CompleteProfileScreen`; `authService.completeOnboarding` stores recipient allergies, restrictions, and delivery details separately | Move registration and uniqueness checks to Auth/API; persist account purpose, recipient data, acceptance, and unverified state server-side; exact labels and text show/hide control | Registration validation, family recipient separation, Google-family completion, database plaintext-password negative test, duplicate race test | Partial / Blocked by backend |
| USR-02 Login | `LoginScreen`, local fallback, and deployed `login-by-username` Edge Function | Add configured Auth secrets and execute five-failure, rate-limit, active/verified, session, and audit integration tests | API tests for five failures, ten-per-minute device limit, concurrent attempts, audit event | Partial / Integration tests pending |
| USR-03 Keep logged in | `sessionPolicy`, AsyncStorage persistence | Secure session storage, inactivity expiry, password-reset session revocation across devices | Persistence, close/reopen, inactivity, revocation tests | Partial |
| USR-04 Forgot password | `ForgotPasswordScreen`, local lookup and code service | Provider-backed SMS/email reset request, no account enumeration beyond exact required messages, server-side rate limits | Reset lookup/provider failure/Google-only scenarios | Partial / Blocked by provider |
| USR-05 New password | `NewPasswordScreen`, local grant and bcrypt replacement | Server-issued one-time reset grant, invalidate every active session, clear lockout server-side | Grant replay, session revocation, same-password and validation tests | Partial / Blocked by backend |
| USR-06 Logout | Profile logout and local audit-like auth events | Server session revocation and durable logout audit; exact confirmation flow on every logout surface | Logout confirmation, durable event, revoked-token test | Partial |
| USR-07 View profile | `ProfileScreen`, `profileService.getProfile`; shows subscription purpose and family recipient details, and maps recipient health data to meal/profile operations | Persist and fetch all fields through authorized API; add explicit empty guardian message and full private-data gate | Profile field rendering, recipient-data separation, and unauthorized access tests | Partial / Blocked by backend |
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

## Current PDF verification gate

No story is considered compliant solely because it appears in the historical matrix. The story-level re-audit is complete, but criterion-level test mapping and verification are still in progress. Track each numbered system requirement in the current PDF to its implementation surface and automated/manual test; mark it complete only after that test passes. The application is **not yet certified compliant with USR-01–USR-50**.

The audit below covers the current PDF at story level. “Partial” means some UI/local behavior exists but at least one acceptance criterion is not met or lacks verification. “Missing” means no usable implementation was found for the core workflow. Local unit tests do not establish remote security, deployment, provider delivery, or multi-user behavior.

| Story | Status | Current evidence and outstanding acceptance gaps |
|---|---|---|
| USR-01 | Partial | Local registration validates and hashes passwords and supports self/family onboarding; remote signup, separate recipient persistence, verified flow ordering, and remote terms acceptance are not wired end to end. |
| USR-02 | Partial | Local lockout plus username-login Edge Function exist; fixed device key, deployment/secrets, verified-account enforcement, and backend integration/rate-limit tests remain gaps. |
| USR-03 | Partial | Client session persistence/inactivity policy exists; remote password-reset revocation and cross-device/session expiry guarantees are unverified. |
| USR-04 | Partial | Local reset lookup/code simulator exists; no SMS/email delivery provider or deployed reset request service. |
| USR-05 | Partial | Local reset grant/hash flow exists; no remote password update or all-session revocation guarantee. |
| USR-06 | Partial | Logout confirmation/local audit exist; durable remote logout audit and backend session revocation are unverified. |
| USR-07 | Partial | Profile UI and remote profile reads exist; family recipient data is not modeled as a separate remote person and privacy/data-scope behavior is unverified. |
| USR-08 | Partial | Local profile edits/verification and remote profile update exist; remote contact changes are not verify-before-save and durable history is missing. |
| USR-09 | Partial | Health data has local/remote persistence, but the selectable condition list differs between screens/services and specified Dietitian access is not available under self-only RLS. |
| USR-10 | Partial | Dietary restrictions persist locally/remotely; staff access and recipient-scoped remote storage are missing. |
| USR-11 | Partial | Client allergen checks and a server order-RPC conflict check exist; nested/live catalog recommendation safety and staff scope are not comprehensively verified. |
| USR-12 | Partial | Preference storage and local ranking exist; remote recipient separation and complete ranking behavior are unverified. |
| USR-13 | Partial | Local filters and remote preference booleans exist; target persistence and complete remote filtering are missing. |
| USR-14 | Partial | Local guardian management and remote guardian storage exist; family recipient relationship and required Admin access are not modeled by RLS. |
| USR-15 | Partial | Terms text and local acceptance timestamp exist; accepted version/consent are not consistently persisted through remote registration/profile flows. |
| USR-16 | Partial | Search/filter UI uses a bundled static catalog; live Admin catalog, availability, and complete combined-filter integration are not wired. |
| USR-17 | Partial | Meal details use bundled meal objects; live catalog/components, availability, and consistent requirement pricing are not guaranteed. |
| USR-18 | Partial | Local cart validation exists and the order RPC recomputes prices; server-side meal-slot/quantity/day limits, customization, and complete order rules are missing. |
| USR-19 | Partial | Fulfillment/address/schedule collection and server validation exist; Admin-configured hours/fees and pickup operations details are not fully implemented. |
| USR-20 | Partial | Idempotent order RPC exists; Dietitian review, payment state/provider, and paid-only Kitchen release workflow are absent. |
| USR-21 | Partial | Client-scoped backend order reads/RLS exist; staff fulfillment and payment workflow integration is missing. |
| USR-22 | Partial | Backend order detail/history reads exist; complete payment/customization data and integration verification are missing. |
| USR-23 | Partial | Status display/Realtime exist; review/payment states and authorized staff transition workflow are missing. |
| USR-24 | Partial | Order/notification Realtime subscriptions exist; status-triggered durable notifications, reconnect/offline coverage, and push delivery are not established. |
| USR-25 | Partial | Local alerts/read state exist; the screen is not wired to the remote notifications table and Admin announcements/push delivery are missing. |
| USR-26 | Partial | Shared palette/body/touch foundations and Help controls exist; Help reachability on every screen, minimum text sizing everywhere, large-text layouts, and screen-reader checks need verification. |
| USR-27 | Partial | FAQ groups/search/expand and basic tests exist; required typo tolerance, exact-match ranking, and short-query behavior are not implemented. |
| USR-28 | Partial | First-use guide/reopen UI exists; guide references are incomplete and viewed state is device-local rather than a durable per-user record. |
| USR-29 | Missing | No user feedback form, persistence/API, or Admin review queue. |
| USR-30 | Partial | Supabase OAuth flow and mock scenarios exist; real account type selection/persistence and deployed provider configuration are incomplete. |
| USR-31 | Partial | Google profile completion UI/validation exists locally; remote completion/recipient persistence and ordering gate are missing. |
| USR-32 | Partial | Username/password and username-login function exist; integrated remote reset and Google linking parity are missing. |
| USR-33 | Partial | Local fixed-code simulator tests expiry/limits/replay; no hashed server issuance/verification or SMS/email provider delivery. |
| USR-34 | Partial | Mock link flow handles validation/conflicts; real Supabase identity linking and provider-backed verification are absent. |
| USR-35 | Partial | `getRecommendedMeals` filters local meals, limits results, and has tests for availability, conflicts, and empty results. Health/doctor restrictions and the mandatory Dietitian review-before-payment workflow are not comprehensively applied; client filtering is not clinical approval. |
| USR-36 | Partial | Home has the required three shortcuts; no-active-order now includes Browse Meals and backend load errors are distinct from empty state. Cross-screen label consistency and navigation-level tests remain outstanding. |
| USR-37 | Partial | Four Home/Meal/Orders/Account tabs and visitor Orders/Account gates exist; private-data and destination-restoration behavior lack end-to-end tests. |
| USR-38 | Partial | Local history captures many old/new values and has integrity tests; allergy-note changes and remote profile/recipient history writers are missing. |
| USR-39 | Partial | Local nutrition solver/recommendations exist; complete safety exclusions, doctor restrictions, and Dietitian approval are missing. |
| USR-40 | Partial | Local bcrypt and Supabase Auth paths exist; remote reset/session revocation and database-level credential-storage evidence are missing. |
| USR-41 | Partial | RLS protects several owner-scoped tables; separate recipient authorization, Dietitian role/scopes, and two-client deployed policy tests are missing. |
| USR-42 | Partial | SQL hash-chain/audit functions exist and some auth/order events are recorded; profile/recipient/logout event coverage and deployed tamper tests are missing. |
| USR-43 | Partial | Registration choice is local; screen now uses the specified descriptions, missing-choice message, and profile label. Google preselection/account persistence and Admin visibility remain missing remotely. |
| USR-44 | Partial | Local family recipient fields/consent are validated and separate from user data; no remote recipient table/API or remote completion/order gate. |
| USR-45 | Missing | No separate Edit meal recipient screen/save path, recipient-only update guarantee, or recipient-change history. |
| USR-46 | Partial | Some local profile/order behavior uses recipient data; order summaries, warnings, and notifications do not consistently distinguish account user from meal recipient. |
| USR-47 | Missing | No delete-account UI/service; reauthentication, in-progress order block, session revocation, retained-order anonymization, and deletion audit are absent. |
| USR-48 | Partial | Palette/contrast/body/touch tests exist; sub-16px text, max-font responsive layout, and complete screen-reader coverage remain. |
| USR-49 | Partial | Static numbered terms, version/date, links, and content tests exist; offline load/retry state and blocking acceptance until text loads are absent. |
| USR-50 | Partial | Local acceptance timestamp and required checkbox/message exist; remote versioned immutable event, deduplication, save-failure handling, and update/reaccept session gate are absent. |

These are not all criterion-level passes: stories remain Partial/Missing until each numbered criterion in the source PDF is mapped to a passing automated or documented manual test. The recommendation tests are local service tests; they do not prove the live Admin catalog, backend authorization, Dietitian decisions, or payment workflow.

## Dependency-aware implementation batches

1. **Foundation and contract cleanup:** exact message catalog, Expo/React Native architecture decision, four-tab navigation, Help reachability, lint cleanup, shared validators and test fixtures.
2. **Backend/security foundation:** Supabase schema, roles, RLS, settings, audit chain, Auth/session model, test seed and dev-only status simulator.
3. **Authentication and account lifecycle:** USR-01–06, USR-30–34, USR-40, USR-43, and USR-47, including real provider interfaces, recipient selection, and session revocation.
4. **Profile/privacy:** USR-07–15, USR-31, USR-38, USR-41–46, USR-49–50, including recipient separation, consent, and staff/guardian scopes.
5. **Catalog/recommendations:** USR-16–17, USR-35, USR-39 and the daily-target screen.
6. **Ordering:** USR-18–20 with one atomic RPC and server-side ingredient checks.
7. **Orders/notifications:** USR-21–25 with Realtime and status enforcement.
8. **Help/navigation/accessibility:** USR-26–29, USR-36–37, USR-48, followed by full acceptance and RLS verification.

## Blockers requiring configuration, not invented behavior

- Supabase project URL/anon key and deployment environment are not present.
- SMS, email, Google OAuth, and Admin-configured settings providers are not present.
- The specification requires Admin/Kitchen/Delivery behavior for authorization and status simulation, but no staff API exists.
- The specification says Expo Router in project guidance while the current app uses React Navigation. This plan preserves the existing navigation until the migration is implemented deliberately; no mixed routing architecture should be introduced.
- Existing plan/biometric/demo behavior is outside USR-01–USR-42. It will not be used to satisfy stories; removal or retention must be decided when the corresponding UI surfaces are refactored.
