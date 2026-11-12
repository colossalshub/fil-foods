import type { StaffRole } from './types';

export const DEMO_PASSWORD = 'Admin@2026';

export const COPY = {
  brand: 'F.I.L. Foods',
  tagline: 'Manage. Serve. Nourish.',
  invalidEmail: 'Invalid email. Add an @ before filfoods.ph and try again.',
  wrongPassword: 'Incorrect password. Try again or tap Forgot password?',
  blank: 'Email and password are required.',
  offline: 'Could not connect',
  checkEmail: 'Check your email',
  checkEmailBody: 'If an account exists for this address, a reset link is on its way.',
  badResetEmail: 'Check the email address below.',
  passwordMismatch: 'Passwords do not match…',
  passwordUpdated: 'Password updated',
  linkExpired: 'Link expired',
  requestNewLink: 'Request a new link',
  shortPassword: 'Password must be at least 8 characters.',
  enterPassword: 'Enter a new password in both fields.',
  notAuthorized: 'Account not authorized',
  noSession: 'No session has been created.',
  loggedIn: 'Logged in successfully',
  logoutTitle: 'Log out of F.I.L. Foods?',
  stay: 'Stay logged in',
  logOut: 'Log out',
  signInRequired: 'Sign in required',
  goToLogin: 'Go to login',
  caughtUp: "You're all caught up.",
  profileUpdated: 'Profile updated',
  badProfileEmail: 'Enter a valid email address.',
  leaveTitle: 'Leave without saving your changes?',
  helpSent: 'Message sent',
  helpEmpty: 'Please enter a message before sending.',
  welcome: 'Welcome back, Admin!',
  noOrders: 'No orders found',
  clearSearch: 'Clear search',
  noOrderSelected: 'No order selected',
  staffAdded: 'Staff added successfully',
  duplicateEmail: 'Email is already used by another staff account.',
  staffUpdated: 'Staff updated successfully',
  staffDeleted: 'Staff deleted successfully',
  deleteWarn: 'This action cannot be undone.',
  yesDelete: 'Yes, delete',
  noKeep: 'No, keep staff',
  priceError: 'Enter a numeric price greater than ₱0.00.',
  menuRequired: 'Name, category, price, and availability are required.',
  notSelectable: 'Not selectable for new orders.',
  menuDeleted: 'This item is no longer available for new orders.',
  notificationsSaved: 'Notification settings saved.',
  turnOff: 'Turn off',
  monthEmpty: 'Monthly data is not supplied.',
  roleLocked: "Role can't be changed here.",
  deniedNotifications: "You can't change notification settings.",
  disabledAccount: 'This account can no longer sign in.',
  setPasswordFirst: 'Set a password from the setup link before signing in.',
  keepEditing: 'Keep editing',
  saveChanges: 'Save changes',
  leave: 'Leave',
  readOnlyOrder: 'Delivered and cancelled orders are read-only.',
  chooseDelivery: 'Choose a delivery staff member.',
  cannotDeleteSelf: "You can't delete your own account.",
  nothingChanged: 'Nothing changed.',
  staffRequired: 'Full name, email, and role are required.',
} as const;

const PANELS: Record<StaffRole, string> = {
  admin: 'Admin Panel',
  dietitian: 'Dietitian Panel',
  kitchen: 'Kitchen Panel',
  delivery: 'Delivery Panel',
};

export function panelTitle(role: StaffRole) {
  return PANELS[role];
}

export function demoEmail(role: StaffRole) {
  if (role === 'dietitian') return 'maria.santos@filfoods.ph';
  if (role === 'kitchen') return 'juan.delacruz@filfoods.ph';
  if (role === 'delivery') return 'ana.reyes@filfoods.ph';
  return 'admin@filfoods.ph';
}
