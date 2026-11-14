# Delivery Module Requirements - DEL-01 through DEL-17

**Source:** Updated spreadsheet export (Nov 2026). Canonical text: [`docs/specs/canonical/delivery-module.export.md`](../docs/specs/canonical/delivery-module.export.md). PDF (may lag): [`docs/specs/FIL_Foods_Delivery_Module.pdf`](../docs/specs/FIL_Foods_Delivery_Module.pdf). Story index: [`docs/specs/delivery-module.md`](../docs/specs/delivery-module.md). Cross-module: [`docs/specs/meal-service-modules.md`](../docs/specs/meal-service-modules.md).
**Authority:** Requirements and acceptance criteria below must be followed as written; record cross-module conflicts instead of inventing staff behavior.

## Implementation instructions

- Preserve every story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to code and tests in the appropriate traceability doc before marking complete.
- Spreadsheet Passed / Failed / Total rows are QA status only, not product features.

## Canonical specification (verbatim export)

Delivery Module							
Precondition: The Delivery Staff member has a staff account created by the Admin and is logged in. Paid orders marked Ready for Pickup and assigned for delivery exist.							
Postcondition: Delivery progress is saved, the Admin and user can see the updated status, and the action is logged.							
No.	Epic (System Component)	Persona (User)	I want to (action)	So that (benefit or value)	Scenarios (Given / When / Then)	Acceptance Criteria (System Requirement)	Remarks
DEL - 01	Authentication & Account Management	As a Delivery Staff member	choose my role on the Select Your Role screen	so that I reach the sign-in that belongs to my job.	Given When Then	1. The system shall show only the role cards listed for this entry screen.	
					"A. Pick the role

Given the app has just opened and the Select Your Role screen shows the title ""Select Your Role"" and ""Choose your role to continue""
When the screen is displayed
Then it shall show the Delivery Staff card (""Handle deliveries and track orders""), each with an icon and an arrow button

When the Delivery Staff card is selected
Then the system shall open the Delivery Staff Log in screen (H14: ""Enter your work email"", ""Enter password"")"	2. The system shall highlight the selected card with the light-green fill and Primary Green border.	
					"B. Back

Given a role Log in screen is open
When the back arrow is selected
Then the system shall return to Select Your Role without losing the chosen role card highlight"		
						Passed	
						Failed	
						Total	
DEL - 02	Authentication & Account Management	As a Delivery Staff member	log in with my work email and password	so that only authorised Delivery Staff staff can open the Delivery Staff and its information.	Given When Then	1. The system shall show the Log in screen with: email field (mail icon, placeholder "Email Address"), password field (lock icon, eye icon), the "Remember me" tick box, the "Forgot password?" link, a primary "Log In" button, an "or" divider and a "Continue with Google" button.	
					"A. Valid credentials

Given the Delivery Staff is on the Delivery Staff Log in screen showing the F.I.L Foods logo, the title ""F.I.L Foods"", the label ""Delivery Staff"", the tagline and the footer ""F.I.L Foods © 2026""
When the staff member enters delivery@filfoods.ph and the correct password and selects Log In
Then the system shall open the Delivery Staff Dashboard
And a green banner shall show ""Logged in successfully"" at the top of the Dashboard content
And the bottom navigation shall show only: Dashboard, Orders, Menu and Settings, with Dashboard marked active

Sample Data:
Email: delivery@filfoods.ph. Password: ••••••••••."	2. The system shall validate that the email contains "@" and that both fields are filled before checking credentials.	
					"B. Wrong email format

Given the Log in screen is open
When the email is typed as deliveryfilfoods.ph (no @) and Log In is selected
Then the system shall keep the staff member on the Log in screen
And the email field shall get a red border and show ""Invalid email. Add an @ before filfoods.ph and try again.""
And the password dots and the Remember me tick shall stay as entered

