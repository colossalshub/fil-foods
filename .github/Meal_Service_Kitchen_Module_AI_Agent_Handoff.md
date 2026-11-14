# Kitchen Module Requirements - KIT-01 through KIT-15

**Source:** [`docs/specs/FIL_Foods_Kitchen_Module.pdf`](../docs/specs/FIL_Foods_Kitchen_Module.pdf) (`FIL_Foods_User_5.xlsx` Kitchen Module, 26 pages). Story index: [`docs/specs/kitchen-module.md`](../docs/specs/kitchen-module.md).
**Authority:** Requirements and acceptance criteria must be followed as written; unresolved conflicts with other modules must be recorded, not silently reinterpreted.

## Implementation instructions

- Preserve every user story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to its screen/component, service/API, data model, and automated test before marking it complete in [`docs/implementation-traceability-staff.md`](../docs/implementation-traceability-staff.md).
- Identify conflicts, ambiguities, dependencies, and external blockers rather than inventing business rules.
- Distinguish requirements from spreadsheet test-status rows (Passed / Failed / Total); do not treat status labels as features.

## PDF transcription

Page headings preserve source pagination. Page content is extracted verbatim from the supplied PDF; table rows may wrap across page boundaries.

### PDF page 1

Kitchen Module
Precondition: The Kitchen Staff member has a staff account created by the Admin and is logged in. Dietitian-reviewed, paid orders and the available meal menu already exist.
Postcondition: The Kitchen Staff has prepared the paid order according to its approved meal selections, allergies and dietary restrictions, and updated its status to Ready for Pickup or the next authorised handoff.
No. Epic (System 
Component)
Persona 
(User)
I want to (action) So that (benefit or value) Scenarios (Given / When / Then) Acceptance Criteria (System Requirement)
KIT-01 Authentication & Account 
Management
As a Kitchen 
Staff member
choose my role on the Select 
Your Role screen
so that I reach the sign-in that 
belongs to my job.
Given When Then 1. The system shall show only the role cards listed for 
this entry screen.
A. Pick the role
Given the app has just opened and the Select Your Role 
screen shows the title "Select Your Role" and "Choose your 
role to continue"
When the screen is displayed
Then it shall show two cards: Kitchen Staff ("Prepare and 
manage food orders") and Delivery Staff ("Handle deliveries 
and track orders"), each with an icon and an arrow button
When the Kitchen Staff card is selected
Then the system shall open the Kitchen Staff Log in screen
2. The system shall highlight the selected card with the 
light-green fill and Primary Green border.
B. Back
Given a role Log in screen is open
When the back arrow is selected
Then the system shall return to Select Your Role without losing 
the chosen role card highlight
Passed
Failed
Total
KIT-02 Authentication & Account 
Management
As a Kitchen 
Staff member
log in with my work email and 
password
so that only authorised Kitchen 
Staff staff can open the 
Kitchen Staff and its 
information.
Given When Then 1. The system shall show the Log in screen with: email 
field (mail icon, placeholder "Email Address"), password 
field (lock icon, eye icon), the "Remember me" tick box, 
the "Forgot password?" link, a primary "Log In" button, 
an "or" divider and a "Continue with Google" button.
### PDF page 2

KIT-02 Authentication & Account 
Management
As a Kitchen 
Staff member
log in with my work email and 
password
so that only authorised Kitchen 
Staff staff can open the 
Kitchen Staff and its 
information.
A. Valid credentials
Given the Kitchen Staff is on the Kitchen Staff Log in screen 
showing the F.I.L Foods logo, the title "F.I.L Foods", the label 
"Kitchen Staff", the tagline and the footer "F.I.L Foods © 2026"
When the staff member enters kitchen@filfoods.ph and the 
correct password and selects Log In
Then the system shall open the Kitchen Staff Dashboard
And a green banner shall show "Logged in successfully" at the 
top of the Dashboard content
And the bottom navigation shall show only: Dashboard, Orders, 
Menu and Settings, with Dashboard marked active
Sample Data:
Email: kitchen@filfoods.ph. Password: ••••••••••.
2. The system shall validate that the email contains "@" 
and that both fields are filled before checking 
credentials.
B. Wrong email format
Given the Log in screen is open
When the email is typed as kitchenfilfoods.ph (no @) and Log 
In is selected
Then the system shall keep the staff member on the Log in 
screen
And the email field shall get a red border and show "Invalid 
email. Add an @ before filfoods.ph and try again."
And the password dots and the Remember me tick shall stay 
as entered
Sample Data:
Email: kitchenfilfoods.ph. Password: ••••••••••.
3. The system shall display the exact messages: "Invalid 
email. Add an @ before filfoods.ph and try again.", 
"Incorrect password. Try again or tap Forgot 
password?", "Email and password are required." and 
"Could not connect".
C. Wrong password
Given the Log in screen is open
When kitchen@filfoods.ph is entered with a wrong password 
and Log In is selected
Then the system shall show "Incorrect password. Try again or 
tap Forgot password?" under the password field, with the field 
outlined in red
And no session shall be created
Sample Data:
Email: kitchen@filfoods.ph. Password: wrong value.
4. The system shall open the Dashboard of the signed-in 
role only and show the "Logged in successfully" banner 
once.
### PDF page 3

KIT-02 Authentication & Account 
Management
As a Kitchen 
Staff member
log in with my work email and 
password
so that only authorised Kitchen 
Staff staff can open the 
Kitchen Staff and its 
information.
D. Blank fields
Given the Log in screen is open with empty inputs 
(placeholders "Email Address" and "Password")
When Log In is selected with both inputs empty
Then the system shall stay on Log in and show the heading 
"Please check your details"
And the inputs shall show the prompts "Enter your email" and 
"Enter your password"
And the message "Email and password are required." shall be 
shown (outcome H03)
5. The system shall show the role label "Kitchen Staff" 
and not any other role's label on this screen (Figma 
Dietitian Log in currently reads "Admin Panel" and must 
read "Dietitian").
E. Show / hide password and Remember me
Given the Log in screen is open
When the eye icon is selected
Then the password shall be revealed as plain text and the icon 
shall change (outcome H01)
When the eye icon is selected again, or Remember me is 
unticked
Then the password shall be masked again and the device shall 
not be remembered (outcome H02)
6. The system shall store passwords only as salted 
hashes and shall never display or log a password in 
readable form.
F. Connection failure
Given the staff member selects Log In and the network is down
When the request fails
Then the system shall show "Could not connect" and "Your 
request was not completed. Check your connection and try 
again."
And the entered details shall be kept, no success message 
shall appear, and the buttons "Try again" and "Go back" shall 
be offered (outcome H10)
7. The system shall restrict Kitchen Staff accounts to the 
features listed in this module.
Passed
Failed
Total
KIT-03 Authentication & Account 
Management
As a Kitchen 
Staff member
recover my password through 
my account email
so that I can regain access 
without asking the Admin to do 
it for me.
Given When Then 1. The system shall send a reset link only to an existing 
account but shall always show the neutral wording "If an 
account exists for this email…".
### PDF page 4

