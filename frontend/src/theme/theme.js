export const colors = {
  primary: '#1F7A40',
  primaryDark: '#14552D',
  action: '#1F7A40',
  secondary: '#27633B',
  background: '#FFFFFF',
  page: '#FFFFFF',
  surface: '#F4F6F5',
  soft: '#E8F5EA',
  white: '#FFFFFF',
  border: '#E6E8E6',
  text: '#1A241C',
  muted: '#66716A',
  inactive: '#9CA3AF',
  danger: '#B42318',
  warning: '#9A5B00',
  success: '#1F7A40',
  tint: '#E8F5EA',
  deep: '#14552D',
  accent: '#D98A20',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const font = { xs: 11, sm: 12, md: 14, body: 16, lg: 18, xl: 22, title: 28 };
export const touch = { min: 48 };
export const control = { minHeight: touch.min };

export const shadow = {
  shadowColor: '#102016',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export const card = {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.lg,
  ...shadow,
};