Sample Data:
Email: deliveryfilfoods.ph. Password: ••••••••••."	3. The system shall display the exact messages: "Invalid email. Add an @ before filfoods.ph and try again.", "Incorrect password. Try again or tap Forgot password?", "Email and password are required." and "Could not connect".	
					"C. Wrong password

Given the Log in screen is open
When delivery@filfoods.ph is entered with a wrong password and Log In is selected
Then the system shall show ""Incorrect password. Try again or tap Forgot password?"" under the password field, with the field outlined in red
And no session shall be created

Sample Data:
Email: delivery@filfoods.ph. Password: wrong value."	4. The system shall open the Dashboard of the signed-in role only and show the "Logged in successfully" banner once.	
					"D. Blank fields

Given the Log in screen is open with empty inputs (placeholders ""Email Address"" and ""Password"")
When Log In is selected with both inputs empty
Then the system shall stay on Log in and show the heading ""Please check your details""
And the inputs shall show the prompts ""Enter your email"" and ""Enter your password""
And the message ""Email and password are required."" shall be shown (outcome H03)"	5. The system shall show the role label "Delivery Staff" and not any other role's label on this screen (Figma Dietitian Log in currently reads "Admin Panel" and must read "Dietitian").	
					"E. Show / hide password and Remember me

Given the Log in screen is open
When the eye icon is selected
Then the password shall be revealed as plain text and the icon shall change (outcome H01)

When the eye icon is selected again, or Remember me is unticked
Then the password shall be masked again and the device shall not be remembered (outcome H02)"	6. The system shall store passwords only as salted hashes and shall never display or log a password in readable form.	
					"F. Connection failure

Given the staff member selects Log In and the network is down
When the request fails
Then the system shall show ""Could not connect"" and ""Your request was not completed. Check your connection and try again.""
And the entered details shall be kept, no success message shall appear, and the buttons ""Try again"" and ""Go back"" shall be offered (outcome H10)"	7. The system shall restrict Delivery Staff accounts to the features listed in this module.	
						Passed	
						Failed	
						Total	
DEL - 03	Authentication & Account Management	As a Delivery Staff member	recover my password through my account email	so that I can regain access without asking the Admin to do it for me.	Given When Then	1. The system shall send a reset link only to an existing account but shall always show the neutral wording "If an account exists for this email…".	
					"A. Request a reset link

Given the Log in screen is open
When ""Forgot password?"" is selected
Then the system shall open ""Forgot password?"" with the text ""Enter your account email to receive a reset link."", an ""Email Address"" field, ""Send reset link"" and ""Back to login"" (H04)

When delivery@filfoods.ph is submitted
Then the system shall show ""Check your email"" and ""If an account exists for this email, a reset link is on its way.""
And the screen shall show ""Email: delivery@filfoods.ph"", ""Check your inbox and spam folder."", ""Resend link"" and ""Back to login"" (H05)

Sample Data:
Email: delivery@filfoods.ph"	2. The system shall reject malformed or blank emails with the messages in the scenarios and send nothing.	
					"B. Invalid email

Given the recovery form is open
When deliveryfilfoods.ph is submitted
Then the system shall show ""Check the email address below."" and ""Enter a valid email address, such as name@example.com.""
And no message shall be sent (H11)

Sample Data:
Email: deliveryfilfoods.ph"	3. The system shall require both password fields to match and shall change the password only after a successful reset.	
					"C. Choose a new password

Given the staff member opened a valid reset link
When the screen ""Reset password"" is shown
Then it shall show ""Create a new password for your account."", ""New password"", ""Confirm password"" and the buttons ""Reset password"" and ""Cancel"" (H06)

When the two passwords do not match
Then the system shall show ""Passwords do not match. Enter the same password in both fields."" and stay on the form (H12)

When both match and Reset password is selected
Then the system shall show ""Password updated"" and ""Your new password is ready. Sign in again to continue.""
And ""Back to login"" shall return to this role's Log in; the old password shall fail and the new one shall work (H07)"	4. The system shall invalidate a reset link after use or expiry.	
					"D. Expired or used link