KIT-03 Authentication & Account 
Management
As a Kitchen 
Staff member
recover my password through 
my account email
so that I can regain access 
without asking the Admin to do 
it for me.
A. Request a reset link
Given the Log in screen is open
When "Forgot password?" is selected
Then the system shall open "Forgot password?" with the text 
"Enter your account email to receive a reset link.", an "Email 
Address" field, "Send reset link" and "Back to login" (H04)
When kitchen@filfoods.ph is submitted
Then the system shall show "Check your email" and "If an 
account exists for this email, a reset link is on its way."
And the screen shall show "Email: kitchen@filfoods.ph", 
"Check your inbox and spam folder.", "Resend link" and "Back 
to login" (H05)
Sample Data:
Email: kitchen@filfoods.ph
2. The system shall reject malformed or blank emails 
with the messages in the scenarios and send nothing.
B. Invalid email
Given the recovery form is open
When kitchenfilfoods.ph is submitted
Then the system shall show "Check the email address below." 
and "Enter a valid email address, such as name@example.
com."
And no message shall be sent (H11)
Sample Data:
Email: kitchenfilfoods.ph
3. The system shall require both password fields to 
match and shall change the password only after a 
successful reset.
C. Choose a new password
Given the staff member opened a valid reset link
When the screen "Reset password" is shown
Then it shall show "Create a new password for your account.", 
"New password", "Confirm password" and the buttons "Reset 
password" and "Cancel" (H06)
When the two passwords do not match
Then the system shall show "Passwords do not match. Enter 
the same password in both fields." and stay on the form (H12)
When both match and Reset password is selected
Then the system shall show "Password updated" and "Your 
new password is ready. Sign in again to continue."
And "Back to login" shall return to this role's Log in; the old 
password shall fail and the new one shall work (H07)
4. The system shall invalidate a reset link after use or 
expiry.
### PDF page 5

