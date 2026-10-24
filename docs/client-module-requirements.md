# Client module tracker

Source: `User_Story_v2.08.10.2026.xlsx`, Client Module, 18 pages. Stories CLT-01 through CLT-46.

Last checked: 25 Oct 2026. Command: `npm test` in `frontend/` — 88 passed, 0 failed.

Use this file when a change lands. Set a row back to IN PROGRESS if the code it names is edited. Do not mark PASS without a test, a screen check, or a named blocker.

Statuses: PASS, SIMULATED, PARTIAL, BLOCKED, NOT VERIFIED, IN PROGRESS.

Sample login: `msantos` / `Meal@2026`.

## Still short of a full pass

These rows are the ones that are not PASS.

| ID | Status | What is left |
| --- | --- | --- |
| CLT-01-AC-08 | BLOCKED | Password is `plaintext-demo` in memory. Argon2id or bcrypt needs a backend. |
| CLT-03-AC-03 | PARTIAL | Unticked session ends on reload. The story also says "after a period of inactivity" and does not say how long, so no timer was invented. |
| CLT-09-AC-05 | BLOCKED | Kitchen Staff cannot see conditions. No staff app in this repo. |
| CLT-11-AC-05 | BLOCKED | Kitchen Staff cannot see allergies. |
| CLT-14-AC-05 | BLOCKED | Admin cannot see the guardian. |
| CLT-25-AC-01 | SIMULATED | Status refreshes from this app's order store about every 4 seconds. No staff client pushes a change. |
| CLT-27-AC-05 | NOT VERIFIED | VoiceOver and TalkBack were not run. |
| CLT-30-AC-02 | NOT VERIFIED | The number builds a `tel:` link. The phone dialer was not opened on a device. |
| CLT-31 all | SIMULATED | No Google SDK. Dev uses the outcome picker. |
| CLT-34-AC-02 | SIMULATED | Code is always `123456`. Nothing is sent. The SMS and email text are shown on screen. |
| CLT-36-AC-02 | PARTIAL | Home uses the draft "Food is Life" paragraph. The business has not approved final copy. |
| CLT-38-AC-01 | PARTIAL | Visitors have Home, Plans, About, Account. Signed-in clients use Meals, Order, Tracking, Alerts, Profile. |
| CLT-39-AC-05 | SIMULATED | Prices live in `planService` and a test can change them. There is no Admin screen. |
| CLT-43 | PARTIAL | Discount math is tested on a 480 subtotal. Chicken Tinola is PHP 120.00, so two servings are PHP 240.00. The story's "x2 at PHP 240.00 = PHP 480.00" line conflicts with CLT-18. |
| CLT-44 device prompt | NOT VERIFIED | Rules are tested with an injected device result. Real Face ID or fingerprint was not run. The option is hidden in the browser. |
| CLT-45-AC-03 | BLOCKED | History is append-only for the client. Admin cannot open it. |

## CLT-01 Register an account

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-01-AC-01 | First name, last name, contact, email, username, and password required. Middle name and suffix optional. Valid details open Verify your account. | PASS |
| CLT-01-AC-02 | Blank required field: "Please fill in all required fields." | PASS |
| CLT-01-AC-03 | Contact must be 11 digits with no letters: "Please enter a valid contact number." | PASS |
| CLT-01-AC-04 | Bad email: "Please enter a valid email address." | PASS |
| CLT-01-AC-05 | Duplicate username or contact, and duplicate email, use the two specified sentences. | PASS |
| CLT-01-AC-06 | Shorter than 8 characters: "Password must be at least 8 characters." | PASS |
| CLT-01-AC-07 | Terms must be accepted before the account is created. | PASS |
| CLT-01-AC-08 | Password stored only as a salted Argon2id or bcrypt hash. Account stays unverified until CLT-34. | BLOCKED |
| CLT-01-AC-09 | "Continue with Google" on the registration screen. | SIMULATED |

