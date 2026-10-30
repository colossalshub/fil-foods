# Meal Service Application — User Story Specification

**Source:** `User_Story_v3_29.10.2026.xlsx`
**Worksheet:** User Module
**User stories found:** 42 (USR-01 through USR-42)

## Global precondition
Precondition: The client has a registered account (or one created by the Admin), is logged in to the meal service application, and the meals and menu have already been set up by the Admin.

## Global postcondition
Postcondition: The client's profile or order is saved with a unique reference, the order status and notifications are updated, and the action is logged under the client's account.

## Instructions for the AI implementation agent
- Treat this document as the source of truth for the requested user-story behavior.
- Preserve every user story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Do not silently remove, weaken, reinterpret, or contradict requirements.
- Before changing code, inspect the existing application and map each requirement to the relevant screen, component, API, data model, and test.
- Identify conflicts, ambiguities, dependencies, and missing implementation details. Report them instead of inventing business rules.
- Implement in coherent, dependency-aware increments; add or update automated tests for the acceptance criteria.
- Preserve existing working behavior unless a user story explicitly changes it.
- Treat sample credentials and personal details as test examples, not real production credentials or customer data.
- Distinguish requirements from spreadsheet test-status rows (Passed / Failed / Total); do not interpret those labels as feature requirements.

---

## USR - 01

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** register an account using my personal details
**So that:** so that I can order meals and keep my health and dietary information in one place.

### Scenarios (Given / When / Then)

Given When Then

A. Register with valid details

Given the client is on the registration screen and has not registered before
When the client enters the first name, last name, contact number, email address, username and password, ticks the Terms and Conditions and selects Register
Then the system shall create the account as unverified and open the "Verify your account" screen (USR - 33)

When the client leaves Middle name and Suffix blank, or fills in only Middle name
Then the system shall accept the registration because both fields are optional

Sample Data:
Maria / Santos / 09171234567 / maria.santos@gmail.com / msantos / Meal@2026, Terms and Conditions ticked.
Optional fields: Middle name Reyes, Suffix left blank.

B. Blank or invalid entries

Given the client is on the registration screen
When a required field is left blank
Then the system shall display "Please fill in all required fields."

When the contact number is not 11 digits or contains letters
Then the system shall display "Please enter a valid contact number."

When the email address is not in a valid format
Then the system shall display "Please enter a valid email address."

When the password has fewer than 8 characters
Then the system shall display "Password must be at least 8 characters."

When Register is selected with the Terms and Conditions unticked
Then the system shall display "You must accept the Terms and Conditions to continue." and not create the account

Sample Data:
Blank first name, last name or email.
Contact numbers: 0917123 (too short) and 0917ABC4567 (contains letters).
Emails: maria.santos@ and maria.santos.gmail.com.
Password: Abc123.
Terms and Conditions: unticked.

C. Duplicate details

Given an account already exists for msantos, 09171234567 and maria.santos@gmail.com
When the client enters the same username or contact number again
Then the system shall display "This username or contact number is already registered."

When the client enters the same email address again
Then the system shall display "This email address is already registered."

Sample Data:
Duplicates: msantos, 09171234567 and maria.santos@gmail.com entered a second time.

D. Labels and password protection

Given the client opens the registration screen
When the form is displayed
Then the system shall show the labels "Password (at least 8 characters)", "Middle name (optional)" and "Suffix (optional)" with a space before each bracket, a "Show" / "Hide" text control on the password field, and an optional "Continue with Google" button

When an account is created
Then the system shall store the password only as a salted Argon2id or bcrypt hash and never in a readable form

Sample Data:
Database check: no readable password is stored; the value is an Argon2id or bcrypt hash.

### Acceptance Criteria / System Requirements

1. The system shall require the first name, last name, contact number, email address, username, and password before an account can be created. Middle name and suffix (e.g., Jr., III) are optional.

2. The system shall display "Please fill in all required fields." when a required field is left blank.

3. The system shall display "Please enter a valid contact number." when the contact number is not 11 digits or contains letters.

4. The system shall display "Please enter a valid email address." when the email address is not in a valid format.

5. The system shall display "This username or contact number is already registered." or "This email address is already registered." when a duplicate is entered.

6. The system shall display "Password must be at least 8 characters." when a shorter password is entered.

7. The system shall require the Terms and Conditions to be accepted before registration is completed and shall display "You must accept the Terms and Conditions to continue." (see USR - 15) when the box is unticked.

8. The system shall store the password only as a salted hash (Argon2id or bcrypt with a unique salt and appropriate work factor), never in readable form, keep the new account unverified until the code in USR - 33 is accepted, and then direct the client to complete the profile.

9. The system shall display "Continue with Google" on the registration screen as an optional alternative to this form (see USR - 30, USR - 32, and USR - 34).

10. The system shall show the password requirement in the field label as "Password (at least 8 characters)", label the optional fields "Middle name (optional)" and "Suffix (optional)" with a space before the bracket, and give the show/hide password control a text label ("Show" or "Hide") instead of an icon alone.

Passed

Failed

Total

---

## USR - 02

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** log in using my registered username and password
**So that:** so that only I, or someone I authorize, can view my orders and health information.

### Scenarios (Given / When / Then)

Given When Then

A. Successful login

Given the client has a verified, active account and is on the login screen
When the client enters the registered username and password and selects Log in
Then the system shall grant access, redirect the client to the meal menu and record the date and time of the login

Sample Data:
Username: msantos. Password: Meal@2026.

B. Invalid or blank credentials

Given the client is on the login screen
When the username or password does not match an active account
Then the system shall display "Invalid username or password."

When the username or password is left blank
Then the system shall not grant access

Sample Data:
Invalid: msantos / wrongpass.
Blank username or password.

C. Account lockout

Given the client has entered a wrong password for msantos four times in a row
When the fifth wrong password is entered
Then the system shall lock the account

When the client then enters the correct password
Then the system shall display "Your account is locked. Please reset your password or contact support." and keep the account locked

When the client resets the password (USR - 04 and USR - 05)
Then the system shall allow the client to log in again

Sample Data:
Wrong password: wrongpass, 5 times in a row.
Correct password after the lockout: Meal@2026.

D. Unverified account

Given the client has registered but not yet verified the account
When the client enters the correct username and password
Then the system shall display "Please verify your account first." and open the "Verify your account" screen (USR - 33)

E. Too many attempts

Given one phone is used to try different usernames
When wrong passwords are entered for 11 different usernames within one minute
Then the system shall display "Too many attempts. Please wait a minute and try again." and not count the blocked attempts towards the five-attempt lockout

Sample Data:
11 different usernames within one minute from the same phone.

### Acceptance Criteria / System Requirements

1. The system shall require a username and a password before granting access.

2. The system shall display "Invalid username or password." when the credentials do not match an active account.

3. The system shall lock the account after five consecutive failed login attempts.

4. The system shall redirect the client to the meal menu after a successful login.

5. The system shall record the date and time of every login and logout.

6. The system shall display "Your account is locked. Please reset your password or contact support." when a locked account is used to log in, and shall keep the account locked until the client resets the password or the Admin unlocks it.

7. The system shall apply the password rules and the five-attempt lockout to username and password accounts only. Accounts that continue with Google are not locked by failed password attempts (see USR - 30).

8. The system shall display "Please verify your account first." and open the "Verify your account" screen (USR - 33) when the correct username and password belong to an account that is not yet verified.

9. The system shall allow no more than 10 login attempts per minute from the same device or network address, whatever the username, and display "Too many attempts. Please wait a minute and try again." Attempts blocked this way do not count towards the five-attempt lockout.

Passed

Failed

Total

---

## USR - 03

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** choose to stay logged in on my device
**So that:** so that I do not have to sign in every time I open the app.

### Scenarios (Given / When / Then)

Given When Then

A. Stay logged in

Given the client is on the login screen
When the client ticks "Keep me logged in", logs in and then closes and reopens the app
Then the system shall keep the session active until the client logs out

When the client logs in with the option unticked and then closes and reopens the app
Then the system shall show the login screen

Sample Data:
Username: msantos. Option ticked, then unticked.

B. Password changed

Given the client is logged in on a device with "Keep me logged in" ticked
When the password is changed
Then the system shall require the client to log in again

Sample Data:
New password: NewMeal@2026.

### Acceptance Criteria / System Requirements

1. The system shall display a "Keep me logged in" option on the login screen.

2. The system shall keep the session active on the device until the client logs out when the option is selected.

3. The system shall end the session when the app is closed or after a period of inactivity when the option is not selected.

4. The system shall require the client to log in again after the password has been changed.

Passed

Failed

Total

---

## USR - 04

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** request help when I forget my password
**So that:** so that I can regain access to my account without asking staff to do it for me.

### Scenarios (Given / When / Then)

Given When Then

A. Request a verification code

Given the client is on the forgot password screen
When the client enters a registered contact number and chooses "Send code by SMS"
Then the system shall send a 6-digit code by SMS