KIT-03 Authentication & Account 
Management
As a Kitchen 
Staff member
recover my password through 
my account email
so that I can regain access 
without asking the Admin to do 
it for me.
D. Expired or used link
Given the reset link has expired or was already used
When the link is opened
Then the system shall show "Link expired" and "This reset link 
has expired or has already been used."
And it shall offer "Request a new link" (back to H04) and "Back 
to login"; no password shall change (H13)
Passed
Failed
Total
KIT-04 Authentication & Account 
Management
As a Kitchen 
Staff member
continue with my Google work 
account
so that I can sign in without 
typing a password.
Given When Then 1. The system shall create a session only when the 
Google identity matches a staff account that holds the 
selected role.
A. Authorised Google account
Given the Log in screen is open
When "Continue with Google" is selected
Then the system shall show "Continue with Google", "Choose a 
work account for filfoods Food.", the account "kitchen@filfoods.
ph", "Use another account", "Continue" and "Cancel" (H08)
When an authorised account is continued
Then the system shall open the Kitchen Staff Dashboard with 
the banner "Logged in successfully"
When Cancel is selected
Then the system shall return to the Log in screen unchanged
2. The system shall never create a new staff account 
from a Google sign-in; only the Admin creates staff.
B. Unauthorised Google account
Given Google confirms the identity but the account has no 
Kitchen Staff role
When the account is continued
Then the system shall show "Account not authorized" and "This 
account is not allowed to access the selected role."
And it shall add "No session has been created." and "Contact 
your administrator if you need access."
And the buttons "Choose another account" and "Back to login" 
shall be shown (H09)
3. The system shall show the Google "G" mark beside 
the label "Continue with Google".
Passed
Failed
### PDF page 6

Total
KIT-05 Home & Navigation As a Kitchen 
Staff member
open my notifications from the 
bell icon
so that I can see new activity 
for my role in one place.
Given When Then 1. The system shall show notifications only for records 
the signed-in role is allowed to open.
A. Notifications list
Given the Kitchen Staff is on a screen whose header shows the 
bell icon
When the bell is selected
Then the system shall open "Notifications" listing only items 
allowed for this role, for example "Order #00350 is pending" 
and "Menu item updated" followed by "No more notifications"
And selecting an order notification shall open that order's detail 
screen for this role; Back returns to the source screen (S01)
2. The system shall mark an item as read when opened 
without changing the order or menu data.
B. Empty inbox
Given there are no notifications
When the bell is selected
Then the system shall show "You’re all caught up." and "New 
updates will appear here." with a Back button; this is not an 
error (S02)
3. The system shall deliver notifications to the Kitchen 
Staff only as set by the Admin (ADM - 21). The Kitchen 
Staff shall not be able to turn them on or off, change 
which notifications are sent, or delete them (KIT-07).
Passed
Failed
Total
KIT-06 Settings & Profile As a Kitchen 
Staff member
view and edit my account 
details in Settings
so that my name and email 
stay correct.
Given When Then 1. The system shall show the signed-in account's own 
name and email only.
A. View Settings
Given the Kitchen Staff is signed in
When Settings is selected in the bottom navigation
Then the system shall show the title "Settings", the avatar initial 
"K", "Kitchen Staff", "kitchen@filfoods.ph" and the button "Edit 
Profile"
And below it: App Preferences (Language "English", 
Appearance "Light Mode"); Support: Help & Support, About F.I.
L Foods; and a Log out row (added because the source screen 
has none)
2. The system shall validate the email format before 
saving.
### PDF page 7

