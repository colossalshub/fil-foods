Dietitian Module							
Precondition: The Dietitian has a staff account created by the Admin and is logged in. User profiles, allergies, health conditions, doctor-provided restrictions, menu items and submitted orders are available.							
Postcondition: The Dietitian has reviewed the user’s dietary information and submitted meal selections, and has approved or returned orders for correction before payment. Health information changes are recorded.							
No.	Epic (System Component)	Persona (User)	I want to (action)	So that (benefit or value)	Scenarios (Given / When / Then)	Acceptance Criteria (System Requirement)	Remarks
DIT - 01	Authentication & Account Management	As a Dietitian	choose my role on the Select Your Role screen	so that I reach the sign-in that belongs to my job.	Given When Then	1. The system shall show only the role cards listed for this entry screen.	
					"A. Pick the role

Given the app has just opened and the Select Your Role screen shows the title ""Select Your Role"" and ""Choose your role to continue""
When the screen is displayed
Then it shall show two cards: Dietitian (""Manage nutrition plans and meal options"") and View Orders (""Track customer orders""), each with an icon and an arrow button

When the Dietitian card is selected
Then the system shall open the Dietitian Log in screen; View Orders also opens Dietitian login and then Orders"	2. The system shall highlight the selected card with the light-green fill and Primary Green border.	
					"B. Back

Given a role Log in screen is open
When the back arrow is selected
Then the system shall return to Select Your Role without losing the chosen role card highlight"		
						Passed	
						Failed	
						Total	
DIT - 02	Authentication & Account Management	As a Dietitian	log in with my work email and password	so that only authorised Dietitian staff can open the Dietitian and its information.	Given When Then	1. The system shall show the Log in screen with: email field (mail icon, placeholder "Email Address"), password field (lock icon, eye icon), the "Remember me" tick box, the "Forgot password?" link, a primary "Log In" button, an "or" divider and a "Continue with Google" button.	
					"A. Valid credentials

Given the Dietitian is on the Dietitian Log in screen showing the F.I.L Foods logo, the title ""F.I.L Foods"", the label ""Dietitian"", the tagline and the footer ""F.I.L Foods © 2026""
When the staff member enters dietitian@filfoods.ph and the correct password and selects Log In
Then the system shall open the Dietitian Dashboard
And a green banner shall show ""Logged in successfully"" at the top of the Dashboard content
And the bottom navigation shall show only: Dashboard, Orders, Menu and Settings, with Dashboard marked active

Sample Data:
Email: dietitian@filfoods.ph. Password: ••••••••••."	2. The system shall validate that the email contains "@" and that both fields are filled before checking credentials.	
					"B. Wrong email format

Given the Log in screen is open
When the email is typed as dietitianfilfoods.ph (no @) and Log In is selected
Then the system shall keep the staff member on the Log in screen
And the email field shall get a red border and show ""Invalid email. Add an @ before filfoods.ph and try again.""
And the password dots and the Remember me tick shall stay as entered

Sample Data:
Email: dietitianfilfoods.ph. Password: ••••••••••."	3. The system shall display the exact messages: "Invalid email. Add an @ before filfoods.ph and try again.", "Incorrect password. Try again or tap Forgot password?", "Email and password are required." and "Could not connect".	
					"C. Wrong password

Given the Log in screen is open
When dietitian@filfoods.ph is entered with a wrong password and Log In is selected
Then the system shall show ""Incorrect password. Try again or tap Forgot password?"" under the password field, with the field outlined in red
And no session shall be created

Sample Data:
Email: dietitian@filfoods.ph. Password: wrong value."	4. The system shall open the Dashboard of the signed-in role only and show the "Logged in successfully" banner once.	
					"D. Blank fields

