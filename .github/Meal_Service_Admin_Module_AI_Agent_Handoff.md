# Admin Module Requirements - ADM-01 through ADM-21

**Source:** Updated spreadsheet export (Nov 2026). Canonical text: [`docs/specs/canonical/admin-module.export.md`](../docs/specs/canonical/admin-module.export.md). PDF (may lag): [`docs/specs/FIL_Foods_Admin_Module.pdf`](../docs/specs/FIL_Foods_Admin_Module.pdf). Story index: [`docs/specs/admin-module.md`](../docs/specs/admin-module.md). Cross-module: [`docs/specs/meal-service-modules.md`](../docs/specs/meal-service-modules.md).
**Authority:** Requirements and acceptance criteria below must be followed as written; record cross-module conflicts instead of inventing staff behavior.

## Implementation instructions

- Preserve every story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to code and tests in the appropriate traceability doc before marking complete.
- Spreadsheet Passed / Failed / Total rows are QA status only, not product features.

## Canonical specification (verbatim export)

Admin Module							
Precondition: The Admin has an account, is logged in to the F.I.L. Foods staff app, and the menu, meal prices, plans, staff accounts and customer orders are available in the system.							
Postcondition: Approved menu, pricing, plan, staff and order changes are saved, the affected roles see the updates, and important actions are recorded in the audit log.							
No.	Epic (System Component)	Persona (User)	I want to (action)	So that (benefit or value)	Scenarios (Given / When / Then)	Acceptance Criteria (System Requirement)	Remarks
ADM - 01	Authentication & Account Management	As an Admin	choose my role on the Select Your Role screen	so that I reach the sign-in that belongs to my job.	Given When Then	1. The system shall show only the role cards listed for this entry screen.	
					"A. Pick the role

Given the app has just opened and the Select Your Role screen shows the title ""Select Your Role"" and ""Choose your role to continue""
When the screen is displayed
Then it shall show four cards: ADMIN (""Managing staffs, menu, plans, meal options, etc""), Dietitian (""Manage nutrition plans and meal options""), Kitchen Staff (""Prepare and manage food orders"") and Delivery Staff (""Handle deliveries and track orders""), each with an icon and an arrow button

When the Admin card is selected
Then the system shall open the Admin Log in screen (label ""Admin Panel"")"	2. The system shall highlight the selected card with the light-green fill and Primary Green border.	
					"B. Back

Given a role Log in screen is open
When the back arrow is selected
Then the system shall return to Select Your Role without losing the chosen role card highlight"		
						Passed	
						Failed	
						Total	
ADM - 02	Authentication & Account Management	As an Admin	log in with my work email and password	so that only authorised Admin staff can open the Admin Panel and its information.	Given When Then	1. The system shall show the Log in screen with: email field (mail icon, placeholder "Email Address"), password field (lock icon, eye icon), the "Remember me" tick box, the "Forgot password?" link, a primary "Log In" button, an "or" divider and a "Continue with Google" button.	
					"A. Valid credentials

Given the Admin is on the Admin Panel Log in screen showing the F.I.L Foods logo, the title ""F.I.L Foods"", the label ""Admin Panel"", the tagline and the footer ""F.I.L Foods © 2026""
When the staff member enters admin@filfoods.ph and the correct password and selects Log In
Then the system shall open the Admin Dashboard
And a green banner shall show ""Logged in successfully"" at the top of the Dashboard content
And the bottom navigation shall show only: Dashboard, Orders, Menu, Staff and Settings, with Dashboard marked active

Sample Data:
Email: admin@filfoods.ph. Password: ••••••••••."	2. The system shall validate that the email contains "@" and that both fields are filled before checking credentials.	
					"B. Wrong email format

Given the Log in screen is open
When the email is typed as adminfilfoods.ph (no @) and Log In is selected
Then the system shall keep the staff member on the Log in screen
And the email field shall get a red border and show ""Invalid email. Add an @ before filfoods.ph and try again.""
And the password dots and the Remember me tick shall stay as entered

Sample Data:
Email: adminfilfoods.ph. Password: ••••••••••."	3. The system shall display the exact messages: "Invalid email. Add an @ before filfoods.ph and try again.", "Incorrect password. Try again or tap Forgot password?", "Email and password are required." and "Could not connect".	
					"C. Wrong password