KIT-06 Settings & Profile As a Kitchen 
Staff member
view and edit my account 
details in Settings
so that my name and email 
stay correct.
B. Edit profile
Given Edit Profile is selected
When the system opens "Edit Profile" with the prefilled "Full 
name" and "Email address" and the staff member changes the 
email to a valid value and selects Save changes
Then the system shall show "Profile updated" and "Your 
changes have been saved." with the new name and email and 
a "Back to Settings" button (S03, S04)
When the email is typed without "@"
Then the system shall show "Enter a valid email address." and 
stay in the editor (S05)
When Back or Cancel is selected after changes
Then the system shall ask "Leave without saving your 
changes?" with "Discard changes" and "Keep editing" (S10)
Sample Data:
Full name: Kitchen Staff. Email: admin.updated@filfoods.ph 
(example).
3. The system shall not change the role through Edit 
Profile.
Passed
Failed
Total
KIT-07 Settings & Profile As a Kitchen 
Staff member
set language and appearance so that the app suits how I 
work.
Given When Then 1. The system shall apply a preference only after Apply.
A. Language
Given Settings is open
When Language is selected
Then the system shall show a choice screen with "English" and 
"Filipino", and "Apply" / "Cancel"; Apply with Filipino shall show 
the Settings labels in Filipino (S08, S16); Cancel keeps the prior 
language
2. The system shall keep each preference per account.
### PDF page 8

KIT-07 Settings & Profile As a Kitchen 
Staff member
set language and appearance so that the app suits how I 
work.
B. Appearance
Given Settings is open
When Appearance is selected
Then the system shall show "Light Mode", "Dark Mode" and 
"Use device setting" with Apply / Cancel; Dark + Apply applies 
the dark theme (S09, S11); device setting shows "Current 
device theme: Light" (S17)
3. The system shall not show the Kitchen Staff a 
Notifications switch. Notifications for this role are 
controlled by the Admin only (ADM - 21), and the 
Kitchen Staff shall receive the notifications the Admin 
has turned on for the records the Kitchen Staff may open 
(KIT-05).
C. No Notifications switch
Given Settings is open for a Kitchen Staff member
When the Kitchen Staff member views App Preferences
Then the system shall show only Language and Appearance, 
with no Notifications switch, and notifications shall arrive in the 
bell inbox only as set by the Admin (ADM - 21)
Passed
Failed
Total
KIT-08 Settings & Profile As a Kitchen 
Staff member
open Help & Support and 
About F.I.L Foods
so that I can ask for help and 
read app information.
Given When Then 1. The system shall not show a ticket number or 
response-time promise.
A. Send a support message
Given Help & Support is open
When a topic such as "Account access" and a message are 
entered and "Send message" is selected
Then the system shall show "Message sent", "Your request has 
been received." and "A reply will be sent to your account email." 
with "Back to Settings" (S12, S13)
When the message is empty
Then the system shall show "Please enter a message before 
sending." (S14)
Sample Data:
Topic: Account access. Message: I need help with my account.
2. The brand name appears as "F.I.L Foods" in Figma 
screens and "filfoods Food" in some outcome screens; 
the final app shall use one name consistently.
### PDF page 9

KIT-08 Settings & Profile As a Kitchen 
Staff member
open Help & Support and 
About F.I.L Foods
so that I can ask for help and 
read app information.
B. About
Given About F.I.L Foods is selected
When the screen opens
Then it shall show "About filfoods Food", "Manage. Serve. 
Nourish.", "Admin · Kitchen Staff · Dietitian" and "filfoods Food 
© 2026" with "Back to Settings" (S15)
Passed
Failed
Total
KIT-09 Authentication & Account 
Management
As a Kitchen 
Staff member
log out of the app so that my account is not 
exposed on a shared device.
Given When Then 1. The system shall end the session on the server and 
clear the stored sign-in.
A. Logout A / B
Given Settings is open
When Log out is selected
Then the system shall dim the screen and show a card with a 
warning symbol, "Log out of F.I.L Foods?", "You're currently 
logged in as Kitchen Staff. You will need to log in again to 
access your account." and the note "Your saved changes will 
be kept."
And the buttons "Stay logged in" and "Log out" shall be shown
When "Log out" is selected
Then the system shall end the session and return to the role 
Log in screen
When "Stay logged in" is selected
Then the system shall close the card and keep Settings 
unchanged
2. The system shall not delete any saved work when 
logging out.
B. After logout
Given the session has ended
When the browser or device Back is used
Then the system shall show "Sign in required" and "Your 
session has ended. Log in again to access this page." with "Go 
to login"; no protected content shall appear (H15)
Passed
Failed
Total
### PDF page 10

