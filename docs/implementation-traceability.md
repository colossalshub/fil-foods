# Meal Service Specification Traceability Plan

Source of truth: [User Module specification](./specs/user-module.md) ([canonical PDF](./specs/FIL_Foods_User_Module.pdf), [verbatim transcription](../.github/Meal_Service_User_Stories_AI_Agent_Handoff.md)). Current stories are **USR-01 through USR-50**.

Staff modules (Admin, Dietitian, Kitchen, Delivery) are indexed in [`docs/specs/meal-service-modules.md`](./specs/meal-service-modules.md). Staff story traceability lives in [`implementation-traceability-staff.md`](./implementation-traceability-staff.md). When a User story depends on staff behavior (menu, Dietitian review, kitchen/delivery status, audit), map the matching **ADM / DIT / KIT / DEL** story before marking the User criterion complete.

The User 5 PDF supersedes the older USR-01–USR-42 specification. It adds USR-43–USR-50 and revises earlier requirements, including signup, family-recipient data, account deletion, accessibility, and versioned Terms and Conditions.

## Revised workbook (2026-11-19)

The User sheet of the revised workbook changes these stories (canonical export refreshed):

| Story | Change | State |
|---|---|---|
| USR-15, USR-43, USR-50 | "Register" is now "Sign Up" | Done (button, terms error and code all say Sign Up; "Registered for: …" labels are spec wording) |
| USR-11, USR-12, USR-35, USR-39 | Meals with a recorded allergen are disabled and blocked, with an explanation — not listed last with a warning | Done — Menu rows, Build Today's Meals cards and the Customize "Next" button are disabled with "Unavailable: this meal contains …, a recorded allergy in … profile." (new wording); recommendations already excluded them; checkout has no "I understand" override and the send button is disabled; `place_order` still raises `allergen_conflict` on the server. |
| USR-13 AC 4/5, USR-21, USR-22, USR-23, USR-49, USR-50 | Order reference `ORD-YYYY-NNNN`; delivery tracking number `TRK-YYYY-NNNN` shown separately | Done — migration `20261119110000_order_reference.sql` (`orders.order_ref` + `orders_ref_seq`, set by a BEFORE INSERT trigger; TRK- only on delivery orders with the same number; existing orders backfilled TRK-2026-0002 → ORD-2026-0002 and pickup orders lose their TRK-; references cannot be rewritten). Client and staff notices, staff bells, staff lists and search use ORD-; order screens show "Order reference" plus "Delivery tracking number" (new wording) on delivery orders; search accepts either. |
| USR-20, USR-21, USR-23 | "Returned for Changes": the user edits and resubmits after a double confirmation; the order goes back to the Dietitian | Pending |
| USR-20 (payments) | GCash, Maya, COD, separate payment status, failed/cancelled/retry, transaction reference. Owner decision: COD orders may reach the Kitchen unpaid | Not started (large; payment not launching yet) |
| USR-20 (plans) | Plans include up to three meals per day with a different choice each day | Not started |
| USR-13 | Sodium calculated from ingredient sodium against the recipient's limit (default 400 mg per meal) | Not started (large) |
| USR-16, USR-18 | Five food items per day; max three meals per day; editing a selection is not an extra meal | Meal limit done; daily 5-item menu not started (large) |

Inconsistencies inside the revised workbook: USR-21's status list has no Pending/Delivered/Paid while USR-23 lists "Paid" as a stage; USR-25/46/47 notification samples use "Order TRK-…" as the order reference; USR-21 numbering repeats AC 4 and 5; card payment is no longer listed but was not explicitly removed.

## Historical baseline audit

The following baseline was audited on 2026-10-30 against the previous 42-story specification, before later implementation changes. It is historical evidence only, not current compliance verification against the supplied PDF.