Given the Log in screen is open
When admin@filfoods.ph is entered with a wrong password and Log In is selected
Then the system shall show ""Incorrect password. Try again or tap Forgot password?"" under the password field, with the field outlined in red
And no session shall be created

Sample Data:
Email: admin@filfoods.ph. Password: wrong value."	4. The system shall open the Dashboard of the signed-in role only and show the "Logged in successfully" banner once.	
					"D. Blank fields

Given the Log in screen is open with empty inputs (placeholders ""Email Address"" and ""Password"")
When Log In is selected with both inputs empty
Then the system shall stay on Log in and show the heading ""Please check your details""
And the inputs shall show the prompts ""Enter your email"" and ""Enter your password""
And the message ""Email and password are required."" shall be shown (outcome H03)"	5. The system shall show the role label "Admin Panel" and not any other role's label on this screen (Figma Dietitian Log in currently reads "Admin Panel" and must read "Dietitian").	
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
And the entered details shall be kept, no success message shall appear, and the buttons ""Try again"" and ""Go back"" shall be offered (outcome H10)"	7. The system shall restrict Admin accounts to the features listed in this module.	
						Passed	
						Failed	
						Total	
ADM - 03	Authentication & Account Management	As an Admin	recover my password through my account email	so that I can regain access without asking the Admin to do it for me.	Given When Then	1. The system shall send a reset link only to an existing account but shall always show the neutral wording "If an account exists for this email…".	
					"A. Request a reset link

Given the Log in screen is open
When ""Forgot password?"" is selected
Then the system shall open ""Forgot password?"" with the text ""Enter your account email to receive a reset link."", an ""Email Address"" field, ""Send reset link"" and ""Back to login"" (H04)

When admin@filfoods.ph is submitted
Then the system shall show ""Check your email"" and ""If an account exists for this email, a reset link is on its way.""
And the screen shall show ""Email: admin@filfoods.ph"", ""Check your inbox and spam folder."", ""Resend link"" and ""Back to login"" (H05)

Sample Data:
Email: admin@filfoods.ph"	2. The system shall reject malformed or blank emails with the messages in the scenarios and send nothing.	
					"B. Invalid email

Given the recovery form is open
When adminfilfoods.ph is submitted
Then the system shall show ""Check the email address below."" and ""Enter a valid email address, such as name@example.com.""
And no message shall be sent (H11)

Sample Data:
Email: adminfilfoods.ph"	3. The system shall require both password fields to match and shall change the password only after a successful reset.	
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
ADM - 04	Authentication & Account Management	As an Admin	continue with my Google work account	so that I can sign in without typing a password.	Given When Then	1. The system shall create a session only when the Google identity matches a staff account that holds the selected role.	
					"A. Authorised Google account

Given the Log in screen is open
When ""Continue with Google"" is selected
Then the system shall show ""Continue with Google"", ""Choose a work account for filfoods Food."", the account ""admin@filfoods.ph"", ""Use another account"", ""Continue"" and ""Cancel"" (H08)

When an authorised account is continued
Then the system shall open the Admin Dashboard with the banner ""Logged in successfully""

When Cancel is selected
Then the system shall return to the Log in screen unchanged"	2. The system shall never create a new staff account from a Google sign-in; only the Admin creates staff.	
					"B. Unauthorised Google account

Given Google confirms the identity but the account has no Admin role
When the account is continued
Then the system shall show ""Account not authorized"" and ""This account is not allowed to access the selected role.""
And it shall add ""No session has been created."" and ""Contact your administrator if you need access.""
And the buttons ""Choose another account"" and ""Back to login"" shall be shown (H09)"	3. The system shall show the Google "G" mark beside the label "Continue with Google".	
						Passed	
						Failed	
						Total	
ADM - 05	Home & Navigation	As an Admin	open my notifications from the bell icon	so that I can see new activity for my role in one place.	Given When Then	1. The system shall show notifications only for records the signed-in role is allowed to open.	
					"A. Notifications list

Given the Admin is on a screen whose header shows the bell icon
When the bell is selected
Then the system shall open ""Notifications"" listing only items allowed for this role, for example ""Order #00350 is pending"" and ""Menu item updated"" followed by ""No more notifications""
And selecting an order notification shall open that order's detail screen for this role; Back returns to the source screen (S01)"	2. The system shall mark an item as read when opened without changing the order or menu data.	
					"B. Empty inbox

