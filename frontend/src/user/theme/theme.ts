export const colors = {
  primary: '#174D3A',
  primaryDark: '#10382B',
  action: '#174D3A',
  secondary: '#174D3A',
  background: '#FFF8E9',
  page: '#FFF8E9',
  authPage: '#F6F9EF',
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
  mint: '#E8F4EA',
  mintStrong: '#DCEAD8',
  mintBorder: '#B8D9C0',
  cardBorder: '#E4EAE2',
  heading: '#1C3B2E',
};

/**
 * Typography follows the F.I.L Foods design guide (Poppins). Families are loaded once in App.tsx
 * with expo-font; each weight is its own family, so styles set `fontFamily` instead of `fontWeight`.
 */
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };
export const font = { xs: 16, sm: 16, md: 16, body: 16, lg: 18, xl: 22, title: 28 };
/** Shared text presets so every screen uses the same hierarchy (USR-48 consistent visual design). */
export const type = {
  pageTitle: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 36, color: colors.heading },
  pageSubtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.muted },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: colors.heading },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.heading },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.text },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
} as const;

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
