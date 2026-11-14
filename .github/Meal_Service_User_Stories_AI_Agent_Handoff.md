# User Module Requirements - USR-01 through USR-50

**Source:** `FIL_Foods_User_5.xlsx - User Module.pdf` (provided PDF, 61 pages).
**Authority:** This PDF supersedes the former USR-01-USR-42 handoff. Requirements and acceptance criteria must be followed as written; unresolved conflicts must be recorded, not silently reinterpreted.

## Implementation instructions

- Preserve every user story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to its screen/component, service/API, data model, and automated test before marking it complete.
- Identify conflicts, ambiguities, dependencies, and external blockers rather than inventing business rules.
- Distinguish requirements from spreadsheet test-status rows (Passed / Failed / Total); do not treat status labels as features.
- Implement in dependency-aware increments and maintain criterion-level verification in `docs/implementation-traceability.md`.

## PDF transcription

Page headings preserve source pagination. Page content is extracted verbatim from the supplied PDF; table rows may wrap across page boundaries.

### PDF page 1

User Module
Precondition: The user (the person who registers, logs in and uses the application) has a registered, verified account (or one created by the Admin), is logged in to the meal service application, and the meals and menu have already been set up by the Admin. The
account is registered either For Myself (the user is also the meal recipient, the person who will receive the meals) or for a Family Member (the user manages the account for another person, the meal recipient).
Postcondition: The user's profile, the meal recipient's profile, or the order is saved with a unique reference, the order status and notifications are updated, and the action is logged under the user's account with the user who made it and the meal recipient it concerns.
Notifications go to the user; the health, dietary, and delivery information belongs to the meal recipient.
No. Epic (System Component) Persona (User) I want to (action) So that (benefit or value) Scenarios (Given / When / Then) Acceptance Criteria (System Requirement) Remarks
USR -
01
Authentication & Account
Management
As a User sign up either for myself or for
a family member, then create
an account using my first
name, last name, contact
number, address, email and
password
so that I can access the meal
service, and the meals and
health information are saved
for the right person (myself or
the family member who will
receive the meals).
Given When Then 1. The system shall first display the "Who is this meal
subscription for?" screen with the options "Signing Up for
Myself" and "Signing Up for a Family Member" before
the sign-up form (USR - 43).
A. Choose who is signing up
Given the user opens the app and selects Sign Up
When the sign-up screen opens
Then the system shall first display "Who is this meal
subscription for?" with two options, "Signing Up for Myself" and
"Signing Up for a Family Member" (USR - 43), before any form
is shown
Sample Data:
Maria Santos chooses "Signing Up for Myself". Carlos Dizon
chooses "Signing Up for a Family Member".
2. The system shall collect the user’s first name and last
name as separate fields (not one full name), contact
number, email address and password. The delivery
address is collected from the user for "Signing Up for
Myself"; for "Signing Up for a Family Member" it is
collected for the family member who will receive the
meals (USR - 44).
B. Sign up for myself
Given the user has chosen "Signing Up for Myself" and has not
registered before
When the user enters the first name, last name, contact
number, complete address, email address and password,
accepts the Terms and Conditions and selects Sign Up
Then the system shall create my account, treat me as the
person who will receive the meals, and open the profile form for
my allergies and dietary restrictions
Sample Data:
Maria / Santos / 09171234567 / 12 Mabini St., Quezon City /
maria.santos@gmail.com / Meal@2026, Terms and Conditions
ticked.
3. The system shall require a password and shall not
create an account without one.

### PDF page 2

USR -
01
Authentication & Account
Management
As a User sign up either for myself or for
a family member, then create
an account using my first
name, last name, contact
number, address, email and
password
so that I can access the meal
service, and the meals and
health information are saved
for the right person (myself or
the family member who will
receive the meals).
C. Sign up for a family member
Given the user has chosen "Signing Up for a Family Member"
and has not registered before
When the user enters their own first name, last name, contact
number, email address and password, accepts the Terms and
Conditions and selects Sign Up
Then the system shall create the account for the user, and then
ask for the details of the family member who will receive the
meals (first name, last name, relationship, delivery address)
(USR - 44), before opening the allergy and dietary restriction
forms for that family member
Sample Data:
User: Carlos Dizon, 09175550123, carlos.dizon@gmail.com.
Family member: Lia Dizon (Child), 8 Sampaguita St., Quezon
City.
4. The system shall validate required fields, email format
and contact number, and display a clear message when
they are not valid.
D. Missing or invalid details
Given the user is on the sign-up form
When a required field (including the password) is missing, or
the email/contact number is invalid
Then the system shall show a clear validation message and
shall not create the account
When no option was chosen on the "Who is this meal
subscription for?" screen and Continue is selected
Then the system shall ask the user to choose one and shall not
open the form
5. The system shall require acceptance of the Terms
and Conditions.
E. Order of the sign-up steps
Given the account has been created
When the user continues
Then the system shall ask, in this order: (1) the personal
details, (2) the food allergies of the meal recipient (USR - 11),
(3) the health condition (HTN, Diabetes, Gout, Kidney Problem,
Low-Cholesterol Diet) or the restriction given by the doctor
(USR - 09), and then show the recommended foods (USR - 35)
Sample Data:
Peanuts; Diabetes; doctor note "Soft food texture".
6. The system shall securely hash passwords and never
store them as readable text.

### PDF page 3

USR -
01
Authentication & Account
Management
As a User sign up either for myself or for
a family member, then create
an account using my first
name, last name, contact
number, address, email and
password
so that I can access the meal
service, and the meals and
health information are saved
for the right person (myself or
the family member who will
receive the meals).
7. After the account is created, the system shall ask for
the food allergies (USR - 11), then the health condition
or the doctor-provided restriction (USR - 09), and then
show the recommended foods based on them (USR -
35). For a family member, these are recorded for the
family member who will receive the meals.
8. The system shall store the choice (For Myself or
Family Member) with the account and show it in the
profile (USR - 07).
Passed
Failed
Total
USR -
02
Authentication & Account
Management
As a User log in using my registered
username and password
so that only I, or someone I
authorize, can view my orders
and health information.
Given When Then 1. The system shall require a username and a password
before granting access.
A. Successful login
Given the user has a verified, active account and is on the login
screen
When the user enters the registered username and password
and selects Log in
Then the system shall grant access, redirect the user to the
meal menu and record the date and time of the login
Sample Data:
Username: msantos. Password: Meal@2026.
2. The system shall display "Invalid username or
password." when the credentials do not match an active
account.
B. Invalid or blank credentials
Given the user is on the login screen
When the username or password does not match an active
account
Then the system shall display "Invalid username or password."
When the username or password is left blank
Then the system shall not grant access
Sample Data:
Invalid: msantos / wrongpass.
Blank username or password.
3. The system shall lock the account after five
consecutive failed login attempts.

### PDF page 4

USR -
02
Authentication & Account
Management
As a User log in using my registered
username and password
so that only I, or someone I
authorize, can view my orders
and health information.
C. Account lockout
Given the user has entered a wrong password for msantos four
times in a row
When the fifth wrong password is entered
Then the system shall lock the account
When the user then enters the correct password
Then the system shall display "Your account is locked. Please
reset your password or contact support." and keep the account
locked
When the user resets the password (USR - 04 and USR - 05)
Then the system shall allow the user to log in again
Sample Data:
Wrong password: wrongpass, 5 times in a row.
Correct password after the lockout: Meal@2026.
4. The system shall redirect the user to the meal menu
after a successful login.
D. Unverified account
Given the user has registered but not yet verified the account
When the user enters the correct username and password
Then the system shall display "Please verify your account first."
and open the "Verify your account" screen (USR - 33)
5. The system shall record the date and time of every
login and logout.
E. Too many attempts
Given one phone is used to try different usernames
When wrong passwords are entered for 11 different usernames
within one minute
Then the system shall display "Too many attempts. Please wait
a minute and try again." and not count the blocked attempts
towards the five-attempt lockout
Sample Data:
11 different usernames within one minute from the same phone.
6. The system shall display "Your account is locked.
Please reset your password or contact support." when a
locked account is used to log in, and shall keep the
account locked until the user resets the password or the
Admin unlocks it.
7. The system shall apply the password rules and the
five-attempt lockout to username and password
accounts only. Accounts that continue with Google are
not locked by failed password attempts (see USR - 30).

### PDF page 5

USR -
02
Authentication & Account
Management
As a User log in using my registered
username and password
so that only I, or someone I
authorize, can view my orders
and health information.
8. The system shall display "Please verify your account
first." and open the "Verify your account" screen (USR -
33) when the correct username and password belong to
an account that is not yet verified.
9. The system shall allow no more than 10 login
attempts per minute from the same device or network
address, whatever the username, and display "Too
many attempts. Please wait a minute and try again."
Attempts blocked this way do not count towards the five-
attempt lockout.
Passed
Failed
Total
USR -
03
Authentication & Account
Management
As a User choose to stay logged in on
my device
so that I do not have to sign in
every time I open the app.
Given When Then 1. The system shall display a "Keep me logged in" option
on the login screen.
A. Stay logged in
Given the user is on the login screen
When the user ticks "Keep me logged in", logs in and then
closes and reopens the app
Then the system shall keep the session active until the user
logs out
When the user logs in with the option unticked and then closes
and reopens the app
Then the system shall show the login screen
Sample Data:
Username: msantos. Option ticked, then unticked.
2. The system shall keep the session active on the
device until the user logs out when the option is
selected.
B. Password changed
Given the user is logged in on a device with "Keep me logged
in" ticked
When the password is changed
Then the system shall require the user to log in again
Sample Data:
New password: NewMeal@2026.
3. The system shall end the session when the app is
closed or after a period of inactivity when the option is
not selected.
4. The system shall require the user to log in again after
the password has been changed.
Passed
Failed
Total

### PDF page 6

USR -
04
Authentication & Account
Management
As a User request help when I forget my
password
so that I can regain access to
my account without asking
staff to do it for me.
Given When Then 1. The system shall allow a password reset to be
requested with the registered contact number or the
registered email address, and the user shall choose
"Send code by SMS" or "Send code by email".
A. Request a verification code
Given the user is on the forgot password screen
When the user enters a registered contact number and
chooses "Send code by SMS"
Then the system shall send a 6-digit code by SMS
When the user enters a registered email address and chooses
"Send code by email"
Then the system shall send a 6-digit code by email
Sample Data:
Registered number: 09171234567, by SMS.
Registered email: maria.santos@gmail.com, by email.
2. The system shall display "No account found with this
contact number." or "No account found with this email
address." when the value is not registered.
B. Unregistered contact details
Given the user is on the forgot password screen
When the contact number or email address is not registered
Then the system shall display "No account found with this
contact number." or "No account found with this email address."
Sample Data:
Unregistered number: 09999999999. Unregistered email:
unknown@example.com.
3. The system shall send the 6-digit verification code by
SMS or by email as chosen, and apply the code rules
and messages in USR - 33 (10-minute expiry, resend,
five incorrect entries).
C. Enter the code
Given a code has been sent to the user
When the user enters the correct code within 10 minutes
Then the system shall open the new password screen (USR -
05)
When the code is wrong, expired, entered wrongly five times, or
resent
Then the system shall apply the code rules and messages in
USR - 33
Sample Data:
Test environment code: 123456.
4. The system shall allow the user to proceed to the new
password screen only after the correct, unexpired code
is entered.

### PDF page 7

USR -
04
Authentication & Account
Management
As a User request help when I forget my
password
so that I can regain access to
my account without asking
staff to do it for me.
D. Google-only account
Given an account signs in only with Google and has no
password
When the user enters its contact number or email address
Then the system shall display "This account signs in with
Google. Please use that option to log in." and not send a code
Sample Data:
Google-only contact number: 09175550142.
5. The system shall display "This account signs in with
Google. Please use that option to log in." when the
account has no password, and shall not send a code.
Passed
Failed
Total
USR -
05
Authentication & Account
Management
As a User set a new password after
verifying my identity
so that my account stays
secure and I can log in again.
Given When Then 1. The system shall allow a new password to be set only
after the verification code in USR - 04 has been
accepted, and shall require the new password to be
entered twice.
A. Set a new password
Given the user has entered the correct verification code (USR -
04)
When the user enters the new password twice and saves
Then the system shall display "Password updated. Please log
in."
When the user was also logged in on another device
Then the system shall end that other session
Sample Data:
New password: NewMeal@2026, entered twice.
Two devices logged in; reset done on one.
2. The system shall display "Passwords do not match."
when the two entries are different.
B. Invalid new password
Given the user is on the new password screen
When the two entries are different
Then the system shall display "Passwords do not match."
When the password has fewer than 8 characters
Then the system shall display "Password must be at least 8
characters."
When the password is the same as the current password
Then the system shall not accept it
Sample Data:
Mismatch: NewMeal@2026 and NewMeal@2027.
Short password: Abc123.
Same as current: Meal@2026.
3. The system shall display "Password must be at least 8
characters." when a shorter password is entered.