Given there are no notifications
When the bell is selected
Then the system shall show ""You’re all caught up."" and ""New updates will appear here."" with a Back button; this is not an error (S02)"		
						Passed	
						Failed	
						Total	
ADM - 06	Settings & Profile	As an Admin	view and edit my account details in Settings	so that my name and email stay correct.	Given When Then	1. The system shall show the signed-in account's own name and email only.	
					"A. View Settings

Given the Admin is signed in
When Settings is selected in the bottom navigation
Then the system shall show the title ""Settings"", the avatar initial ""A"", ""Admin Account"", ""admin@filfoods.ph"" and the button ""Edit Profile""
And below it: App Preferences (Language ""English"", Appearance ""Light Mode""); System: About F.I.L Foods, Help & Support, Log Out"	2. The system shall validate the email format before saving.	
					"B. Edit profile

Given Edit Profile is selected
When the system opens ""Edit Profile"" with the prefilled ""Full name"" and ""Email address"" and the staff member changes the email to a valid value and selects Save changes
Then the system shall show ""Profile updated"" and ""Your changes have been saved."" with the new name and email and a ""Back to Settings"" button (S03, S04)

When the email is typed without ""@""
Then the system shall show ""Enter a valid email address."" and stay in the editor (S05)

When Back or Cancel is selected after changes
Then the system shall ask ""Leave without saving your changes?"" with ""Discard changes"" and ""Keep editing"" (S10)

Sample Data:
Full name: Admin Account. Email: admin.updated@filfoods.ph (example)."	3. The system shall not change the role through Edit Profile.	
						Passed	
						Failed	
						Total	
ADM - 07	Settings & Profile	As an Admin	set language and appearance	so that the app suits how I work.	Given When Then	1. The system shall apply a preference only after Apply.	
					"A. Language

Given Settings is open
When Language is selected
Then the system shall show a choice screen with ""English"" and ""Filipino"", and ""Apply"" / ""Cancel""; Apply with Filipino shall show the Settings labels in Filipino (S08, S16); Cancel keeps the prior language"	2. The system shall keep each preference per account.	
					"B. Appearance

Given Settings is open
When Appearance is selected
Then the system shall show ""Light Mode"", ""Dark Mode"" and ""Use device setting"" with Apply / Cancel; Dark + Apply applies the dark theme (S09, S11); device setting shows ""Current device theme: Light"" (S17)"	3. The system shall not show the Admin a Notifications switch. The Admin shall always receive notifications for the records the Admin may open (ADM - 05).	
					"C. No Notifications switch

Given Settings is open as an Admin
When the Admin views App Preferences
Then the system shall show only Language and Appearance, with no Notifications switch, and new items shall keep arriving in the bell inbox (ADM - 05)"		
						Passed	
						Failed	
						Total	
ADM - 08	Settings & Profile	As an Admin	open Help & Support and About F.I.L Foods	so that I can ask for help and read app information.	Given When Then	1. The system shall not show a ticket number or response-time promise.	
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
ADM - 09	Authentication & Account Management	As an Admin	log out of the app	so that my account is not exposed on a shared device.	Given When Then	1. The system shall end the session on the server and clear the stored sign-in.	
					"A. Logout A / B

Given Settings is open
When Log out is selected
Then the system shall dim the screen and show a card with a warning symbol, ""Log out of F.I.L Foods?"", ""You're currently logged in as Admin. You will need to log in again to access your account."" and the note ""Your saved changes will be kept.""
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
ADM - 10	Dashboard	As an Admin	see totals for orders, sales, customers and menu items on my Dashboard	so that I can understand how the business is doing today.	Given When Then	1. The system shall show the four metrics and Sales Overview to the Admin only.	
					"A. Open the Dashboard

Given the Admin has logged in successfully
When the Dashboard loads
Then the header shall show the F.I.L Foods mark, ""F.I.L Foods"", ""Admin Panel"", the bell and the avatar ""A""
And the greeting shall read ""Welcome back, Admin!"" and ""Here's what's happening today.""
And four metric cards shall show: Total Orders 124 (↑ +12%), Total Sales ₱8,750.00 (↑ +15%), Total Customers 892 (↑ +8%) and Menu Items 24 (↑ +2%)