## CLT-02 Log in

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-02-AC-01 | Username and password required. | PASS |
| CLT-02-AC-02 | Bad credentials: "Invalid username or password." | PASS |
| CLT-02-AC-03 | Lock after five consecutive failures. | PASS |
| CLT-02-AC-04 | Success opens the meal menu. | PASS |
| CLT-02-AC-05 | Login and logout times are recorded. | PASS |
| CLT-02-AC-06 | Locked account: "Your account is locked. Please reset your password or contact support." Stays locked until reset. | PASS |
| CLT-02-AC-07 | Lockout does not apply to Google-only accounts. | PASS |
| CLT-02-AC-08 | Unverified account: "Please verify your account first." Opens Verify your account. | PASS |
| CLT-02-AC-09 | More than 10 attempts in a minute: "Too many attempts. Please wait a minute and try again." Those attempts do not count toward the lock. | PASS |

## CLT-03 Keep me logged in

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-03-AC-01 | Checkbox on the login screen. | PASS |
| CLT-03-AC-02 | Ticked session survives reload. Password is not stored. | PASS |
| CLT-03-AC-03 | Unticked session ends on reload. Inactivity length is not specified. | PARTIAL |
| CLT-03-AC-04 | Password change requires login again. | PASS |

## CLT-04 Forgot password

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-04-AC-01 | Reset with contact or email, then SMS or email. | PASS |
| CLT-04-AC-02 | Unknown contact or email uses the two "No account found" sentences. | PASS |
| CLT-04-AC-03 | 6-digit code uses the CLT-34 rules. Test code 123456. | SIMULATED |
| CLT-04-AC-04 | New password screen opens only after a correct unexpired code. | PASS |
| CLT-04-AC-05 | Google-only account: "This account signs in with Google. Please use that option to log in." No code is sent. | PASS |

## CLT-05 Set a new password

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-05-AC-01 | Only after a reset grant. Password entered twice. No grant returns to Forgot password. | PASS |
| CLT-05-AC-02 | Mismatch: "Passwords do not match." | PASS |
| CLT-05-AC-03 | Shorter than 8: "Password must be at least 8 characters." | PASS |
| CLT-05-AC-04 | Current password is rejected. The story quotes no sentence. The app uses "New password must be different from your current password." | PASS |
| CLT-05-AC-05 | Success: "Password updated. Please log in." | PASS |
| CLT-05-AC-06 | Other sessions end. Lock is cleared. | PASS |

## CLT-06 Log out

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-06-AC-01 | Log out is on Profile. | PASS |
| CLT-06-AC-02 | "Are you sure you want to log out?" | PASS |
| CLT-06-AC-03 | Yes returns to login. No keeps the session. | PASS |
| CLT-06-AC-04 | Logout date and time are recorded. | PASS |

## CLT-07 View profile

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-07-AC-01 | Name, contact, email, and address. Sample: Maria Santos, 09171234567, maria.santos@gmail.com, 12 Mabini St., Quezon City. | PASS |
| CLT-07-AC-02 | Health, restrictions, allergies, and meal preferences. | PASS |
| CLT-07-AC-03 | Guardian when one exists. Jose Santos, Son. | PASS |
| CLT-07-AC-04 | Last updated date. | PASS |

## CLT-08 Edit personal information

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-08-AC-01 | Edit name, suffix, contact, email, and address. | PASS |
| CLT-08-AC-02 | Invalid contact or email uses the two format sentences. | PASS |
| CLT-08-AC-03 | Blank first name, last name, or email uses the required-fields sentence. | PASS |
| CLT-08-AC-04 | New contact or email is saved only after the correct CLT-34 code. Wrong code keeps the old value. | SIMULATED |
| CLT-08-AC-05 | Value owned by another account uses the duplicate sentences. | PASS |
| CLT-08-AC-06 | "Profile updated successfully." | PASS |
| CLT-08-AC-07 | Unsaved leave asks for confirmation. The story quotes no sentence. The app uses "Discard unsaved changes?" | PASS |