When the client enters a registered email address and chooses "Send code by email"
Then the system shall send a 6-digit code by email

Sample Data:
Registered number: 09171234567, by SMS.
Registered email: maria.santos@gmail.com, by email.

B. Unregistered contact details

Given the client is on the forgot password screen
When the contact number or email address is not registered
Then the system shall display "No account found with this contact number." or "No account found with this email address."

Sample Data:
Unregistered number: 09999999999. Unregistered email: unknown@example.com.

C. Enter the code

Given a code has been sent to the client
When the client enters the correct code within 10 minutes
Then the system shall open the new password screen (USR - 05)

When the code is wrong, expired, entered wrongly five times, or resent
Then the system shall apply the code rules and messages in USR - 33

Sample Data:
Test environment code: 123456.

D. Google-only account

Given an account signs in only with Google and has no password
When the client enters its contact number or email address
Then the system shall display "This account signs in with Google. Please use that option to log in." and not send a code

Sample Data:
Google-only contact number: 09175550142.

### Acceptance Criteria / System Requirements

1. The system shall allow a password reset to be requested with the registered contact number or the registered email address, and the client shall choose "Send code by SMS" or "Send code by email".

2. The system shall display "No account found with this contact number." or "No account found with this email address." when the value is not registered.

3. The system shall send the 6-digit verification code by SMS or by email as chosen, and apply the code rules and messages in USR - 33 (10-minute expiry, resend, five incorrect entries).

4. The system shall allow the client to proceed to the new password screen only after the correct, unexpired code is entered.

5. The system shall display "This account signs in with Google. Please use that option to log in." when the account has no password, and shall not send a code.

Passed

Failed

Total

---

## USR - 05

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** set a new password after verifying my identity
**So that:** so that my account stays secure and I can log in again.

### Scenarios (Given / When / Then)

Given When Then

A. Set a new password

Given the client has entered the correct verification code (USR - 04)
When the client enters the new password twice and saves
Then the system shall display "Password updated. Please log in."

When the client was also logged in on another device
Then the system shall end that other session

Sample Data:
New password: NewMeal@2026, entered twice.
Two devices logged in; reset done on one.

B. Invalid new password

Given the client is on the new password screen
When the two entries are different
Then the system shall display "Passwords do not match."

When the password has fewer than 8 characters
Then the system shall display "Password must be at least 8 characters."

When the password is the same as the current password
Then the system shall not accept it

Sample Data:
Mismatch: NewMeal@2026 and NewMeal@2027.
Short password: Abc123.
Same as current: Meal@2026.

C. No verified code

Given the client has not entered a verified code
When the client tries to open the new password screen
Then the system shall refuse access and return the client to the forgot password screen

### Acceptance Criteria / System Requirements

1. The system shall allow a new password to be set only after the verification code in USR - 04 has been accepted, and shall require the new password to be entered twice.

2. The system shall display "Passwords do not match." when the two entries are different.

3. The system shall display "Password must be at least 8 characters." when a shorter password is entered.

4. The system shall not accept a new password that is the same as the current password.

5. The system shall display "Password updated. Please log in." after a successful reset.

6. The system shall end all other active sessions of the account after the password is changed.

Passed

Failed

Total

---

## USR - 06

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** log out of my account
**So that:** so that my information is not exposed when someone else uses the device.

### Scenarios (Given / When / Then)

Given When Then

A. Log out with confirmation

Given the client is logged in
When the client chooses Log out from the main menu
Then the system shall display "Are you sure you want to log out?" with Yes and No

When the client chooses Yes
Then the system shall end the session, show the login screen and record the date and time of the logout

Sample Data:
Logout timestamp in the log, e.g. 2026-10-12 09:15 AM.

B. Cancel logging out

Given the "Are you sure you want to log out?" message is displayed
When the client chooses No
Then the system shall keep the session active

### Acceptance Criteria / System Requirements

1. The system shall provide a Log out option reachable from the main menu.

2. The system shall display "Are you sure you want to log out?" before ending the session.

3. The system shall end the session and return to the login screen after confirmation.

4. The system shall record the date and time of the logout.

Passed

Failed

Total

---

## USR - 07

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** view my profile in one screen
**So that:** so that I can check that my personal, health, and dietary information is correct before ordering.

### Scenarios (Given / When / Then)

Given When Then

A. View the profile

Given the client msantos is logged in and has completed the profile
When the client opens Profile
Then the system shall display the personal details, the health conditions, dietary restrictions, food allergies and meal preferences, the guardian or family member, and the date the profile was last updated

Sample Data:
First name Maria, Last name Santos, 09171234567, maria.santos@gmail.com, 12 Mabini St., Quezon City.
Hypertension, Low-sodium, Peanuts, guardian Jose Santos (Son), last updated 2026-10-11.

### Acceptance Criteria / System Requirements

1. The system shall display the client's first name, last name (with middle name and suffix, if any), contact number, email address, and address.

2. The system shall display the recorded health conditions, dietary restrictions, food allergies, and meal preferences.

3. The system shall display the guardian/family member information, if any.

4. The system shall display the date the profile was last updated.

Passed

Failed

Total

---

## USR - 08

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** edit my personal information
**So that:** so that my contact and delivery details are always current.

### Scenarios (Given / When / Then)

Given When Then

A. Edit personal information

Given the client is on the Edit profile screen
When the client changes the address or name and saves
Then the system shall save the change and display "Profile updated successfully."

Sample Data:
Address: 45 Rizal Ave., Quezon City.
Name: First name Maria Luisa, Last name Santos.

B. Blank or invalid entries

Given the client is on the Edit profile screen
When the first name, last name or email is blank
Then the system shall display "Please fill in all required fields."

When the contact number or email address is not valid
Then the system shall display "Please enter a valid contact number." or "Please enter a valid email address."

Sample Data:
Invalid contact numbers: 0917123 and 0917ABC4567. Invalid email: maria.santos@.

C. Change contact number or email

Given the client is on the Edit profile screen
When the client enters a new contact number or email address
Then the system shall send a 6-digit code by SMS or email and save the new value only after the correct code is entered

When a wrong code is entered
Then the system shall show the message in USR - 33 and keep the old value

When the new value belongs to another account
Then the system shall display "This username or contact number is already registered." or "This email address is already registered."

Sample Data:
New number: 09181234567. New email: m.santos@gmail.com. Wrong code: 000000.

D. Leave with unsaved changes

Given the client has edited a field without saving
When the client presses Back
Then the system shall ask for confirmation before leaving the screen

### Acceptance Criteria / System Requirements

1. The system shall allow the first name, last name, middle name, suffix, contact number, email address, and address to be edited.

2. The system shall display "Please enter a valid contact number." or "Please enter a valid email address." when the value is not valid.

3. The system shall display "Please fill in all required fields." when the first name, last name, or email is blank.

4. The system shall send a 6-digit verification code by SMS to a new contact number, or by email to a new email address, and save the new value only after the correct code is entered, using the code rules and messages in USR - 33.

5. The system shall display "This username or contact number is already registered." or "This email address is already registered." when the new value belongs to another account.

6. The system shall display "Profile updated successfully." after the changes are saved.

7. The system shall ask for confirmation before leaving the screen with unsaved changes.

Passed

Failed

Total

---

## USR - 09

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** add and update my health conditions
**So that:** so that the kitchen prepares meals that are appropriate for my condition.

### Scenarios (Given / When / Then)

Given When Then

A. Add health conditions

Given the client is on the health conditions screen
When the client selects conditions from the list or enters one under "Other" and saves
Then the system shall save them and display "Health information saved."

Sample Data:
Hypertension and Diabetes selected. Other: Gout.

B. Update or remove a condition

Given the client has saved health conditions
When the client updates or removes a condition and saves
Then the system shall save the change, display "Health information saved." and update the "last updated" date

Sample Data:
Remove Diabetes.

C. Kitchen Staff view

Given the client has an active order
When Kitchen Staff open the order
Then the system shall show the client's saved conditions

### Acceptance Criteria / System Requirements

1. The system shall allow health conditions to be selected from a list (e.g., diabetes, hypertension, kidney disease, heart disease) or entered under "Other."

2. The system shall allow a recorded condition to be updated or removed.

3. The system shall display "Health information saved." after a successful save.

4. The system shall update the "last updated" date whenever the health information changes.

5. The system shall make the saved conditions viewable to Kitchen Staff for the client's active orders.

Passed

Failed

Total

---

## USR - 10

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** add my dietary restrictions
**So that:** so that the meals shown and prepared follow the diet I am required to keep.

### Scenarios (Given / When / Then)

Given When Then

A. Add dietary restrictions

Given the client is on the dietary restrictions screen
When the client selects restrictions or enters one under "Other" and saves
Then the system shall save them and display "Dietary restrictions saved."

Sample Data:
Low-sodium and Soft diet selected. Other: No pork.

B. Remove a restriction

Given the client has saved dietary restrictions
When the client removes one and saves
Then the system shall remove it

Sample Data:
Remove Soft diet.

C. Highlighted meals

