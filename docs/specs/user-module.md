# User Module specification (current)

**Authority:** Updated spreadsheet export (Nov 2026) — [`canonical/user-module.export.md`](./canonical/user-module.export.md). PDF (may lag): [`FIL_Foods_User_Module.pdf`](./FIL_Foods_User_Module.pdf).

This document is the working index. Verbatim handoff: [`.github/Meal_Service_User_Stories_AI_Agent_Handoff.md`](../../.github/Meal_Service_User_Stories_AI_Agent_Handoff.md). Refresh: [`canonical/README.md`](./canonical/README.md). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). User implementation status: [`docs/implementation-traceability.md`](../implementation-traceability.md). Staff modules: [`implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not implement against the retired USR-01–USR-42 handoff. Unresolved conflicts with other modules (Admin, Dietitian, Kitchen, Delivery) must be recorded, not silently reinterpreted. Spreadsheet Passed / Failed / Total rows are test status, not features.

## Scope

USR-01 through USR-50. The PDF adds USR-43–USR-50 and revises earlier stories so that:

- The **user** is the person who registers, logs in, and receives notifications.
- The **meal recipient** is the person whose health, dietary, and delivery information the meals follow.
- An account is either **Signing Up for Myself** or **Signing Up for a Family Member** (one meal recipient per account).
- Orders go through Dietitian review and payment before Kitchen release, where those stories require it.

## Module precondition and postcondition

**Precondition:** The user has a registered, verified account (or one created by Admin), is logged in, and Admin has set up meals and the menu. The account is For Myself (user is also the meal recipient) or for a Family Member (user manages the account for another meal recipient).

**Postcondition:** The user's profile, the meal recipient's profile, or the order is saved with a unique reference; order status and notifications are updated; the action is logged under the user's account with the user who made it and the meal recipient it concerns. Notifications go to the user; health, dietary, and delivery information belongs to the meal recipient.

## Story catalog

| ID | Epic | I want to |
|---|---|---|
| USR-01 | Authentication & Account Management | Sign up for myself or a family member with first name, last name, contact number, address, email, and password |
| USR-02 | Authentication & Account Management | Log in with my registered username and password |
| USR-03 | Authentication & Account Management | Stay logged in on my device |
| USR-04 | Authentication & Account Management | Request help when I forget my password |
| USR-05 | Authentication & Account Management | Set a new password after verifying my identity |
| USR-06 | Authentication & Account Management | Log out of my account |
| USR-07 | User Profile & Dietary Information | View my profile and the meal recipient's profile on one screen |
| USR-08 | User Profile & Dietary Information | Edit my own personal information |
| USR-09 | User Profile & Dietary Information | Select a health condition or enter a doctor-given dietary restriction |
| USR-10 | User Profile & Dietary Information | Record dietary restrictions and food preferences |
| USR-11 | User Profile & Dietary Information | Record food allergies |
| USR-12 | User Profile & Dietary Information | Add the meal recipient's meal preferences |
| USR-13 | User Profile & Dietary Information | Update the meal recipient's nutritional preferences |
| USR-14 | User Profile & Dietary Information | Add a guardian or family contact for the meal recipient |
| USR-15 | User Profile & Dietary Information | View the Terms and Conditions |
| USR-16 | Meals & Ordering | Browse available meals by meal time and food category |
| USR-17 | Meals & Ordering | View meal details and ingredients |
| USR-18 | Meals & Ordering | Choose one meal per meal time and customize the choice |
| USR-19 | Meals & Ordering | Choose delivery or pickup |
| USR-20 | Meals & Ordering | Review selections, confirm the order, and pay after Dietitian approval |
| USR-21 | Orders | View submitted orders and payment status |
| USR-22 | Orders | View full details of an order |
| USR-23 | Orders | Check order status (review, payment, preparation, delivery, or pickup) |
| USR-24 | Orders | Receive updates when order status changes |
| USR-25 | Orders | Receive updates about my order |
| USR-26 | Help & Assistance | View help instructions |
| USR-27 | Help & Assistance | View frequently asked questions |
| USR-28 | Help & Assistance | Access a basic navigation guide |
| USR-29 | Help & Assistance | Send comments or suggestions about meals and service |
| USR-30 | Authentication & Account Management | Continue with Google to sign up or log in |
| USR-31 | Authentication & Account Management | Complete my profile after continuing with Google |
| USR-32 | Authentication & Account Management | Use username and password instead of Google |
| USR-33 | Authentication & Account Management | Verify my account with an SMS or email code |
| USR-34 | Authentication & Account Management | Link Google to my existing account |
| USR-35 | Home & Navigation | View meal recommendations based on allergies and recorded restrictions |
| USR-36 | Home & Navigation | Use Home shortcuts for common tasks |
| USR-37 | Home & Navigation | Move between Home, Meal, Orders, and Account |
| USR-38 | User Profile & Dietary Information | Review history of changes to the meal recipient's health and dietary information |
| USR-39 | Meals & Ordering | See meal suggestions that match recorded dietary information and preferences |
| USR-40 | Authentication & Account Management | Use a password-based account with secure password storage |
| USR-41 | Authentication & Account Management | Access only the information and actions allowed for my role |
| USR-42 | Security & Auditability | See a record of important profile changes that cannot be quietly rewritten |
| USR-43 | Authentication & Account Management | Choose Signing Up for Myself or Signing Up for a Family Member |
| USR-44 | User Profile & Dietary Information | Enter family-member meal recipient details, kept separate from my account |
| USR-45 | User Profile & Dietary Information | Update meal recipient details without changing my own account details |
| USR-46 | User Profile & Dietary Information | See clearly who is using the app and who the meals are for on every screen |
| USR-47 | Authentication & Account Management | Delete my account |
| USR-48 | User Interface & Accessibility | Use a clear, accessible interface |
| USR-49 | User Profile & Dietary Information | Read Terms and Conditions in clear numbered sections |
| USR-50 | User Profile & Dietary Information | Accept or decline Terms and Conditions, and accept again when they change |

## Added in this module (not in USR-01–USR-42)

| ID | What it adds |
|---|---|
| USR-43 | Account-purpose choice before the sign-up form |
| USR-44 | Separate family meal-recipient record and management confirmation |
| USR-45 | Edit meal recipient without editing the account holder |
| USR-46 | User vs meal recipient labeling on screens, orders, and notifications |
| USR-47 | Delete account, with in-progress order and audit rules |
| USR-48 | Accessibility (palette, 16px minimum, large text, screen reader) |
| USR-49 | Versioned, numbered Terms and Conditions content |
| USR-50 | Acceptance recording, re-accept on new version, decline/session rules |

USR-01, USR-07–USR-14, USR-16–USR-20, USR-27 (fuzzy FAQ), USR-29 (feedback), USR-43–USR-50, and order/profile stories were rewritten around recipient separation, meal-time ordering, Dietitian review, payment, accessibility, and versioned Terms.

## Cross-module chain (from the PDF)

User (USR-20) submits order → Dietitian reviews suitability (DIT-15) → User pays after approval → Kitchen receives approved, paid order (KIT-11 to KIT-13) → Admin assigns delivery staff where needed (ADM-12) → Delivery Staff updates delivery status (DEL-15 to DEL-17). For pickup, Kitchen marks Ready for Pickup and the order is completed after collection. Admin manages the menu and availability used by the User menu (ADM-17 and ADM-18).
