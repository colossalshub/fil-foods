// Exact strings quoted in the client user stories. Do not paraphrase these.
export const MSG = {
  required: 'Please fill in all required fields.',
  invalidContact: 'Please enter a valid contact number.',
  invalidEmail: 'Please enter a valid email address.',
  duplicateUser: 'This username or contact number is already registered.',
  duplicateEmail: 'This email address is already registered.',
  shortPassword: 'Password must be at least 8 characters.',
  passwordMismatch: 'Passwords do not match.',
  termsRequired: 'You must accept the Terms and Conditions to continue.',
  invalidCredentials: 'Invalid username or password.',
  locked: 'Your account is locked. Please reset your password or contact support.',
  verifyFirst: 'Please verify your account first.',
  rateLimit: 'Too many attempts. Please wait a minute and try again.',
  noContact: 'No account found with this contact number.',
  noEmail: 'No account found with this email address.',
  googleOnly: 'This account signs in with Google. Please use that option to log in.',
  // USR-05 says to reject the current password, but the story does not quote a message.
  samePassword: 'New password must be different from your current password.',
  passwordUpdated: 'Password updated. Please log in.',
  logoutConfirm: 'Are you sure you want to log out?',
  googleCancelled: 'Sign in with Google was cancelled.',
  googleConnection: 'Unable to continue with Google. Please check your connection and try again.',
  inactive: 'This account is inactive. Please contact support.',
  googleNeedsName: 'Continue with Google needs your name and email address to create your account.',
  linkPrompt: 'An account with this email already exists. Log in to link your Google account.',
  googleLinked: 'Your Google account is linked.',
  googleAlreadyLinked: 'This Google account is already linked to another account.',
  verified: 'Your account is verified.',
  codeExpired: 'The verification code has expired.',
  wrongCode: 'Incorrect verification code.',
  tooManyWrong: 'Too many incorrect attempts. Please request a new code.',
  sendFailed: 'We could not send the code. Please try again or use the other method.',
  tooManyCodeRequests: 'Too many code requests. Please try again in an hour.',
  // Email-link confirmation (Supabase default emails, no custom SMTP). Not quoted in the stories:
  // checkEmailLink was given by the owner; the other link messages are new wording.
  checkEmailLink: 'Check your email and tap the link to confirm your account.',
  checkEmailResetLink: 'Check your email and tap the link to reset your password.',
  linkResent: 'We sent a new link to your email.',
  linkExpired: 'This link has expired or was already used. Please request a new one.',
  profileUpdated: 'Profile updated successfully.',
  healthSaved: 'Health information saved.',
  dietarySaved: 'Dietary restrictions saved.',
  allergiesSaved: 'Food allergies saved.',
  mealPrefsSaved: 'Meal preferences saved.',
  nutritionalUpdated: 'Nutritional preferences updated.',
  guardianRequired: "Please enter the guardian's name and contact number.",
  guardianSaved: 'Guardian information saved.',
  removeGuardianConfirm: 'Are you sure you want to remove this guardian?',
  noChangesYet: 'No changes yet.',
  noMeals: 'No meals found.',
  noActiveOrders: 'You have no active orders',
  guestGate: 'Log in to continue',
  noGuardian: 'No guardian or family member added yet.',
  registrationTypeRequired: 'Please choose Signing Up for Myself or Signing Up for a Family Member to continue.',
  allergyWarning: (allergen: string) => `This meal contains ${allergen}, which is listed in your profile.`,
  noExactCombo: 'No exact match is available. Here is the closest option.',
  notMedicalAdvice: "Suggestions are not medical advice. Follow your doctor or dietitian's guidance.",
  recipientUpdated: 'Meal recipient updated successfully.',
  deleteWarning: 'Delete your account? This will permanently remove your profile and your health, dietary and allergy information. This cannot be undone.',
  deleteWrongPassword: 'Incorrect password. Your account was not deleted.',
  accountDeleted: 'Your account has been deleted.',
  orderInProgress: 'You have an order in progress. Please wait until it is delivered or cancelled before deleting your account.',
  enterComment: 'Please enter a comment before submitting.',
  commentSubmitted: 'Your feedback has been submitted.',
  termsLoadFailed: 'The Terms and Conditions could not be loaded. Please try again.',
  termsUpdated: 'We updated our Terms and Conditions. Please review and accept to continue.',
  termsDeclined: 'You need to accept the updated Terms and Conditions to keep using F.I.L. Foods.',
  acceptanceSaveFailed: 'We could not save your acceptance. Please try again.',
  oneMealPerTime: 'You can choose only one meal for that meal time.',
  maxMealsPerDay: 'You can choose a maximum of three meals per day.',
};

/** USR-28 navigation guide — quoted labels from the user stories / Figma. */
export const GUIDE_COPY = {
  welcomeTitle: 'Welcome to F.I.L Foods',
  welcomeLead: "Here's a quick tour of the app.",
  startGuide: 'Start guide',
  skipForNow: 'Skip for now',
  skipGuide: 'Skip guide',
  appGuideTitle: 'App guide',
  replayLead: 'Replay any part of the tour.',
  startFromBeginning: 'Start from the beginning',
  screenReference: 'Screen reference',
  stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  back: 'Back',
  next: 'Next',
  close: 'Close',
  gotIt: 'Got it',
};