Given the reset link has expired or was already used
When the link is opened
Then the system shall show ""Link expired"" and ""This reset link has expired or has already been used.""
And it shall offer ""Request a new link"" (back to H04) and ""Back to login""; no password shall change (H13)"		
						Passed	
						Failed	
						Total	
DEL - 04	Authentication & Account Management	As a Delivery Staff member	continue with my Google work account	so that I can sign in without typing a password.	Given When Then	1. The system shall create a session only when the Google identity matches a staff account that holds the selected role.	
					"A. Authorised Google account

Given the Log in screen is open
When ""Continue with Google"" is selected
Then the system shall show ""Continue with Google"", ""Choose a work account for filfoods Food."", the account ""delivery@filfoods.ph"", ""Use another account"", ""Continue"" and ""Cancel"" (H08)

When an authorised account is continued
Then the system shall open the Delivery Staff Dashboard with the banner ""Logged in successfully""

When Cancel is selected
Then the system shall return to the Log in screen unchanged"	2. The system shall never create a new staff account from a Google sign-in; only the Admin creates staff.	
					"B. Unauthorised Google account

Given Google confirms the identity but the account has no Delivery Staff role
When the account is continued
Then the system shall show ""Account not authorized"" and ""This account is not allowed to access the selected role.""
And it shall add ""No session has been created."" and ""Contact your administrator if you need access.""
And the buttons ""Choose another account"" and ""Back to login"" shall be shown (H09)"	3. The system shall show the Google "G" mark beside the label "Continue with Google".	
						Passed	
						Failed	
						Total	
DEL - 05	Home & Navigation	As a Delivery Staff member	open my notifications from the bell icon	so that I can see new activity for my role in one place.	Given When Then	1. The system shall show notifications only for records the signed-in role is allowed to open.	
					"A. Notifications list

Given the Delivery Staff is on a screen whose header shows the bell icon
When the bell is selected
Then the system shall open ""Notifications"" listing only items allowed for this role, for example ""Order #00350 is pending"" and ""Menu item updated"" followed by ""No more notifications""
And selecting an order notification shall open that order's detail screen for this role; Back returns to the source screen (S01)"	2. The system shall mark an item as read when opened without changing the order or menu data.	
					"B. Empty inbox

Given there are no notifications
When the bell is selected
Then the system shall show ""You’re all caught up."" and ""New updates will appear here."" with a Back button; this is not an error (S02)"	3. The system shall deliver notifications to the Delivery Staff only as set by the Admin (ADM - 21). The Delivery Staff shall not be able to turn them on or off, change which notifications are sent, or delete them (DEL - 07).	
						Passed	
						Failed	
						Total	
DEL - 06	Settings & Profile	As a Delivery Staff member	view and edit my account details in Settings	so that my name and email stay correct.	Given When Then	1. The system shall show the signed-in account's own name and email only.	
					"A. View Settings

Given the Delivery Staff is signed in
When Settings is selected in the bottom navigation
Then the system shall show the title ""Settings"", the avatar initial ""D"", ""Delivery Staff"", ""delivery@filfoods.ph"" and the button ""Edit Profile""
And below it: App Preferences (Language ""English"", Appearance ""Light Mode""); Support: Help & Support, About F.I.L Foods; and a Log out row (added because the source screen has none)"	2. The system shall validate the email format before saving.	
					"B. Edit profile

Given Edit Profile is selected
When the system opens ""Edit Profile"" with the prefilled ""Full name"" and ""Email address"" and the staff member changes the email to a valid value and selects Save changes
Then the system shall show ""Profile updated"" and ""Your changes have been saved."" with the new name and email and a ""Back to Settings"" button (S03, S04)

When the email is typed without ""@""
Then the system shall show ""Enter a valid email address."" and stay in the editor (S05)