## CLT-09 Health conditions

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-09-AC-01 | List plus Other. Samples include Hypertension, Diabetes, and Gout. | PASS |
| CLT-09-AC-02 | Update or remove a condition. | PASS |
| CLT-09-AC-03 | "Health information saved." | PASS |
| CLT-09-AC-04 | Last updated changes. | PASS |
| CLT-09-AC-05 | Kitchen Staff can see the conditions on an active order. | BLOCKED |

## CLT-10 Dietary restrictions

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-10-AC-01 | List plus Other. | PASS |
| CLT-10-AC-02 | Remove a restriction. | PASS |
| CLT-10-AC-03 | Matching meals are highlighted. | PASS |
| CLT-10-AC-04 | "Dietary restrictions saved." | PASS |

## CLT-11 Food allergies

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-11-AC-01 | Common allergens plus a manual entry and a reaction note. | PASS |
| CLT-11-AC-02 | Reaction note per allergy. | PASS |
| CLT-11-AC-03 | "Food allergies saved." | PASS |
| CLT-11-AC-04 | Compared when meals are viewed and ordered, including sauces. | PASS |
| CLT-11-AC-05 | Kitchen Staff can see allergies on an active order. | BLOCKED |

## CLT-12 Meal preferences

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-12-AC-01 | Preferred categories and disliked ingredients. | PASS |
| CLT-12-AC-02 | Update or remove preferences. | PASS |
| CLT-12-AC-03 | Matching meals sort first. | PASS |
| CLT-12-AC-04 | "Meal preferences saved." | PASS |
| CLT-12-AC-05 | Score +3 category, +2 restriction, +1 nutrition, -3 per dislike. Allergen meals last with no bonus. Ties alphabetical. Sample: Tinola 5, Bangus 5, Satay last. | PASS |

## CLT-13 Nutritional preferences

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-13-AC-01 | Lower calories, higher protein, lower sodium. | PASS |
| CLT-13-AC-02 | Selection can be changed. | PASS |
| CLT-13-AC-03 | Meal list can be filtered by the saved preference. | PASS |
| CLT-13-AC-04 | "Nutritional preferences updated." | PASS |

## CLT-14 Guardian

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-14-AC-01 | Name, relationship, and contact. Sample Jose Santos / Son / 09189876543. | PASS |
| CLT-14-AC-02 | "Please enter the guardian's name and contact number." | PASS |
| CLT-14-AC-03 | Update or remove. | PASS |
| CLT-14-AC-04 | "Guardian information saved." | PASS |
| CLT-14-AC-05 | Admin can view the guardian. | BLOCKED |

## CLT-15 Terms and Conditions

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-15-AC-01 | Open from registration and from Profile. | PASS |
| CLT-15-AC-02 | "You must accept the Terms and Conditions to continue." | PASS |
| CLT-15-AC-03 | Acceptance date and time are stored. | PASS |
| CLT-15-AC-04 | Text states how health and dietary information is collected and used. Final charter wording is still a draft. | PASS |

## CLT-16 Search and filter meals

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-16-AC-01 | Meals show name and category. | PASS |
| CLT-16-AC-02 | Search by name. | PASS |
| CLT-16-AC-03 | Filter by category, dietary restriction, and allergen-free. | PASS |
| CLT-16-AC-04 | Profile matches are highlighted. | PASS |
| CLT-16-AC-05 | Small spelling mistakes, case ignored, closest first. Nothing close: "No meals found. Try a different name." | PASS |

## CLT-17 Meal details

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-17-AC-01 | Ingredients and allergens. | PASS |
| CLT-17-AC-02 | Calories, protein, carbohydrates, fat, sodium. Tinola: 320 kcal, 28 g, 12 g, 15 g, 480 mg. | PASS |
| CLT-17-AC-03 | Portion and price. 1 bowl (350 g), PHP 120.00. | PASS |
| CLT-17-AC-04 | "This meal contains [allergen], which is listed in your profile." | PASS |
| CLT-17-AC-05 | Unavailable meal: "This meal is no longer available." | PASS |
| CLT-17-AC-06 | Allergens are found from ingredients and sauces, not only tags. | PASS |