KIT-10 Dashboard As a Kitchen 
Staff member
see my Dashboard with 
shortcuts to Orders and Menu
so that I can start my shift 
quickly.
Given When Then 1. The system shall NOT show Total Orders, Total 
Sales, Total Customers, Sales Overview or Staff.
A. Dashboard
Given the Kitchen Staff has logged in
When the Dashboard loads
Then the header shall show "Kitchen Staff" and "Kitchen Panel"
And the greeting shall read "Welcome back, Kitchen Staff!" and 
"Here's what you can do today."
And a "View Orders" button and a "Menu Management" card 
with "View All" and "Manage your menu items." shall be shown
And five items with Edit buttons: Fried Chicken ₱120.00, Pasta 
Carbonara ₱150.00, Spring Salad ₱100.00, Grilled Salmon 
₱200.00, Miso Soup ₱80.00
Passed
Failed
Total
KIT-11 Orders As a Kitchen 
Staff member
see the orders list with only 
the food, the customer's first 
name and the Order ID
so that I can prepare food 
without seeing private details.
Given When Then 1. The Order ID shall be unique and shown as #00000.
A. Orders list
Given the Kitchen Staff selects Orders
When the screen opens
Then "Orders" with the search box "Search orders..." and filters 
All, Pending, Preparing, Delivered
And rows show food image, FIRST NAME only, Order ID, date 
and status: Juan #00350 Oct 29, 2026 • 08:45 PM Pending; 
Maria #00349 08:30 PM Preparing; Carlos #00348 07:50 PM 
Delivered; Ana #00347 07:20 PM Cancelled; Mark #00346 06:
55 PM Delivered
And rows shall NOT show last name, price, total or address
2. Status badges use: Pending, Preparing, Delivered, 
Cancelled.
### PDF page 11

KIT-11 Orders As a Kitchen 
Staff member
see the orders list with only 
the food, the customer's first 
name and the Order ID
so that I can prepare food 
without seeing private details.
B. Fuzzy search by first name or Order ID
Given Orders is open with the five sample orders listed
When "Mria" is typed (a missing letter)
Then only Maria #00349 shall be listed, with the first name only
When "carols" is typed (two letters swapped)
Then only Carlos #00348 shall be listed
When "350" or "#00350" is typed
Then only Juan #00350 shall be listed
When "Mar" is typed (a partial name)
Then Maria #00349 and Mark #00346 shall be listed, newest 
first
3. The system shall search only the first name and the 
Order ID shown on the list, and shall never search or 
reveal the last name, price, total or address.
C. Fuzzy search: limits and combined filters
Given Orders is open with the five sample orders listed
When a last name such as "Reyes" or "Santos" is typed
Then the system shall show "No orders found", "Try another 
name or order number." and "Clear search", because last 
names are not searched for Kitchen Staff
When "00359" is typed (one wrong digit)
Then the system shall show the same "No orders found" 
message, because Order IDs are never spelling-corrected
When "Jon" is typed (too different from any first name)
Then the system shall show the same "No orders found" 
message
When "Mria" is typed and Delivered is selected
Then the system shall show "No orders found", because Maria 
#00349 is Preparing
When the search box is cleared
Then the full list shall be restored
4. The system shall ignore capital letters and extra 
spaces, match partial first names, and find first names 
with small typing mistakes (one wrong, missing, extra or 
swapped letter for names of 3 to 5 letters, up to two for 6 
or more). Order IDs shall be matched only exactly or 
partially. Search shall start from 2 typed characters and 
work together with the status filter.
Passed
Failed
Total
### PDF page 12