### PDF page 8

USR -
05
Authentication & Account
Management
As a User set a new password after
verifying my identity
so that my account stays
secure and I can log in again.
C. No verified code
Given the user has not entered a verified code
When the user tries to open the new password screen
Then the system shall refuse access and return the user to the
forgot password screen
4. The system shall not accept a new password that is
the same as the current password.
5. The system shall display "Password updated. Please
log in." after a successful reset.
6. The system shall end all other active sessions of the
account after the password is changed.
Passed
Failed
Total
USR -
06
Authentication & Account
Management
As a User log out of my account so that my information is not
exposed when someone else
uses the device.
Given When Then 1. The system shall provide a Log out option reachable
from the main menu.
A. Log out with confirmation
Given the user is logged in
When the user chooses Log out from the main menu
Then the system shall display "Are you sure you want to log
out?" with Yes and No
When the user chooses Yes
Then the system shall end the session, show the login screen
and record the date and time of the logout
Sample Data:
Logout timestamp in the log, e.g. 2026-10-12 09:15 AM.
2. The system shall display "Are you sure you want to
log out?" before ending the session.
B. Cancel logging out
Given the "Are you sure you want to log out?" message is
displayed
When the user chooses No
Then the system shall keep the session active
3. The system shall end the session and return to the
login screen after confirmation.
4. The system shall record the date and time of the
logout.
Passed
Failed
Total

### PDF page 9

USR -
07
User Profile & Dietary
Information
As a User view my profile, and the meal
recipient's profile, in one
screen
so that I can check that the
personal, health, and dietary
information of the user and of
the meal recipient is correct
before ordering.
Given When Then 1. The system shall display "Registered for: Myself" or
"Registered for: Family Member" at the top of the profile
(USR - 43).
A. View the profile (For Myself)
Given the user msantos registered For Myself, is logged in and
has completed the profile
When the user opens Profile
Then the system shall display "Registered for: Myself" and one
set of details for the user, who is also the meal recipient: the
personal details, the health conditions, dietary restrictions, food
allergies and meal preferences, the guardian or family member,
and the date the profile was last updated
Sample Data:
First name Maria, Last name Santos, 09171234567, maria.
santos@gmail.com, 12 Mabini St., Quezon City.
Hypertension, Low-sodium, Peanuts, guardian Jose Santos
(Son), last updated 2026-10-11.
2. The system shall display the user's first name, last
name (with middle name and suffix, if any), contact
number, and email address.
B. View the profile (Family Member)
Given the user cdizon registered as Family Member, is logged
in and has saved the meal recipient's details
When the user opens Profile
Then the system shall display "Registered for: Family Member"
and two separate sections: "Your details" (the user's name,
contact number and email address) and "Meal recipient" (the
name, relationship to the user, contact number if any, and
delivery address of the person receiving the meals), followed by
the meal recipient's health conditions, dietary restrictions, food
allergies and meal preferences, the family contact, and the date
the profile was last updated
Sample Data:
Your details: Carlos Dizon, 09175550123, carlos.dizon@gmail.
com.
Meal recipient: Lia Dizon (Child), 8 Sampaguita St., Quezon
City.
Diabetes, Low-sugar, Peanuts, family contact Carlos Dizon, last
updated 2026-10-20.
3. The system shall display the address as part of the
same person's details for a For Myself account, because
the user is also the meal recipient.
4. The system shall display the user's details ("Your
details") and the meal recipient's details ("Meal
recipient": name, relationship to the user, contact
number if any, and delivery address) in two separate
sections for a Family Member account.

### PDF page 10

USR -
07
User Profile & Dietary
Information
As a User view my profile, and the meal
recipient's profile, in one
screen
so that I can check that the
personal, health, and dietary
information of the user and of
the meal recipient is correct
before ordering.
5. The system shall display the meal recipient's recorded
health conditions, dietary restrictions, food allergies, and
meal preferences, labeled with the meal recipient's name
(USR - 46).
6. The system shall display the guardian/family member
information, if any (USR - 14).
7. The system shall display the date the profile was last
updated.
Passed
Failed
Total
USR -
08
User Profile & Dietary
Information
As a User edit my own personal
information
so that my contact details, and
my delivery details when I
registered For Myself, are
always current.
Given When Then 1. The system shall allow the user's first name, last
name, middle name, suffix, contact number, and email
address to be edited, and the address as well when the
account is registered For Myself.
A. Edit personal information
Given the user is on the Edit profile screen
When the user changes the address or name and saves
Then the system shall save the change and display "Profile
updated successfully."
Given the user registered as Family Member
When the user changes the name or contact number and saves
Then the system shall change only the user's details and leave
the meal recipient's details as they are
Sample Data:
Address: 45 Rizal Ave., Quezon City.
Name: First name Maria Luisa, Last name Santos.
Family Member: Carlos Dizon changes the contact number to
09175550999. Lia Dizon's details do not change.
2. The system shall display "Please enter a valid contact
number." or "Please enter a valid email address." when
the value is not valid.

### PDF page 11

USR -
08
User Profile & Dietary
Information
As a User edit my own personal
information
so that my contact details, and
my delivery details when I
registered For Myself, are
always current.
B. Blank or invalid entries
Given the user is on the Edit profile screen
When the first name, last name or email is blank
Then the system shall display "Please fill in all required fields."
When the contact number or email address is not valid
Then the system shall display "Please enter a valid contact
number." or "Please enter a valid email address."
Sample Data:
Invalid contact numbers: 0917123 and 0917ABC4567. Invalid
email: maria.santos@.
3. The system shall display "Please fill in all required
fields." when the first name, last name, or email is blank.
C. Change contact number or email
Given the user is on the Edit profile screen
When the user enters a new contact number or email address
Then the system shall send a 6-digit code by SMS or email and
save the new value only after the correct code is entered
When a wrong code is entered
Then the system shall show the message in USR - 33 and keep
the old value
When the new value belongs to another account
Then the system shall display "This username or contact
number is already registered." or "This email address is already
registered."
Sample Data:
New number: 09181234567. New email: m.santos@gmail.com.
Wrong code: 000000.
4. The system shall send a 6-digit verification code by
SMS to a new contact number, or by email to a new
email address, and save the new value only after the
correct code is entered, using the code rules and
messages in USR - 33.
D. Leave with unsaved changes
Given the user has edited a field without saving
When the user presses Back
Then the system shall ask for confirmation before leaving the
screen
5. The system shall display "This username or contact
number is already registered." or "This email address is
already registered." when the new value belongs to
another account.
6. The system shall display "Profile updated
successfully." after the changes are saved.
7. The system shall ask for confirmation before leaving
the screen with unsaved changes.

### PDF page 12

USR -
08
User Profile & Dietary
Information
As a User edit my own personal
information
so that my contact details, and
my delivery details when I
registered For Myself, are
always current.
8. The system shall apply this story to the user's own
details only. The meal recipient's details of a Family
Member account, including the delivery address, are
edited in USR - 45.
Passed
Failed
Total
USR -
09
User Profile & Dietary
Information
As a User select my health condition or
enter a dietary restriction given
by my doctor
so that the system can
recommend meals that follow
my health needs and medical
instructions.
Given When Then 1. The system shall provide condition options for HTN,
Diabetes, Gout, Kidney Problem and Low-Cholesterol
Diet.
A. Select health conditions
Given I am completing or editing the dietary information form
When I select one or more applicable conditions, such as
Hypertension (HTN), Diabetes, Gout, Kidney Problem or Low-
Cholesterol Diet
Then the system shall save the selected conditions to my
profile.
2. The system shall provide an “Other / Doctor-provided
restriction” option with a text field.
B. Doctor-provided restriction
Given I am completing or editing the dietary information form
When my doctor has given me a specific dietary restriction
Then I can select the doctor-provided restriction option and
enter the instruction in the text field for Dietitian review.
3. The system shall make the saved information
available to the Dietitian and use it when filtering meal
recommendations.
Passed
Failed
Total
USR -
10
User Profile & Dietary
Information
As a User record my dietary restrictions
and food preferences
so that recommended meals
do not conflict with the diet I
need to follow.
Given When Then 1. The system shall allow users to record additional
dietary restrictions.
A. Record other restrictions and preferences
Given the dietary information form is open
When I enter restrictions or preferences not already covered by
the condition list
Then the system shall save them to my profile and include
them when checking meal suitability.
2. The system shall use these restrictions when filtering
recommended meals.
3. The system shall make the information visible to the
Dietitian and Kitchen Staff when needed.
Passed
Failed
Total

### PDF page 13

USR -
11
User Profile & Dietary
Information
As a User record my food allergies so that meals containing
ingredients I am allergic to are
excluded from my
recommendations.
Given When Then 1. The system shall allow users to select or enter food
allergies.
A. Save food allergies
Given the allergy section is open
When I select or enter my food allergies and save the form
Then the system shall store the allergies and exclude meals
containing those allergens from recommended foods.
2. The system shall check meal ingredients and allergen
information before showing a recommendation.
B. No safe meal available
Given the allergy section is open
When no safe recommended meal is available
Then the system shall show a message instead of suggesting
an unsafe meal.
3. The system shall not recommend meals that contain a
recorded allergen.
Passed
Failed
Total
USR -
12
User Profile & Dietary
Information
As a User add the meal recipient's meal
preferences
so that the menu can suggest
meals the meal recipient is
more likely to enjoy.
Given When Then 1. The system shall allow preferred meal categories and
disliked ingredients to be recorded.
A. Add meal preferences
Given the user is on the meal preferences screen of the meal
recipient
When the user records preferred categories and disliked
ingredients and saves
Then the system shall save them and display "Meal
preferences saved."
Sample Data:
Preferred categories: Soup, Fish.
Disliked ingredients: Ampalaya, Liver.
2. The system shall allow the preferences to be updated
or removed.
B. Update or remove a preference
Given the user has saved meal preferences
When the user removes a disliked ingredient and saves
Then the system shall remove it
Sample Data:
Remove Liver.
3. The system shall use the preferences to sort matching
meals first in the menu.

### PDF page 14

USR -
12
User Profile & Dietary
Information
As a User add the meal recipient's meal
preferences
so that the menu can suggest
meals the meal recipient is
more likely to enjoy.
C. Menu ranking
Given the meal recipient prefers Soup and Fish, dislikes
Ampalaya, has the Low-sodium restriction and is allergic to
Peanuts
When the user opens the menu
Then the system shall list meals by score, highest first, with
meals that contain a recorded allergen listed last and shown
with a warning
Sample Data:
Chicken Tinola (score 5), Grilled Bangus (5), other meals (0),
Ampalaya Stir-fry (-3), Chicken Satay (last).
4. The system shall display "Meal preferences saved."
after a successful save.
5. The system shall rank the menu by a score and list
the highest score first, with equal scores in alphabetical
order:
   - +3 when the meal is in a preferred category
   - +2 when the meal matches a dietary restriction in the
meal recipient's profile (e.g., Low-sodium)
   - +1 when the meal matches a nutritional preference
(USR - 13)
   - -3 for each disliked ingredient in the meal
   - Meals that contain a recorded allergen are listed last,
with a warning, and never given a bonus
6. The system shall record the preferences for the meal
recipient, not for the user, and shall rank the menu using
the meal recipient's preferences, restrictions, and
allergies.
Passed
Failed
Total
USR -
13
User Profile & Dietary
Information
As a User update the meal recipient's
nutritional preferences
so that I can pick meals that fit
the meal recipient's daily
nutrition goals.
Given When Then 1. The system shall allow nutritional preferences to be
selected (e.g., lower calories, higher protein, lower
sodium).
A. Select nutritional preferences
Given the user is on the nutritional preferences screen of the
meal recipient
When the user selects preferences and saves
Then the system shall save them and display "Nutritional
preferences updated."
Sample Data:
Lower sodium and Higher protein selected.
Family Member: Lower calories selected for Lia Dizon.
2. The system shall allow the selected preferences to be
changed at any time.

### PDF page 15

USR -
13
User Profile & Dietary
Information
As a User update the meal recipient's
nutritional preferences
so that I can pick meals that fit
the meal recipient's daily
nutrition goals.
B. Change preferences
Given the meal recipient has saved nutritional preferences
When the user changes them
Then the system shall save the new selection
Sample Data:
Change to Lower calories only.
3. The system shall allow the meal list to be filtered
using the saved nutritional preferences.
C. Filter the menu
Given the meal recipient has saved nutritional preferences
When the user applies the filter in the menu
Then the system shall show only matching meals
4. The system shall display "Nutritional preferences
updated." after a successful save.
5. The system shall save the nutritional preferences for
the meal recipient, not for the user.
Passed
Failed
Total
USR -
14
User Profile & Dietary
Information
As a User add a guardian or family
contact for the meal recipient
so that someone the meal
recipient trusts can be
contacted about the meal
recipient's orders when
needed.
Given When Then 1. The system shall allow a guardian/family member to
be added with name, relationship, and contact number.
A. Add a guardian
Given the user is on the guardian screen
When the user enters the name, relationship and contact
number and saves
Then the system shall save them and display "Guardian
information saved."
Sample Data:
Jose Santos / Son / 09189876543.
2. The system shall display "Please enter the guardian's
name and contact number." when a required field is
blank.
B. Blank required field
Given the user is adding a guardian
When the name or contact number is left blank
Then the system shall display "Please enter the guardian's
name and contact number."
Sample Data:
Blank contact number.
3. The system shall allow the guardian/family member
information to be updated or removed.