## CLT-18 Quantity

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-18-AC-01 | Add a meal with a quantity. Tinola x2 is PHP 240.00. | PASS |
| CLT-18-AC-02 | Whole numbers greater than zero only. | PASS |
| CLT-18-AC-03 | 0 or negative: "Quantity must be greater than zero." | PASS |
| CLT-18-AC-04 | Change or remove before confirmation. | PASS |
| CLT-18-AC-05 | Total is computed and read-only. | PASS |

## CLT-19 Delivery or pickup

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-19-AC-01 | Delivery or pickup is required. The story quotes no sentence. The app uses "Choose delivery or pickup." | PASS |
| CLT-19-AC-02 | Blank delivery address: "Please enter a delivery address." | PASS |
| CLT-19-AC-03 | Past schedule: "The schedule cannot be earlier than the current date and time." | PASS |
| CLT-19-AC-04 | Instructions are optional. | PASS |
| CLT-19-AC-05 | Lead time 24 hours: "Please choose a time at least 24 hours from now." | PASS |
| CLT-19-AC-06 | Kitchen hours: "The kitchen is closed at that time. Orders can be scheduled Monday to Saturday, 7:00 AM to 6:00 PM." | PASS |

## CLT-20 Confirm an order

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-20-AC-01 | Summary shows meals, quantities, prices, total, fulfillment, schedule, and instructions. | PASS |
| CLT-20-AC-02 | Allergen warning on the summary. | PASS |
| CLT-20-AC-03 | Edit before confirm. | PASS |
| CLT-20-AC-04 | Unique tracking number. Status Confirmed. | PASS |
| CLT-20-AC-05 | "Order placed successfully." Amounts in Philippine Peso with two decimals. | PASS |
| CLT-20-AC-06 | Active plan shows a discount line and the total after discount. | PASS |
| CLT-20-AC-07 | One order if Confirm is repeated. Button shows "Placing your order..." | PASS |
| CLT-20-AC-08 | Allergies are re-checked at confirm. Client removes the meal or ticks "I understand." | PASS |

## CLT-21 View orders

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-21-AC-01 | Tracking number, date, meals, and status. | PASS |
| CLT-21-AC-02 | Newest ongoing orders first. | PASS |
| CLT-21-AC-03 | Filter by status and date range. | PASS |
| CLT-21-AC-04 | "You have no orders yet." | PASS |

## CLT-22 Order details

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-22-AC-01 | Tracking number, meals with quantities, and total. | PASS |
| CLT-22-AC-02 | Fulfillment, schedule, address, and instructions. | PASS |
| CLT-22-AC-03 | Status history with date and time. | PASS |
| CLT-22-AC-04 | "Order not found." | PASS |

## CLT-23 Find by tracking number

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-23-AC-01 | Tracking number on confirmation and in details. | PASS |
| CLT-23-AC-02 | Search by tracking number. | PASS |
| CLT-23-AC-03 | Another client's number: "Order not found." | PASS |

## CLT-24 Order status

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-24-AC-01 | Confirmed, Preparing, Ready for Pick-up, Ready for Delivery, Out for Delivery, Completed. | PASS |
| CLT-24-AC-02 | Only the statuses for that fulfillment type. | PASS |
| CLT-24-AC-03 | Color plus a text label. | PASS |

## CLT-25 Live updates

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-25-AC-01 | Status updates without a manual refresh when it changes in the store. | SIMULATED |
| CLT-25-AC-02 | Ongoing orders ahead of completed orders. | PASS |
| CLT-25-AC-03 | Date and time of the latest update. | PASS |
| CLT-25-AC-04 | "Unable to refresh. Please check your connection." | PASS |