Sample Data:
Orders 124 / Sales ₱8,750.00 / Customers 892 / Menu items 24."	2. Metric values shall be calculated from stored orders, customers and menu items, not typed in.	
					"B. Recent Orders

Given the Dashboard is open
When the Recent Orders card is displayed
Then it shall list #00350 Juan Dela Cruz Pending Oct 29, 2026 08:45 PM; #00349 Maria Santos Preparing 08:30 PM; #00348 Carlos Reyes Delivered 07:50 PM, each with a food image and status badge
And ""View all"" shall open Admin Orders; selecting a row shall open that order's detail (A09)"	3. The percentage arrows shall be green when positive.	
					"C. Sales Overview

Given the Dashboard is open
When the Sales Overview card is displayed
Then it shall show a line-and-area chart for ""This Week"" with x labels Week 1–Week 4 and y scale 0, 2k, 4k, 6k, 8k
And the period filter ""This Week"" shall open the choice ""This Week"" / ""This Month"" with Apply and Cancel (A10)
And Month + Apply shall show ""This Month"", ""Period selection applied"" and ""Monthly data is not supplied."" (A11)"		
						Passed	
						Failed	
						Total	
ADM - 11	Orders	As an Admin	view, search and filter all customer orders and open any order	so that I can monitor every order in the business.	Given When Then	1. The system shall show every order to the Admin including full customer name and price.	
					"A. Order list

Given the Admin selects Orders in the bottom navigation
When the screen opens
Then the title ""Orders"" and a basket icon shall be shown with the search box ""Search orders..."" and filters All, Pending, Preparing, Delivered
And each card shall show food image, order number, FULL customer name, date and time, status badge and price: #00350 Juan Dela Cruz Pending ₱120.00 08:45 PM; #00349 Maria Santos Preparing ₱99.00 08:30 PM; #00348 Carlos Reyes Delivered ₱180.00 07:50 PM; #00347 Ana Garcia Cancelled ₱85.00 07:20 PM; #00346 Mark Villanueva Delivered ₱140.00 06:55 PM (all Oct 29, 2026)"	2. The system shall keep the chosen search and filter when Back is used.	
					"B. Search and filter

Given Orders is open
When ""Maria"" is typed
Then only #00349 Maria Santos shall be listed (O01)

When ""xyz-no-match"" is typed
Then the system shall show ""No orders found"", ""Try another name or order number."" and ""Clear search"" (O02)

When Pending / Preparing / Delivered is selected
Then only orders with that status shall be listed (O04 / O05 / O06); All restores the full list (O03)"	3. Status badges use the palette: Pending #FFDDBF, Preparing #D8F3DC, Delivered #1C773A, Cancelled #D76566.	
					"C. Order detail

Given an order card is selected
When #00350 is opened
Then ""Order Details"" shall show ""#00350 · Juan Dela Cruz"", Pending, ""Oct 29, 2026 · 08:45 PM"", ""Recorded total ₱120.00"" and ""Back to Orders"" (A09)

When #00348 or #00347 is opened
Then the detail shall be read-only: Delivered ""Total ₱180.00"" with ""No further kitchen action."" (O07) or Cancelled ""Recorded amount ₱85.00"" (O08)

When the basket icon is selected
Then the system shall show ""Order Summary"", ""No order selected"", ""No checkout or payment started."" (O09)"	4. The system shall search the customer name and the order number as the Admin types, ignoring capital letters, extra spaces and accents, and shall also find names with small typing mistakes: one wrong, missing, extra or swapped letter for words of 3 to 5 letters, and up to two for words of 6 or more letters.	
					"D. Fuzzy search: typing mistakes and partial names

Given Orders is open with the five sample orders listed
When ""Mria"" is typed (a missing letter)
Then #00349 Maria Santos shall be listed

When ""carols"" is typed (two letters swapped)
Then #00348 Carlos Reyes shall be listed

When ""Villanueba"" is typed (one wrong letter)
Then #00346 Mark Villanueva shall be listed

When ""Garcia Ana"" is typed (words in a different order)
Then #00347 Ana Garcia shall be listed