- The client is an Expo 58 JavaScript app using React Navigation, not Expo Router.
- All application data is held in [`frontend/src/user/data/mockStore.ts`](../frontend/src/user/data/mockStore.ts). The server schema is in [`supabase/`](../supabase/).
- Supabase migrations `20261030131000`, `20261030140000`, and `20261030142000` are applied to project `jmayfxgpxzgyilyvnbju`; the `login-by-username` Edge Function is deployed and responding.
- Existing unit tests pass: 91/91.
- `npm run lint` may flag [`frontend/src/user/components/VerificationFlow.tsx`](../frontend/src/user/components/VerificationFlow.tsx) (historical note from pre–User 5 cleanup).
- Existing code includes plan/biometric/demo features that are not in USR-01–USR-50 and must not become dependencies of the client stories.

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
| USR-18 Meal selection (one per meal time) | `CartContext`, quantity parser and running line totals | Remove non-spec plan discounts, server-side quantity/price validation, read-only computed totals | Quantity edge cases and tamper-resistant total tests | Partial |
| USR-19 Fulfillment/schedule | `OrderScreen`, hard-coded 24-hour/Monday-Saturday rules, delivery-fee summary row | Admin settings API, timezone-safe Asia/Manila validation, delivery fee/address persistence, date-time picker UX | Boundary timezone, lead-time, kitchen-hour, pickup/delivery tests | Partial |
| USR-20 Summary/confirm | Local fallback plus Supabase-backed checkout path using stable request UUID and deployed hardened `place_order` RPC | Run authenticated concurrent retry, rollback, and server allergen integration tests | Concurrent retry/rollback/idempotency and server allergen recheck tests | Partial / Integration tests pending |
| USR-21 Orders list | `TrackingScreen`, local filtering/sorting | Persisted client-scoped query, exact empty state, status/date filters | API/RLS/filter ordering tests | Partial |
| USR-22 Order details | `OrderDetailScreen`, local status history, delivery-fee row | Persisted detail endpoint with client authorization and full fulfillment/history data | Missing/foreign order and history tests | Partial |
| USR-23 Status flow | Status labels/badge and local constants | Enforce forward-only fulfillment-specific transitions in DB/RPC; actor and timestamp history | Transition matrix, skipped/reverted/foreign actor tests | Partial / Blocked by backend |
| USR-24 Live tracking | Four-second local polling fallback plus deployed Supabase Realtime order/notification subscription path | Surface connection state and run reconnect/offline tests | Realtime event, reconnect, offline UI tests | Partial / Integration tests pending |
| USR-25 Notifications | Local notifications/announcements and read state | Durable notification transaction/trigger, confirmed/status/cancelled/issue events, realtime delivery target | Trigger, unread/read persistence and announcement tests | Partial / Blocked by backend |
| USR-26 Help/accessibility | `HelpScreen`, help data, guide, shared `HelpButton` | Put labeled Help control on every auth/main screen, remove icon-only header use, exact 16px/200% checks | Screen reachability and accessibility snapshot/manual checklist | Partial |
| USR-27 FAQ | `FaqScreen` / `FaqExperience` (groups, search, expand); linked from `HelpScreen` | Preserve exact content and empty message; expose through Account/relevant screens | `helpContent.test.ts` search/group cases | Partial |
| USR-28 Navigation guide | `AppGuideExperience`, `GuideReplayList`, `HelpGuideGate`, `HelpScreen` | First-login welcome + step flow matches Figma; reopen from Help; server-side viewed state still pending | `helpContent.test.ts`, first-login/reopen/manual | Partial |
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
| USR-02 | Partial | A successful sign-in now opens the meal menu (Meal tab) per criterion 4; a pending destination still wins. Local lockout plus username-login Edge Function exist; fixed device key, deployment/secrets, verified-account enforcement, and backend integration/rate-limit tests remain gaps. |
| USR-03 | Partial | Client session persistence/inactivity policy exists; remote password-reset revocation and cross-device/session expiry guarantees are unverified. |
| USR-04 | Partial | Local reset lookup/code simulator exists; no SMS/email delivery provider or deployed reset request service. |
| USR-05 | Partial | Local reset grant/hash flow exists; no remote password update or all-session revocation guarantee. |
| USR-06 | Partial | Logout confirmation/local audit exist; durable remote logout audit and backend session revocation are unverified. |
| USR-07 | Partial | Profile UI and remote profile reads exist; family recipient data is not modeled as a separate remote person and privacy/data-scope behavior is unverified. |
| USR-08 | Partial | Local profile edits/verification and remote profile update exist; remote contact changes are not verify-before-save and durable history is missing. |
| USR-09 | Partial | One condition list everywhere: Hypertension (HTN), Diabetes, Gout, Kidney Problem, Low-Cholesterol Diet, plus "Other / Doctor-provided restriction". Specified Dietitian access is not available under self-only RLS. |
| USR-10 | Partial | Dietary restrictions persist locally/remotely; staff access and recipient-scoped remote storage are missing. |
| USR-11 | Partial | Client allergen checks and a server order-RPC conflict check exist; nested/live catalog recommendation safety and staff scope are not comprehensively verified. |
| USR-12 | Partial | Preference storage and local ranking exist; remote recipient separation and complete ranking behavior are unverified. |
| USR-13 | Partial | The Menu has a "Use my nutrition goals" checkbox that filters with the saved nutritional preferences. Remote target persistence and server-side filtering are still missing. |
| USR-14 | Partial | Local guardian management and remote guardian storage exist; family recipient relationship and required Admin access are not modeled by RLS. |
| USR-15 | Partial | Terms text and local acceptance timestamp exist; accepted version/consent are not consistently persisted through remote registration/profile flows. |
| USR-16 | Partial | Menu shows Breakfast (pastries and breads), Lunch and Dinner (meat: Beef, Pork, Chicken, Fish; or vegetable choices) with ₱300 on every item, "Search meals" (OSA fuzzy search across meal times), profile ranking, per-meal allergen warnings and "No meals found.". The catalog is still bundled, not the live Admin catalog. |
| USR-17 | Partial | Meal details price every item at ₱300 and adding a Lunch/Dinner item opens its customization. Live catalog/components and server availability are not wired. |
| USR-18 | Partial | One meal per meal time, three at most per day, and partial days are allowed: checkout works with one, two or three meals in any order, a chosen meal can be removed, and the tabs jump between meal times. Customization asks for a vegetable style or a meat option with a Pinoy cooking style, notes "Subject to availability and Dietitian approval.", and checks the whole plate's allergens. Dietitian approval is still a Dietitian action. |
| USR-19 | Partial | Fulfillment/address/schedule collection and server validation exist; Admin-configured hours/fees and pickup operations details are not fully implemented. |
| USR-20 | Partial | Checkout goes straight from the cart to delivery or pickup; there is no separate plan step. The summary lists each meal's meal time, customization, delivery or pickup, schedule, "Ordered by"/"Meal recipient" or "Ordered by and for". It defaults to Standard meal (₱300 per meal, total = meals × ₱300) and offers Weekly ₱4,999, Monthly ₱27,899 and Yearly ₱327,999 as an optional "Plan (optional)" choice; a chosen plan sets the total and appears on the summary and confirm screens. A new order is saved as For Dietitian Review. Open question for the group: how a plan relates to day orders (see inconsistency 9). The Supabase `place_order` RPC still totals the meals and does not take a plan. |
| USR-21 | Partial | Client-scoped backend order reads/RLS exist; staff fulfillment and payment workflow integration is missing. |
| USR-22 | Partial | Backend order detail/history reads exist; complete payment/customization data and integration verification are missing. |
| USR-23 | Partial | Status display/Realtime exist; review/payment states and authorized staff transition workflow are missing. |
| USR-24 | Partial | Order/notification Realtime subscriptions exist; status-triggered durable notifications, reconnect/offline coverage, and push delivery are not established. |
| USR-25 | Partial | Local alerts/read state exist; the screen is not wired to the remote notifications table and Admin announcements/push delivery are missing. |
| USR-26 | Partial | A labelled Help pill (`HelpButton`) now sits in the shared `PageHeader` (Home, Meal, Orders, Account) and `BackHeader`/`BackPageShell` (every sub-page, checkout step, meal detail, order detail, Notifications, Change history), plus the auth screens. The Help page itself hides it. Large-text layouts and screen-reader passes still need a manual device check. |
| USR-27 | Partial | FAQ search ignores case and extra spaces, ranks an exact match first, allows the specified typo budget, and leaves a one-character query unfiltered. |
| USR-28 | Partial | Figma welcome, stepped tour, and Help replay list cover menu, order, tracking, profile, and help with labeled screen references; viewed state remains device-local. |
| USR-29 | Partial | Signed-in Help has a comments field, rejects an empty comment, and stores the comment locally. Admin review of submitted feedback is still an Admin-module gap. |
| USR-30 | Partial | Supabase OAuth flow and mock scenarios exist; real account type selection/persistence and deployed provider configuration are incomplete. |
| USR-31 | Partial | Google profile completion UI/validation exists locally; remote completion/recipient persistence and ordering gate are missing. |
| USR-32 | Partial | Username/password and username-login function exist; integrated remote reset and Google linking parity are missing. |
| USR-33 | Partial | Local fixed-code simulator tests expiry/limits/replay; no hashed server issuance/verification or SMS/email provider delivery. |
| USR-34 | Partial | Mock link flow handles validation/conflicts; real Supabase identity linking and provider-backed verification are absent. |
| USR-35 | Partial | `getRecommendedMeals` filters local meals, limits results, and has tests for availability, conflicts, and empty results. Health/doctor restrictions and the mandatory Dietitian review-before-payment workflow are not comprehensively applied; client filtering is not clinical approval. |
| USR-36 | Partial | Home has the required three shortcuts; no-active-order now includes Browse Meals and backend load errors are distinct from empty state. Cross-screen label consistency and navigation-level tests remain outstanding. |
| USR-37 | Partial | Four Home/Meal/Orders/Account tabs and visitor Orders/Account gates exist; private-data and destination-restoration behavior lack end-to-end tests. |
| USR-38 | Partial | Local history records old/new values, including allergy-note changes ("Skin rash > Hives", tested). Account > Change history shows read-only cards newest first with date/time, field, Added/Removed or old → new value, actor, and meal recipient; empty state shows "No changes yet." Remote profile/recipient history writers are still missing. |
| USR-39 | Partial | Local nutrition solver/recommendations exist; complete safety exclusions, doctor restrictions, and Dietitian approval are missing. |
| USR-40 | Partial | Local bcrypt and Supabase Auth paths exist; remote reset/session revocation and database-level credential-storage evidence are missing. |
| USR-41 | Partial | RLS protects several owner-scoped tables; separate recipient authorization, Dietitian role/scopes, and two-client deployed policy tests are missing. |
| USR-42 | Partial | SQL hash-chain/audit functions exist and some auth/order events are recorded; profile/recipient/logout event coverage and deployed tamper tests are missing. |
| USR-43 | Partial | Registration choice is local; screen now uses the specified descriptions, missing-choice message, and profile label. Google preselection/account persistence and Admin visibility remain missing remotely. |
| USR-44 | Partial | Local family recipient fields/consent are validated and separate from user data; no remote recipient table/API or remote completion/order gate. |
| USR-45 | Partial | Family accounts have Edit meal recipient, required-field and contact checks, unsaved-back confirmation, and a history entry that leaves the account holder unchanged. Remote recipient persistence is still missing. |
| USR-46 | Partial | Home, Account, order summary (now also for For Myself accounts: "Ordered by and for"), per-meal allergen warnings on Build Today's Meals and the Menu, and family status alerts name the meal recipient. Staff-facing copies of those labels are not in this client. |
| USR-47 | Partial | Account has Delete account with the quoted warning, wrong-password message, in-progress block, and local removal. Ending every device session, Admin anonymization, and cross-user denial remain server rules. |
| USR-48 | Partial | The spec palette is unchanged and is now used through theme tokens instead of per-screen hex values. Text uses the design guide's Poppins family, loaded with `expo-font`, plus shared `type` presets for page title, subtitle, section, card, body, label and button. All client text is 16px or larger except tab-bar labels (13px under icons) and the "Suitable for you" badge (14px). Large-font layout and full screen-reader coverage still need device verification. |
| USR-49 | Partial | Static numbered terms, version/date, links, and content tests exist; offline load/retry state and blocking acceptance until text loads are absent. |
| USR-50 | Partial | A changed terms version blocks the app until the user accepts; accepting continues to the Home screen, and decline ends the session with the quoted message. The tamper-evident acceptance record is still a server audit rule. |