Given the client has saved Low-sodium as a restriction
When the client opens the menu
Then the system shall highlight the matching low-sodium meals

### Acceptance Criteria / System Requirements

1. The system shall allow one or more restrictions to be selected (e.g., low-sodium, low-sugar, soft diet, vegetarian) or entered under "Other."

2. The system shall allow a restriction to be removed at any time.

3. The system shall use the restrictions to highlight matching meals in the menu.

4. The system shall display "Dietary restrictions saved." after a successful save.

Passed

Failed

Total

---

## USR - 11

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** add my food allergies
**So that:** so that I am warned about and protected from meals that could harm me.

### Scenarios (Given / When / Then)

Given When Then

A. Add food allergies

Given the client is on the food allergies screen
When the client selects common allergens or enters one manually, adds a note on the reaction and saves
Then the system shall save them and display "Food allergies saved."

Sample Data:
Peanuts (note: Skin rash and swelling) and Shellfish selected.
Manual entry: Mango.

B. Allergy warning

Given the client has Peanuts recorded as an allergy
When the client opens "Chicken Satay with Peanut Sauce"
Then the system shall show an allergy warning

C. Kitchen Staff view

Given the client has an active order
When Kitchen Staff open the order
Then the system shall show the client's allergies

### Acceptance Criteria / System Requirements

1. The system shall allow allergies to be selected from common allergens (e.g., peanuts, shellfish, eggs, milk, soy, gluten) or entered manually.

2. The system shall allow a note on the reaction to be added for each allergy.

3. The system shall display "Food allergies saved." after a successful save.

4. The system shall compare the allergies against meal allergen information when meals are viewed and ordered.

5. The system shall make the allergies viewable to Kitchen Staff for the client's active orders.

Passed

Failed

Total

---

## USR - 12

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** add my meal preferences
**So that:** so that the menu can suggest meals I am more likely to enjoy.

### Scenarios (Given / When / Then)

Given When Then

A. Add meal preferences

Given the client is on the meal preferences screen
When the client records preferred categories and disliked ingredients and saves
Then the system shall save them and display "Meal preferences saved."

Sample Data:
Preferred categories: Soup, Fish.
Disliked ingredients: Ampalaya, Liver.

B. Update or remove a preference

Given the client has saved meal preferences
When the client removes a disliked ingredient and saves
Then the system shall remove it

Sample Data:
Remove Liver.

C. Menu ranking

Given the client prefers Soup and Fish, dislikes Ampalaya, has the Low-sodium restriction and is allergic to Peanuts
When the client opens the menu
Then the system shall list meals by score, highest first, with meals that contain a recorded allergen listed last and shown with a warning

Sample Data:
Chicken Tinola (score 5), Grilled Bangus (5), other meals (0), Ampalaya Stir-fry (-3), Chicken Satay (last).

### Acceptance Criteria / System Requirements

1. The system shall allow preferred meal categories and disliked ingredients to be recorded.

2. The system shall allow the preferences to be updated or removed.

3. The system shall use the preferences to sort matching meals first in the menu.

4. The system shall display "Meal preferences saved." after a successful save.

5. The system shall rank the menu by a score and list the highest score first, with equal scores in alphabetical order:
   - +3 when the meal is in a preferred category
   - +2 when the meal matches a dietary restriction in the profile (e.g., Low-sodium)
   - +1 when the meal matches a nutritional preference (USR - 13)
   - -3 for each disliked ingredient in the meal
   - Meals that contain a recorded allergen are listed last, with a warning, and never given a bonus

Passed

Failed

Total

---

## USR - 13

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** update my nutritional preferences
**So that:** so that I can pick meals that fit my daily nutrition goals.

### Scenarios (Given / When / Then)

Given When Then

A. Select nutritional preferences

Given the client is on the nutritional preferences screen
When the client selects preferences and saves
Then the system shall save them and display "Nutritional preferences updated."

Sample Data:
Lower sodium and Higher protein selected.

B. Change preferences

Given the client has saved nutritional preferences
When the client changes them
Then the system shall save the new selection

Sample Data:
Change to Lower calories only.

C. Filter the menu

Given the client has saved nutritional preferences
When the client applies the filter in the menu
Then the system shall show only matching meals

### Acceptance Criteria / System Requirements

1. The system shall allow nutritional preferences to be selected (e.g., lower calories, higher protein, lower sodium).

2. The system shall allow the selected preferences to be changed at any time.

3. The system shall allow the meal list to be filtered using the saved nutritional preferences.

4. The system shall display "Nutritional preferences updated." after a successful save.

Passed

Failed

Total

---

## USR - 14

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** add my guardian or family member's information
**So that:** so that someone I trust can be contacted about my orders when needed.

### Scenarios (Given / When / Then)

Given When Then

A. Add a guardian

Given the client is on the guardian screen
When the client enters the name, relationship and contact number and saves
Then the system shall save them and display "Guardian information saved."

Sample Data:
Jose Santos / Son / 09189876543.

B. Blank required field

Given the client is adding a guardian
When the name or contact number is left blank
Then the system shall display "Please enter the guardian's name and contact number."

Sample Data:
Blank contact number.

C. No guardian yet

Given the client has not saved a guardian
When the client opens the guardian screen
Then the system shall display "No guardian or family member added yet." and an "Add guardian" button

D. Edit a guardian

Given the client has a saved guardian
When the client opens Edit guardian
Then the system shall show the form filled in with the saved details

When the client changes the number and saves
Then the system shall save the change and display "Guardian information saved."

Sample Data:
Number changed from 09189876543 to 09189876500.

E. Remove a guardian

Given the client has a saved guardian
When the client chooses Remove
Then the system shall display "Are you sure you want to remove this guardian?" with Yes and No

When the client chooses Yes
Then the system shall remove the entry

When the client chooses No
Then the system shall keep the entry

F. Admin view

Given a guardian has been saved
When the Admin opens the client record
Then the system shall show the guardian information

### Acceptance Criteria / System Requirements

1. The system shall allow a guardian/family member to be added with name, relationship, and contact number.

2. The system shall display "Please enter the guardian's name and contact number." when a required field is blank.

3. The system shall allow the guardian/family member information to be updated or removed.

4. The system shall display "Guardian information saved." after a successful save.

5. The system shall make the guardian information viewable to the Admin.

6. The system shall display "No guardian or family member added yet." and an "Add guardian" button when no guardian has been saved.

7. The system shall open an Edit guardian form filled in with the saved name, relationship, and contact number, and shall apply the same required-field check as in no. 2.

8. The system shall display "Are you sure you want to remove this guardian?" with Yes and No options before a guardian is removed.

Passed

Failed

Total

---

## USR - 15

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** view the Terms and Conditions
**So that:** so that I understand how my information will be used before I agree.

### Scenarios (Given / When / Then)

Given When Then

A. View the Terms and Conditions

Given the client is on the registration page or Profile
When the client opens the Terms and Conditions
Then the system shall display them, including how health and dietary information is collected and used

Sample Data:
Opened from the registration page and from Profile.

B. Registration without acceptance

Given the client is on the registration page with the box unticked
When the client selects Register
Then the system shall display "You must accept the Terms and Conditions to continue."

C. Accept the Terms and Conditions

Given the client ticks the box
When the client registers
Then the system shall record the date and time of acceptance

Sample Data:
Acceptance timestamp, e.g. 2026-10-12 09:00 AM.

### Acceptance Criteria / System Requirements

1. The system shall display the Terms and Conditions during registration and from the profile screen.

2. The system shall display "You must accept the Terms and Conditions to continue." when registration is attempted without acceptance.

3. The system shall record the date and time the Terms and Conditions were accepted.

4. The system shall state how health and dietary information is collected and used.

Passed

Failed

Total

---

## USR - 16

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** browse, search for, and filter meals in the Meals section
**So that:** so that I can find meals by name or dietary needs, even if I make a small spelling mistake.

### Scenarios (Given / When / Then)

Given When Then

A. Browse and search meals

Given the client is in the Meals section
When the client opens the section
Then the system shall display the available meals with their names and categories

When the client searches "Tinola"
Then the system shall show the matching meals

Sample Data:
Search: Tinola.

B. Search with spelling errors

Given the meal Chicken Tinola is in the catalog
When the client searches "Chiken Tinola", "tinula" or "CHICKEN"
Then the system shall show Chicken Tinola among the most relevant results, with exact matches ranked above close matches

When the client searches "Pizzaa"
Then the system shall show a close match only if it passes the similarity threshold

Sample Data:
Searches: Chiken Tinola, tinula, CHICKEN, Pizzaa.

C. No results

Given the client is in the Meals section
When no meal meets the search and filter conditions
Then the system shall display "No meals found."

Sample Data:
Search: xyz123.

D. Filter meals

Given the client is in the Meals section
When the client selects a category, a dietary restriction and an allergen-free option together
Then the system shall show only the meals that meet all selected filters

Sample Data:
Category = Soup, Dietary restriction = Low-sodium, Allergen-free = Peanuts.

