export const colors = {
  primary: '#174D3A',
  primaryDark: '#10382B',
  action: '#174D3A',
  secondary: '#174D3A',
  background: '#FFF8E9',
  page: '#FFF8E9',
  surface: '#FFFFFF',
  soft: '#E9F0E6',
  white: '#FFFFFF',
  border: '#D6DDD5',
  text: '#343A35',
  muted: '#59625C',
  inactive: '#747B75',
  danger: '#B42318',
  warning: '#9A5B00',
  success: '#174D3A',
  tint: '#E9F0E6',
  deep: '#10382B',
  accent: '#E9A23B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const font = { xs: 16, sm: 16, md: 16, body: 16, lg: 18, xl: 22, title: 28 };
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