These are not all criterion-level passes: stories remain Partial/Missing until each numbered criterion in the source PDF is mapped to a passing automated or documented manual test. The recommendation tests are local service tests; they do not prove the live Admin catalog, backend authorization, Dietitian decisions, or payment workflow.

## 2026-11-17 design-consistency pass (Figma "FIXED 11/13/26" vs app)

This pass compared every USR frame in the designer's Figma page with the running web build. The specification still decides behaviour, labels and messages. The Figma file sets the look. Story status above is unchanged unless a row says otherwise.

| Story group | Figma vs app before this pass | Change made |
|---|---|---|
| All screens (USR-26, USR-46, USR-48) | Titles were 28–32px in different weights and positions. Help was missing on Home, Meal, Orders, meal/order detail and checkout. Sub-pages used a white app bar, and the Figma design does not. About 40 hard-coded greens/greys duplicated theme colours. Text used the system font, and the design uses Poppins. | Added Poppins (Regular/Medium/SemiBold/Bold) through `expo-font` and `@expo-google-fonts/poppins`. Added `fonts` and `type` tokens. Replaced the duplicated hex values with theme tokens. Added `PageHeader` for tab pages and `BackHeader`/`BackPageShell` for sub-pages: a back link and Help pill on the botanical background, then a left-aligned title, as in the design. Restyled Help as the design's outlined pill. |
| Navigation (USR-37) | The Figma bar shows text only with an underline. The app used a floating pill with icons and 11px labels. | Kept the app's floating bar with icons, which are easier to recognise and tap. Labels are now 13px Poppins, and the active tab gets the design's soft-green indicator. |
| Sign-up (USR-01, USR-43) | The account-purpose screen was white, with a small logo and plain text options. It had no way back to log in. | Moved it to the botanical page with the large brand block. The options are now cards with an icon tile and a radio, as in the design. The spec's descriptions and the missing-choice message are unchanged. Added "Already have an account? Log in". |
| Meals (USR-16–18) | The final meal time still said "Next · Choose Breakfast →" after all three meals were chosen. The allergy note printed "[object Object]". The Continue button was hidden below the list. | Next-step labels now go to the next empty meal time, or to "Save · Review today's meals". Fixed the allergy-name note. The primary action is now a sticky footer. Customize and Menu screens use the shared back header. |
| Checkout (USR-19–20) | Checkout pages had no back link or Help, and their titles did not match other pages. | Plan, Delivery or Pickup, delivery/pickup details, Order summary and Confirm now use `BackHeader`. The checkout title style is `type.pageTitle`. |
| Orders (USR-21–23) | The search button was cut off on narrow screens. The order detail used its own back row. | Fixed the input sizing. Order detail uses `BackHeader`. |
| Account (USR-07, USR-25, USR-38, USR-42) | Notifications had no back control. Change history and Activity record were plain text lines with a redundant Close button. | Notifications now uses `BackPageShell` (back to Account). Change history uses `ChangeHistoryCard`, matching USR 38 F1. Activity record is a divided card. Both have empty-state cards. |
| USR-40, USR-41, USR-48 | No Figma frames. | Built in the same visual language. No new screens were needed. |