When Back or Cancel is selected after changes
Then the system shall ask ""Leave without saving your changes?"" with ""Discard changes"" and ""Keep editing"" (S10)

Sample Data:
Full name: Delivery Staff. Email: admin.updated@filfoods.ph (example)."	3. The system shall not change the role through Edit Profile.	
						Passed	
						Failed	
						Total	
DEL - 07	Settings & Profile	As a Delivery Staff member	set language and appearance	so that the app suits how I work.	Given When Then	1. The system shall apply a preference only after Apply.	
					"A. Language

Given Settings is open
When Language is selected
Then the system shall show a choice screen with ""English"" and ""Filipino"", and ""Apply"" / ""Cancel""; Apply with Filipino shall show the Settings labels in Filipino (S08, S16); Cancel keeps the prior language"	2. The system shall keep each preference per account.	
					"B. Appearance

Given Settings is open
When Appearance is selected
Then the system shall show ""Light Mode"", ""Dark Mode"" and ""Use device setting"" with Apply / Cancel; Dark + Apply applies the dark theme (S09, S11); device setting shows ""Current device theme: Light"" (S17)"	3. The system shall not show the Delivery Staff a Notifications switch. Notifications for this role are controlled by the Admin only (ADM - 21), and the Delivery Staff shall receive the notifications the Admin has turned on for the records the Delivery Staff may open (DEL - 05).	
					"C. No Notifications switch

Given Settings is open for a Delivery Staff member
When the Delivery Staff member views App Preferences
Then the system shall show only Language and Appearance, with no Notifications switch, and notifications shall arrive in the bell inbox only as set by the Admin (ADM - 21)"		
						Passed	
						Failed	
						Total	
DEL - 08	Settings & Profile	As a Delivery Staff member	open Help & Support and About F.I.L Foods	so that I can ask for help and read app information.	Given When Then	1. The system shall not show a ticket number or response-time promise.	
					"A. Send a support message

Given Help & Support is open
When a topic such as ""Account access"" and a message are entered and ""Send message"" is selected
Then the system shall show ""Message sent"", ""Your request has been received."" and ""A reply will be sent to your account email."" with ""Back to Settings"" (S12, S13)

When the message is empty
Then the system shall show ""Please enter a message before sending."" (S14)

Sample Data:
Topic: Account access. Message: I need help with my account."	2. The brand name appears as "F.I.L Foods" in Figma screens and "filfoods Food" in some outcome screens; the final app shall use one name consistently.	
					"B. About

Given About F.I.L Foods is selected
When the screen opens
Then it shall show ""About filfoods Food"", ""Manage. Serve. Nourish."", ""Admin · Kitchen Staff · Dietitian"" and ""filfoods Food © 2026"" with ""Back to Settings"" (S15)"		
						Passed	
						Failed	
						Total	
DEL - 09	Authentication & Account Management	As a Delivery Staff member	log out of the app	so that my account is not exposed on a shared device.	Given When Then	1. The system shall end the session on the server and clear the stored sign-in.	
					"A. Logout A / B

Given Settings is open
When Log out is selected
Then the system shall dim the screen and show a card with a warning symbol, ""Log out of F.I.L Foods?"", ""You're currently logged in as Delivery Staff. You will need to log in again to access your account."" and the note ""Your saved changes will be kept.""
And the buttons ""Stay logged in"" and ""Log out"" shall be shown

When ""Log out"" is selected
Then the system shall end the session and return to the role Log in screen

When ""Stay logged in"" is selected
Then the system shall close the card and keep Settings unchanged"	2. The system shall not delete any saved work when logging out.	
					"B. After logout

Given the session has ended
When the browser or device Back is used
Then the system shall show ""Sign in required"" and ""Your session has ended. Log in again to access this page."" with ""Go to login""; no protected content shall appear (H15)"		
						Passed	
						Failed	
						Total	