### PDF page 16

USR -
14
User Profile & Dietary
Information
As a User add a guardian or family
contact for the meal recipient
so that someone the meal
recipient trusts can be
contacted about the meal
recipient's orders when
needed.
C. No guardian yet
Given the user has not saved a guardian
When the user opens the guardian screen
Then the system shall display "No guardian or family member
added yet." and an "Add guardian" button
4. The system shall display "Guardian information
saved." after a successful save.
D. Edit a guardian
Given the user has a saved guardian
When the user opens Edit guardian
Then the system shall show the form filled in with the saved
details
When the user changes the number and saves
Then the system shall save the change and display "Guardian
information saved."
Sample Data:
Number changed from 09189876543 to 09189876500.
5. The system shall make the guardian information
viewable to the Admin.
E. Remove a guardian
Given the user has a saved guardian
When the user chooses Remove
Then the system shall display "Are you sure you want to
remove this guardian?" with Yes and No
When the user chooses Yes
Then the system shall remove the entry
When the user chooses No
Then the system shall keep the entry
6. The system shall display "No guardian or family
member added yet." and an "Add guardian" button when
no guardian has been saved.
F. Admin view
Given a guardian has been saved
When the Admin opens the user record
Then the system shall show the guardian information
7. The system shall open an Edit guardian form filled in
with the saved name, relationship, and contact number,
and shall apply the same required-field check as in no.
2.

### PDF page 17

USR -
14
User Profile & Dietary
Information
As a User add a guardian or family
contact for the meal recipient
so that someone the meal
recipient trusts can be
contacted about the meal
recipient's orders when
needed.
G. Family Member accounts
Given the user registered as Family Member
When the user opens the guardian screen
Then the system shall show the user's name and contact
number as the main family contact of the meal recipient without
requiring a guardian to be added, and shall still allow another
guardian or family contact to be added
Sample Data:
Main family contact for Lia Dizon: Carlos Dizon, 09175550123
(the user). Another contact added: Rosa Dizon / Grandmother /
09175550456.
8. The system shall display "Are you sure you want to
remove this guardian?" with Yes and No options before
a guardian is removed.
9. The system shall show the user as the main family
contact of the meal recipient for a Family Member
account, using the name and contact number of the
user's account, shall not require another guardian to be
added, and shall allow another guardian or family
contact to be added.
Passed
Failed
Total
USR -
15
User Profile & Dietary
Information
As a User view the Terms and
Conditions
so that I understand how my
information will be used before
I agree.
Given When Then 1. The system shall display the Terms and Conditions
during registration and from the profile screen.
A. View the Terms and Conditions
Given the user is on the registration page or Profile
When the user opens the Terms and Conditions
Then the system shall display them, including how health and
dietary information is collected and used
Sample Data:
Opened from the registration page and from Profile.
2. The system shall display "You must accept the Terms
and Conditions to continue." when registration is
attempted without acceptance.
B. Registration without acceptance
Given the user is on the registration page with the box unticked
When the user selects Register
Then the system shall display "You must accept the Terms and
Conditions to continue."
3. The system shall record the date and time the Terms
and Conditions were accepted.

### PDF page 18

USR -
15
User Profile & Dietary
Information
As a User view the Terms and
Conditions
so that I understand how my
information will be used before
I agree.
C. Accept the Terms and Conditions
Given the user ticks the box
When the user registers
Then the system shall record the date and time of acceptance
Sample Data:
Acceptance timestamp, e.g. 2026-10-12 09:00 AM.
4. The system shall state how health and dietary
information is collected and used.
D. Family Member statement
Given the user registered as Family Member
When the user opens the Terms and Conditions
Then the system shall display the statement that a user who
registers for a family member must be allowed to manage that
person's meals and health information
Sample Data:
Carlos Dizon reads the statement before saving Lia Dizon's
details (USR - 44).
5. The system shall state in the Terms and Conditions
that a user who registers for a family member must be
allowed to manage that person's meals and health
information, and shall record the user's confirmation
(USR - 44).
Passed
Failed
Total
USR -
16
Meals & Ordering As a User browse the available meals by
meal time and food category
so that I can choose from the
foods currently offered for
breakfast, lunch or dinner.
Given When Then 1. The system shall separate the menu into Breakfast,
Lunch and Dinner.
Connected to Admin menu
management (ADM - 17 to
ADM - 18).
A. Browse meals by meal time
Given I am signed in and open the Meals or Order page
When I select Breakfast, Lunch or Dinner
Then the system shall show the items available for that meal
time.
Breakfast shall show the pastries and breads currently
available. Lunch and Dinner shall show the available meat
choices (Beef, Pork, Chicken or Fish) and vegetable choices.
2. Breakfast shall display only available pastries and
breads.
3. Lunch and Dinner shall display available meat or
vegetable options.
4. The system shall show availability and current price
for each item.
5. Meal availability and menu options shall use the menu
items and availability maintained by Admin (ADM - 17
and ADM - 18).

### PDF page 19

Passed
Failed
Total
USR -
17
Meals & Ordering As a User view the details and
ingredients of an available
meal
so that I can check whether
the meal is suitable for my
allergies and dietary
restrictions.
Given When Then 1. Each meal detail shall show its ingredients and
allergen information.
A. View meal details
Given I am viewing the available meals
When I open a meal
Then the system shall show its name, description, ingredients,
meal time, price and relevant allergen information.
2. The system shall display the standard meal price of
₱300.
3. The system shall show whether the meal is available.
Passed
Failed
Total
USR -
18
Meals & Ordering As a User choose one meal for each
meal time and customize my
food choice
so that I can select meals that
match my preferences while
following my dietary needs.
Given When Then 1. The system shall allow one meal per meal time:
Breakfast, Lunch and Dinner.
A. One meal per meal time
Given I am on the Order page
When I select one available meal for Breakfast, Lunch or
Dinner
Then the system shall allow only one meal selection for that
meal time and a maximum of three meals per day.
2. The system shall limit selections to three meals per
day.
B. Customize vegetables or meat
Given I am on the Order page
When I choose vegetables or meat for a meal
Then for vegetables I can select steamed, stir-fried or pinakbet.
For meat I can select Beef, Pork, Chicken or Fish and a Filipino
cooking style such as Adobo, Tinola, Sinigang, Kaldereta or
Pinoy Steak, subject to availability and Dietitian approval.
3. Vegetable options shall include steamed, stir-fried and
Pinakbet.
4. Meat options shall include Beef, Pork, Chicken and
Fish.
5. Available Filipino cooking styles shall include Adobo,
Tinola, Sinigang, Kaldereta and Pinoy Steak.
6. Customizations shall be checked against the user’s
allergies and restrictions.
Passed
Failed
Total

### PDF page 20

USR -
19
Meals & Ordering As a User choose delivery or pickup for
my confirmed meal order
so that I can receive my meals
at my address or collect them
myself.
Given When Then 1. The system shall require the user to choose Delivery
or Pickup.
A. Choose how to receive the order
Given I have selected my meals
When I proceed to fulfillment
Then I shall choose Delivery or Pickup.
2. Delivery shall require a valid delivery address and
schedule.
B. Delivery selected
Given I am choosing how to receive my order
When I choose Delivery
Then the system shall use or request my delivery address.
3. Pickup shall show the pickup details and schedule.
C. Pickup selected
Given I am choosing how to receive my order
When I choose Pickup
Then the system shall show the pickup instructions and
available pickup schedule.
4. The selected fulfillment method shall be included in
the order summary.
Passed
Failed
Total
USR -
20
Meals & Ordering As a User review my meal selections or
plan, confirm my order and
pay after Dietitian approval
so that I can verify the order
and complete payment before
the kitchen prepares my
meals.
Given When Then 1. The system shall calculate the total based on selected
meals or the selected plan.
Connected workflow: User →
Dietitian (DIT - 15) →
payment → Kitchen (KIT - 11
to KIT - 13) → Admin
assignment (ADM - 12) →
Delivery Staff (DEL - 15 to
DEL - 17), or Ready for
Pickup.
A. Review the order summary
Given I have selected meals for the day or a meal plan
When I open the order summary
Then the system shall show the selected meals, meal times,
customizations, delivery or pickup details and total amount.
A standard meal shall cost ₱300. The available plans shall be
₱4,999 weekly, ₱27,899 monthly and ₱327,999 yearly.
2. The system shall display ₱300 per standard meal and
the weekly, monthly and yearly plan prices.

### PDF page 21

USR -
20
Meals & Ordering As a User review my meal selections or
plan, confirm my order and
pay after Dietitian approval
so that I can verify the order
and complete payment before
the kitchen prepares my
meals.
B. Dietitian review and payment
Given I have confirmed my order
When the order is submitted
Then it shall be sent to the Dietitian for review. If approved, the
system shall prompt me to pay. The order shall be sent to the
Kitchen only after payment is confirmed.
3. The system shall require confirmation before
submitting the order.
4. Confirmed orders shall be routed to the Dietitian for
review.
5. Payment shall be requested only after Dietitian
approval.
6. Only paid orders shall be forwarded to Kitchen Staff
for preparation.
7. The confirmed order shall be sent to the Dietitian for
review (DIT - 15). After approval and successful
payment, it shall enter the Kitchen order queue (KIT - 11
to KIT - 13). For delivery orders, the Admin assigns
Delivery Staff (ADM - 12), who update delivery progress
(DEL - 15 to DEL - 17). Pickup orders are completed
after the pickup handoff is confirmed.
Passed
Failed
Total
USR -
21
Orders As a User view my submitted orders and
their payment status
so that I can keep track of
orders that are awaiting
review, payment or
preparation.
Given When Then 1. The system shall show only the signed-in user’s
orders.
Status source is connected
to the relevant staff-module
actions.
A. View submitted orders
Given I have submitted an order
When I open Orders
Then the system shall list my orders with an order reference,
date, selected meals, fulfillment method, total and current
status.
2. Each order shall have a unique order reference.
3. The order list shall show the current review, payment,
preparation and fulfillment status.
4. Order records and status shall reflect authorized
updates from Dietitian (DIT - 15), Kitchen Staff (KIT -
13), Admin (ADM - 12) and Delivery Staff (DEL - 17).
Passed
Failed
Total

### PDF page 22

USR -
22
Orders As a User view the full details of an order so that I can verify the meals,
customizations, price and
fulfillment details.
Given When Then 1. The system shall show complete details for the user’s
own order only.
A. View order details
Given an order appears in my order list
When I open the order
Then the system shall show its meal selections,
customizations, amount, payment status, delivery or pickup
details and status history.
2. The system shall display payment and fulfillment
information accurately.
Passed
Failed
Total
USR -
23
Orders As a User check the status of my order so that I know whether it is
being reviewed, awaiting
payment, prepared or ready
for delivery or pickup.
Given When Then 1. The system shall display the current order status. Connected to Kitchen and
Delivery status updates.
A. View current order status
Given I have an active order
When I view its status
Then the system shall show the current stage: For Dietitian
Review, Awaiting Payment, Paid, Preparing, Ready for Pickup,
Out for Delivery, Completed or Cancelled.
2. The status shall update when the Dietitian, Admin,
Kitchen Staff or Delivery Staff completes an authorised
action.
3. For delivery orders, the status shall reflect Delivery
Staff updates (DEL - 17); for pickup orders, it shall reflect
the Kitchen's Ready for Pickup update (KIT - 13) and
pickup completion.
Passed
Failed
Total
USR -
24
Orders As a User receive updates when my
order status changes
so that I do not need to keep
checking the order page.
Given When Then 1. The system shall notify the user of important order
status changes.
A. Receive status notifications
Given notifications are enabled for my account
When my order is reviewed, payment is recorded, preparation
starts, or the order is ready, dispatched or completed
Then the system shall send an in-app notification about the
status change.
2. Notifications shall identify the related order and its
updated status.
Passed
Failed
Total

### PDF page 23