Design decisions where the app's UX was kept over the Figma: the floating icon tab bar; the sticky primary action on Build Today's Meals; descriptive subtitles on the sign-up choice (spec text); 16px minimum text where the Figma uses 13–14px captions (USR-48); and the existing filter/search panel on My Orders.

## 2026-11-17 user-module accuracy pass

Changes made to follow USR-01–USR-50 more closely:

| Story | Change |
| --- | --- |
| USR-02, USR-30, USR-31 | Signing in opens the meal menu (Meal tab) instead of Home. |
| USR-50 | Accepting updated terms continues to the Home screen. |
| USR-09 | The three different condition lists are now one list matching the spec, with "Hypertension (HTN)". |
| USR-13, USR-26 | "Use my nutrition goals" filter on the Menu. |
| USR-16 | Price on every menu item, profile ranking, per-meal allergen warnings, Fish allergen on the Fish choice. |
| USR-17 | Adding a Lunch/Dinner item from its details opens the customization step. |
| USR-18 | Checkout with 1–2 meals, Remove on a chosen meal, "Next · Choose …" jump, customization is vegetable *or* meat + cooking style, whole-plate allergen check, "Subject to availability and Dietitian approval." note. |
| USR-20 | Summary shows customizations; the party lines show for every account type. The mandatory "Choose a plan" step was removed: checkout defaults to Standard meal and plans are an optional choice on the summary. |
| USR-18 | A refused meal's message now shows in the same tap (cart rules moved to `context/cartRules.ts`). |
| USR-28, USR-37 | "Search meals" on the Meal tab opens the Menu with OSA fuzzy search. |
| USR-46 | Recipient-named allergen warnings on each meal card. |