## CLT-26 Notifications

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-26-AC-01 | Notification on confirm, status change, cancel, or issue. | PASS |
| CLT-26-AC-02 | Shown with date and time. | PASS |
| CLT-26-AC-03 | Unread is marked. Read items stay in the list. | PASS |
| CLT-26-AC-04 | Admin announcements appear in the same list. | SIMULATED |

## CLT-27 Help and accessible controls

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-27-AC-01 | How to place an order: Choose meals, Set quantity, Pick delivery or pickup, Review, Confirm. | PASS |
| CLT-27-AC-02 | Help is reachable from Menu, Profile, Order, and Tracking. | PASS |
| CLT-27-AC-03 | Readable text and labeled buttons. Help body is 16px. | PASS |
| CLT-27-AC-04 | Buttons and links at least 44 pt / 48 dp. | PASS |
| CLT-27-AC-05 | VoiceOver and TalkBack announce every control. | NOT VERIFIED |
| CLT-27-AC-06 | Text size up to 200% does not hide content. Scaling is allowed. A 200% device pass was not done. | NOT VERIFIED |

## CLT-28 FAQ

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-28-AC-01 | Groups: Account, Ordering, Delivery, Health Information. | PASS |
| CLT-28-AC-02 | Keyword search. "password" finds a match. | PASS |
| CLT-28-AC-03 | "No answers found." | PASS |

## CLT-29 App guide

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-29-AC-01 | Guide covers menu, order, tracking, profile, and help. Shown on first login. | PASS |
| CLT-29-AC-02 | Can be opened again from Help. | PASS |
| CLT-29-AC-03 | Each step has a short description and a labeled screen reference. | PASS |

## CLT-30 Contact

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-30-AC-01 | 0917-555-0123, support@mealservice.ph, Mon-Sat 7:00 AM-6:00 PM. | PASS |
| CLT-30-AC-02 | Tapping the number opens the dialer. | NOT VERIFIED |
| CLT-30-AC-03 | The number can be changed in the help content. Sample 0917-555-0199. | SIMULATED |

## CLT-31 Continue with Google

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-31-AC-01 | Button on login and registration. | SIMULATED |
| CLT-31-AC-02 | Existing account signs in. A new account is created once. | SIMULATED |
| CLT-31-AC-03 | Google email is treated as verified. New user goes to Complete profile. Finished profile opens the menu. | SIMULATED |
| CLT-31-AC-04 | Email already registered: "An account with this email already exists. Log in to link your Google account." | SIMULATED |
| CLT-31-AC-05 | Cancel: "Sign in with Google was cancelled." | SIMULATED |
| CLT-31-AC-06 | Refused name or email: "Continue with Google needs your name and email address to create your account." | SIMULATED |
| CLT-31-AC-07 | Unreachable: "Unable to continue with Google. Please check your connection and try again." | SIMULATED |
| CLT-31-AC-08 | Inactive: "This account is inactive. Please contact support." | SIMULATED |
| CLT-31-AC-09 | Account picker. Each Google account is a separate client. | SIMULATED |
| CLT-31-AC-10 | Login time is recorded. Keep me logged in applies. No password is stored. | SIMULATED |

## CLT-32 Complete profile

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-32-AC-01 | First name, last name, and contact required. Email is filled and not sent a code. Username and password are not required. | PASS |
| CLT-32-AC-02 | Blank required field uses the required-fields sentence. | PASS |
| CLT-32-AC-03 | Invalid contact uses the contact sentence. | PASS |
| CLT-32-AC-04 | No code is sent to the Google email. | PASS |
| CLT-32-AC-05 | Contact already used: "This username or contact number is already registered." Accounts are not linked. | PASS |
| CLT-32-AC-06 | Terms required, with the terms sentence, and the time is stored. | PASS |
| CLT-32-AC-07 | The menu stays closed until the profile is saved. | PASS |

