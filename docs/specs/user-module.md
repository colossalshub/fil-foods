# User module (User Story v6)

Index only. Acceptance criteria are in [`User_Story_v6_20_11_2026.xlsx`](./User_Story_v6_20_11_2026.xlsx), sheet User Module. Open that sheet for the story you are implementing. Map: [`meal-service-modules.md`](./meal-service-modules.md).

**Scope:** USR-01–USR-50. The user registers, signs in, and gets notifications. The meal recipient is who the meals, health, diet, and delivery details are for. One meal recipient per account (For Myself, or one Family Member).

**Precondition:** The user (the person who registers, logs in and uses the application) has a registered, verified account (or one created by the Admin), is logged in to the meal service application, and the meals and menu have already been set up by the Admin. The account is registered either For Myself (the user is also the meal recipient, the person who will receive the meals) or for a Family Member (the user manages the account for another person, the meal recipient).

**Postcondition:** The user's profile, the meal recipient's profile, or the order is saved with a unique reference, the order status and notifications are updated, and the action is logged under the user's account with the user who made it and the meal recipient it concerns. Notifications go to the user; the health, dietary, and delivery information belongs to the meal recipient.

## Stories

| ID | Epic | I want to |
|---|---|---|
| USR-01 | Authentication & Account Management | sign up either for myself or for a family member, then create an account using my first name, last name, contact number, address, email and password |
| USR-02 | Authentication & Account Management | log in using my registered username and password |
| USR-03 | Authentication & Account Management | choose to stay logged in on my device |
| USR-04 | Authentication & Account Management | request help when I forget my password |
| USR-05 | Authentication & Account Management | set a new password after verifying my identity |
| USR-06 | Authentication & Account Management | log out of my account |
| USR-07 | User Profile & Dietary Information | view my profile, and the meal recipient's profile, in one screen |
| USR-08 | User Profile & Dietary Information | edit my own personal information |
| USR-09 | User Profile & Dietary Information | select my health condition or enter a dietary restriction given by my doctor |
| USR-10 | User Profile & Dietary Information | record my dietary restrictions and food preferences |
| USR-11 | User Profile & Dietary Information | record my food allergies |
| USR-12 | User Profile & Dietary Information | add the meal recipient's meal preferences |
| USR-13 | User Profile & Dietary Information | update the meal recipient's nutritional preferences |
| USR-14 | User Profile & Dietary Information | add a guardian or family contact for the meal recipient |
| USR-15 | User Profile & Dietary Information | view the Terms and Conditions |
| USR-16 | Meals & Ordering | browse the available meals by meal time and food category |
| USR-17 | Meals & Ordering | view the details and ingredients of an available meal |
| USR-18 | Meals & Ordering | choose one meal for each meal time and customize my food choice |
| USR-19 | Meals & Ordering | choose delivery or pickup for my confirmed meal order |
| USR-20 | Meals & Ordering | review my meal selections or plan, confirm my order and pay after Dietitian approval |
| USR-21 | Orders | view my submitted orders and their payment status |
| USR-22 | Orders | view the full details of an order |
| USR-23 | Orders | check the status of my order |
| USR-24 | Orders | receive updates when my order status changes |
| USR-25 | Orders | receive updates about my order |
| USR-26 | Help & Assistance | view help instructions |
| USR-27 | Help & Assistance | view frequently asked questions |
| USR-28 | Help & Assistance | access a basic guide to navigating the app |
| USR-29 | Help & Assistance | send comments or suggestions about the meals and service |
| USR-30 | Authentication & Account Management | continue with Google to sign up or log in |
| USR-31 | Authentication & Account Management | complete my profile after continuing with Google |
| USR-32 | Authentication & Account Management | use my username and password instead of Google |
| USR-33 | Authentication & Account Management | verify my account with a code sent by SMS or email |
| USR-34 | Authentication & Account Management | link my Google account to my existing account |
| USR-35 | Home & Navigation | view meal recommendations based on my allergies and recorded health or dietary restrictions |
| USR-36 | Home & Navigation | use the Home screen shortcuts to reach common tasks |
| USR-37 | Home & Navigation | move between Home, Meal, Orders, and Account using the main navigation |
| USR-38 | User Profile & Dietary Information | review the history of changes to the meal recipient's health and dietary information |
| USR-39 | Meals & Ordering | see meal suggestions that match my recorded dietary information and preferences |
| USR-40 | Authentication & Account Management | use a password-based account protected by secure password storage |
| USR-41 | Authentication & Account Management | access only the account information and actions allowed for my role |
| USR-42 | Security & Auditability | see a record of important changes I make to my profile |
| USR-43 | Authentication & Account Management | choose whether I am registering For Myself or for a Family Member |
| USR-44 | User Profile & Dietary Information | enter the details of the family member who will receive the meals when I register for a Family Member |
| USR-45 | User Profile & Dietary Information | update the details of the meal recipient |
| USR-46 | User Profile & Dietary Information | see clearly who is using the app and who the meals are for on every screen |
| USR-47 | Authentication & Account Management | delete my account |
| USR-48 | User Interface & Accessibility | use a clear and accessible interface with readable text, visible buttons and understandable instructions |
| USR-49 | User Profile & Dietary Information | read the Terms and Conditions in clear, numbered sections |
| USR-50 | User Profile & Dietary Information | accept or decline the Terms and Conditions, and accept again when they change |