When ""Mar"" is typed (a partial name)
Then #00349 Maria Santos and #00346 Mark Villanueva shall be listed, newest first"	5. The system shall also match partial names, match several typed words in any order (every word must match), and list exact and partial matches before spelling-corrected matches; matches of the same kind are listed newest first.	
					"E. Fuzzy search: limits and combined filters

Given Orders is open with the five sample orders listed
When ""350"" or ""#00350"" is typed
Then only #00350 Juan Dela Cruz shall be listed

When ""00359"" is typed (one wrong digit)
Then the system shall show ""No orders found"", ""Try another name or order number."" and ""Clear search"", because order numbers are never spelling-corrected

When ""Jon"" is typed (too different from any name)
Then the system shall show the same ""No orders found"" message

When ""Mria"" is typed and Delivered is selected
Then the system shall show ""No orders found"", because Maria Santos is Preparing

When the search box is cleared
Then the full list shall be restored"	6. The system shall match order numbers only exactly or partially, never by spelling correction. Search shall start from 2 typed characters, work together with the status filter, and show "No orders found" when nothing is close enough.	
						Passed	
						Failed	
						Total	
ADM - 12	Orders	As an Admin	update an order's status and assign it to a delivery staff member	so that kitchen and delivery work stays in step and I can fix mistakes.	Given When Then	1. The system shall allow the Admin to move an order to any valid status.	
					"A. Change status

Given an order is open in Admin detail
When the Admin selects a new status and confirms
Then the system shall save the new status, update the badge colour and notify the kitchen / delivery roles
And the change shall be recorded with the Admin's name and time"	2. The system shall list only Delivery-role staff in the assignment picker.	
					"B. Assign delivery

Given an order is Ready for pickup
When a Delivery Staff member such as Mark Peralta is chosen
Then the system shall show that member's name on the order and add it to their Orders list

Sample Data:
Delivery staff: Ana Reyes, Mark Peralta."		
						Passed	
						Failed	
						Total	
ADM - 13	Staff Management	As an Admin	view and filter all staff accounts	so that I can see who works in each role.	Given When Then	1. The system shall show Staff Management to the Admin only.	
					"A. Staff list

Given the Admin selects Staff
When the screen opens
Then the title ""Staff Management"" with a plus icon shall be shown with filters All, Dietitians, Kitchen Staff, Delivery
And each card shall show a photo, name, role badge, online dot and email: Dr. Maria Santos – Dietitian – maria.santos@filfoods.ph; Chef Juan Dela Cruz – Kitchen Staff – juan.delacruz@filfoods.ph; Ana Reyes – Delivery Staff – ana.reyes@filfoods.ph; Mark Peralta – Delivery Staff – mark.peralta@filfoods.ph
And every card shall have a pencil (edit) and a trash (delete) icon

When a filter is selected
Then only that role shall be listed (A01–A04)"	2. The system shall never list customers in Staff Management.	
						Passed	
						Failed	
						Total	
ADM - 14	Staff Management	As an Admin	add a new staff member	so that new dietitians, kitchen and delivery staff can use the app.	Given When Then	1. The system shall require full name, email and role.	
					"A. Create staff

Given the Admin selects the plus icon
When ""Add Staff"" opens and Full name, Email and Role are entered and ""Create staff"" is selected
Then the system shall show ""Staff added successfully"" with the new name, email and role and ""View all staff"" (A06)
And the list shall include the new member

Sample Data:
Jamie Rivera / jamie.rivera@filfoods.ph / Kitchen Staff. Roles: Dietitian, Kitchen Staff, Delivery Staff."	2. The system shall allow only the roles Dietitian, Kitchen Staff and Delivery Staff.	
					"B. Duplicate email

Given Add Staff is open
When ana.reyes@filfoods.ph is entered
Then the system shall show ""Email is already used by another staff account."" and not create the account (A07)"	3. The system shall send the new staff member a way to set a password.	
						Passed	
						Failed	
						Total	
ADM - 15	Staff Management	As an Admin	edit a staff member and confirm before saving	so that corrections are intentional.	Given When Then	1. The system shall change nothing until "Save changes" is selected.	
					"A. Edit confirmation