KIT-12 Orders As a Kitchen 
Staff member
open an order to see its food 
and the customer's allergies 
and nutritional preferences
so that I prepare the order 
safely.
Given When Then 1. Allergies shall be visible before the staff member acts 
on the order.
A. Order details
Given the Kitchen Staff opens #00350
When Order Details loads
Then the card shall show the customer first name, #00350, Oct 
29, 2026 • 08:45 PM and the badge Pending
And "Order Items": Fried Chicken ×1 and Pasta Carbonara ×1 
(no prices shall be shown to this role)
And "Customer Preferences": Allergies Peanuts, Shellfish; 
Dietary Preference Low Sugar; Calories 400 – 600 kcal; 
Sodium ≤ 2g; Protein ≥ 25g
And a primary button "Start Preparing" shall be shown
2. The screen shall not show the customer's last name, 
email or payment details.
Passed
Failed
Total
KIT-13 Orders As a Kitchen 
Staff member
update a paid order from 
Preparing to Ready for Pickup
so that the Admin, Delivery 
Staff and user know when the 
meal is ready.
Given When Then 1. Kitchen Staff shall only prepare orders with Dietitian 
approval and confirmed payment.
A. Start preparing
Given an order has been approved by the Dietitian and 
payment is confirmed
When Kitchen Staff starts preparing the meal
Then the status shall change to Preparing.
2. The system shall show the approved meal selections 
and relevant allergies and restrictions.
B. Preparation complete
Given an order is being prepared
When preparation is complete
Then Kitchen Staff shall mark the order Ready for Pickup or 
ready for delivery handoff.
3. Kitchen Staff shall update the status to Preparing and 
Ready for Pickup.
Passed
Failed
Total
KIT-14 Customers As a Kitchen 
Staff member
see a customer's allergies and 
preferred low or high sugar, 
calories, sodium and protein
so that meals are prepared to 
the customer's needs.
Given When Then 1. The page is read-only.
### PDF page 13

KIT-14 Customers As a Kitchen 
Staff member
see a customer's allergies and 
preferred low or high sugar, 
calories, sodium and protein
so that meals are prepared to 
the customer's needs.
A. Customer details
Given the Kitchen Staff opens a customer
When Customer Details loads
Then it shall show the initial "A", first name and email, Allergies: 
Peanuts, Dairy and Preferred Nutritional Levels: Sugar Low ≤ 
5g; Calories Moderate 400 – 600 kcal; Sodium Low ≤ 2.00 mg; 
Protein High ≥ 25g
And no order history and no address shall be shown
Passed
Failed
Total
KIT-15 Menu As a Kitchen 
Staff member
see all menu items and 
manage them
so that the menu reflects what 
the kitchen can make.
Given When Then 1. The staff member can add, edit, delete and set 
availability of menu items.
A. View
Given the Kitchen Staff selects Menu
When the screen opens
Then it shall show tabs All, Meals, Desserts, Drinks and six 
items: Fried Chicken ₱120.00, Pasta Carbonara ₱150.00, 
Spring Salad ₱100.00, Grilled Salmon ₱200.00, Miso Soup 
₱80.00, Fruit Bowl ₱70.00
2. The staff member cannot open Staff or sales 
information.
B. Manage
Given a menu item is selected or Edit is selected on the 
Dashboard
When the price or availability is changed and saved
Then the system shall show "Edit Menu Item" with name, price 
and availability, then "Menu item updated" and "Your permitted 
changes were saved." (K05, K08)
When an item is added or deleted
Then the same confirmations as Admin shall be used: "Save 
menu changes?" and "Delete <item>?" with "No, keep it" / "Yes, 
delete"
Passed
Failed
Total
### PDF page 14

Kitchen Module
Precondition: The Kitchen Staff member has a staff account created by the Admin and is logged in. Dietitian-reviewed, paid orders and the available meal menu already exist.
Postcondition: The Kitchen Staff has prepared the paid order according to its approved meal selections, allergies and dietary restrictions, and updated its status to Ready for Pickup or the next authorised handoff.
Remarks
### PDF page 15


### PDF page 16


### PDF page 17


### PDF page 18


### PDF page 19


### PDF page 20


### PDF page 21


### PDF page 22


### PDF page 23


### PDF page 24


### PDF page 25


### PDF page 26