### Acceptance Criteria / System Requirements

1. The system shall display available meals with their names and categories in the Meals section.

2. The system shall allow keyword searching by meal name and relevant meal text available in the catalog.

3. The system shall support case-insensitive fuzzy matching for minor spelling errors, missing characters, extra characters, and similar word forms. Exact matches shall rank above fuzzy matches.

4. The system shall allow filtering by meal category, dietary restriction, and allergen-free options. Multiple selected filters shall be applied together.

5. The system shall show meal details, including ingredients, allergen information, nutrition, portion size, and price when these details are available in the catalog.

6. The system shall warn the client when a meal conflicts with a recorded allergy or dietary restriction and shall not label a conflicting meal as safe or suitable.

7. The system shall display "No meals found." when no result meets the search and filter conditions.

8. The system shall present search results in a clear list with readable labels and controls suitable for Android use, including older users.

Passed

Failed

Total

---

## USR - 17

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** view the details of a meal before ordering
**So that:** so that I know exactly what I am eating.

### Scenarios (Given / When / Then)

Given When Then

A. View meal details

Given the client has selected a meal
When the meal details open
Then the system shall display the ingredients, allergen information, nutritional information, portion size and price

Sample Data:
Chicken Tinola: 320 kcal, protein 28 g, carbs 12 g, fat 15 g, sodium 480 mg, 1 bowl (350 g), PHP 120.00.

B. Allergy conflict

Given the client has Peanuts recorded as an allergy
When the client opens "Chicken Satay"
Then the system shall display "This meal contains Peanuts, which is listed in your profile."

When a sauce lists peanut butter as an ingredient but has no Peanuts tag
Then the system shall still show the warning because it checks the full ingredient list

Sample Data:
Peanut allergy profile; sauce with peanut butter and no Peanuts tag.

C. Unavailable meal

Given the Admin has marked a meal as unavailable
When the client opens the meal
Then the system shall display "This meal is no longer available."

### Acceptance Criteria / System Requirements

1. The system shall display the ingredients and allergen information of the selected meal.

2. The system shall display the nutritional information (calories, protein, carbohydrates, fat, and sodium).

3. The system shall display the portion size and price.

4. The system shall display "This meal contains [allergen], which is listed in your profile." when it conflicts with a recorded allergy.

5. The system shall display "This meal is no longer available." when an unavailable meal is opened.

6. The system shall find allergen conflicts from the full ingredient list of the meal, including sauces and sub-recipes, and not only from the allergen tags.

Passed

Failed

Total

---

## USR - 18

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** select meals and the quantity I want
**So that:** so that my order matches how many servings I need.

### Scenarios (Given / When / Then)

Given When Then

A. Add meals with a quantity

Given the client has selected Chicken Tinola at PHP 120.00
When the client enters a quantity of 2
Then the system shall add the meal and show PHP 240.00 as the running total

Sample Data:
Chicken Tinola x2 = PHP 240.00.

B. Invalid quantity

Given the client is entering a quantity
When the value is 0, -1, 1.5 or text
Then the system shall accept whole numbers greater than zero only, and display "Quantity must be greater than zero." for 0 or a negative value

Sample Data:
Invalid quantities: 0, -1, 1.5, abc.

C. Change or remove a meal

Given the client has a meal in the order
When the client changes the quantity to 3
Then the system shall update the total to PHP 360.00

When the client removes the meal
Then the system shall remove it from the order

When the client tries to type into the total field
Then the system shall keep the total read-only

### Acceptance Criteria / System Requirements

1. The system shall allow a meal to be added to the order with a quantity.

2. The system shall accept whole numbers greater than zero only.

3. The system shall display "Quantity must be greater than zero." when 0 or a negative value is entered.

4. The system shall allow a selected meal to be changed or removed before confirmation.

5. The system shall compute the running total automatically and not allow it to be edited manually.

Passed

Failed

Total

---

## USR - 19

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** choose delivery or pickup, with my preferred schedule and instructions
**So that:** so that my meal arrives or is ready when it is convenient for me.

### Scenarios (Given / When / Then)

Given When Then

A. Valid delivery details

Given the client has meals in the order
When the client chooses Delivery, enters an address, a schedule and instructions
Then the system shall accept the details

Sample Data:
12 Mabini St., Quezon City, 2026-10-13 12:00 PM, "Please call upon arrival".

B. Missing selections

Given the client is choosing delivery or pickup
When nothing is selected and Next is selected
Then the system shall require a selection

When Delivery is chosen with a blank address
Then the system shall display "Please enter a delivery address."

When a past schedule is chosen
Then the system shall display "The schedule cannot be earlier than the current date and time."

Sample Data:
Past schedule: 2026-10-10 08:00 AM.

C. Pickup without instructions

Given the client chooses Pickup
When the special instructions are left empty
Then the system shall accept the order details

D. Lead time

Given it is now 2026-10-12 09:00 AM (Monday) and the minimum lead time is 24 hours
When the client chooses 2026-10-12 12:00 PM
Then the system shall display "Please choose a time at least 24 hours from now."

When the client chooses 2026-10-13 09:00 AM
Then the system shall accept the schedule

E. Kitchen hours

Given the kitchen is open Monday to Saturday, 7:00 AM to 6:00 PM
When the client chooses a time outside those hours
Then the system shall display "The kitchen is closed at that time. Orders can be scheduled Monday to Saturday, 7:00 AM to 6:00 PM."

Sample Data:
2026-10-14 06:00 AM, 2026-10-14 07:00 PM and Sunday 2026-10-18 12:00 PM.

### Acceptance Criteria / System Requirements

1. The system shall require delivery or pick-up to be selected.

2. The system shall require a delivery address for delivery orders and display "Please enter a delivery address." when blank.

3. The system shall require a preferred date and time and display "The schedule cannot be earlier than the current date and time." when a past schedule is selected.

4. The system shall allow optional special instructions to be entered.

5. The system shall require the schedule to be at least the minimum lead time (24 hours, set by the Admin) from the current time and display "Please choose a time at least 24 hours from now." otherwise.

6. The system shall require the schedule to fall within the kitchen operating hours set by the Admin and display "The kitchen is closed at that time. Orders can be scheduled Monday to Saturday, 7:00 AM to 6:00 PM." otherwise. Both rules apply to delivery and pickup.

Passed

Failed

Total

---

## USR - 20

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** review my order summary before confirming
**So that:** so that I can correct mistakes before the kitchen starts preparing.

### Scenarios (Given / When / Then)

Given When Then

A. Review and confirm

Given the client has chosen meals, delivery details and a schedule
When the order summary opens
Then the system shall display the meals, quantities, prices, total, fulfillment type, schedule and special instructions

When the client selects Confirm
Then the system shall create the order with a unique tracking number, set the status to "Confirmed" and display "Order placed successfully."

Sample Data:
Chicken Tinola x2 at PHP 240.00, Delivery, 2026-10-13 12:00 PM, "Please call upon arrival".
Tracking number TRK-2026-0001, status Confirmed.

B. Allergy warnings

Given the client is allergic to Peanuts and has added Chicken Satay
When the summary opens
Then the system shall display an allergy warning for the meal

When the allergy was added to the profile from another device just before Confirm
Then the system shall show "[Meal] contains [allergen], which is listed in your profile." and require the client to remove the meal or tick "I understand"

Sample Data:
Chicken Satay with a peanut allergy.

C. Confirm tapped twice

Given the client is confirming an order
When Confirm is tapped twice quickly, or the connection is lost and the request is sent again
Then the system shall create only one order, show the same tracking number, and show "Placing your order..." with the button disabled while it works

D. Edit from the summary

Given the order summary is displayed
When the client edits the quantity
Then the system shall update the order before confirmation

### Acceptance Criteria / System Requirements

1. The system shall display the meals, quantities, prices, total amount, fulfillment type, schedule, and special instructions.

2. The system shall display allergen warnings for any selected meal that conflicts with the client's allergies.

3. The system shall allow the order to be edited from the summary screen before confirmation.

4. The system shall generate a unique tracking number (e.g., TRK-2026-0001) and set the status to "Confirmed" once the order is confirmed.

5. The system shall display "Order placed successfully." and all amounts in Philippine Peso with two decimal places.

6. The system shall create only one order, with one tracking number, when Confirm is tapped more than once or the same request is sent again (for example after a poor connection), and shall disable the button and show "Placing your order..." while the order is being placed.

7. The system shall re-check every meal in the order against the client's allergies, at ingredient level and using the profile as it is at that moment, when Confirm is tapped, and shall display "[Meal] contains [allergen], which is listed in your profile." The client must remove the meal or tick "I understand" before the order is confirmed.

Passed

Failed

Total

---

## USR - 21

**Epic / System Component:** Orders
**Persona:** As a User
**I want to:** view my orders
**So that:** so that I can see what I have ordered and which orders are still ongoing.

### Scenarios (Given / When / Then)

Given When Then

A. View orders