Given the Admin selects the pencil on Ana Reyes
When the email is changed to ana.reyes.delivery@filfoods.ph and Save is selected
Then the system shall dim the list and show ""Save staff changes?"", ""Save the updated email for Ana Reyes? Her role will remain Delivery Staff.""
And a yellow summary shall read ""Email address ana.reyes@filfoods.ph → ana.reyes.delivery@filfoods.ph""
And buttons ""Save changes"" and ""Keep editing"" shall be shown

When Save changes is selected
Then the list shall show a green banner ""Staff updated successfully"" and ""Ana Reyes’s email has been updated."" and the new email on her card

When Keep editing is selected
Then the form shall stay open with the draft unchanged

Sample Data:
Ana Reyes: ana.reyes@filfoods.ph → ana.reyes.delivery@filfoods.ph."	2. The confirmation shall name the staff member and the exact change.	
						Passed	
						Failed	
						Total	
ADM - 16	Staff Management	As an Admin	delete a staff member after a clear warning	so that people who left cannot sign in.	Given When Then	1. The system shall disable the deleted account's sign-in immediately.	
					"A. Delete A / B

Given the Admin selects the trash icon on Ana Reyes
When the icon is selected
Then the system shall show ""Delete Ana Reyes?"", ""Are you sure you want to remove Ana Reyes from your staff? Her staff account and app access will be removed.""
And a red line shall read ""Warning: this action cannot be undone."" with ""No, keep staff"" and ""Yes, delete""

When ""Yes, delete"" is selected
Then the list shall show ""Staff deleted successfully"" and ""Ana Reyes was removed from your staff."" and Ana's card shall be gone

When ""No, keep staff"" is selected
Then the list shall stay unchanged"	2. The system shall not allow an Admin to delete their own account.	
						Passed	
						Failed	
						Total	
ADM - 17	Menu Management	As an Admin	view the menu, meal categories, prices and availability	so that I can keep the available breakfast, lunch and dinner choices accurate.	Given When Then	1. The Admin shall be able to view meal categories, ingredients, allergens, prices and availability.	
					"A. View the menu

Given I open Menu Management
When the menu loads
Then I shall see Breakfast pastries and breads, and Lunch and Dinner options grouped into meat and vegetable choices, including available Filipino dishes.
The standard meal price shall be ₱300. The weekly, monthly and yearly plans shall be ₱4,999, ₱27,899 and ₱327,999 respectively."	2. The system shall support the standard ₱300 meal price and the three stated plan prices.	
						3. Only available menu items shall be offered for ordering.	
						Passed	
						Failed	
						Total	
ADM - 18	Menu Management	As an Admin	add, edit, delete and set availability of menu items	so that the menu stays correct.	Given When Then	1. The system shall require name, category, price greater than 0 and availability.	
					"A. Add

Given the Admin selects Add Menu Item
When Item name, Category, Price and Availability are entered and ""Add item"" is selected
Then the system shall show ""Menu item added successfully"" with the item, category and price (M05, M06)

When the price is 0.00
Then the system shall show ""Enter a numeric price greater than ₱0.00."" (M07)

Sample Data:
Vegetable Wrap / Meals / 110.00 / Available."	2. The system shall change nothing until the confirmation is accepted.	
					"B. Edit confirmation