Given the Log in screen is open with empty inputs (placeholders ""Email Address"" and ""Password"")
When Log In is selected with both inputs empty
Then the system shall stay on Log in and show the heading ""Please check your details""
And the inputs shall show the prompts ""Enter your email"" and ""Enter your password""
And the message ""Email and password are required."" shall be shown (outcome H03)"	5. The system shall show the role label "Dietitian" and not any other role's label on this screen (Figma Dietitian Log in currently reads "Admin Panel" and must read "Dietitian").	
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
And the entered details shall be kept, no success message shall appear, and the buttons ""Try again"" and ""Go back"" shall be offered (outcome H10)"	7. The system shall restrict Dietitian accounts to the features listed in this module.	
						Passed	
						Failed	
						Total	
DIT - 03	Authentication & Account Management	As a Dietitian	recover my password through my account email	so that I can regain access without asking the Admin to do it for me.	Given When Then	1. The system shall send a reset link only to an existing account but shall always show the neutral wording "If an account exists for this email…".	
					"A. Request a reset link

Given the Log in screen is open
When ""Forgot password?"" is selected
Then the system shall open ""Forgot password?"" with the text ""Enter your account email to receive a reset link."", an ""Email Address"" field, ""Send reset link"" and ""Back to login"" (H04)

When dietitian@filfoods.ph is submitted
Then the system shall show ""Check your email"" and ""If an account exists for this email, a reset link is on its way.""
And the screen shall show ""Email: dietitian@filfoods.ph"", ""Check your inbox and spam folder."", ""Resend link"" and ""Back to login"" (H05)

Sample Data:
Email: dietitian@filfoods.ph"	2. The system shall reject malformed or blank emails with the messages in the scenarios and send nothing.	
					"B. Invalid email

Given the recovery form is open
When dietitianfilfoods.ph is submitted
Then the system shall show ""Check the email address below."" and ""Enter a valid email address, such as name@example.com.""
And no message shall be sent (H11)

Sample Data:
Email: dietitianfilfoods.ph"	3. The system shall require both password fields to match and shall change the password only after a successful reset.	
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
DIT - 04	Authentication & Account Management	As a Dietitian	continue with my Google work account	so that I can sign in without typing a password.	Given When Then	1. The system shall create a session only when the Google identity matches a staff account that holds the selected role.	
					"A. Authorised Google account

Given the Log in screen is open
When ""Continue with Google"" is selected
Then the system shall show ""Continue with Google"", ""Choose a work account for filfoods Food."", the account ""dietitian@filfoods.ph"", ""Use another account"", ""Continue"" and ""Cancel"" (H08)

When an authorised account is continued
Then the system shall open the Dietitian Dashboard with the banner ""Logged in successfully""

When Cancel is selected
Then the system shall return to the Log in screen unchanged"	2. The system shall never create a new staff account from a Google sign-in; only the Admin creates staff.	
					"B. Unauthorised Google account

Given Google confirms the identity but the account has no Dietitian role
When the account is continued
Then the system shall show ""Account not authorized"" and ""This account is not allowed to access the selected role.""
And it shall add ""No session has been created."" and ""Contact your administrator if you need access.""
And the buttons ""Choose another account"" and ""Back to login"" shall be shown (H09)"	3. The system shall show the Google "G" mark beside the label "Continue with Google".	
						Passed	
						Failed	
						Total	
DIT - 05	Home & Navigation	As a Dietitian	open my notifications from the bell icon	so that I can see new activity for my role in one place.	Given When Then	1. The system shall show notifications only for records the signed-in role is allowed to open.	
					"A. Notifications list

Given the Dietitian is on a screen whose header shows the bell icon
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
DIT - 06	Settings & Profile	As a Dietitian	view and edit my account details in Settings	so that my name and email stay correct.	Given When Then	1. The system shall show the signed-in account's own name and email only.	
					"A. View Settings

Given the Dietitian is signed in
When Settings is selected in the bottom navigation
Then the system shall show the title ""Settings"", the avatar initial ""D"", ""Dietitian Account"", ""dietitian@filfoods.ph"" and the button ""Edit Profile""
And below it: App Preferences (Notifications switch, Language ""English"", Appearance ""Light Mode""); Support: Help & Support, About F.I.L Foods; and a Log out row (added because the source screen has none)"	2. The system shall validate the email format before saving.	
					"B. Edit profile