USR -
25
Orders As a User receive updates about my
order
so that I do not have to keep
checking the app.
Given When Then 1. The system shall send a notification when an order is
confirmed, when its status changes, and when it is
cancelled or has an issue.
A. Order notifications
Given the user has an order
When the order is confirmed, changes status, or is cancelled
Then the system shall send a notification shown with its date
and time
When the order belongs to a Family Member account
Then the system shall send the notification to the user and
name the meal recipient in it
Sample Data:
"Order TRK-2026-0002 is now Out for Delivery." (2026-10-12
11:45 AM).
Family Member: "Order TRK-2026-0004 for Lia Dizon is now
Out for Delivery." sent to Carlos Dizon.
2. The system shall display notifications in the app with
the date and time.
B. Read notifications
Given the user has unread notifications
When the user opens one
Then the system shall mark it as read and keep it in the list
3. The system shall mark unread notifications and keep
read notifications viewable.
C. Admin announcements
Given the Admin sends an announcement
When the user opens notifications
Then the system shall show the announcement in the same list
Sample Data:
"Kitchen closed on Oct 31".
4. The system shall show announcements sent by the
Admin in the same list.
5. The system shall send order notifications to the user,
and include the meal recipient's name in the notification
for Family Member orders.
Passed
Failed
Total
USR -
26
Help & Assistance As a User view help instructions so that I can learn how to use
the app without asking for
technical help.
Given When Then 1. The system shall display help instructions in simple,
step-by-step language.

### PDF page 24

USR -
26
Help & Assistance As a User view help instructions so that I can learn how to use
the app without asking for
technical help.
A. Help reachable from every screen
Given the user is on any screen
When the user selects the Help button
Then the system shall open the help instructions, including from
the login and sign-up screens
Sample Data:
Help opened from the login, sign-up, Home, Menu, Profile,
Order and Tracking screens.
2. The system shall make the help instructions reachable
from every screen, including the login and sign-up
screens, through a Help button with a text label.
B. Step-by-step instructions
Given the user is on the Help screen
When the user opens "How to place an order"
Then the system shall show simple steps
Sample Data:
1. Choose meals, 2. Set quantity, 3. Pick delivery or pickup, 4.
Review, 5. Confirm.
3. The system shall use text of at least 16 px, including
meal-card text, checkbox labels, and the header Help
button, and clearly labeled buttons.
C. Readable text
Given the user views the app
When the text size is checked, including meal cards, the "Use
my nutrition goals" checkbox label and the header Help button
Then the system shall use text of at least 16 px and clearly
labeled buttons
When the phone text size is set to the largest
Then the system shall follow the setting without hiding content
4. The system shall follow the phone's text size setting
without hiding content.
Passed
Failed
Total
USR -
27
Help & Assistance As a User view frequently asked
questions
so that I can get quick
answers to common concerns.
Given When Then 1. The system shall display the frequently asked
questions grouped by topic (account, ordering, delivery,
health information).

### PDF page 25

USR -
27
Help & Assistance As a User view frequently asked
questions
so that I can get quick
answers to common concerns.
A. Browse by topic
Given the user is on the FAQ screen
When the screen opens
Then the system shall group the questions by topic
Sample Data:
Topics: Account, Ordering, Delivery, Health Information.
2. The system shall allow the questions to be searched
by keyword.
B. Search the FAQ
Given the user is on the FAQ screen
When the user searches "password"
Then the system shall show the matching question
When the user searches "zzzz"
Then the system shall display "No answers found."
3. The system shall display "No answers found." when
the search returns no result.
C. Expand an answer
Given the FAQ list is displayed
When the user taps a question
Then the system shall expand its full answer, and collapse it
when tapped again
Sample Data:
"How do I reset my password?": Forgot password > verify
identity > set a new password.
4. The system shall expand a question to show its full
answer when it is tapped and collapse it when tapped
again.

### PDF page 26

USR -
27
Help & Assistance As a User view frequently asked
questions
so that I can get quick
answers to common concerns.
D. Fuzzy FAQ search
Given the user is on the FAQ screen
When the user searches "pasword" (a missing letter)
Then the system shall show the matching question "How do I
reset my password?"
When the user searches "PASSWORD " (capital letters and an
extra space)
Then the system shall show the same question
When the user searches "reset pasword" (two words, one
misspelled)
Then the system shall show the same question
When the user searches "delivry" (a missing letter)
Then the system shall show the questions about delivery
When the user searches "p" (one character only)
Then the system shall keep showing the full grouped list until at
least 2 characters are typed
5. The system shall search the question and answer text
while ignoring capital letters and extra spaces, and shall
find words with small typing mistakes (one wrong,
missing, extra or swapped letter for words of 3 to 5
letters, up to two for 6 or more). Exact matches shall be
listed before spelling-corrected matches, and "No
answers found." shall be shown when nothing is close
enough.
Passed
Failed
Total
USR -
28
Help & Assistance As a User access a basic guide to
navigating the app
so that I know where to find
each feature.
Given When Then 1. The system shall display a guide covering the main
screens: menu, order, tracking, profile, and help.
A. First-login guide
Given the user logs in for the first time
When the Home screen opens
Then the system shall show the guide covering the menu,
order, tracking, profile and help
Sample Data:
Guide shown on first login.
2. The system shall allow the guide to be opened at any
time, not only on first login.
B. Reopen the guide
Given the user has already seen the guide
When the user opens it from Help
Then the system shall show it again
3. The system shall present each step with a short
description and a labeled screen reference.

### PDF page 27

USR -
28
Help & Assistance As a User access a basic guide to
navigating the app
so that I know where to find
each feature.
C. Screen reference
Given the guide is displayed
When the user views a step
Then the system shall show a short description and a labeled
screen reference
Sample Data:
Step "Menu: browse and search meals" with a labeled
screenshot.
Passed
Failed
Total
USR -
29
Help & Assistance As a User send comments or
suggestions about the meals
and service
so that I can share feedback
and help improve F.I.L. Foods.
Given When Then 1. The system shall provide a text field for comments
and suggestions.
A. Submit feedback
Given I am signed in
When I open Feedback or Help & Assistance, enter my
comment or suggestion and select Submit
Then the system shall save the feedback and show a
submission confirmation.
2. The system shall not submit an empty message.
B. Empty message
Given I am signed in
When the message is empty
Then the system shall ask me to enter a comment before
submitting.
3. Submitted feedback shall be available to the Admin
for review.
Passed
Failed
Total
USR -
30
Authentication & Account
Management
As a User continue with Google to sign
up or log in
so that I can use my existing
Google account instead of
creating a new password.
Given When Then 1. The system shall display a "Continue with Google"
button on the login screen and the registration screen,
next to the username and password option.

### PDF page 28

USR -
30
Authentication & Account
Management
As a User continue with Google to sign
up or log in
so that I can use my existing
Google account instead of
creating a new password.
A. First-time Google user
Given the user has no account and is on the login or
registration screen
When the user selects "Continue with Google"
Then the system shall create the account without sending a
code, because Google has confirmed the email, and open the
profile screen (USR - 31)
When no registration type has been chosen yet
Then the system shall show the registration type screen first
(USR - 43)
Sample Data:
maria.santos@gmail.com, not yet registered.
2. The system shall sign in the existing account when
the Google account has been used before, and create a
new user account when it has not, without creating a
duplicate.
B. Returning Google user
Given the user has used Google before
When the user selects "Continue with Google"
Then the system shall sign in the same account without
creating a duplicate, and open the meal menu if the profile is
complete or the profile screen if it is not
Sample Data:
Returning user with a complete profile. Returning user who left
before finishing the profile.
3. The system shall treat the email address confirmed by
Google as verified and shall not send a code to it. A new
Google user goes to complete the profile (USR - 31)
before any order, and a returning user with a complete
profile goes to the meal menu.
C. Email already exists
Given an account with the same email exists and is not linked
to Google
When the user continues with Google
Then the system shall display "An account with this email
already exists. Log in to link your Google account." and open
the linking screen (USR - 34)
Sample Data:
maria.santos@gmail.com belongs to msantos.
4. The system shall not create a second account and
shall display "An account with this email already exists.
Log in to link your Google account." when the Google
email belongs to an account that is not linked to Google,
and then open the linking screen (USR - 34).

### PDF page 29

USR -
30
Authentication & Account
Management
As a User continue with Google to sign
up or log in
so that I can use my existing
Google account instead of
creating a new password.
D. Cancelled, refused or failed sign-in
Given the Google window is open
When the user closes or cancels it
Then the system shall return to the previous screen and display
"Sign in with Google was cancelled."
When the user refuses to share the name or email
Then the system shall display "Continue with Google needs
your name and email address to create your account." and
create nothing
When there is no internet or Google is unavailable
Then the system shall display "Unable to continue with Google.
Please check your connection and try again."
5. The system shall return to the previous screen without
creating or changing any account and display "Sign in
with Google was cancelled." when the user closes or
cancels the Google window.
E. Inactive account
Given the account linked to the Google account is inactive
When the user continues with Google
Then the system shall display "This account is inactive. Please
contact support."
6. The system shall display "Continue with Google needs
your name and email address to create your account."
and create nothing when the user refuses to share the
name or email.
F. Several Google accounts
Given the phone has two Google accounts
When the user selects "Continue with Google"
Then the system shall show the account picker and use the
chosen account, treating each as a separate user account
Sample Data:
maria.santos@gmail.com and msantos.work@gmail.com.
7. The system shall display "Unable to continue with
Google. Please check your connection and try again."
when Google cannot be reached or returns an error.
G. Stay logged in
Given the user ticked "Keep me logged in" and logged in with
Google
When the user closes and reopens the app
Then the system shall keep the user logged in and record the
login and logout times
8. The system shall display "This account is inactive.
Please contact support." when the linked account is
inactive.
9. The system shall show the Google account picker
when more than one Google account is on the device,
and shall treat each Google account as a separate user
account.

### PDF page 30

USR -
30
Authentication & Account
Management
As a User continue with Google to sign
up or log in
so that I can use my existing
Google account instead of
creating a new password.
10. The system shall record the date and time of every
login and logout, and shall apply the "Keep me logged
in" option, as in USR - 02, USR - 03, and USR - 06.
11. The system shall ask for the registration type (For
Myself or Family Member) before creating a new Google
account when none has been chosen yet (USR - 43).
Passed
Failed
Total
USR -
31
Authentication & Account
Management
As a User complete my profile after
continuing with Google
so that the service can reach
me about my orders and my
account is complete before I
order.
Given When Then 1. The system shall require the first name, last name,
and contact number before the account can be used.
The names and the email address are filled in from
Google (the user can edit the names). A username and
a password are not required.
A. Complete the profile
Given the user has continued with Google and the names and
verified email are filled in
When the user enters a contact number, ticks the Terms and
Conditions and saves
Then the system shall make the account ready, send no code
to the Google email, and open the meal menu
Sample Data:
Maria / Santos, maria.santos@gmail.com, contact
09171234567.
2. The system shall display "Please fill in all required
fields." when a required field is left blank.
B. Blank or invalid entries
Given the user is on the profile screen
When a required field is left blank
Then the system shall display "Please fill in all required fields."
When the contact number is not 11 digits or contains letters
Then the system shall display "Please enter a valid contact
number."
Sample Data:
Contact numbers: 0917123 and 0917ABC4567.
3. The system shall display "Please enter a valid contact
number." when the value is not 11 digits or contains
letters.

### PDF page 31

USR -
31
Authentication & Account
Management
As a User complete my profile after
continuing with Google
so that the service can reach
me about my orders and my
account is complete before I
order.
C. Duplicate contact number
Given another account already uses 09171234567
When the user enters that number
Then the system shall display "This username or contact
number is already registered." and not link the two accounts
4. The system shall not send a code to the Google email
address, which Google has already confirmed.
D. Terms and Conditions
Given the user leaves the box unticked
When the user saves
Then the system shall display "You must accept the Terms and
Conditions to continue."
When the box is ticked
Then the system shall record the date and time of acceptance
(USR - 15)
5. The system shall display "This username or contact
number is already registered." when the contact number
belongs to another account, and shall not link the two
accounts.
E. Unfinished profile
Given the user closed the app before finishing
When the user signs in again
Then the system shall show this screen again and not allow the
meal menu or an order until the profile is complete
6. The system shall require the Terms and Conditions to
be accepted, display "You must accept the Terms and
Conditions to continue." otherwise, and record the date
and time of acceptance (USR - 15).
F. Family Member
Given the user continued with Google and chose Family
Member
When the profile screen opens
Then the system shall also show the meal recipient's details
form (USR - 44) and not make the account ready until both are
saved
Sample Data:
Carlos Dizon continues with Google, enters 09175550123, then
enters Lia Dizon's details.
7. The system shall return the user to this screen at each
sign-in until the profile is complete, and shall not allow
orders until then.
8. The system shall also require the meal recipient's
details (USR - 44) before the account can be used when
the registration type is Family Member.
Passed
Failed
Total

### PDF page 32

