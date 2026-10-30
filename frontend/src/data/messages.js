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
  // CLT-05 says to reject the current password, but the story does not quote a message.
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
  allergyWarning: (allergen) => `This meal contains ${allergen}, which is listed in your profile.`,
  noExactCombo: 'No exact match is available. Here is the closest option.',
  notMedicalAdvice: "Suggestions are not medical advice. Follow your doctor or dietitian's guidance.",
};

export const waitForCode = (seconds) =>
  `Please wait ${seconds} seconds before requesting a new code.`;

export const SMS_TEMPLATE =
  'Your verification code is 123456. It expires in 10 minutes. Do not share this code.';
export const EMAIL_SUBJECT = 'Your verification code';
export const EMAIL_TEMPLATE =
  'Your verification code is 123456. It expires in 10 minutes. If you did not ask for this code, ignore this email.';