Not added: the "Suggest a day of meals" solver panel. No story asks for calorie/protein/fat targets or a suggested day; USR-13 only asks for nutritional preferences that filter the menu. `solveNutritionPlan` stays in the code and docs but is not mounted.

### Inconsistencies in the source documents (for the group to decide)

1. **Landing after login.** USR-02 no. 4 "redirect the user to the meal menu" vs USR-28 "When the Home screen opens" (first-login guide) and USR-50 H "continue to the Home screen". Implemented: menu after login, Home after accepting new terms; the guide is a global overlay so it shows either way.
2. **When family details are asked.** USR-01 C asks for the meal recipient right after the account is created; USR-43 B / USR-44 no. 1 say after the account is verified.
3. **Button label.** Resolved in the revised workbook (2026-11-19): "Sign Up" everywhere.
4. **Order status names.** USR-23 lists For Dietitian Review, Awaiting Payment, Paid, Preparing, Ready for Pickup, Out for Delivery, Completed, Cancelled; USR-47 uses "Pending … Ready for pickup, Out for delivery" and "delivered"; Figma USR 21 shows "Delivered". The staff/DB side also uses "Ready for Delivery" and "Confirmed".
5. **Quantity.** USR-26 help sample "2. Set quantity" vs USR-18 one meal per meal time (there is no quantity). Kept the sample text.
6. **Meal data.** USR-16 lists meat choices (Beef, Pork, Chicken, Fish) and vegetable choices; USR-12/USR-46 samples use named dishes (Chicken Tinola, Grilled Bangus, Ampalaya Stir-fry, "Chicken Satay" vs "Chicken Satay with Peanut Sauce"). Figma USR 16 vegetables are Pinakbet, Chopsuey, Sautéed Green Beans, Steamed Pechay; USR-18 says steamed, stir-fried, Pinakbet; Figma USR 2 says "Pakbet"; Figma breads add "Pan de Coco".
7. **Customization shape.** USR-18 B "vegetables or meat" vs Figma "Build Your Lunch" combining Vegetables + Meat + Cooking Style. Implemented the spec (one or the other).
8. **Prices.** ₱300 standard (USR-17/20/49) vs Figma USR 37 F2, 26 F3, 46 F3 (₱180, ₱170, ₱150, ₱165; total ₱350).
9. **Plans vs day orders (still open).** USR-20 offers Weekly ₱4,999 / Monthly ₱27,899 / Yearly ₱327,999 for "meals for the day or a meal plan", but USR-18 caps an order at 3 meals per day and nothing says how many meals a plan covers or how later day orders are charged. Implemented (approved by Michael): Standard meal is the default (meals × ₱300); choosing a plan on the order summary makes the total the plan price. The group still needs to define plan coverage.
10. **Nutrition filter.** USR-26 label "Use my nutrition goals" vs Figma USR 26 F3 filters "No peanuts / No shellfish / Low sodium".
11. **HTN label.** USR-09 criterion "HTN", scenario "Hypertension (HTN)", USR-07 sample "Hypertension". Implemented "Hypertension (HTN)".
12. **Figma messages not in the spec.** USR 2 F5 "Account locked." (spec: "Your account is locked. Please reset your password or contact support."); USR 5 F6 "Your verification could not be confirmed. Please request a new code."; USR 4 F4 "Reset code requested." and "Resend" (spec: "Resend code"); USR 17 F2 "This meal is currently unavailable. Please choose another meal."; USR 18 F5 shrimp-paste message; USR 20 F5 payment methods (GCash, Maya, card). The app uses the spec wording.
13. **Sample ids.** USR-49 "Order #00350" vs user tracking ids "TRK-2026-…".
14. **Allergen meals.** USR-46 D warns when adding a meal with a listed allergen; the app's meal details block adding it (stricter, kept).
15. **Missing Figma frames.** No frames for USR 40, 41, 48.
16. **Cross-module.** The Admin console keeps its own local orders and statuses; there is no Dietitian database role; the spec mentions Expo Router but the app uses React Navigation.


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