Given the client has TRK-2026-0001 (2026-10-10, Completed) and TRK-2026-0002 (2026-10-12, Preparing)
When the client opens Orders
Then the system shall list the orders with the tracking number, date, meals and status, newest first

Sample Data:
TRK-2026-0002 is listed above TRK-2026-0001.

B. Filter orders

Given the client is on the Orders screen
When the client filters by status and date range
Then the system shall show only the matching orders

Sample Data:
Status = Completed, Date = 2026-10-01 to 2026-10-11: only TRK-2026-0001.

C. No orders

Given the client has never placed an order
When the client opens Orders
Then the system shall display "You have no orders yet."

### Acceptance Criteria / System Requirements

1. The system shall display the client's orders showing the tracking number, date, meals, and status.

2. The system shall sort the orders with the newest first.

3. The system shall allow the orders to be filtered by status and date range.

4. The system shall display "You have no orders yet." when no order exists.

Passed

Failed

Total

---

## USR - 22

**Epic / System Component:** Orders
**Persona:** As a User
**I want to:** view the complete details of an order
**So that:** so that I can verify what was ordered without contacting the service.

### Scenarios (Given / When / Then)

Given When Then

A. View order details

Given the client has order TRK-2026-0002
When the client opens it
Then the system shall display the tracking number, meals with quantities, total, fulfillment type, schedule, delivery address, special instructions and status history with date and time

Sample Data:
Chicken Tinola x2, PHP 240.00, Delivery, 12 Mabini St.
Status history: Confirmed 09:00 AM, Preparing 10:30 AM.

B. Order not found

Given the client opens an order that does not exist
When the order screen loads
Then the system shall display "Order not found."

Sample Data:
TRK-2026-9999.

### Acceptance Criteria / System Requirements

1. The system shall display the tracking number, meals with quantities, and total amount.

2. The system shall display the fulfillment type, schedule, delivery address, and special instructions.

3. The system shall display the status history with the date and time of each change.

4. The system shall display "Order not found." when an order that does not exist is opened.

Passed

Failed

Total

---

## USR - 23

**Epic / System Component:** Orders
**Persona:** As a User
**I want to:** check the current status of my order
**So that:** so that I know whether my meal is being prepared, ready, or on its way.

### Scenarios (Given / When / Then)

Given When Then

A. Delivery order status

Given the client has a delivery order
When the status is checked
Then the system shall show Confirmed, Preparing, Ready for Delivery, Out for Delivery or Completed

Sample Data:
Confirmed > Preparing > Ready for Delivery > Out for Delivery > Completed.

B. Pickup order status

Given the client has a pickup order
When the status is checked
Then the system shall show Confirmed, Preparing, Ready for Pick-up or Completed, with no delivery statuses

Sample Data:
Confirmed > Preparing > Ready for Pick-up > Completed.

C. Colors with text

Given an order has a status
When the status is displayed
Then the system shall show it with a color and a text label

Sample Data:
Preparing shown in orange.

### Acceptance Criteria / System Requirements

1. The system shall display the status as Confirmed, Preparing, Ready for Pick-up, Ready for Delivery, Out for Delivery, or Completed.

2. The system shall show only the statuses that apply to the chosen fulfillment type.

3. The system shall color-code each status and show it together with text.

Passed

Failed

Total

---

## USR - 24

**Epic / System Component:** Orders
**Persona:** As a User
**I want to:** monitor my ongoing orders without refreshing the screen
**So that:** so that I can see updates as soon as they happen.

### Scenarios (Given / When / Then)

Given When Then

A. Live status update

Given the client keeps the order screen open
When Staff change TRK-2026-0002 from Preparing to Out for Delivery
Then the system shall update the status automatically without a refresh and show the date and time of the latest update

B. Order of ongoing orders

Given the client has an ongoing and a completed order
When the orders are listed
Then the system shall display the ongoing order first

Sample Data:
TRK-2026-0002 (ongoing) above TRK-2026-0001 (completed).

C. Connection lost

Given the client is watching an ongoing order
When the connection is lost
Then the system shall display "Unable to refresh. Please check your connection."

Sample Data:
Wi-Fi turned off.

### Acceptance Criteria / System Requirements

1. The system shall update the displayed status automatically when Staff change it.

2. The system shall display ongoing orders ahead of completed orders.

3. The system shall display the date and time of the latest update.

4. The system shall display "Unable to refresh. Please check your connection." when the connection is lost.

Passed

Failed

Total

---

## USR - 25

**Epic / System Component:** Orders
**Persona:** As a User
**I want to:** receive updates about my order
**So that:** so that I do not have to keep checking the app.

### Scenarios (Given / When / Then)

Given When Then

A. Order notifications

Given the client has an order
When the order is confirmed, changes status, or is cancelled
Then the system shall send a notification shown with its date and time

Sample Data:
"Order TRK-2026-0002 is now Out for Delivery." (2026-10-12 11:45 AM).

B. Read notifications

Given the client has unread notifications
When the client opens one
Then the system shall mark it as read and keep it in the list

C. Admin announcements

Given the Admin sends an announcement
When the client opens notifications
Then the system shall show the announcement in the same list

Sample Data:
"Kitchen closed on Oct 31".

### Acceptance Criteria / System Requirements

1. The system shall send a notification when an order is confirmed, when its status changes, and when it is cancelled or has an issue.

2. The system shall display notifications in the app with the date and time.

3. The system shall mark unread notifications and keep read notifications viewable.

4. The system shall show announcements sent by the Admin in the same list.

Passed

Failed

Total

---

## USR - 26

**Epic / System Component:** Help & Assistance
**Persona:** As a User
**I want to:** view help instructions
**So that:** so that I can learn how to use the app without asking for technical help.

### Scenarios (Given / When / Then)

Given When Then

A. Help reachable from every screen

Given the client is on any screen
When the client selects the Help button
Then the system shall open the help instructions, including from the login and sign-up screens

Sample Data:
Help opened from the login, sign-up, Home, Menu, Profile, Order and Tracking screens.

B. Step-by-step instructions

Given the client is on the Help screen
When the client opens "How to place an order"
Then the system shall show simple steps

Sample Data:
1. Choose meals, 2. Set quantity, 3. Pick delivery or pickup, 4. Review, 5. Confirm.

C. Readable text

Given the client views the app
When the text size is checked, including meal cards, the "Use my nutrition goals" checkbox label and the header Help button
Then the system shall use text of at least 16 px and clearly labeled buttons

When the phone text size is set to the largest
Then the system shall follow the setting up to 200% without hiding content

### Acceptance Criteria / System Requirements

1. The system shall display help instructions in simple, step-by-step language.

2. The system shall make the help instructions reachable from every screen, including the login and sign-up screens, through a Help button with a text label.

3. The system shall use text of at least 16 px, including meal-card text, checkbox labels, and the header Help button, and clearly labeled buttons.

4. The system shall follow the phone's text size setting up to 200% without hiding content.

Passed

Failed

Total

---

## USR - 27

**Epic / System Component:** Help & Assistance
**Persona:** As a User
**I want to:** view frequently asked questions
**So that:** so that I can get quick answers to common concerns.

### Scenarios (Given / When / Then)

Given When Then

A. Browse by topic

Given the client is on the FAQ screen
When the screen opens
Then the system shall group the questions by topic

Sample Data:
Topics: Account, Ordering, Delivery, Health Information.

B. Search the FAQ

Given the client is on the FAQ screen
When the client searches "password"
Then the system shall show the matching question

When the client searches "zzzz"
Then the system shall display "No answers found."

C. Expand an answer

Given the FAQ list is displayed
When the client taps a question
Then the system shall expand its full answer, and collapse it when tapped again

Sample Data:
"How do I reset my password?": Forgot password > verify identity > set a new password.

### Acceptance Criteria / System Requirements

1. The system shall display the frequently asked questions grouped by topic (account, ordering, delivery, health information).

2. The system shall allow the questions to be searched by keyword.

3. The system shall display "No answers found." when the search returns no result.

4. The system shall expand a question to show its full answer when it is tapped and collapse it when tapped again.

Passed

Failed

Total

---

## USR - 28

**Epic / System Component:** Help & Assistance
**Persona:** As a User
**I want to:** access a basic guide to navigating the app
**So that:** so that I know where to find each feature.

### Scenarios (Given / When / Then)

Given When Then

A. First-login guide

Given the client logs in for the first time
When the Home screen opens
Then the system shall show the guide covering the menu, order, tracking, profile and help

Sample Data:
Guide shown on first login.

B. Reopen the guide

Given the client has already seen the guide
When the client opens it from Help
Then the system shall show it again

C. Screen reference

Given the guide is displayed
When the client views a step
Then the system shall show a short description and a labeled screen reference

Sample Data:
Step "Menu: browse and search meals" with a labeled screenshot.

### Acceptance Criteria / System Requirements

1. The system shall display a guide covering the main screens: menu, order, tracking, profile, and help.

2. The system shall allow the guide to be opened at any time, not only on first login.

3. The system shall present each step with a short description and a labeled screen reference.