Given the Admin selects the pencil on Fried Chicken
When the price is changed to 130.00 and saved
Then the system shall show ""Save menu changes?"", ""Save your changes to Fried Chicken? The updated price will appear on the menu.""
And summary ""Fried Chicken Price: ₱120.00 → ₱130.00""; buttons ""Save changes"" and ""Keep editing""
And after saving: ""Menu item updated successfully"" and ""Fried Chicken is now ₱130.00."""	3. Currency shall be shown as ₱ with two decimals.	
					"C. Delete

Given the Admin selects the trash icon on Fried Chicken
When the icon is selected
Then the system shall show ""Delete Fried Chicken?"", ""Are you sure you want to delete Fried Chicken from the menu? This action cannot be undone.""
And red line ""Warning: this item will no longer be available for new orders."" and ""No, keep it"" / ""Yes, delete""

When ""Yes, delete"" is selected
Then ""Menu item deleted successfully"" and ""Fried Chicken was removed from the menu."" shall appear"		
					"D. Availability

Given a menu item is open
When Unavailable is saved
Then the badge shall change and the item shall show ""Not selectable for new orders."" and ""Existing orders unchanged."" (M10)"		
						Passed	
						Failed	
						Total	
ADM - 19	Customers	As an Admin	view the customer list and each customer's allergies and nutritional preferences	so that I have the same information as the dietitian and can answer questions about the 892 customers.	Given When Then	1. The system shall show allergies and nutritional preferences to the Admin.	
					"A. Customer details

Given the Admin opens a customer such as Ana Garcia
When Customer Details opens
Then it shall show ""Ana Garcia"", anagarcia@gmail.com, Allergies: Peanuts, Dairy, and Preferred Nutritional Levels: Sugar Low ≤ 5g; Calories Moderate 400 – 600 kcal; Sodium Low (≤ 400 mg on the Dietitian screens, ≤ 2.00 mg on the Kitchen customer screen, ≤ 2g on the Kitchen order screen: unresolved source conflict); Protein High ≥ 25g
And Order History shall list Spring Salad, Oct 29, 2026 • 07:20 PM, Delivered, ₱100.00"	2. The system shall keep customer health data read-only for the Admin unless a customer-edit story is added.	
						Passed	
						Failed	
						Total	
ADM - 20	Security & Auditability	As an Admin	see an audit log of staff, menu and order changes	so that every important action has a name and time.	Given When Then	1. The system shall write an audit entry for every create, edit and delete, and for every Dietitian decision on a health-condition removal request (DIT - 17).	
					"A. Audit entry

Given an Admin deletes Ana Reyes
When the deletion is confirmed
Then the system shall record the Admin account, action, target and time"	2. Audit entries shall not be editable.	
						Passed	
						Failed	
						Total	
ADM - 21	Settings & Profile	As an Admin	control which notifications Kitchen Staff and Delivery Staff receive	so that kitchen and delivery staff see only the notifications I decide they need, and only I can change them.	Given When Then	1. The system shall allow only the Admin to turn notifications on or off for Kitchen Staff and Delivery Staff, and to choose which order and menu notifications each of these roles receives.	
					"A. Turn notifications on or off for a role

Given the Admin is signed in and Settings is open
When the Admin opens the ""Staff Notifications"" row (shown separately from App Preferences) and turns the Kitchen Staff switch OFF
Then the system shall ask ""Turn off notifications for Kitchen Staff?"" with ""Turn off"" and ""Keep on""

When the Admin selects ""Turn off""
Then the system shall show ""Notification settings saved."" and new items shall stop arriving in the Kitchen Staff bell inbox

When the Admin turns the switch ON again
Then new items shall arrive again

Sample Data:
Role: Kitchen Staff. Switch: ON to OFF to ON."	2. The system shall not show Kitchen Staff or Delivery Staff any control to turn their notifications on or off, change which notifications they receive, or delete them (KIT - 07, DEL - 07), and shall deny such a request even if it is sent directly.	
					"B. Choose which notifications a role receives

Given the Admin has opened Staff Notifications for a role
When the Admin turns individual notification types ON or OFF and selects Save
Then the system shall show ""Notification settings saved."" and send that role only the types that are ON

When the Admin turns every type OFF for a role
Then the system shall treat it as notifications OFF for that role

Sample Data:
Kitchen Staff: New order ON, Menu item updated ON.
Delivery Staff: Order ready for pickup ON, Menu item updated OFF."	3. The system shall display "Notification settings saved." after a change is saved.	
					"C. Staff cannot change their notifications

Given a Kitchen Staff or Delivery Staff member is signed in
When the staff member opens Settings
Then the system shall show only Language and Appearance under App Preferences and no Notifications switch

When a request to change a notification setting is sent by the staff member
Then the system shall deny it and leave the Admin's setting unchanged

Sample Data:
Staff: kitchen@filfoods.ph, delivery@filfoods.ph."	4. The system shall apply a change from the next notification onward and keep notifications already received viewable.	
					"D. Change is logged

Given the Admin has changed a notification setting
When the change is saved
Then the system shall record it in the audit log (ADM - 20) under the Admin account with the role, the setting, the old and new value, and the date and time"	5. The system shall log every notification setting change under the Admin account.	
						Passed	
						Failed	
						Total