/** USR-27 FAQ — Figma labels; empty state matches quoted story text. */
export const FAQ_COPY = {
  title: 'FAQ',
  subtitle: 'Common questions about orders and delivery.',
  searchPlaceholder: 'Search the FAQ',
  clearSearch: 'Clear search',
  tapToCollapse: 'Tap again to collapse',
  searchMinChars: (min: number) => `Type at least ${min} characters to search.`,
  openFromHelp: 'Browse frequently asked questions',
};

/** USR-29 Feedback — quoted labels from the user stories / Figma. */
export const FEEDBACK_COPY = {
  title: 'Feedback',
  subtitle: 'Tell us what you think.',
  fieldLabel: 'Your comment',
  placeholder: 'Type your comments or suggestions here.',
  submit: 'Submit',
  thankYouTitle: 'Thank you!',
  backToHelp: 'Back to Help',
};

/** USR-17 meal detail screen — quoted labels and messages from the user stories / Figma. */
export const MEAL_DETAIL_COPY = {
  backToMeals: 'Back to meals',
  title: 'Meal details',
  lead: 'Check this meal before you choose it.',
  unavailableTitle: 'Not available',
  unavailableBody: 'This meal is currently unavailable. Please choose another meal.',
  allergenWarningTitle: 'Allergen warning',
  chooseAnotherMeal: 'Choose another meal',
  notAvailableCta: 'Not available',
  available: 'Available',
  notAvailable: 'Not available',
  description: 'Description',
  ingredients: 'Ingredients',
  allergenInformation: 'Allergen information',
  noneListed: 'None listed',
  listedAllergensProfileNote: (profileRef: string) =>
    `Listed allergens are checked against ${profileRef}.`,
  addToMealTime: (mealTime: string) => `Add to ${mealTime}`,
  removeFromOrder: 'Remove from order',
  addedToOrderTitle: 'Added to order',
  addedToOrderBody: (mealName: string) => `${mealName} is in your cart.`,
  keepBrowsing: 'Keep browsing',
  viewOrder: 'View order',
  logInToOrderTitle: 'Log in to order',
  logInToOrderBody: 'Create an account or log in before placing an order.',
  notNow: 'Not now',
  logIn: 'Log in',
};

/** USR-35 / USR-36 Home — Figma strings. */
export const HOME_COPY = {
  screenTitle: 'Home',
  welcomeBack: (name: string) => `Welcome back, ${name}.`,
  orderingFor: (name: string) => `Ordering for ${name}.`,
  activeOrder: 'Active order',
  recommendedLead:
    "Meals that fit your allergies, health conditions and doctor's restrictions.",
  recommendedLeadFor: (name: string) =>
    `Meals that fit ${name}'s allergies, health conditions and doctor's restrictions.`,
  matchedToProfile: 'Matched to your profile',
  matchedToYour: (details: string) => `Matched to your ${details}.`,
  matchedToName: (name: string, details: string) => `Matched to ${name}'s ${details}.`,
  suitableForYou: '✓ Suitable for you',
  orderAgain: 'Order again',
  reorder: 'Reorder',
  emptyOrdersBody: 'Nothing is on the way yet. Browse a meal, and your first order will show up here.',
  addMeal: 'Add',
  noMatchingTitle: 'No matching meals',
  noMatchingBody:
    "There are currently no matching meals. We only show meals that fit your allergies, health conditions and doctor's restrictions.",
  noMatchingBodyFor: (name: string) =>
    `There are currently no matching meals. We only show meals that fit ${name}'s allergies, health conditions and doctor's restrictions.`,
  loadingOrders: 'Loading your orders…',
  ordersLoadError: "Your orders didn't load. Try again.",
  tryAgain: 'Try again',
  loadingRecommendations: 'Loading your recommendations…',
  openProfile: 'Open profile',
  browseMeals: 'Browse Meals',
  myOrders: 'My Orders',
  myAccount: 'My Account',
  goBack: 'Go back',
};

/** Short lines under each finished dish on Home. */
export const HOME_MEAL_NOTES: Record<string, { description: string; benefit: string }> = {
  'ready-pork-adobo': {
    description: 'Pork braised in vinegar, soy, and garlic.',
    benefit: 'Savory and high in protein.',
  },
  'ready-beef-pinoy-steak': {
    description: 'Beef simmered with onions and citrus.',
    benefit: 'Hearty and high in protein.',
  },
  'ready-chicken-tinola': {
    description: 'Chicken soup with ginger and papaya.',
    benefit: 'A lighter, comforting bowl.',
  },
  'ready-fish-pinoy-steak': {
    description: 'Fish in a savory sauce with citrus.',
    benefit: 'A lighter, high-protein meal.',
  },
};