Passed

Failed

Total

---

## USR - 29

**Epic / System Component:** Help & Assistance
**Persona:** As a User
**I want to:** view the contact information for assistance
**So that:** so that I can reach someone when the app cannot solve my problem.

### Scenarios (Given / When / Then)

Given When Then

A. View contact information

Given the client opens the contact information
When the screen loads
Then the system shall display the service's contact number, email address and operating hours

Sample Data:
0917-555-0123, support@mealservice.ph, Mon-Sat 7:00 AM-6:00 PM.

B. Call from the app

Given the contact number is displayed
When the client taps the number
Then the system shall open the phone dialer

C. Admin changes the number

Given the Admin changes the contact number
When the client opens the contact information
Then the system shall show the new number

Sample Data:
New number: 0917-555-0199.

### Acceptance Criteria / System Requirements

1. The system shall display the service's contact number, email address, and operating hours.

2. The system shall allow the contact number to be tapped to place a call.

3. The system shall display the contact information set by the Admin.

Passed

Failed

Total

---

## USR - 30

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** continue with Google to sign up or log in
**So that:** so that I can use my existing Google account instead of creating a new password.

### Scenarios (Given / When / Then)

Given When Then

A. First-time Google user

Given the client has no account and is on the login or registration screen
When the client selects "Continue with Google"
Then the system shall create the account without sending a code, because Google has confirmed the email, and open the profile screen (USR - 31)

Sample Data:
maria.santos@gmail.com, not yet registered.

B. Returning Google user

Given the client has used Google before
When the client selects "Continue with Google"
Then the system shall sign in the same account without creating a duplicate, and open the meal menu if the profile is complete or the profile screen if it is not

Sample Data:
Returning client with a complete profile. Returning client who left before finishing the profile.

C. Email already exists

Given an account with the same email exists and is not linked to Google
When the client continues with Google
Then the system shall display "An account with this email already exists. Log in to link your Google account." and open the linking screen (USR - 34)

Sample Data:
maria.santos@gmail.com belongs to msantos.

D. Cancelled, refused or failed sign-in

Given the Google window is open
When the client closes or cancels it
Then the system shall return to the previous screen and display "Sign in with Google was cancelled."

When the client refuses to share the name or email
Then the system shall display "Continue with Google needs your name and email address to create your account." and create nothing

When there is no internet or Google is unavailable
Then the system shall display "Unable to continue with Google. Please check your connection and try again."

E. Inactive account

Given the account linked to the Google account is inactive
When the client continues with Google
Then the system shall display "This account is inactive. Please contact support."

F. Several Google accounts

Given the phone has two Google accounts
When the client selects "Continue with Google"
Then the system shall show the account picker and use the chosen account, treating each as a separate client account

Sample Data:
maria.santos@gmail.com and msantos.work@gmail.com.

G. Stay logged in

Given the client ticked "Keep me logged in" and logged in with Google
When the client closes and reopens the app
Then the system shall keep the client logged in and record the login and logout times

### Acceptance Criteria / System Requirements

1. The system shall display a "Continue with Google" button on the login screen and the registration screen, next to the username and password option.

2. The system shall sign in the existing account when the Google account has been used before, and create a new client account when it has not, without creating a duplicate.

3. The system shall treat the email address confirmed by Google as verified and shall not send a code to it. A new Google client goes to complete the profile (USR - 31) before any order, and a returning client with a complete profile goes to the meal menu.

4. The system shall not create a second account and shall display "An account with this email already exists. Log in to link your Google account." when the Google email belongs to an account that is not linked to Google, and then open the linking screen (USR - 34).

5. The system shall return to the previous screen without creating or changing any account and display "Sign in with Google was cancelled." when the client closes or cancels the Google window.

6. The system shall display "Continue with Google needs your name and email address to create your account." and create nothing when the client refuses to share the name or email.

7. The system shall display "Unable to continue with Google. Please check your connection and try again." when Google cannot be reached or returns an error.

8. The system shall display "This account is inactive. Please contact support." when the linked account is inactive.

9. The system shall show the Google account picker when more than one Google account is on the device, and shall treat each Google account as a separate client account.

10. The system shall record the date and time of every login and logout, and shall apply the "Keep me logged in" option, as in USR - 02, USR - 03, and USR - 06.

Passed

Failed

Total

---

## USR - 31

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** complete my profile after continuing with Google
**So that:** so that the service can reach me about my orders and my account is complete before I order.

### Scenarios (Given / When / Then)

Given When Then

A. Complete the profile

Given the client has continued with Google and the names and verified email are filled in
When the client enters a contact number, ticks the Terms and Conditions and saves
Then the system shall make the account ready, send no code to the Google email, and open the meal menu

Sample Data:
Maria / Santos, maria.santos@gmail.com, contact 09171234567.

B. Blank or invalid entries

Given the client is on the profile screen
When a required field is left blank
Then the system shall display "Please fill in all required fields."

When the contact number is not 11 digits or contains letters
Then the system shall display "Please enter a valid contact number."

Sample Data:
Contact numbers: 0917123 and 0917ABC4567.

C. Duplicate contact number

Given another account already uses 09171234567
When the client enters that number
Then the system shall display "This username or contact number is already registered." and not link the two accounts

D. Terms and Conditions

Given the client leaves the box unticked
When the client saves
Then the system shall display "You must accept the Terms and Conditions to continue."

When the box is ticked
Then the system shall record the date and time of acceptance (USR - 15)

E. Unfinished profile

Given the client closed the app before finishing
When the client signs in again
Then the system shall show this screen again and not allow the meal menu or an order until the profile is complete

### Acceptance Criteria / System Requirements

1. The system shall require the first name, last name, and contact number before the account can be used. The names and the email address are filled in from Google (the client can edit the names). A username and a password are not required.

2. The system shall display "Please fill in all required fields." when a required field is left blank.

3. The system shall display "Please enter a valid contact number." when the value is not 11 digits or contains letters.

4. The system shall not send a code to the Google email address, which Google has already confirmed.

5. The system shall display "This username or contact number is already registered." when the contact number belongs to another account, and shall not link the two accounts.

6. The system shall require the Terms and Conditions to be accepted, display "You must accept the Terms and Conditions to continue." otherwise, and record the date and time of acceptance (USR - 15).

7. The system shall return the client to this screen at each sign-in until the profile is complete, and shall not allow orders until then.

Passed

Failed

Total

---

## USR - 32

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** use my username and password instead of Google
**So that:** so that I can still use the app if I prefer not to use another account.

### Scenarios (Given / When / Then)

Given When Then

A. Use the app without Google

Given the client does not tap "Continue with Google"
When the client registers or logs in with a username and password
Then the system shall work fully as in USR - 01 and USR - 02

Sample Data:
msantos / Meal@2026.

B. Wrong password

Given the client logs in with a username and password
When the password is wrong
Then the system shall display "Invalid username or password."

C. Google later with the same email

Given the client has a username and password account
When the client later taps "Continue with Google" with the same email
Then the system shall ask the client to log in to link the accounts (USR - 34) and not link them automatically

Sample Data:
maria.santos@gmail.com.

D. Forgot password

Given the client has a username and password account
When the client uses Forgot password
Then the system shall send the code as in USR - 04

Sample Data:
09171234567.

### Acceptance Criteria / System Requirements

1. The system shall keep "Continue with Google" optional, so that registration (USR - 01) and login (USR - 02) with a username and password work fully when it is not selected.

2. The system shall not link a username and password account with a Google account automatically. A Google account is linked only after the client logs in with that account's username and password (USR - 34).

3. The system shall offer password reset (USR - 04 and USR - 05) for username and password accounts only.

4. The system shall show the same menu, orders, and profile screens to every client, whichever sign-in method was used.

Passed

Failed

Total

---

## USR - 33

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** verify my account with a code sent by SMS or email
**So that:** so that the service knows my contact details are mine and my account is protected.

### Scenarios (Given / When / Then)

Given When Then

A. Choose how to receive the code

Given the client has just registered
When the "Verify your account" screen opens
Then the system shall show "Send code by SMS" and "Send code by email" with the number and address partly hidden

When the client chooses a method
Then the system shall send a 6-digit code by that method

Sample Data:
0917*****67 and m*****s@gmail.com.
Test environment code: 123456. Email subject: "Your verification code".

B. Correct code

Given a code has been sent
When the client enters the correct code within 10 minutes
Then the system shall display "Your account is verified." and open the profile screen

C. Wrong, expired or too many codes

Given a code has been sent
When the code is wrong
Then the system shall display "Incorrect verification code."

When the code is entered after 10 minutes
Then the system shall display "The verification code has expired."

When a wrong code is entered five times in a row
Then the system shall display "Too many incorrect attempts. Please request a new code."

Sample Data:
Wrong code: 000000. Correct code entered after 11 minutes.

D. Resend or switch method

Given a code has been sent
When the client taps "Resend code"
Then the system shall send a new code and invalidate the earlier one

