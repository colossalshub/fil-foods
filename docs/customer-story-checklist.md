# Customer story checklist

USR-01 to USR-50, judged from the customer app on the msantos account on 21 Nov 2026 and User Story v6. Admin copies and staff screens are out of scope.

| Status | Count |
|---|---|
| In the app | 50 |
| Questionable | 0 |
| Not real yet | 0 |

**In the app** means the main action is on the phone and did not contradict the story. **Questionable** means part of it is there and a checker would pause. **Not real yet** means the screen is a stand-in.

A reviewer on this account will notice these first:

- Continue with Google is connected. Only Gmail addresses listed as Google test users can sign in until the consent screen is published.
- Send code by email sends a real email. Send code by SMS shows "We could not send the code. Please try again or use the other method." because no SMS provider is connected.

| Story | I want to | Status | What we saw |
|---|---|---|---|
| USR-01 | Sign up for myself or a family member | In the app | After the account details, the app asks for food allergies, then the health condition or a doctor's restriction, then recommended foods. |
| USR-02 | Log in with username and password | In the app | msantos can log in, and the app opens the meal menu. |
| USR-03 | Stay logged in on this device | In the app | Remember me keeps the session on this device. Clearing every device belongs to the password-reset story. |
| USR-04 | Get help when I forget my password | In the app | A registered email can request a code with Send code by email. An unknown number or email shows the no-account message. SMS shows the could-not-send message. |
| USR-05 | Set a new password after I prove who I am | In the app | After the email code is accepted, the new password is entered twice, saved, and the other sessions are signed out. |
| USR-06 | Log out | In the app | Account has Log out. |
| USR-07 | See my profile and the meal recipient on one screen | In the app | For Myself stays one screen. A family recipient is saved on the server as the person the meals are for. |
| USR-08 | Edit my own personal information | In the app | A new phone number is saved only after an email confirmation code. A new email waits for Supabase's confirmation email. |
| USR-09 | Select a health condition or a doctor's restriction | In the app | The condition list and an other/doctor field are on Account. Maria has no condition and does have Low-sugar and Soft diet. |
| USR-10 | Record dietary restrictions and food preferences | In the app | Restrictions save and show on Account. Preferred foods are the next story. |
| USR-11 | Record food allergies so those meals cannot be ordered | In the app | Shellfish and Soy are saved. Meals that contain them are left off Home and disabled on the menu, with the Unavailable sentence. None of today's five foods contain them. |
| USR-12 | Add the meal recipient's meal preferences | In the app | Preferences are saved. The menu lists the best matches first and shows the reason under each meal. |
| USR-13 | Update nutritional preferences | In the app | Higher protein is saved. A meal's detail shows its sodium and whether it is within or above the 400 mg limit. |
| USR-14 | Add a guardian or family contact | In the app | Account can save a guardian name, relationship, and contact number. Maria has not added one. |
| USR-15 | View the Terms and Conditions | In the app | Account links to the terms and shows Accepted 2026-10-11 09:00 AM. |
| USR-16 | Browse meals by meal time and food category | In the app | Breakfast is bread. Lunch and Dinner share Beef, Pork, Chicken, and Steamed. That is the five foods for the day. |
| USR-17 | View a meal's details and ingredients | In the app | Tapping a food on Today's meals opens its details and ingredients. Adding a lunch or dinner food then opens customization. |
| USR-18 | Choose one meal per meal time and customize it | In the app | One meal per time, up to three. Build Your Dinner offers only today's meats, then a cooking style. Fish is not a choice. |
| USR-19 | Choose delivery or pickup | In the app | The customer chooses delivery or pickup, then the address and schedule. |
| USR-20 | Review, confirm, and pay after the Dietitian approves | In the app | The summary uses the plan chosen at checkout. Pay now on the GCash or Maya page records the payment on the order. |
| USR-21 | See submitted orders and payment status | In the app | The list waits while orders load, then shows ORD-2026-0012 as Awaiting Payment. |
| USR-22 | See the full details of an order | In the app | Order details show the reference, payment, meals, delivery or pickup, and status history. |
| USR-23 | Check the status of my order | In the app | The customer sees For Dietitian Review, Awaiting Payment, Paid, Preparing, Ready for Pickup, Out for Delivery, Completed, and Cancelled. A confirmed order is shown as Preparing. |
| USR-24 | Receive updates when the status changes | In the app | A status change is saved as a notification that names the order and the new status. That notice shows on the main screens, and the list updates while Notifications is open. |
| USR-25 | Receive updates about my order | In the app | Notifications reads the updates saved for the account, including order messages from the server. |
| USR-26 | View help instructions | In the app | A labelled Help control is on Home, Meal, Orders, and Account. |
| USR-27 | View frequently asked questions | In the app | FAQ is reached from Help, with search. |
| USR-28 | Use a basic guide to the app | In the app | The guide can be replayed. Once it is seen, that is saved on the account and on the phone. |
| USR-29 | Send comments about the meals and service | In the app | A signed-in comment is saved to the account's feedback record. |
| USR-30 | Continue with Google | In the app | Continue with Google opens the real Google account through Supabase. Only listed test users can sign in until the consent screen is published. |
| USR-31 | Finish my profile after Google | In the app | A new Google user who has not finished a profile is asked For Myself or Family Member, then allergies, health, and recommended foods. |
| USR-32 | Use username and password instead of Google | In the app | msantos signs in with a username and password. |
| USR-33 | Verify my account with an SMS or email code | In the app | Verify your account offers SMS and email, with the number and email partly hidden. Email sends the code. SMS shows the could-not-send message. The right email code shows "Your account is verified." |
| USR-34 | Link Google to my existing account | In the app | Continue with Google asks for the password on an existing account before Google stays linked. |
| USR-35 | See meals that fit my allergies and diet | In the app | Home names the match: higher protein, leaves out Shellfish and Soy, fits the low-sugar and soft diet. |
| USR-36 | Use Home shortcuts for common tasks | In the app | Browse Meals, My Orders, and My Account are on Home. |
| USR-37 | Move between Home, Meal, Orders, and Account | In the app | Those four tabs are the main navigation. |
| USR-38 | Review changes to health and diet information | In the app | Account > Change history is read-only. A saved health, diet, allergy, or personal edit is stored with the old value, the new value, and who changed it. |
| USR-39 | See suggestions that match my diet and preferences | In the app | Home and the menu keep meals that fit the saved allergies, restrictions, and preferences, and they say why. |
| USR-40 | Use a password that is stored securely | In the app | Sign-in uses the account password. The password is not shown again after login. |
| USR-41 | See only what my role allows | In the app | A customer has Home, Meal, Orders, and Account. Staff sign-in is a separate entry. |
| USR-42 | See a record of important profile changes | In the app | Account shows the activity record of important changes the customer made. |
| USR-43 | Choose For Myself or for a Family Member | In the app | Maria's account says Registered for: Myself. |
| USR-44 | Enter the family member who will receive the meals | In the app | The family form saves the recipient on the server, separate from the account holder. |
| USR-45 | Update the meal recipient | In the app | Editing the family recipient saves the new details on the server and leaves the account holder unchanged. |
| USR-46 | See who is using the app and who the meals are for | In the app | Home, Meal, and Orders say the meals are for Maria. Account says Registered for: Myself. |
| USR-47 | Delete my account | In the app | Delete account is on Account. Confirming it signs the customer out on every device. |
| USR-48 | Use a clear, readable interface | In the app | Text and buttons stay readable, and Build Your Dinner keeps its last row above the tab bar. |
| USR-49 | Read the terms in numbered sections | In the app | The terms are numbered and linked from Account. |
| USR-50 | Accept or decline the terms, including when they change | In the app | A finished account that already accepted the terms signs straight in. An older saved version is asked to accept again before Home. |