## CLT-33 Username and password still work

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-33-AC-01 | Registration and login work without Google. | PASS |
| CLT-33-AC-02 | Matching email does not link accounts by itself. | PASS |
| CLT-33-AC-03 | Password reset is only for accounts that have a password. | PASS |
| CLT-33-AC-04 | Both sign-in methods use the same signed-in tabs. | PASS |

## CLT-34 Verify with a code

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-34-AC-01 | "Send code by SMS" and "Send code by email", with the number and email partly hidden. | PASS |
| CLT-34-AC-02 | 6-digit code and the specified SMS and email text. | SIMULATED |
| CLT-34-AC-03 | Correct code: "Your account is verified." | PASS |
| CLT-34-AC-04 | After 10 minutes: "The verification code has expired." | PASS |
| CLT-34-AC-05 | Wrong code: "Incorrect verification code." | PASS |
| CLT-34-AC-06 | A new code invalidates the previous one. | PASS |
| CLT-34-AC-07 | Five wrong entries: "Too many incorrect attempts. Please request a new code." | PASS |
| CLT-34-AC-08 | An unverified account cannot log in. Plans and orders use the same flag. | PASS |
| CLT-34-AC-09 | The same rules are used for password reset and for a changed contact or email. | PASS |
| CLT-34-AC-10 | Send failure: "We could not send the code. Please try again or use the other method." | PASS |
| CLT-34-AC-11 | Each code works once. | PASS |
| CLT-34-AC-12 | 60-second wait: "Please wait [n] seconds before requesting a new code." | PASS |
| CLT-34-AC-13 | Five codes an hour: "Too many code requests. Please try again in an hour." | PASS |

## CLT-35 Link Google

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-35-AC-01 | Link screen shows the email-exists sentence and username and password fields. | SIMULATED |
| CLT-35-AC-02 | Link only after the correct password. "Your Google account is linked." | SIMULATED |
| CLT-35-AC-03 | Wrong password uses the login sentence and the five-attempt lock. | PASS |
| CLT-35-AC-04 | Cancel links nothing. Forgot password opens CLT-04. | PASS |
| CLT-35-AC-05 | "This Google account is already linked to another account." | SIMULATED |
| CLT-35-AC-06 | After linking, Google and the password open the same account. | SIMULATED |

## CLT-36 Home

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-36-AC-01 | Home explains customized, dietitian-approved meals with delivery or pickup. | PASS |
| CLT-36-AC-02 | "Food is Life" heading and explanation. Draft text, pending business approval. | PARTIAL |
| CLT-36-AC-03 | Visitors see Get started and Log in. | PASS |
| CLT-36-AC-04 | Short sentences and readable text. | PASS |

## CLT-37 How it works

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-37-AC-01 | Five numbered steps with a title and one line. | PASS |
| CLT-37-AC-02 | "Choose a plan" opens Plans. | PASS |
| CLT-37-AC-03 | Get started opens registration for a visitor. | PASS |

## CLT-38 Bottom menu

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-38-AC-01 | Home, Plans, About, and Account, with the current item highlighted. | PARTIAL |
| CLT-38-AC-02 | Account opens login for a visitor and Profile for a signed-in client. | PASS |
| CLT-38-AC-03 | About opens help and service information. | PASS |

## CLT-39 View plans

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-39-AC-01 | Heading "Simple plans. Powerful benefits." and the no-lock-in line. Weekly, Monthly, Yearly. | PASS |
| CLT-39-AC-02 | Name, price, period, tagline, three benefits, and a button named for the plan. | PASS |
| CLT-39-AC-03 | "No lock-in — change or cancel anytime" below the card. | PASS |
| CLT-39-AC-04 | Visitors can view plans. | PASS |
| CLT-39-AC-05 | Prices are the ones set for the client to read. No Admin screen. | SIMULATED |

## CLT-40 Switch plan period

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-40-AC-01 | Opens on Weekly. | PASS |
| CLT-40-AC-02 | The selected period is the only one highlighted, and the card updates immediately. | PASS |
| CLT-40-AC-03 | The period is kept when returning from a cancelled summary. | PASS |