USR -
32
Authentication & Account
Management
As a User use my username and
password instead of Google
so that I can still use the app if
I prefer not to use another
account.
Given When Then 1. The system shall keep "Continue with Google"
optional, so that registration (USR - 01) and login (USR -
02) with a username and password work fully when it is
not selected.
A. Use the app without Google
Given the user does not tap "Continue with Google"
When the user registers or logs in with a username and
password
Then the system shall work fully as in USR - 01 and USR - 02
Sample Data:
msantos / Meal@2026.
2. The system shall not link a username and password
account with a Google account automatically. A Google
account is linked only after the user logs in with that
account's username and password (USR - 34).
B. Wrong password
Given the user logs in with a username and password
When the password is wrong
Then the system shall display "Invalid username or password."
3. The system shall offer password reset (USR - 04 and
USR - 05) for username and password accounts only.
C. Google later with the same email
Given the user has a username and password account
When the user later taps "Continue with Google" with the same
email
Then the system shall ask the user to log in to link the accounts
(USR - 34) and not link them automatically
Sample Data:
maria.santos@gmail.com.
4. The system shall show the same menu, orders, and
profile screens to every user, whichever sign-in method
was used.
D. Forgot password
Given the user has a username and password account
When the user uses Forgot password
Then the system shall send the code as in USR - 04
Sample Data:
09171234567.
Passed
Failed
Total

### PDF page 33

USR -
33
Authentication & Account
Management
As a User verify my account with a code
sent by SMS or email
so that the service knows my
contact details are mine and
my account is protected.
Given When Then 1. The system shall show a "Verify your account" screen
after registration with two options, "Send code by SMS"
(to the contact number) and "Send code by email" (to the
email address), and shall hide part of the number or
address (e.g., 0917*****67 and m*****s@gmail.com).
The code shall always go to the user's own contact
number or email address, never to the meal recipient's.
A. Choose how to receive the code
Given the user has just registered
When the "Verify your account" screen opens
Then the system shall show "Send code by SMS" and "Send
code by email" with the number and address partly hidden
When the user chooses a method
Then the system shall send a 6-digit code by that method
Sample Data:
0917*****67 and m*****s@gmail.com.
Test environment code: 123456. Email subject: "Your
verification code".
2. The system shall send a 6-digit numeric verification
code by the chosen channel. SMS text: "Your verification
code is 123456. It expires in 10 minutes. Do not share
this code." Email subject: "Your verification code"; email
body: "Your verification code is 123456. It expires in 10
minutes. If you did not ask for this code, ignore this
email."
B. Correct code
Given a code has been sent
When the user enters the correct code within 10 minutes
Then the system shall display "Your account is verified." and
open the profile screen
3. The system shall mark the account as verified only
when the correct, unexpired code is entered, and display
"Your account is verified."

### PDF page 34

USR -
33
Authentication & Account
Management
As a User verify my account with a code
sent by SMS or email
so that the service knows my
contact details are mine and
my account is protected.
C. Wrong, expired or too many codes
Given a code has been sent
When the code is wrong
Then the system shall display "Incorrect verification code."
When the code is entered after 10 minutes
Then the system shall display "The verification code has
expired."
When a wrong code is entered five times in a row
Then the system shall display "Too many incorrect attempts.
Please request a new code."
Sample Data:
Wrong code: 000000. Correct code entered after 11 minutes.
4. The system shall display "The verification code has
expired." when the code is used after 10 minutes.
D. Resend or switch method
Given a code has been sent
When the user taps "Resend code"
Then the system shall send a new code and invalidate the
earlier one
When the user taps "Send code by email instead" after
choosing SMS
Then the system shall send a new code by email and stop the
SMS code from working
5. The system shall display "Incorrect verification code."
when a wrong code is entered.
E. Code limits
Given a code was accepted or replaced
When the same code is entered again
Then the system shall display "Incorrect verification code."
When "Resend code" is tapped again after 10 seconds
Then the system shall display "Please wait [n] seconds before
requesting a new code."
When a sixth code is requested within one hour
Then the system shall display "Too many code requests.
Please try again in an hour."
6. The system shall allow the code to be resent, and
shall invalidate any previously sent code when a new
one is issued.

### PDF page 35

USR -
33
Authentication & Account
Management
As a User verify my account with a code
sent by SMS or email
so that the service knows my
contact details are mine and
my account is protected.
F. Code cannot be sent
Given the user has chosen a method
When the SMS or email cannot be sent
Then the system shall display "We could not send the code.
Please try again or use the other method."
7. The system shall display "Too many incorrect
attempts. Please request a new code." and require a
new code after five consecutive incorrect entries.
G. Unverified login
Given the user closed the app before verifying
When the user logs in
Then the system shall display "Please verify your account first."
(USR - 02) and not allow orders
8. The system shall not allow an unverified account to
log in (USR - 02), place an order.
9. The system shall use these same code rules and
messages for password reset (USR - 04) and for a
changed contact number or email address (USR - 08).
10. The system shall display "We could not send the
code. Please try again or use the other method." when
the SMS or email cannot be sent.
11. The system shall accept each code only once. A
code that was already used, or replaced by a newer one,
is rejected with "Incorrect verification code."
12. The system shall allow a new code to be requested
only 60 seconds after the last one and display "Please
wait [n] seconds before requesting a new code."
13. The system shall allow no more than five codes per
hour for the same contact number or email address and
display "Too many code requests. Please try again in an
hour." These rules also apply to password reset (USR -
04) and to changed contact numbers and emails (USR -
08).
Passed
Failed
Total
USR -
34
Authentication & Account
Management
As a User link my Google account to my
existing account
so that I can sign in with one
tap and keep my orders and
profile.
Given When Then 1. The system shall show the linking screen with the
message "An account with this email already exists. Log
in to link your Google account." and username and
password fields when the Google email belongs to an
account that is not yet linked to Google.

### PDF page 36

USR -
34
Authentication & Account
Management
As a User link my Google account to my
existing account
so that I can sign in with one
tap and keep my orders and
profile.
A. Link the accounts
Given the Google email belongs to an account not yet linked to
Google
When the linking screen opens
Then the system shall show "An account with this email already
exists. Log in to link your Google account." with username and
password fields
When the user enters the correct username and password
Then the system shall link Google, sign the user in and display
"Your Google account is linked."
Sample Data:
msantos / Meal@2026.
2. The system shall link the Google account only after
the correct username and password of the existing
account are entered, and never automatically.
B. Wrong password
Given the user is on the linking screen
When the password is wrong
Then the system shall display "Invalid username or password."
When it is wrong five times in a row
Then the system shall lock the account as in USR - 02
3. The system shall display "Invalid username or
password." for a wrong password and apply the five-
attempt lockout from USR - 02.
C. Cancel or forgot password
Given the user is on the linking screen
When the user cancels
Then the system shall link nothing and open the login screen
When the user taps "Forgot password"
Then the system shall open the reset flow in USR - 04
4. The system shall return to the login screen without
linking anything when the user cancels.
D. Already linked
Given a Google account is linked to one user account
When it is linked to a second account
Then the system shall display "This Google account is already
linked to another account."
5. The system shall allow a Google account to be linked
to only one user account, and display "This Google
account is already linked to another account." otherwise.

### PDF page 37

USR -
34
Authentication & Account
Management
As a User link my Google account to my
existing account
so that I can sign in with one
tap and keep my orders and
profile.
E. After linking
Given the Google account is linked to msantos
When the user taps "Continue with Google" or logs in with
msantos / Meal@2026
Then the system shall sign in to the same account both ways
6. The system shall, after linking, sign the user in to the
same account with Continue with Google, and keep the
username and password working.
Passed
Failed
Total
USR -
35
Home & Navigation As a User view meal recommendations
based on my allergies and
recorded health or dietary
restrictions
so that I can quickly find meals
that are suitable for my needs.
Given When Then 1. Recommendations shall be filtered using recorded
allergies, health conditions and doctor-provided
restrictions.
A. Matching recommendations
Given I have completed my profile and signed in
When the Home or Order page loads
Then the system shall show available meal recommendations
that match my recorded allergies, health conditions and doctor-
provided restrictions.
2. Only available meals that pass the suitability checks
shall be recommended.
B. No suitable meals
Given I have completed my profile and signed in
When no suitable meals are available
Then the system shall explain that there are currently no
matching meals and shall not display conflicting options.
3. The Dietitian shall review submitted orders before
payment.
Passed
Failed
Total
USR -
36
Home & Navigation As a User use the Home screen
shortcuts to reach common
tasks
so that I can get to meals, my
current order, or my profile in
one or two taps.
Given When Then 1. The system shall display shortcuts for "Browse
Meals", "My Orders", and "My Account" on Home.
A. Home shortcuts
Given the user is on the Home screen
When the user selects "Browse Meals", "My Orders" or "My
Account"
Then the system shall open Meals, Orders or Account
Sample Data:
Shortcut labels exactly: "Browse Meals", "My Orders", "My
Account" (not "Order a meal", "Track my order" or "My health
profile").
2. The system shall keep the same shortcut labels
("Browse Meals", "My Orders", "My Account") and
destinations throughout the application, and shall not
use other labels for them.

### PDF page 38

USR -
36
Home & Navigation As a User use the Home screen
shortcuts to reach common
tasks
so that I can get to meals, my
current order, or my profile in
one or two taps.
B. No current order
Given the user has no current order
When the user selects "My Orders"
Then the system shall open the order history and display "You
have no orders yet." when appropriate
When the Home screen is displayed
Then the system shall show "You have no active orders" with a
"Browse Meals" shortcut
C. Same labels everywhere
Given the user moves through the application
When a shortcut appears on another screen
Then the system shall use the same labels and destinations
Passed
Failed
Total
USR -
37
Home & Navigation As a User move between Home, Meal,
Orders, and Account using the
main navigation
so that I can find the main
features from any main screen
without guessing where they
are.
Given When Then 1. The system shall provide a navigation bar with four
destinations: Home, Meal, Orders, and Account, on the
main signed-in screens.
A. Move between destinations
Given the user is signed in
When the user selects Home, Meal, Orders or Account
Then the system shall open the matching screen and highlight
it
When the user moves between main screens
Then the system shall keep every destination available
Sample Data:
Hover over (or tap) "Meal": the meal catalog and search tools
open. Orders: current and previous orders. Account: profile and
settings.
2. The system shall keep Help and service contact
information accessible from Account and from relevant
screens, without taking a permanent place in the four-
item navigation bar.
B. Visitor not logged in
Given the visitor has not logged in
When the visitor taps Orders or Account
Then the system shall display "Log in to continue" with a Log in
button, and open the tapped destination after the user logs in
3. The system shall require sign-in before showing
private profile information, health information, or order
details, and shall display "Log in to continue" with a Log
in button when a visitor who is not logged in taps Orders
or Account.

### PDF page 39

USR -
37
Home & Navigation As a User move between Home, Meal,
Orders, and Account using the
main navigation
so that I can find the main
features from any main screen
without guessing where they
are.
C. Help access
Given the user is on a main screen
When the user needs help
Then the system shall keep Help and service contact
information available from Account and relevant screens,
without a fifth item in the navigation bar
Passed
Failed
Total
USR -
38
User Profile & Dietary
Information
As a User review the history of changes
to the meal recipient's health
and dietary information
so that I can check when the
meal recipient's information
changed and who changed it,
and help ensure the profile
stays accurate.
Given When Then 1. The system shall record changes to the meal
recipient's health conditions, dietary restrictions, and
food allergies with the previous value, new value, actor
(the user who made the change), and timestamp.
A. Record a change
Given the user changes health, dietary or allergy information
When the change is saved
Then the system shall record the previous value, new value,
actor and timestamp
Sample Data:
Add Peanuts to allergies. Remove Diabetes from health
conditions. Change the Peanuts note from "Skin rash" to
"Hives".
Family Member: Carlos Dizon adds Peanuts to Lia Dizon's
allergies. Actor: Carlos Dizon. Meal recipient: Lia Dizon.
2. The system shall display the change history of the
account (the user's own and the meal recipient's
information) in Account, newest first, with the date and
time, the field changed, and the old and new value for
each entry.
B. View the history
Given the user has recorded changes
When the user opens Account > Change History
Then the system shall list the entries newest first with the date
and time, field changed, and old and new value
Sample Data:
"Skin rash > Hives".
3. The user shall not be able to edit or delete audit-
history entries.
C. No changes yet
Given the user has made no changes
When the user opens the history
Then the system shall display "No changes yet."
4. The system shall use append-only, tamper-evident
event logging for relevant account and profile actions.
Each event shall include a timestamp, user ID, event
type, and a SHA-256 hash linked to the previous event's
hash.

### PDF page 40