DEL - 10	Dashboard	As a Delivery Staff member	see my Dashboard with shortcuts to Orders and Menu	so that I can start my shift quickly.	Given When Then	1. The system shall NOT show Total Orders, Total Sales, Total Customers, Sales Overview or Staff.	
					"A. Dashboard

Given the Delivery Staff has logged in
When the Dashboard loads
Then the header shall show ""Delivery Staff"" and ""Delivery Panel""
And the greeting shall read ""Welcome back, Delivery Staff!"" and ""Here's what you can do today.""
And a ""View Orders"" button and a ""Menu Management"" card with ""View All"" and ""Manage your menu items."" shall be shown
And five items with Edit buttons: Fried Chicken ₱120.00, Pasta Carbonara ₱150.00, Spring Salad ₱100.00, Grilled Salmon ₱200.00, Miso Soup ₱80.00"		
						Passed	
						Failed	
						Total	
DEL - 11	Orders	As a Delivery Staff member	see the orders list with only the food, the customer's first name and the Order ID	so that I can prepare food without seeing private details.	Given When Then	1. The Order ID shall be unique and shown as #00000.	
					"A. Orders list

Given the Delivery Staff selects Orders
When the screen opens
Then ""Orders"" with the search box ""Search orders..."" and filters All, Pending, Preparing, Delivered
And rows show food image, FIRST NAME only, Order ID, date and status: Juan #00350 Oct 29, 2026 • 08:45 PM Pending; Maria #00349 08:30 PM Preparing; Carlos #00348 07:50 PM Delivered; Ana #00347 07:20 PM Cancelled; Mark #00346 06:55 PM Delivered
And rows shall NOT show last name, price, total or address"	2. Status badges: Pending, Preparing, Delivered, Cancelled.	
					"B. Fuzzy search by first name or Order ID

Given Orders is open with the five sample orders listed
When ""Mria"" is typed (a missing letter)
Then only Maria #00349 shall be listed, with the first name only

When ""carols"" is typed (two letters swapped)
Then only Carlos #00348 shall be listed

When ""350"" or ""#00350"" is typed
Then only Juan #00350 shall be listed

When ""Mar"" is typed (a partial name)
Then Maria #00349 and Mark #00346 shall be listed, newest first"	3. The system shall search only the first name and the Order ID shown on the list, and shall never search or reveal the last name, price, total or address.	
					"C. Fuzzy search: limits and combined filters

Given Orders is open with the five sample orders listed
When a last name such as ""Reyes"" or ""Santos"" is typed
Then the system shall show ""No orders found"", ""Try another name or order number."" and ""Clear search"", because last names are not searched for Delivery Staff

When ""00359"" is typed (one wrong digit)
Then the system shall show the same ""No orders found"" message, because Order IDs are never spelling-corrected

When ""Jon"" is typed (too different from any first name)
Then the system shall show the same ""No orders found"" message

When ""Mria"" is typed and Delivered is selected
Then the system shall show ""No orders found"", because Maria #00349 is Preparing

When the search box is cleared
Then the full list shall be restored"	4. The system shall ignore capital letters and extra spaces, match partial first names, and find first names with small typing mistakes (one wrong, missing, extra or swapped letter for names of 3 to 5 letters, up to two for 6 or more). Order IDs shall be matched only exactly or partially. Search shall start from 2 typed characters and work together with the status filter.	
						Passed	
						Failed	
						Total	
DEL - 12	Orders	As a Delivery Staff member	open an order to see its food and the customer's allergies and nutritional preferences	so that I prepare the order safely.	Given When Then	1. Allergies shall be visible before the staff member acts on the order.	
					"A. Order details

Given the Delivery Staff opens #00350
When Order Details loads
Then the card shall show the customer first name, #00350, Oct 29, 2026 • 08:45 PM and the badge Pending
And ""Order Items"": Fried Chicken ×1 and Pasta Carbonara ×1 (no prices shall be shown to this role)
And ""Customer Preferences"": Allergies Peanuts, Shellfish; Dietary Preference Low Sugar; Calories 400 – 600 kcal; Sodium ≤ 2g; Protein ≥ 25g
And no ""Start Preparing"" button; the delivery section (see Delivery stories) shall be shown"	2. The screen shall not show the customer's last name, email or payment details.	
						Passed	
						Failed	
						Total	