## CLT-41 Choose a plan

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-41-AC-01 | Buttons: Choose weekly, Choose monthly, Choose yearly. | PASS |
| CLT-41-AC-02 | Visitor: "Please log in or create an account to choose a plan." | PASS |
| CLT-41-AC-03 | Summary shows name, price, period, benefits, and the no-lock-in note, then asks to confirm. | PASS |
| CLT-41-AC-04 | Confirm: "Your [period] plan is active." Start and renewal dates are shown. | PASS |
| CLT-41-AC-05 | Cancel starts no plan. | PASS |
| CLT-41-AC-06 | Active plan shows "Current plan" and cannot be chosen again. | PASS |
| CLT-41-AC-07 | Unverified account: "Please verify your account first." Incomplete Google profile opens CLT-32. | PASS |

## CLT-42 Change or cancel a plan

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-42-AC-01 | Profile shows the plan, price, renewal, Change plan, and Cancel plan. | PASS |
| CLT-42-AC-02 | Change applies at the end of the current period after confirmation. | PASS |
| CLT-42-AC-03 | Cancel asks for confirmation and states the last usable date. | PASS |
| CLT-42-AC-04 | No cancellation fee and no minimum period. | PASS |
| CLT-42-AC-05 | After cancelling, the client can choose a plan again. | PASS |

## CLT-43 Plan discount

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-43-AC-01 | Active plan discount is a separate line, with the total after discount. | PASS |
| CLT-43-AC-02 | Weekly 5%, monthly 15%, yearly 75%, never above those caps. The 480-peso sample is tested. The Tinola line total in CLT-18 is 240. | PARTIAL |
| CLT-43-AC-03 | No discount line when there is no active plan. | PASS |
| CLT-43-AC-04 | Amounts in Philippine Peso with two decimals. | PASS |

## CLT-44 Biometric unlock

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-44-AC-01 | "Unlock with fingerprint or face" only when the device supports biometrics and one is enrolled. Turning it on requires the password. | PASS |
| CLT-44-AC-02 | Prompt on reopen or after 5 minutes in the background. | PASS |
| CLT-44-AC-03 | "Biometric not recognised. Try again or use your password." After three failures, the password is required. | PASS |
| CLT-44-AC-04 | "Use password" is available. Failures do not count toward the login lock. | PASS |
| CLT-44-AC-05 | Logout, password change, or a change in enrolled biometrics turns the option off. | PASS |
| CLT-44-AC-06 | No fingerprint or face data is stored. | PASS |
| CLT-44-AC-07 | The client can turn the option off. | PASS |
| CLT-44-device | A real device prompt was not run. | NOT VERIFIED |

## CLT-45 Change history

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-45-AC-01 | Health, diet, and allergy changes record before, after, who, and when. | PASS |
| CLT-45-AC-02 | Profile opens "Change history", newest first. | PASS |
| CLT-45-AC-03 | The client cannot edit or delete entries. Admin access is not built. | BLOCKED |
| CLT-45-AC-04 | "No changes yet." | PASS |

## CLT-46 Recommended meals

| ID | Criterion | Status |
| --- | --- | --- |
| CLT-46-AC-01 | "Recommended for you", up to 5 meals. | PASS |
| CLT-46-AC-02 | No allergen, disliked ingredient, restriction conflict, or unavailable meal. | PASS |
| CLT-46-AC-03 | Ordered with the CLT-12 score, with a reason. | PASS |
| CLT-46-AC-04 | Empty profile: "Complete your profile to get recommendations." | PASS |
| CLT-46-AC-05 | The list updates when the profile changes. | PASS |
| CLT-46-AC-06 | "Recommendations are suggestions only. Please follow the advice of your doctor or dietitian." | PASS |

## Where the checks live

`frontend/package.json` script `test` runs the registration, terms, verification, session, auth, Google, profile, order, plan, help, tracking, and biometric tests.