/** USR-37 / Account hub — design strings. */
export const ACCOUNT_COPY = {
  screenTitle: 'Account',
  screenSubtitle: 'Your profile and settings.',
  editProfile: 'Edit profile',
  healthInformation: 'Health information',
  changeHistory: 'Change history',
  activityRecord: 'Activity record',
  help: 'Help',
  logOut: 'Log out',
  noActivityYet: 'No activity recorded yet.',
  activityIntegrityWarning:
    'Activity record could not be verified. A stored event may have been altered.',
};

/** USR-25 notifications screen — labels aligned with user stories / Figma. */
export const NOTIFICATIONS_COPY = {
  screenTitle: 'Notifications',
  screenSubtitle: 'Updates on your orders.',
  unreadSubtitle: (count: number) =>
    `${count} unread notification${count === 1 ? '' : 's'}`,
  emptyTitle: "You're all caught up.",
  emptyBody: 'Notifications will appear here.',
  tagAnnouncement: 'Announcement',
  tagFamilyMember: 'Family Member',
};

export const ORDERS_COPY = {
  listTitle: 'My Orders',
  listSubtitle: 'Submitted orders and payment.',
  activeSection: 'Active',
  pastSection: 'Past orders',
  statusTitle: 'Order status',
  statusSubtitle: 'From review to completion.',
  detailsTitle: 'Order details',
  backToOrders: 'Back to orders',
  orderProgress: 'Order progress',
  statusHistory: 'Status history',
  deliveryDetails: 'Delivery details',
  fulfillmentHeading: 'FULFILLMENT',
  orderReference: 'Order reference',
  // Revised USR-13 AC 5: separate delivery tracking number (new wording).
  trackingNumber: 'Delivery tracking number',
  status: 'Status',
  date: 'Date',
  paymentStatus: 'Payment status',
  fulfillment: 'Fulfillment',
  total: 'Total',
  amount: 'Amount',
  viewOrderDetails: 'View order details',
  cancelledHeading: 'Cancelled',
  cancelledBody: 'This order was cancelled and will not be processed.',
  progressForDietitianReview: 'Your Dietitian is reviewing your order.',
  // Revised USR-23: "Returned for Changes" is the spec label; the other lines are new wording.
  progressReturnedForChanges: 'The Dietitian asked for changes. Edit your order and resubmit it.',
  returnedReasonLabel: "Dietitian's reason",
  editAndResubmit: 'Edit and resubmit',
  resubmitBanner: (ref: string) => `Editing ${ref}. It will go back to the Dietitian for review.`,
  resubmitConfirmTitle: 'Resubmit this order?',
  resubmitConfirmBody: (ref: string) => `Your edited order ${ref} will be sent to the Dietitian for review again.`,
  resubmitConfirm: 'Yes, resubmit',
  resubmitAction: 'Resubmit for review',
  resubmitted: 'Order resubmitted for Dietitian review.',
  resubmitMissingMeals: 'Some meals from the returned order are no longer on the menu. Choose them again.',
  progressAwaitingPayment: 'Approved by your Dietitian. You can pay now.',
  progressPaid: 'Payment received. Your order has been sent to the Kitchen.',
  progressPreparing: 'The kitchen is preparing your meals.',
  progressReadyPickup: 'Your order is ready. Come and pick it up.',
  progressReadyDelivery: 'Your order is ready for dispatch.',
  progressOutForDelivery: 'Your order is on its way to you.',
  progressCompleted: 'Your order has been completed.',
  historySentToDietitian: 'Sent to the Dietitian',
  historyReturnedForChanges: 'Returned for Changes by the Dietitian',
  historyApprovedByDietitian: 'Approved by the Dietitian',
  historyPaid: 'Paid',
  historySentToKitchen: 'Sent to the Kitchen',
  historyPreparing: 'Preparing',
  historyReadyPickup: 'Ready for Pickup',
  historyReadyDelivery: 'Ready for Delivery',
  historyOutForDelivery: 'Out for Delivery',
  historyCompleted: 'Completed',
  historyCancelled: 'Cancelled',
  paymentPending: 'Pending',
};

export const waitForCode = (seconds: number) =>
  `Please wait ${seconds} seconds before requesting a new code.`;

/** USR-51. Quoted labels and validation messages stay as written. */
export const SPECIAL_REQUEST_COPY = {
  add: 'Add special request',
  remove: 'Remove special request',
  heading: 'Special request',
  prepare: 'How to prepare',
  noteLabel: 'Note',
  tooLong: 'Special requests can be up to 150 characters.',
  allergen: "This request includes an ingredient listed in the recipient's allergies.",
  feeLabel: 'Special request fee',
  feesLine: 'Special request fees',
  mealTotal: 'Meal total',
};

export const SMS_TEMPLATE =
  'Your verification code is 123456. It expires in 10 minutes. Do not share this code.';
export const EMAIL_SUBJECT = 'Your verification code';
export const EMAIL_TEMPLATE =
  'Your verification code is 123456. It expires in 10 minutes. If you did not ask for this code, ignore this email.';