DEL - 13	Customers	As a Delivery Staff member	see a customer's allergies and preferred low or high sugar, calories, sodium and protein	so that meals are prepared to the customer's needs.	Given When Then	1. The page is read-only.	
					"A. Customer details

Given the Delivery Staff opens a customer
When Customer Details loads
Then it shall show the initial ""A"", first name and email, Allergies: Peanuts, Dairy and Preferred Nutritional Levels: Sugar Low ≤ 5g; Calories Moderate 400 – 600 kcal; Sodium Low ≤ 2.00 mg; Protein High ≥ 25g
And no order history and no address shall be shown"		
						Passed	
						Failed	
						Total	
DEL - 14	Menu	As a Delivery Staff member	see all menu items and manage them	so that the menu reflects what the kitchen can make.	Given When Then	1. The staff member can add, edit, delete and set availability of menu items.	
					"A. View

Given the Delivery Staff selects Menu
When the screen opens
Then it shall show tabs All, Meals, Desserts, Drinks and six items: Fried Chicken ₱120.00, Pasta Carbonara ₱150.00, Spring Salad ₱100.00, Grilled Salmon ₱200.00, Miso Soup ₱80.00, Fruit Bowl ₱70.00"	2. The staff member cannot open Staff or sales information.	
					"B. Manage

Given a menu item is selected or Edit is selected on the Dashboard
When the price or availability is changed and saved
Then the system shall show ""Edit Menu Item"" with name, price and availability, then ""Menu item updated"" and ""Your permitted changes were saved."" (K05, K08)

When an item is added or deleted
Then the same confirmations as Admin shall be used: ""Save menu changes?"" and ""Delete <item>?"" with ""No, keep it"" / ""Yes, delete"""		
						Passed	
						Failed	
						Total	
DEL - 15	Delivery	As a Delivery Staff member	see the delivery address information of an order	so that I know where and to whom to deliver.	Given When Then	1. Only Delivery Staff and Admin can see the delivery address.	
					"A. Address

Given the staff member opens an order that is Ready for pickup
When Order Details loads
Then a ""Delivery Address"" card shall show the customer's first name, contact number, full address and delivery notes
And this card is shown to Delivery Staff only

Sample Data:
Name: Juan. Address: sample address. Contact: sample number."	2. Kitchen and Dietitian shall never receive the address.	
						Passed	
						Failed	
						Total	
DEL - 16	Delivery	As a Delivery Staff member	see a map of the delivery location	so that I can find the customer.	Given When Then	1. The map uses the Primary Green for the route and the pin.	
					"A. Map

Given an order has a delivery address
When the map is shown
Then it shall show a pin at the delivery location and the staff member's position
And an ""Open in Maps"" button shall start navigation

When the location is unavailable
Then the system shall show ""Location not available"" and still show the address text"	2. The map shall load only for the open order.	
						Passed	
						Failed	
						Total	
DEL - 17	Delivery	As a Delivery Staff member	update a delivery order from Out for Delivery to Completed	so that the user and Admin can confirm that the meal has been delivered.	Given When Then	1. Delivery Staff shall only access orders assigned for delivery.	
					"A. Start the delivery

Given an order is Ready for Pickup and assigned to a Delivery Staff member
When the staff member collects the order and starts the delivery
Then the status shall change to Out for Delivery."	2. The system shall record the Out for Delivery and Completed status with date and time.	
					"B. Hand over the meal

Given an order is Out for Delivery
When the meal is handed to the recipient
Then the staff member shall mark the order Completed."	3. The updated status shall be visible to the user and Admin.	
						Passed	
						Failed	
						Total