Given Edit Profile is selected
When the system opens ""Edit Profile"" with the prefilled ""Full name"" and ""Email address"" and the staff member changes the email to a valid value and selects Save changes
Then the system shall show ""Profile updated"" and ""Your changes have been saved."" with the new name and email and a ""Back to Settings"" button (S03, S04)

When the email is typed without ""@""
Then the system shall show ""Enter a valid email address."" and stay in the editor (S05)

When Back or Cancel is selected after changes
Then the system shall ask ""Leave without saving your changes?"" with ""Discard changes"" and ""Keep editing"" (S10)

Sample Data:
Full name: Dietitian Account. Email: admin.updated@filfoods.ph (example)."	3. The system shall not change the role through Edit Profile.	
						Passed	
						Failed	
						Total	
DIT - 07	Settings & Profile	As a Dietitian	set notifications, language and appearance	so that the app suits how I work.	Given When Then	1. The system shall apply a preference only after Apply (language, appearance) or at the switch (notifications).	
					"A. Notifications switch

Given Settings is open with Notifications ON
When the switch is turned OFF
Then the preference shall be saved and the row shall show OFF (S07)

When it is turned ON
Then the row shall show ON (S06)"	2. The system shall keep each preference per account.	
					"B. Language

Given Settings is open
When Language is selected
Then the system shall show a choice screen with ""English"" and ""Filipino"", and ""Apply"" / ""Cancel""; Apply with Filipino shall show the Settings labels in Filipino (S08, S16); Cancel keeps the prior language"		
					"C. Appearance

Given Settings is open
When Appearance is selected
Then the system shall show ""Light Mode"", ""Dark Mode"" and ""Use device setting"" with Apply / Cancel; Dark + Apply applies the dark theme (S09, S11); device setting shows ""Current device theme: Light"" (S17)"		
						Passed	
						Failed	
						Total	
DIT - 08	Settings & Profile	As a Dietitian	open Help & Support and About F.I.L Foods	so that I can ask for help and read app information.	Given When Then	1. The system shall not show a ticket number or response-time promise.	
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
DIT - 09	Authentication & Account Management	As a Dietitian	log out of the app	so that my account is not exposed on a shared device.	Given When Then	1. The system shall end the session on the server and clear the stored sign-in.	
					"A. Logout A / B

Given Settings is open
When Log out is selected
Then the system shall dim the screen and show a card with a warning symbol, ""Log out of F.I.L Foods?"", ""You're currently logged in as Dietitian. You will need to log in again to access your account."" and the note ""Your saved changes will be kept.""
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
DIT - 10	Dashboard	As a Dietitian	see my Dashboard with allergies, customer preferences and a menu overview	so that I can start nutrition work quickly.	Given When Then	1. The system shall NOT show Total Orders, Total Sales, Total Customers, Menu Items count or Sales Overview.	
					"A. Dashboard

Given the Dietitian has logged in
When the Dashboard loads
Then the header shall show ""Dietitian"" and ""Nutrition Specialist""
And the greeting shall read ""Welcome back, Dietitian!"" and ""Here's an overview of your nutrition insights.""
And two cards shall show ""Allergies / View Only"" and ""Customer / Preferences""
And ""Menu Overview"" with ""View All"" shall list Fried Chicken ₱120.00, Pasta Carbonara ₱150.00, Spring Salad ₱100.00, Grilled Salmon ₱200.00, Miso Soup ₱80.00, Fruit Bowl ₱70.00 in a two-column grid"	2. The bottom navigation shall have no Staff item.	
						Passed	
						Failed	
						Total	
DIT - 11	Allergies & Preferences	As a Dietitian	see customers' allergies	so that I can plan meals that are safe.	Given When Then	1. Allergies are visible only to Admin, Dietitian, Kitchen and Delivery roles.	
					"A. Allergies