When the client taps "Send code by email instead" after choosing SMS
Then the system shall send a new code by email and stop the SMS code from working

E. Code limits

Given a code was accepted or replaced
When the same code is entered again
Then the system shall display "Incorrect verification code."

When "Resend code" is tapped again after 10 seconds
Then the system shall display "Please wait [n] seconds before requesting a new code."

When a sixth code is requested within one hour
Then the system shall display "Too many code requests. Please try again in an hour."

F. Code cannot be sent

Given the client has chosen a method
When the SMS or email cannot be sent
Then the system shall display "We could not send the code. Please try again or use the other method."

G. Unverified login

Given the client closed the app before verifying
When the client logs in
Then the system shall display "Please verify your account first." (USR - 02) and not allow orders

### Acceptance Criteria / System Requirements

1. The system shall show a "Verify your account" screen after registration with two options, "Send code by SMS" (to the contact number) and "Send code by email" (to the email address), and shall hide part of the number or address (e.g., 0917*****67 and m*****s@gmail.com).

2. The system shall send a 6-digit numeric verification code by the chosen channel. SMS text: "Your verification code is 123456. It expires in 10 minutes. Do not share this code." Email subject: "Your verification code"; email body: "Your verification code is 123456. It expires in 10 minutes. If you did not ask for this code, ignore this email."

3. The system shall mark the account as verified only when the correct, unexpired code is entered, and display "Your account is verified."

4. The system shall display "The verification code has expired." when the code is used after 10 minutes.

5. The system shall display "Incorrect verification code." when a wrong code is entered.

6. The system shall allow the code to be resent, and shall invalidate any previously sent code when a new one is issued.

7. The system shall display "Too many incorrect attempts. Please request a new code." and require a new code after five consecutive incorrect entries.

8. The system shall not allow an unverified account to log in (USR - 02), place an order.

9. The system shall use these same code rules and messages for password reset (USR - 04) and for a changed contact number or email address (USR - 08).

10. The system shall display "We could not send the code. Please try again or use the other method." when the SMS or email cannot be sent.

11. The system shall accept each code only once. A code that was already used, or replaced by a newer one, is rejected with "Incorrect verification code."

12. The system shall allow a new code to be requested only 60 seconds after the last one and display "Please wait [n] seconds before requesting a new code."

13. The system shall allow no more than five codes per hour for the same contact number or email address and display "Too many code requests. Please try again in an hour." These rules also apply to password reset (USR - 04) and to changed contact numbers and emails (USR - 08).

Passed

Failed

Total

---

## USR - 34

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** link my Google account to my existing account
**So that:** so that I can sign in with one tap and keep my orders and profile.

### Scenarios (Given / When / Then)

Given When Then

A. Link the accounts

Given the Google email belongs to an account not yet linked to Google
When the linking screen opens
Then the system shall show "An account with this email already exists. Log in to link your Google account." with username and password fields

When the client enters the correct username and password
Then the system shall link Google, sign the client in and display "Your Google account is linked."

Sample Data:
msantos / Meal@2026.

B. Wrong password

Given the client is on the linking screen
When the password is wrong
Then the system shall display "Invalid username or password."

When it is wrong five times in a row
Then the system shall lock the account as in USR - 02

C. Cancel or forgot password

Given the client is on the linking screen
When the client cancels
Then the system shall link nothing and open the login screen

When the client taps "Forgot password"
Then the system shall open the reset flow in USR - 04

D. Already linked

Given a Google account is linked to one client account
When it is linked to a second account
Then the system shall display "This Google account is already linked to another account."

E. After linking

Given the Google account is linked to msantos
When the client taps "Continue with Google" or logs in with msantos / Meal@2026
Then the system shall sign in to the same account both ways

### Acceptance Criteria / System Requirements

1. The system shall show the linking screen with the message "An account with this email already exists. Log in to link your Google account." and username and password fields when the Google email belongs to an account that is not yet linked to Google.

2. The system shall link the Google account only after the correct username and password of the existing account are entered, and never automatically.

3. The system shall display "Invalid username or password." for a wrong password and apply the five-attempt lockout from USR - 02.

4. The system shall return to the login screen without linking anything when the client cancels.

5. The system shall allow a Google account to be linked to only one client account, and display "This Google account is already linked to another account." otherwise.

6. The system shall, after linking, sign the client in to the same account with Continue with Google, and keep the username and password working.

Passed

Failed

Total

---

## USR - 35

**Epic / System Component:** Home & Navigation
**Persona:** As a User
**I want to:** view recommended meals on the Home screen after logging in
**So that:** so that I can quickly see meals that are safe for my allergies and open their details.

### Scenarios (Given / When / Then)

Given When Then

A. Recommended meals after login

Given the client has registered allergies and logs in
When the Home screen opens
Then the system shall display recommended meals based on the registered allergies, following the rules in USR - 39, and only meals without an ingredient the client is allergic to

Sample Data:
Allergic to Peanuts: Chicken Tinola and Grilled Bangus shown, Chicken Satay not shown.
Shellfish added to allergies: shellfish meals removed.

B. Open the Meal page

Given recommended meals are displayed
When the client clicks "Chicken Tinola"
Then the system shall redirect to the Meal page showing its ingredients and nutritional information

When the client hovers over (or taps, on a touch screen) "Meal" in the navigation bar
Then the system shall open the Meal page

Sample Data:
Chicken Tinola: 320 kcal, protein 28 g, carbs 12 g, fat 15 g, sodium 480 mg.

C. No active order

Given the client has no active order
When the Home screen opens
Then the system shall display "You have no active orders" with a "Browse Meals" shortcut

Sample Data:
Notification bell shown with a text label or count badge.

### Acceptance Criteria / System Requirements

1. The system shall display recommended meals on Home after login, based on the client's registered allergies and following the recommendation rules in USR-39.

2. The system shall display only meals that do not contain an ingredient the client is allergic to.

3. The system shall redirect the client to the Meal page when a recommended meal is clicked.

4. The system shall make the Meal page accessible by hovering over (or tapping, on a touch screen) the "Meal" option in the navigation bar.

5. The system shall display the selected meal's details on the Meal page, including its ingredients and nutritional information.

6. The system shall show the current order status or a shortcut to the latest active order when one exists, and shall display "You have no active orders" with a "Browse Meals" shortcut when none exists.

7. The system shall give icon-only controls, such as the notification bell, a visible text label or badge.

Passed

Failed

Total

---

## USR - 36

**Epic / System Component:** Home & Navigation
**Persona:** As a User
**I want to:** use the Home screen shortcuts to reach common tasks
**So that:** so that I can get to meals, my current order, or my profile in one or two taps.

### Scenarios (Given / When / Then)

Given When Then

A. Home shortcuts

Given the client is on the Home screen
When the client selects "Browse Meals", "My Orders" or "My Account"
Then the system shall open Meals, Orders or Account

Sample Data:
Shortcut labels exactly: "Browse Meals", "My Orders", "My Account" (not "Order a meal", "Track my order" or "My health profile").

B. No current order

Given the client has no current order
When the client selects "My Orders"
Then the system shall open the order history and display "You have no orders yet." when appropriate

When the Home screen is displayed
Then the system shall show "You have no active orders" with a "Browse Meals" shortcut

C. Same labels everywhere

Given the client moves through the application
When a shortcut appears on another screen
Then the system shall use the same labels and destinations

### Acceptance Criteria / System Requirements

1. The system shall display shortcuts for "Browse Meals", "My Orders", and "My Account" on Home.

2. The system shall keep the same shortcut labels ("Browse Meals", "My Orders", "My Account") and destinations throughout the application, and shall not use other labels for them.

Passed

Failed

Total

---

## USR - 37

**Epic / System Component:** Home & Navigation
**Persona:** As a User
**I want to:** move between Home, Meal, Orders, and Account using the main navigation
**So that:** so that I can find the main features from any main screen without guessing where they are.

### Scenarios (Given / When / Then)

Given When Then

A. Move between destinations

Given the client is signed in
When the client selects Home, Meal, Orders or Account
Then the system shall open the matching screen and highlight it

When the client moves between main screens
Then the system shall keep every destination available

Sample Data:
Hover over (or tap) "Meal": the meal catalog and search tools open. Orders: current and previous orders. Account: profile and settings.

B. Visitor not logged in

Given the visitor has not logged in
When the visitor taps Orders or Account
Then the system shall display "Log in to continue" with a Log in button, and open the tapped destination after the client logs in

C. Help access

Given the client is on a main screen
When the client needs help
Then the system shall keep Help and service contact information available from Account and relevant screens, without a fifth item in the navigation bar

### Acceptance Criteria / System Requirements

1. The system shall provide a navigation bar with four destinations: Home, Meal, Orders, and Account, on the main signed-in screens.

2. The system shall keep Help and service contact information accessible from Account and from relevant screens, without taking a permanent place in the four-item navigation bar.

3. The system shall require sign-in before showing private profile information, health information, or order details, and shall display "Log in to continue" with a Log in button when a visitor who is not logged in taps Orders or Account.