USR -
38
User Profile & Dietary
Information
As a User review the history of changes
to the meal recipient's health
and dietary information
so that I can check when the
meal recipient's information
changed and who changed it,
and help ensure the profile
stays accurate.
D. Protected entries
Given history entries exist
When the user tries to edit or delete one
Then the system shall not allow it and shall flag a broken hash
chain as a possible alteration when integrity is checked
5. The system shall verify the hash chain when audit-log
integrity is checked and flag a broken chain as a
possible alteration.
6. The user-facing history shall show only the user's
permitted information; internal security metadata need
not be exposed in the regular profile view.
7. The system shall display "No changes yet." when no
profile changes have been recorded.
Passed
Failed
Total
USR -
39
Meals & Ordering As a User see meal suggestions that
match my recorded dietary
information and preferences
so that I can choose suitable
meals without manually
checking every menu item.
Given When Then 1. The recommendation process shall consider all saved
health and dietary information.
A. Generate meal suggestions
Given my dietary profile is saved
When meal suggestions are generated
Then the system shall consider allergies, HTN, Diabetes, Gout,
Kidney Problem, Low-Cholesterol Diet, other doctor-provided
restrictions and my food preferences.
2. The system shall exclude meals that conflict with
known allergies or restrictions.
3. The Dietitian shall be able to review suitability before
an order proceeds to payment.
Passed
Failed
Total
USR -
40
Authentication & Account
Management
As a User use a password-based
account protected by secure
password storage
so that my password is not
stored or exposed as readable
text.
Given When Then 1. The system shall never store a user's raw password.
A. Password storage
Given a password-based account exists
When the password is stored
Then the system shall never store the raw password, only an
Argon2id or bcrypt verifier with a unique salt
Sample Data:
Database check: no plaintext password is present.
2. The system shall store password verifiers using
Argon2id or bcrypt with a unique salt and an appropriate
work factor.

### PDF page 41

USR -
40
Authentication & Account
Management
As a User use a password-based
account protected by secure
password storage
so that my password is not
stored or exposed as readable
text.
B. Login checks
Given the stored verifier exists
When valid and invalid passwords are entered
Then the system shall verify them without logging or displaying
the password and behave correctly for both
3. The system shall verify the entered password against
the stored verifier without logging or displaying the
password.
C. Password reset
Given the user resets the password
When the reset is saved
Then the system shall replace the verifier and invalidate
existing sessions
4. A password reset shall replace the verifier and
invalidate existing sessions as defined by the account-
security rules.
5. Test data shall confirm that the database contains no
plaintext password and that valid and invalid login
attempts behave correctly.
Passed
Failed
Total
USR -
41
Authentication & Account
Management
As a User access only the account
information and actions
allowed for my role
so that my profile, health
information, and orders stay
private from other users.
Given When Then 1. The system shall check the authenticated session and
assigned role before allowing access to protected
screens or operations.
A. Own records only
Given a user is logged in
When the user opens or changes a record
Then the system shall allow only the profile, dietary information
and orders of the user's own account, including those of the
meal recipient registered under it, except access explicitly
authorized for a linked guardian or family member
2. A user account shall be allowed to view and change
only the profile, dietary information, and orders of its own
account, including the meal recipient registered under it,
except for access explicitly authorized for a linked
guardian/family member.
B. Another user's record
Given a user changes a record identifier manually
When the request is sent
Then the system shall deny it
3. Requests for another user's private record shall be
denied even if the record identifier is changed manually.

### PDF page 42

USR -
41
Authentication & Account
Management
As a User access only the account
information and actions
allowed for my role
so that my profile, health
information, and orders stay
private from other users.
C. No valid session
Given a request has no valid session
When it reaches a protected screen or action
Then the system shall redirect to sign-in or reject it, using a
shared server-side check rather than a hidden button
4. Requests without a valid session shall be redirected to
sign-in or rejected.
5. Authorization shall be enforced by a shared
middleware or equivalent server-side gate; hiding a
button in the interface alone shall not count as access
control.
6. The implementation may represent roles with a
bitmask or another explicit role-permission mapping, but
permission checks shall produce the same deny-by-
default behavior.
7. The system shall allow only the user of a Family
Member account to view or change the meal recipient's
records, because the meal recipient has no login of their
own.
Passed
Failed
Total
USR -
42
Security & Auditability As a User see a record of important
changes I make to my profile
so that I can review updates to
my health and dietary
information and trust that the
history cannot be quietly
rewritten.
Given When Then 1. The system shall append an event when the user
creates an account or changes profile, meal recipient,
health, dietary, or allergy information. Relevant
supported account and order actions, including
login/logout and order-status changes, shall also be
recorded where applicable.
A. Record events
Given the user creates an account or changes profile, health,
dietary or allergy information
When the action completes
Then the system shall append an event with a timestamp, user
ID, event type, change details and a SHA-256 hash that
includes the previous event's hash
2. Each event shall include a timestamp, user ID, event
type, relevant action/change details, and a SHA-256
hash that incorporates the previous event's hash, and,
for a Family Member account, the meal recipient the
event concerns.
B. Altered events
Given events exist
When one is edited or removed
Then the hash-chain integrity check shall report a mismatch or
broken chain, and normal operations shall not edit or delete
events
3. Existing events shall not be edited or deleted through
normal application operations.

### PDF page 43

USR -
42
Security & Auditability As a User see a record of important
changes I make to my profile
so that I can review updates to
my health and dietary
information and trust that the
history cannot be quietly
rewritten.
C. User view
Given the user opens the activity record
When the record is displayed
Then the system shall show only the user's own events and no
other users' events or internal security secrets
4. If a stored event is altered or removed, a hash-chain
integrity check shall report a mismatch or broken chain.
5. Only actions and data actually supported by the user
application shall be logged; no file-upload event shall be
included unless file upload is added to scope.
6. The regular user interface shall not expose other
users' events or internal security secrets.
Passed
Failed
Total
USR -
43
Authentication & Account
Management
As a User choose whether I am
registering For Myself or for a
Family Member
so that the service knows
whether I will receive the
meals myself or I am
managing the account for
another person who will
receive them.
Given When Then 1. The system shall display a "Who is this meal
subscription for?" screen with the options "Signing Up for
Myself" and "Signing Up for a Family Member" before
the registration form.
Screen wording follows the
design (Part 1): "Signing Up
for Myself" / "Signing Up for
a Family Member". The
stored account type is still
shown as "For Myself" /
"Family Member" in the
profile and in the rest of this
module.
A. Choose "Signing Up for Myself"
Given the user has selected Register
When the registration type screen opens
Then the system shall display "Who is this meal subscription
for?" with two options, "Signing Up for Myself" (description: "I
will receive and consume the meals.") and "Signing Up for a
Family Member" (description: "Ordering for a parent, senior
relative, or loved one."), and a Continue button
When the user selects "Signing Up for Myself" and Continue
Then the system shall open the registration form for the user's
own details (USR - 01) and treat the user as the meal recipient,
so no separate meal recipient details are asked
Sample Data:
Maria Santos (msantos) selects "Signing Up for Myself". The
user and the meal recipient are the same person: Maria Santos.
2. The system shall show a short description under each
option: "I will receive and consume the meals." (Signing
Up for Myself) and "Ordering for a parent, senior relative,
or loved one." (Signing Up for a Family Member).

### PDF page 44

USR -
43
Authentication & Account
Management
As a User choose whether I am
registering For Myself or for a
Family Member
so that the service knows
whether I will receive the
meals myself or I am
managing the account for
another person who will
receive them.
B. Choose "Signing Up for a Family Member"
Given the user is on the registration type screen
When the user selects "Signing Up for a Family Member" and
Continue
Then the system shall open the registration form for the user's
own details (USR - 01) and, after the account is verified, ask for
the details of the family member who will receive the meals
(USR - 44)
Sample Data:
Carlos Dizon (cdizon) selects "Signing Up for a Family Member"
to register for his daughter, Lia Dizon. Carlos is the user (he
logs in and manages the app). Lia is the meal recipient (she
receives the meals).
3. The system shall require one option to be selected
and shall display "Please choose Signing Up for Myself
or Signing Up for a Family Member to continue." when
Continue is selected without a choice.
C. No option selected
Given the user is on the registration type screen and has not
selected an option
When the user selects Continue
Then the system shall display "Please choose Signing Up for
Myself or Signing Up for a Family Member to continue." and
stay on the screen
Sample Data:
Continue selected with neither option chosen.
4. The system shall treat the user and the meal recipient
as the same person when "Signing Up for Myself" is
chosen, and shall not ask for separate meal recipient
details.
D. Continue with Google
Given the user selects "Continue with Google" and the Google
account has no account yet
When no registration type has been chosen yet (for example,
the user started from the login screen)
Then the system shall show the registration type screen before
creating the account and apply the chosen type to the new
account
When the user already chose a type before selecting "Continue
with Google"
Then the system shall use that choice and not ask again
Sample Data:
maria.santos@gmail.com continues with Google and chooses
"Signing Up for Myself".
5. The system shall treat the user and the meal recipient
as two different people when "Signing Up for a Family
Member" is chosen. The login details, verification codes,
and notifications stay with the user, and the meal
recipient's details are entered separately (USR - 44).

### PDF page 45

USR -
43
Authentication & Account
Management
As a User choose whether I am
registering For Myself or for a
Family Member
so that the service knows
whether I will receive the
meals myself or I am
managing the account for
another person who will
receive them.
E. Registration type shown
Given the user has finished registration
When the user opens Profile (USR - 07) or the Admin opens
the user account
Then the system shall show "Registered for: Myself" or
"Registered for: Family Member"
Sample Data:
msantos: Registered for Myself. cdizon: Registered for Family
Member.
6. The system shall show the registration type screen
before creating a new Google account when no type has
been chosen yet, and shall apply the chosen type to that
account (USR - 30 and USR - 31).
7. The system shall store the registration type with the
account and show it in the profile (USR - 07) and to the
Admin.
Passed
Failed
Total
USR -
44
User Profile & Dietary
Information
As a User enter the details of the family
member who will receive the
meals when I register for a
Family Member
so that the kitchen, delivery
staff, and Admin know who the
meals are for, while my own
account details stay separate.
Given When Then 1. The system shall ask for the meal recipient's details
only when the registration type is Family Member (USR -
43), after the account is verified (USR - 33), or on the
profile screen for a user who continued with Google
(USR - 31).
A. Enter the meal recipient's details
Given the user registered as Family Member, verified the
account (USR - 33) and is on the meal recipient details screen
When the user enters the meal recipient's first name, last
name, relationship to the user and delivery address, ticks "I
confirm that I am allowed to manage this person's meals and
health information." and selects Save
Then the system shall save the meal recipient as a separate
person under the user's account, record the date and time of
the confirmation, and open the health and dietary information
screens for the meal recipient (USR - 09 to USR - 13)
Sample Data:
User: Carlos Dizon (cdizon), 09175550123.
Meal recipient: Lia / Dizon / Child / 8 Sampaguita St., Quezon
City. Confirmation ticked.
2. The system shall require the meal recipient's first
name, last name, relationship to the user (Child, Parent,
Spouse, Sibling, Grandparent, or Other), and delivery
address. The middle name, suffix, and contact number
are optional.

### PDF page 46

USR -
44
User Profile & Dietary
Information
As a User enter the details of the family
member who will receive the
meals when I register for a
Family Member
so that the kitchen, delivery
staff, and Admin know who the
meals are for, while my own
account details stay separate.
B. Optional fields left blank
Given the user is on the meal recipient details screen and has
filled in the required fields and the confirmation
When the contact number, middle name and suffix are left
blank
Then the system shall accept the details because these fields
are optional
Sample Data:
Lia Dizon saved with no contact number, middle name or suffix.
3. The system shall display "Please fill in all required
fields." when a required field is blank and "Please enter
a valid contact number." when the contact number is not
11 digits or contains letters.
C. Blank or invalid entries
Given the user is on the meal recipient details screen
When a required field is left blank
Then the system shall display "Please fill in all required fields."
When the meal recipient's contact number is entered and is not
11 digits or contains letters
Then the system shall display "Please enter a valid contact
number."
When Save is selected with the confirmation unticked
Then the system shall display "Please confirm that you are
allowed to manage this person's information." and not save the
details
Sample Data:
Blank delivery address.
Contact number: 0917123.
Confirmation: unticked.
4. The system shall require the user to tick "I confirm that
I am allowed to manage this person's meals and health
information." and shall display "Please confirm that you
are allowed to manage this person's information." when
it is unticked.
D. The meal recipient does not log in
Given the meal recipient has been saved
When the account is used
Then the system shall keep the user as the only person who
logs in, with the user's own username and password, and shall
create no username or password for the meal recipient
Sample Data:
Carlos logs in as cdizon. Lia Dizon has no username or
password.
5. The system shall record the date and time of this
confirmation and the user who gave it (see USR - 15).

### PDF page 47