Checked against `frontend/.env` and the running Expo process on 2026-11-14. Values are not recorded here.

- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set. Expo loads them, Auth health returns 200, and the anon key can see `meals`, `profiles`, `orders`, and `notifications`. Apply [`supabase/migrations/20261115143000_sync_user5_menu_catalog.sql`](../supabase/migrations/20261115143000_sync_user5_menu_catalog.sql) so `meals` includes the app menu (`client_meal_key` matches frontend meal ids). `menu_items` and `staff` are not tables in this project.
- SMS and email providers are still not configured. Google OAuth is a Supabase Auth provider setting, not an app environment variable. The client secret must stay in the Supabase dashboard.
- The in-app Admin console (`frontend/src/admin`) has Admin, Dietitian, Kitchen, and Delivery roles, but it keeps its own local order list. It does not read or update the user app's Supabase orders. Its statuses are Pending, Preparing, Delivered, and Cancelled. The database roles are `client`, `owner_admin`, `kitchen_staff`, and `delivery_staff`, with no Dietitian role.
- The specification says Expo Router in project guidance while the current app uses React Navigation. This plan preserves the existing navigation until the migration is implemented deliberately; no mixed routing architecture should be introduced.
- Existing plan/biometric/demo behavior is outside USR-01–USR-50. It will not be used to satisfy stories; removal or retention must be decided when the corresponding UI surfaces are refactored.