Given the Dietitian opens the Allergies card
When ""Allergies & Preferences"" opens
Then it shall show ""Allergies"" and ""View-only information"" with chips Peanuts, Shellfish, Dairy, Eggs, Gluten, Other
And chips cannot be added, removed or edited"	2. The Dietitian cannot edit allergies.	
						Passed	
						Failed	
						Total	
DIT - 12	Allergies & Preferences	As a Dietitian	see each customer's preferred low or high levels of sugar, calories, sodium and protein	so that I can plan suitable meal options.	Given When Then	1. Each tile shall show the level word (Low / Moderate / High) and the range value.	
					"A. Preferred levels

Given the Dietitian is on Allergies & Preferences or Customer details
When the section ""Preferred Nutritional Levels"" is shown
Then subtitle ""Customer's preferred range""
And four tiles: Sugar Low ≤ 5g; Calories Moderate 400 – 600 kcal; Sodium Low ≤ 400 mg; Protein High ≥ 25g
And the footer ""These preferences help you plan suitable meal options."""	2. Values are read-only for the Dietitian.	
						Passed	
						Failed	
						Total	
DIT - 13	Customers	As a Dietitian	open a customer and review their profile, preferences and order history	so that I can give advice per customer.	Given When Then	1. The Dietitian can only read customer information.	
					"A. Directory and details

Given the Dietitian selects the ""Customer / Preferences"" card
When the directory opens
Then it shall show ""Customer Preferences"", ""Choose a customer"", ""Ana Garcia"" and anagarcia@gmail.com (D01)

When Ana Garcia is selected
Then Customer Details shall show initial ""A"", ""Ana Garcia"", anagarcia@gmail.com, Allergies Peanuts and Dairy, the four preference tiles and ""Order History"" with ""View All""
And history row: Spring Salad, Oct 29, 2026 • 07:20 PM, Delivered, ₱100.00

When View All is selected
Then ""Order History"" for Ana Garcia opens (D04); a row opens ""History Detail"" with Spring Salad, Delivered, Amount ₱100.00 (D05)"	2. The screen shall not show the customer's delivery address or payment information.	
						Passed	
						Failed	
						Total	
DIT - 14	Menu	As a Dietitian	view all menu items without being able to change them	so that I can check meals against allergies and nutrition preferences.	Given When Then	1. The system shall block any create, edit or delete request from the Dietitian role on the server.	
					"A. View-only menu

Given the Dietitian selects Menu
When the screen opens
Then the title ""Menu"", tabs All, Meals, Desserts, Drinks and six cards with name and price (Fried Chicken ₱120.00, Pasta Carbonara ₱150.00, Spring Salad ₱100.00, Grilled Salmon ₱200.00, Miso Soup ₱80.00, Fruit Bowl ₱70.00)
And there shall be no Add, Edit, Delete or availability control

When an item is selected
Then a read-only review shall show the name, price and ""Nutrition: not supplied"", ""Allergens: not supplied"", ""Use verified data before recommending."" (D03)"		
						Passed	
						Failed	
						Total	
DIT - 15	Orders	As a Dietitian	review submitted meal selections and the user's dietary information	so that each order is suitable for the user before payment is requested.	Given When Then	1. The Dietitian shall review allergies, HTN, Diabetes, Gout, Kidney Problem, Low-Cholesterol Diet and doctor-provided restrictions.	
					"A. Open a submitted order

Given a user has submitted an order
When the Dietitian opens the order
Then the system shall show the selected breakfast, lunch or dinner, food customizations, allergies, health conditions and doctor-provided restrictions."	2. An order shall not proceed to payment until the Dietitian approves it.	
					"B. Approve a suitable order

Given a user has submitted an order
When the meal selections are suitable
Then the Dietitian can approve the order and allow it to proceed to payment."	3. The system shall record the Dietitian decision and any reason for return.	
					"C. Return an order for changes

Given a user has submitted an order
When changes are needed
Then the Dietitian can return the order with a reason for the user to revise."		
						Passed	
						Failed	
						Total	
DIT - 16	Access Control	As a Dietitian	be blocked from staff management, sales figures and menu management	so that I only see what my job needs.	Given When Then	1. The bottom navigation shall contain Dashboard, Orders, Menu and Settings only.	
					"A. Restricted areas

Given the Dietitian is signed in
When the Dietitian tries to open Staff, Total Sales, Total Orders, Total Customers, Sales Overview or a menu edit
Then the system shall not show these screens or controls and shall return ""You do not have access to this page."" for a direct link"	2. The server shall reject these requests regardless of the UI.	
						Passed	
						Failed	
						Total	
DIT - 17	Health Information Approval	As a Dietitian	review a request to remove a customer's health condition and approve or reject it	so that a condition is taken off a meal recipient's profile, and the kitchen stops preparing meals for it, only after a qualified person has confirmed that it is safe.	Given When Then	1. The system shall list pending removal requests on the Dietitian Dashboard (a "Condition Removal Requests" card with the pending count) and in the bell notifications, oldest first, showing the meal recipient, the condition, the reason, who asked and when. The list shall stay available when the Notifications switch (DIT - 07) is OFF.	
					"A. Review pending requests

Given a user has asked to remove Diabetes from Lia Dizon's health conditions
When the Dietitian opens ""Condition Removal Requests"" from the Dashboard
Then the system shall list ""Lia Dizon · Diabetes"", the reason and the date requested, and open the request with Lia Dizon's other conditions, allergies and nutritional preferences

Sample Data:
Requested by Carlos Dizon on 2026-11-07. Reason: Doctor's note says blood sugar is back to normal."	2. The system shall show, on each request, the meal recipient's other health conditions, allergies and nutritional preferences (DIT - 11, DIT - 12, DIT - 13) so that the Dietitian can decide.	
					"B. Approve

Given the request for Diabetes is open
When the Dietitian selects Approve
Then the system shall remove Diabetes from Lia Dizon's profile, update the ""last updated"" date and notify Carlos Dizon ""Your request to remove Diabetes from Lia Dizon's health conditions was approved.""

Sample Data:
Approved on 2026-11-08."	3. The system shall, when the Dietitian approves a request, remove the condition from the meal recipient's profile, update the "last updated" date and notify the user (USR - 09).	
					"C. Reject with a reason

Given the request for Diabetes is open
When the Dietitian selects Reject, enters a reason and confirms
Then the system shall keep Diabetes and notify Carlos Dizon ""Your request to remove Diabetes from Lia Dizon's health conditions was not approved."" with the reason

When the reason is blank
Then the system shall display ""Please enter a reason for rejecting this request."" and not reject the request

Sample Data:
Reason: Please send a recent doctor's note."	4. The system shall require a reason when the Dietitian rejects a request and display "Please enter a reason for rejecting this request." when it is blank. On rejection the condition shall stay and the user shall be notified with the reason.	
					"D. Already decided

Given two Dietitians have the same request open
When the second Dietitian decides after the first
Then the system shall display ""This request has already been decided."" and change nothing"	5. The system shall let only one decision be made per request and display "This request has already been decided." if another Dietitian decided it first.	
					"E. Other roles blocked

Given the Admin, Kitchen Staff or Delivery Staff is signed in
When the person opens a removal request by direct link or tries to approve or reject it
Then the system shall refuse and display ""You do not have access to this page."""	6. The server shall allow only the Dietitian role to decide a request. The user who made the request, the Admin, Kitchen Staff and Delivery Staff shall be refused, and a direct link shall return "You do not have access to this page." (DIT - 16).	
						7. The system shall record every decision in the audit log (ADM - 20) with the Dietitian account, meal recipient, condition, decision, reason and time, and in the meal recipient's change history (USR - 38).	
						Passed	
						Failed	
						Total