USR -
44
User Profile & Dietary
Information
As a User enter the details of the family
member who will receive the
meals when I register for a
Family Member
so that the kitchen, delivery
staff, and Admin know who the
meals are for, while my own
account details stay separate.
E. Unfinished details
Given the user closed the app before saving the meal
recipient's details
When the user signs in again
Then the system shall show this screen again and not allow the
meal menu or an order until the details are saved
Sample Data:
App closed after verification, then signed in again.
6. The system shall keep the meal recipient's details
separate from the user's own details. The meal recipient
has no username or password and does not log in.
F. For Myself accounts
Given the user registered For Myself
When the profile is completed
Then the system shall not show this screen and shall use the
user's own name, contact number and address as the meal
recipient's details
Sample Data:
msantos (For Myself): no meal recipient screen is shown.
7. The system shall use the user's contact number for
contact about an order when the meal recipient has no
contact number.
8. The system shall not allow the meal menu or an order
until the meal recipient's details are saved.
9. The system shall allow one meal recipient per
account.
10. The system shall not ask for separate meal recipient
details when the registration type is For Myself, and shall
use the user's own details.
Passed
Failed
Total
USR -
45
User Profile & Dietary
Information
As a User update the details of the meal
recipient
so that the name, contact
details, and delivery address
of the person receiving the
meals stay correct without
changing my own account
details.
Given When Then 1. The system shall show an "Edit meal recipient" option
in the profile of Family Member accounts, separate from
"Edit profile" for the user's own details (USR - 08).

### PDF page 48

USR -
45
User Profile & Dietary
Information
As a User update the details of the meal
recipient
so that the name, contact
details, and delivery address
of the person receiving the
meals stay correct without
changing my own account
details. A. Edit the meal recipient (Family Member)
Given the user registered as Family Member and is on the Edit
meal recipient screen
When the user changes the delivery address or name and
saves
Then the system shall save the change to the meal recipient
only, leave the user's own details unchanged, and display "Meal
recipient updated successfully."
Sample Data:
Lia Dizon's address changed from 8 Sampaguita St. to 15
Orchid St., Quezon City. Carlos Dizon's name and contact
number are unchanged.
2. The system shall allow the meal recipient's first name,
last name, middle name, suffix, relationship to the user,
contact number, and delivery address to be edited.
B. Blank or invalid entries
Given the user is on the Edit meal recipient screen
When a required field is blank
Then the system shall display "Please fill in all required fields."
When the contact number is not 11 digits or contains letters
Then the system shall display "Please enter a valid contact
number."
Sample Data:
Blank last name. Contact number: 0917ABC4567.
3. The system shall apply the same required-field and
contact number checks and messages as USR - 44.
C. For Myself accounts
Given the user registered For Myself
When the user edits the name, contact number or address in
Edit profile (USR - 08)
Then the system shall apply the change to the meal recipient
as well, because they are the same person, and shall not show
a separate Edit meal recipient screen
Sample Data:
Maria Santos changes the address to 45 Rizal Ave., Quezon
City. Her orders are delivered to the new address.
4. The system shall display "Meal recipient updated
successfully." after the changes are saved and shall
leave the user's own details unchanged.
D. Leave with unsaved changes
Given the user has edited a field without saving
When the user presses Back
Then the system shall ask for confirmation before leaving the
screen
5. The system shall treat a change to the user's name,
contact number, or address as a change to the meal
recipient as well when the registration type is For Myself.
6. The system shall ask for confirmation before leaving
the screen with unsaved changes.

### PDF page 49

USR -
45
User Profile & Dietary
Information
As a User update the details of the meal
recipient
so that the name, contact
details, and delivery address
of the person receiving the
meals stay correct without
changing my own account
details.
7. The system shall record each change to the meal
recipient's details in the change history (USR - 38) with
the user who made it.
Passed
Failed
Total
USR -
46
User Profile & Dietary
Information
As a User see clearly who is using the
app and who the meals are for
on every screen
so that I never mix up my own
details with those of the
person receiving the meals,
especially when I manage the
account for a family member.
Given When Then 1. The system shall show the person each screen
applies to on Home, Profile, each health and dietary
screen, the meal details and menu warnings, the order
summary, the orders list, and the order details.
A. For Myself labels
Given the user registered For Myself and is logged in
When the user opens Home, Profile, the health and dietary
screens, or the order summary
Then the system shall use "you" and "your" (for example
"Meals for you" and "Your health conditions") and shall not
show a separate meal recipient
Sample Data:
Maria Santos sees "Meals for you" on Home and "Your health
conditions".
2. The system shall use "you" and "your" and show no
separate meal recipient for For Myself accounts.
B. Family Member labels
Given the user registered as Family Member and is logged in
When the user opens Home, Profile, the health and dietary
screens, the meal details, or the order summary
Then the system shall show the meal recipient's name on each
screen and show the user's name only as the person logged in
Sample Data:
Carlos Dizon is logged in. Home: "Meals for Lia Dizon". Screen
title: "Health conditions of Lia Dizon".
3. The system shall show the meal recipient's name on
those screens for Family Member accounts, and the
user's name only as the person logged in.

### PDF page 50

USR -
46
User Profile & Dietary
Information
As a User see clearly who is using the
app and who the meals are for
on every screen
so that I never mix up my own
details with those of the
person receiving the meals,
especially when I manage the
account for a family member.
C. Order summary
Given the user has chosen meals and delivery details
When the order summary opens
Then the system shall show "Ordered by" (the user) and "Meal
recipient" (name and delivery address) as separate lines
When the account is For Myself
Then the system shall show the same person once as "Ordered
by and for"
Sample Data:
Family Member: Ordered by Carlos Dizon. Meal recipient: Lia
Dizon, 8 Sampaguita St., Quezon City.
For Myself: Ordered by and for Maria Santos.
4. The system shall show "Ordered by" (the user) and
"Meal recipient" (name and delivery address) in the
order summary and the order details, and "Ordered by
and for" for a For Myself account.
D. Warnings name the right person
Given Peanuts is recorded as an allergy of the meal recipient
When the user opens "Chicken Satay with Peanut Sauce" or
adds it to an order
Then the system shall display "This meal contains Peanuts,
which is listed in your profile." for a For Myself account
And "This meal contains Peanuts, which is listed in Lia Dizon's
profile." for a Family Member account (USR - 17 and USR - 20)
Sample Data:
msantos (For Myself) and cdizon (Family Member, meal
recipient Lia Dizon).
5. The system shall word allergy and dietary warnings
with the meal recipient: "... which is listed in your profile."
(For Myself) or "... which is listed in [meal recipient's
name]'s profile." (Family Member).
E. Notifications go to the user
Given an order exists for the meal recipient
When an order notification is sent
Then the system shall send it to the user, and for a Family
Member account shall include the meal recipient's name (USR -
25)
Sample Data:
Carlos Dizon receives "Order TRK-2026-0004 for Lia Dizon is
now Out for Delivery."
6. The system shall send order notifications to the user
and include the meal recipient's name in notifications for
Family Member orders.
7. The system shall keep the health, dietary, allergy, and
delivery information with the meal recipient, and keep
the login details, verification codes, and notifications with
the user.

### PDF page 51

Passed
Failed
Total
USR -
47
Authentication & Account
Management
As a User delete my account so that I can stop using the
service and have my personal
and health information
removed.
Given When Then 1. The system shall provide a "Delete account" option in
Account (reachable from the main navigation, USR - 37)
and shall require the user's password, or a new Google
sign-in for an account that continues with Google, and a
final confirmation before the account is deleted.
A. Delete the account
Given the user is logged in and has no order in progress
When the user selects Delete account, enters the password
and selects Yes on the warning
Then the system shall delete the account, end the session,
show "Your account has been deleted." and open the login
screen
Sample Data:
Username: msantos. Password: Meal@2026.
2. The system shall show this warning before the final
confirmation: "Delete your account? This will
permanently remove your profile and your health, dietary
and allergy information. This cannot be undone." with
Yes and No.
B. Cancel or wrong password
Given the user is on the Delete account screen
When the user selects No or Cancel, or leaves the screen
Then the system shall keep the account unchanged
When the password entered is wrong
Then the system shall display "Incorrect password. Your
account was not deleted." and keep the account
Sample Data:
Wrong password: Meal@2025.
3. The system shall keep the account unchanged when
the user cancels or enters a wrong password, and shall
display "Incorrect password. Your account was not
deleted." for a wrong password.

### PDF page 52

USR -
47
Authentication & Account
Management
As a User delete my account so that I can stop using the
service and have my personal
and health information
removed.
C. Account that continues with Google
Given the account continues with Google and has no password
When the user selects Delete account
Then the system shall ask the user to sign in with Google again
and, once confirmed, show the same warning as for other
accounts
Sample Data:
Google account: maria.santos@gmail.com.
4. The system shall not delete an account that has an
order in Pending, Preparing, Ready for pickup, or Out for
delivery status, and shall display "You have an order in
progress. Please wait until it is delivered or cancelled
before deleting your account."
D. Order in progress
Given the user has an order that is not yet Delivered or
Cancelled
When the user selects Delete account
Then the system shall display "You have an order in progress.
Please wait until it is delivered or cancelled before deleting your
account." and not delete the account
When every order is Delivered or Cancelled
Then the system shall allow the deletion to continue
Sample Data:
Order TRK-2026-0002 is Out for Delivery.
5. For a Family Member account, the system shall delete
the meal recipient's profile, health conditions, dietary
restrictions, allergies, preferences and guardian or family
contacts together with the user's account, because the
meal recipient has no login of their own (USR - 41), and
shall name the meal recipient in the warning.
E. Family Member account
Given the user registered as a Family Member and has no
order in progress
When the user confirms the deletion
Then the system shall delete the user's account and the meal
recipient's profile and health, dietary and allergy information,
and the warning shall have named the meal recipient
Sample Data:
Carlos Dizon deletes the account; the warning names Lia
Dizon.
6. The system shall end every active session of the
account on every device when it is deleted, including
sessions kept with "Keep me logged in" (USR - 03).

### PDF page 53

USR -
47
Authentication & Account
Management
As a User delete my account so that I can stop using the
service and have my personal
and health information
removed.
F. Logged in on another device
Given the user is also logged in on a second device
When the account is deleted on the first device
Then the system shall end the session on the second device
and open the login screen the next time the app is used there
Sample Data:
Phone and tablet, both logged in as msantos.
7. The system shall treat a deleted account as
unregistered: login shall display "Invalid username or
password.", password recovery shall display "No
account found with this contact number." or "No account
found with this email address.", and the username,
contact number and email address shall be free to
register again as a new, empty account (USR - 01).
G. After deletion
Given the account has been deleted
When the old username and password are entered on the login
screen
Then the system shall display "Invalid username or password."
When the old contact number is entered on the forgot password
screen
Then the system shall display "No account found with this
contact number."
When the same username, contact number and email address
are used to register
Then the system shall create a new account with no previous
profile, health information or orders
Sample Data:
msantos, 09171234567, maria.santos@gmail.com.
8. The system shall keep completed and cancelled
orders only in anonymised form (no name, contact
number, email address, delivery address or health
information) for the Admin's order and sales records,
remove the user from the customer list (ADM - 19), and
stop all notifications to the user.

### PDF page 54