Passed

Failed

Total

---

## USR - 38

**Epic / System Component:** Client Profile & Dietary Information
**Persona:** As a User
**I want to:** review the history of changes to my health and dietary information
**So that:** so that I can check when my information changed and help ensure my profile stays accurate.

### Scenarios (Given / When / Then)

Given When Then

A. Record a change

Given the client changes health, dietary or allergy information
When the change is saved
Then the system shall record the previous value, new value, actor and timestamp

Sample Data:
Add Peanuts to allergies. Remove Diabetes from health conditions. Change the Peanuts note from "Skin rash" to "Hives".

B. View the history

Given the client has recorded changes
When the client opens Account > Change History
Then the system shall list the entries newest first with the date and time, field changed, and old and new value

Sample Data:
"Skin rash > Hives".

C. No changes yet

Given the client has made no changes
When the client opens the history
Then the system shall display "No changes yet."

D. Protected entries

Given history entries exist
When the client tries to edit or delete one
Then the system shall not allow it and shall flag a broken hash chain as a possible alteration when integrity is checked

### Acceptance Criteria / System Requirements

1. The system shall record changes to the client's health conditions, dietary restrictions, and food allergies with the previous value, new value, actor, and timestamp.

2. The system shall display the client's own change history in Account, newest first, with the date and time, the field changed, and the old and new value for each entry.

3. The client shall not be able to edit or delete audit-history entries.

4. The system shall use append-only, tamper-evident event logging for relevant account and profile actions. Each event shall include a timestamp, user ID, event type, and a SHA-256 hash linked to the previous event's hash.

5. The system shall verify the hash chain when audit-log integrity is checked and flag a broken chain as a possible alteration.

6. The client-facing history shall show only the client's permitted information; internal security metadata need not be exposed in the regular profile view.

7. The system shall display "No changes yet." when no profile changes have been recorded.

Passed

Failed

Total

---

## USR - 39

**Epic / System Component:** Meals & Ordering
**Persona:** As a User
**I want to:** see meal suggestions that match my recorded preferences and dietary information
**So that:** so that I can find suitable options more quickly while avoiding meals that conflict with my recorded needs.

### Scenarios (Given / When / Then)

Given When Then

A. Suggestion cards

Given the client has saved preferences and dietary information
When the client opens the suggestions
Then the system shall show up to five meal suggestion cards, each with a plain reason, and the note "Suggestions are not medical advice. Follow your doctor or dietitian's guidance."

Sample Data:
Profile: prefers Soup and Fish, dislikes Ampalaya, allergic to Peanuts.
Chicken Tinola and Grilled Bangus, with "Matches your preference for soup".

B. Excluded meals

Given the profile records an allergen, a disliked ingredient, a restriction, or a meal is unavailable
When suggestions are made
Then the system shall not suggest those meals, and shall update the suggestions when the profile changes

Sample Data:
Chicken Satay and Ampalaya Stir-fry not recommended. Shellfish added: shellfish meals removed.

C. Empty profile

Given the client has no profile information
When the client opens the suggestions
Then the system shall display "Add dietary information to get more relevant suggestions." with a shortcut to Account

D. Daily nutritional targets

Given the client opens the daily-target screen and enters calories, protein and fat
When the system calculates a combination of available meals
Then the system shall show the suggested combination with its nutritional totals and a short explanation, without relaxing allergy or dietary exclusions

Sample Data:
Target: 1,800 calories, 120 g protein and under 50 g fat; breakfast, lunch and dinner options evaluated.

E. No exact match

Given no combination meets every target
When the result is shown
Then the system shall display "No exact match is available. Here is the closest option." with that option's totals

### Acceptance Criteria / System Requirements

1. The system shall show up to five meal suggestions based on the client's saved meal preferences and dietary information, where enough profile and catalog information is available.

2. The system shall exclude meals that contain a recorded allergen, include a disliked ingredient, conflict with a recorded dietary restriction, or are unavailable.

3. The system shall rank remaining meals using the preference-match rules defined for the project and explain each recommendation in plain language.

4. The system shall refresh suggestions when the client changes relevant profile information.

5. The system shall display "Suggestions are not medical advice. Follow your doctor or dietitian's guidance." near the suggestions.

6. Recommendations shall be displayed on Home as described in USR-39 and USR-35 and shall be optional shortcuts only; the full catalog shall remain directly accessible from the Meal page.

7. When the client provides daily nutritional targets, the system shall be able to calculate a suggested combination of available meals that aims to meet the client's calorie and nutrient targets while respecting configured limits, meal-selection constraints, dietary restrictions, and allergy exclusions. The system may use a Multi-Choice Knapsack Problem approach or Linear Programming.

8. The system shall display the nutritional totals and a brief explanation for suggested meal combinations. It shall not claim exact target compliance when nutrition data is incomplete.

9. The system shall provide a daily-target screen with fields for calories, protein, and fat, and shall show the suggested meal combination with its nutritional totals. When no combination meets every target, it shall display "No exact match is available. Here is the closest option." with that option's totals.

Passed

Failed

Total

---

## USR - 40

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** use a password-based account protected by secure password storage
**So that:** so that my password is not stored or exposed as readable text.

### Scenarios (Given / When / Then)

Given When Then

A. Password storage

Given a password-based account exists
When the password is stored
Then the system shall never store the raw password, only an Argon2id or bcrypt verifier with a unique salt

Sample Data:
Database check: no plaintext password is present.

B. Login checks

Given the stored verifier exists
When valid and invalid passwords are entered
Then the system shall verify them without logging or displaying the password and behave correctly for both

C. Password reset

Given the client resets the password
When the reset is saved
Then the system shall replace the verifier and invalidate existing sessions

### Acceptance Criteria / System Requirements

1. The system shall never store a user's raw password.

2. The system shall store password verifiers using Argon2id or bcrypt with a unique salt and an appropriate work factor.

3. The system shall verify the entered password against the stored verifier without logging or displaying the password.

4. A password reset shall replace the verifier and invalidate existing sessions as defined by the account-security rules.

5. Test data shall confirm that the database contains no plaintext password and that valid and invalid login attempts behave correctly.

Passed

Failed

Total

---

## USR - 41

**Epic / System Component:** Authentication & Account Management
**Persona:** As a User
**I want to:** access only the account information and actions allowed for my role
**So that:** so that my profile, health information, and orders stay private from other users.

### Scenarios (Given / When / Then)

Given When Then

A. Own records only

Given a client is logged in
When the client opens or changes a record
Then the system shall allow only the client's own profile, dietary information and orders, except access explicitly authorized for a linked guardian or family member

B. Another client's record

Given a client changes a record identifier manually
When the request is sent
Then the system shall deny it

C. No valid session

Given a request has no valid session
When it reaches a protected screen or action
Then the system shall redirect to sign-in or reject it, using a shared server-side check rather than a hidden button

### Acceptance Criteria / System Requirements

1. The system shall check the authenticated session and assigned role before allowing access to protected screens or operations.

2. A client account shall be allowed to view and change only its own profile, dietary information, and orders, except for access explicitly authorized for a linked guardian/family member.

3. Requests for another client's private record shall be denied even if the record identifier is changed manually.

4. Requests without a valid session shall be redirected to sign-in or rejected.

5. Authorization shall be enforced by a shared middleware or equivalent server-side gate; hiding a button in the interface alone shall not count as access control.

6. The implementation may represent roles with a bitmask or another explicit role-permission mapping, but permission checks shall produce the same deny-by-default behavior.

Passed

Failed

Total

---

## USR - 42

**Epic / System Component:** Security & Auditability
**Persona:** As a User
**I want to:** see a record of important changes I make to my profile
**So that:** so that I can review updates to my health and dietary information and trust that the history cannot be quietly rewritten.

### Scenarios (Given / When / Then)

Given When Then

A. Record events

Given the client creates an account or changes profile, health, dietary or allergy information
When the action completes
Then the system shall append an event with a timestamp, user ID, event type, change details and a SHA-256 hash that includes the previous event's hash

B. Altered events

Given events exist
When one is edited or removed
Then the hash-chain integrity check shall report a mismatch or broken chain, and normal operations shall not edit or delete events

C. Client view

Given the client opens the activity record
When the record is displayed
Then the system shall show only the client's own events and no other users' events or internal security secrets

### Acceptance Criteria / System Requirements

1. The system shall append an event when the client creates an account or changes profile, health, dietary, or allergy information. Relevant supported account and order actions, including login/logout and order-status changes, shall also be recorded where applicable.

2. Each event shall include a timestamp, user ID, event type, relevant action/change details, and a SHA-256 hash that incorporates the previous event's hash.

3. Existing events shall not be edited or deleted through normal application operations.

4. If a stored event is altered or removed, a hash-chain integrity check shall report a mismatch or broken chain.

5. Only actions and data actually supported by the client application shall be logged; no file-upload event shall be included unless file upload is added to scope.

6. The regular client interface shall not expose other users' events or internal security secrets.

Passed

Failed

Total

---