USR -
47
Authentication & Account
Management
As a User delete my account so that I can stop using the
service and have my personal
and health information
removed.
H. Past orders and records
Given the user had delivered order TRK-2026-0001
When the account is deleted
Then the Admin shall still see the order with the customer
shown as "Deleted user" and no contact, address or health
information, the user shall no longer appear in the customer list,
and no further notifications shall be sent
Sample Data:
Order TRK-2026-0001 (Delivered) shows "Deleted user".
9. The system shall append an account-deleted event to
the activity record (USR - 42) with the date and time,
user ID and event type but no personal details, and shall
not edit or remove earlier events.
I. Another user's account
Given a user is logged in
When a request to delete another user's account is sent, for
example by changing the account identifier manually
Then the system shall deny it and leave that account
unchanged (USR - 41)
10. The system shall allow only the account's own user
to delete it, and shall deny any request to delete another
user's account.
Passed
Failed
Total
USR -
48
User Interface &
Accessibility
As a User use a clear and accessible
interface with readable text,
visible buttons and
understandable instructions
so that older adults and
younger family members can
comfortably use F.I.L. Foods.
Given When Then 1. The interface shall use a consistent, eye-pleasing
palette based on deep forest green (#174D3A), sage
green (#E9F0E6), warm cream (#FFF8E9), warm gold
(#E9A23B), charcoal (#343A35) and white (#FFFFFF).
New story. Applies across
Login, Registration, Dietary
Assessment, Home, Meals,
Checkout, Tracking and
Feedback screens.
A. Readable interface
Given the user opens any user-facing page
When the page is displayed
Then text, labels, fields and buttons shall be readable and
clearly distinguishable.
2. Regular body text should generally be 16–18px or
larger where practical.
B. Clear interaction feedback
Given the user submits a form or makes a selection
When the action succeeds or fails
Then the system shall display a clear confirmation, warning or
error message.
3. Buttons and interactive controls shall have clear labels
and adequate touch/click areas.

### PDF page 55

USR -
48
User Interface &
Accessibility
As a User use a clear and accessible
interface with readable text,
visible buttons and
understandable instructions
so that older adults and
younger family members can
comfortably use F.I.L. Foods.
C. Consistent visual design
Given the user moves between the application screens
When each screen is displayed
Then the interface shall use a consistent and eye-pleasing
visual style.
4. Text and controls shall have sufficient contrast.
5. Selected, disabled, warning, success and error states
shall be visually distinguishable.
6. Forms shall use simple instructions and shall not
overcrowd the screen.
7. The layout shall remain usable on supported screen
sizes.
Passed
Failed
Total
USR -
49
User Profile & Dietary
Information
As a User read the Terms and
Conditions in clear, numbered
sections
so that I know what I am
agreeing to about my account,
health information, orders,
payment and delivery before I
accept.
Given When Then 1. The system shall display the Terms and Conditions in
numbered sections with short headings: 1. Using F.I.L.
Foods, 2. Registering For Myself or for a Family
Member, 3. Health, Dietary and Allergy Information, 4.
Privacy and Data Protection, 5. Meals, Orders and
Payment, 6. Delivery and Pickup, 7. Account Deletion, 8.
Changes to These Terms, 9. Contact.
New story. Gives the full
contents of the Terms and
Conditions that USR - 15
displays.
A. Open from the registration page
Given the user is on the registration page
When the user selects "Terms and Conditions"
Then the system shall display the Terms and Conditions with
the list of sections, the version number and the "Last updated"
date
Sample Data:
Version 1.0, last updated 2026-11-12.
2. The system shall show a list of the section headings
at the top, and selecting a heading shall scroll to that
section.
B. Jump to a section
Given the Terms and Conditions are open
When the user selects "5. Meals, Orders and Payment" in the
list of sections
Then the system shall scroll to Section 5 and show its text,
including the standard meal price of ₱300 and the limit of three
meals per day
Sample Data:
Section 5 selected. Price: ₱300 per meal. Limit: 3 meals per
day.
3. Section 2 shall state that a user who registers for a
family member must be allowed to manage that person's
meals and health information, that the user is the only
person who logs in, and that one meal recipient is
allowed per account (USR - 43 and USR - 44).

### PDF page 56

USR -
49
User Profile & Dietary
Information
As a User read the Terms and
Conditions in clear, numbered
sections
so that I know what I am
agreeing to about my account,
health information, orders,
payment and delivery before I
accept.
C. Open from Profile or Account
Given the user is logged in
When the user opens the Terms and Conditions from Profile or
Account
Then the system shall display the current version and shall not
change the date and time the user accepted them
Sample Data:
Maria Santos (msantos) opens them from Profile. Accepted on
2026-11-12 09:00 AM.
4. Section 3 shall state that health conditions, dietary
restrictions and allergies are used only to recommend
suitable meals and to prepare orders safely, that the
Dietitian reviews each order before payment, that
allergies are visible to the Admin, Dietitian, Kitchen Staff
and Delivery Staff, and that the app does not replace the
advice of a doctor.
D. Family Member sections
Given the user registered as Family Member
When the user reads Section 2 and Section 3
Then the system shall display the statement that the user must
be allowed to manage the meal recipient's meals and health
information, and that this information is used to recommend and
prepare suitable meals
Sample Data:
Carlos Dizon reads both sections before saving Lia Dizon's
details (USR - 44).
5. Section 4 shall state what personal information is
collected, why it is collected and who can see it, that the
delivery address is visible only to the Delivery Staff and
the Admin, that passwords are stored only in hashed
form (USR - 40), and that the information is handled
under the Data Privacy Act of 2012 (RA 10173).
E. Health information and who can see it
Given the user is reading Section 3
When the section is displayed
Then the system shall state that allergies are visible to the
Admin, Dietitian, Kitchen Staff and Delivery Staff, that the
Dietitian reviews each order before payment, and that the app
does not replace a doctor's advice
Sample Data:
Allergy: Peanuts. Visible to staff before the order is prepared.
6. Section 5 shall state the standard meal price of ₱300,
the limit of one meal per meal time and three meals per
day, that each order goes to the Dietitian for review, that
payment is requested only after approval, and that only
paid orders are prepared (USR - 20).

### PDF page 57

USR -
49
User Profile & Dietary
Information
As a User read the Terms and
Conditions in clear, numbered
sections
so that I know what I am
agreeing to about my account,
health information, orders,
payment and delivery before I
accept.
F. Privacy and delivery address
Given the user is reading Section 4
When the section is displayed
Then the system shall state what personal information is
collected, why it is collected and who can see it, that only the
Delivery Staff and the Admin see the delivery address, and that
the information is handled under RA 10173
Sample Data:
Delivery address: 12 Mabini St., Quezon City. Visible to
Delivery Staff and Admin only.
7. Section 6 shall state that the user chooses Delivery or
Pickup, that Delivery needs a valid address and
schedule, and that Pickup shows the pickup details and
schedule (USR - 19).
G. Account deletion and changes to the terms
Given the user is reading Section 7 and Section 8
When the sections are displayed
Then the system shall state that an account cannot be deleted
while an order is in progress and that the user will be asked to
accept any new version
Sample Data:
Order #00350 is Preparing, so account deletion is blocked
(USR - 47).
8. Section 7 shall state that the user can delete the
account from Account, that deletion is not possible while
an order is in progress, and that deleting a Family
Member account also deletes the meal recipient's
information (USR - 47).
H. Terms and Conditions cannot be loaded
Given the device has no connection
When the user selects "Terms and Conditions"
Then the system shall display "The Terms and Conditions
could not be loaded. Please try again." with a Try again button,
and shall not let the user accept them until the text has loaded
Sample Data:
Airplane mode is on. After the connection returns, Try again
loads the text.
9. Section 8 shall state that the Terms and Conditions
may change and that the user will be asked to accept
the new version (USR - 50). Section 9 shall give the
service contact information shown in Help (USR - 37).
10. The system shall display the version number and the
"Last updated" date of the Terms and Conditions.
11. The system shall make the Terms and Conditions
reachable from the registration page, the profile screen
of a user who continued with Google, Profile and
Account, and shall use text of at least 16 px (USR - 26).

### PDF page 58

USR -
49
User Profile & Dietary
Information
As a User read the Terms and
Conditions in clear, numbered
sections
so that I know what I am
agreeing to about my account,
health information, orders,
payment and delivery before I
accept.
12. The system shall display "The Terms and Conditions
could not be loaded. Please try again." with a Try again
button when they cannot be loaded, and shall not let the
user accept them until the text has loaded.
Passed
Failed
Total
USR -
50
User Profile & Dietary
Information
As a User accept or decline the Terms
and Conditions, and accept
again when they change
so that my agreement is
recorded with the version I
accepted and I stay in control
of how my information is used.
Given When Then 1. The system shall display an unticked box "I have read
and agree to the Terms and Conditions" with a link to the
Terms and Conditions (USR - 49) on the registration
page and on the profile screen of a user who continued
with Google (USR - 31).
New story. Applies to
registration, Continue with
Google and every login after
an update (USR - 15, USR -
31, USR - 44).
A. Accept and register
Given the user is on the registration page with the registration
details filled in
When the user ticks "I have read and agree to the Terms and
Conditions" and selects Register
Then the system shall create the account and record the date
and time, the user ID and the version number of the accepted
Terms and Conditions
Sample Data:
Maria Santos (msantos) ticks the box on 2026-11-12 09:00 AM.
Version 1.0 accepted.
2. The system shall display "You must accept the Terms
and Conditions to continue." when the user selects
Register or Save with the box unticked, and shall not
create the account or save the profile (USR - 15).
B. Box left unticked
Given the user is on the registration page with the box unticked
When the user selects Register
Then the system shall display "You must accept the Terms and
Conditions to continue." and not create the account
Sample Data:
Carlos Dizon (cdizon). Box: unticked.
3. The system shall provide a Decline option next to the
box. Selecting it shall return the user to the previous
screen without creating or changing any account.
C. Decline the Terms and Conditions
Given the user is on the registration page
When the user selects Decline
Then the system shall return to the previous screen without
creating or changing any account
Sample Data:
Maria Santos selects Decline. No account "msantos" is created.
4. The system shall record, for every acceptance, the
date and time, the user ID and the version number of the
Terms and Conditions accepted (USR - 15).

### PDF page 59

USR -
50
User Profile & Dietary
Information
As a User accept or decline the Terms
and Conditions, and accept
again when they change
so that my agreement is
recorded with the version I
accepted and I stay in control
of how my information is used.
D. Continue with Google
Given the user continued with Google and is on the profile
screen
When the user selects Save with the box unticked
Then the system shall display "You must accept the Terms and
Conditions to continue." and not save the profile
When the box is ticked and Save is selected
Then the system shall record the acceptance and save the
profile (USR - 31)
Sample Data:
Maria Santos saves once with the box unticked, then ticks it
and saves again.
5. The system shall append each acceptance to the
activity record (USR - 42) and shall not allow the user to
edit or delete it.
E. Family Member confirmation
Given the user registered as Family Member and has ticked the
Terms and Conditions box
When the user saves the meal recipient's details without the
confirmation tick
Then the system shall display "Please confirm that you are
allowed to manage this person's information." and not save the
details (USR - 44)
Sample Data:
Carlos Dizon ticked the Terms and Conditions box.
Confirmation for Lia Dizon: unticked.
6. The system shall record only one acceptance for a
version, even when Register or Save is selected twice.
F. Acceptance cannot be saved
Given the user ticked the box
When the user selects Register and the connection fails
Then the system shall display "We could not save your
acceptance. Please try again." and not create the account
Sample Data:
Connection lost while registering.
7. For a Family Member, the system shall still require the
separate confirmation "I confirm that I am allowed to
manage this person's meals and health information."
(USR - 44). Ticking the Terms and Conditions box shall
not replace it.
G. Register selected twice
Given the user ticked the box
When the user selects Register twice in a row
Then the system shall record only one acceptance for this
version
Sample Data:
Two taps within one second. One acceptance record: 2026-11-
12 09:00 AM.
8. When a new version is published, the system shall
display "We updated our Terms and Conditions. Please
review and accept to continue." the next time the user
logs in or opens the app, and shall require acceptance
before the user continues.

### PDF page 60

USR -
50
User Profile & Dietary
Information
As a User accept or decline the Terms
and Conditions, and accept
again when they change
so that my agreement is
recorded with the version I
accepted and I stay in control
of how my information is used.
H. Terms and Conditions updated
Given the user has an account and accepted version 1.0, and
version 1.1 has been published
When the user logs in or opens the app
Then the system shall display "We updated our Terms and
Conditions. Please review and accept to continue." with the
new version and its "Last updated" date
When the user opens the new version, ticks the box and
selects Accept
Then the system shall record the date and time, the user ID
and version 1.1, and continue to the Home screen
Sample Data:
msantos accepted version 1.0 on 2026-11-12. Version 1.1 is
published later.
9. When the user declines the updated version, the
system shall end the session, keep the account
unchanged, and display "You need to accept the
updated Terms and Conditions to keep using F.I.L.
Foods." The user shall be able to log in again later to
review and accept.
I. Decline the updated terms
Given the updated Terms and Conditions are displayed
When the user selects Decline
Then the system shall end the session, keep the account and
all saved information unchanged, and display "You need to
accept the updated Terms and Conditions to keep using F.I.L.
Foods."
When the user logs in again later
Then the system shall display the updated Terms and
Conditions again
Sample Data:
cdizon declines version 1.1 and logs in the next day. The
prompt appears again.
10. The system shall not cancel or change an order that
is already in progress when a new version is published,
and shall still send its status notifications (USR - 24).
J. Orders when the terms change
Given the user has an order in progress when a new version is
published
When the user has not yet accepted the new version
Then the system shall keep preparing and delivering the order,
shall not cancel or change it, and shall still send its status
notifications
Sample Data:
Order #00350 is Preparing when version 1.1 is published.
11. The system shall display "We could not save your
acceptance. Please try again." and shall not create the
account when the acceptance cannot be saved.

### PDF page 61

USR -
50
User Profile & Dietary
Information
As a User accept or decline the Terms
and Conditions, and accept
again when they change
so that my agreement is
recorded with the version I
accepted and I stay in control
of how my information is used.
K. Acceptance record
Given the user has accepted a version
When the user opens the activity record
Then the system shall show the date and time and the version
accepted, and shall not allow the entry to be edited or deleted
(USR - 42)
Sample Data:
Accepted Terms and Conditions version 1.0, 2026-11-12 09:00
AM.
12. The system shall use the same box, messages and
acceptance record for sign-up with a username and
password and for Continue with Google (USR - 01 and
USR - 30).
Passed
Failed
Total
COMPONENT CONNECTIONS
User (USR - 20) submits order → Dietitian reviews suitability (DIT - 15) → User pays after approval → Kitchen receives approved, paid order (KIT - 11 to KIT - 13) → Admin assigns delivery staff where needed (ADM - 12) → Delivery Staff updates delivery status (DEL - 15 to DEL - 17). For pickup, Kitchen marks Ready for Pickup and the order is
completed after collection. Admin manages the menu and availability used by the User menu (ADM - 17 and ADM - 18).
