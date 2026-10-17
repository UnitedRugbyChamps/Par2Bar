import { Platform } from 'react-native';

/* Monochrome, like a black-tie scorecard: black, white and warm greys, with
 * a champagne accent taken from the clubhouse-cream of a printed logo. */
export const C = {
  bg: '#F7F7F5',
  card: '#FFFFFF',
  ink: '#0B0B0B',
  charcoal: '#1C1C1B',
  sub: '#6E6E6A',
  faint: '#A9A9A4',
  line: '#E8E8E4',
  soft: '#F0F0ED',
  white: '#FFFFFF',
  brand: '#0B0B0B',
  brandSoft: '#F0F0ED',
  champagne: '#D9C7A0',
  accent: '#D9C7A0',
  danger: '#C8312B',
  under: '#D23B33', // under par in red, the way scoreboards do
  over: '#0B0B0B',
  live: '#E5484D',
  // scorecard marks stay monochrome; colours are kept only for small chips
  eagle: '#0B0B0B',
  birdie: '#0B0B0B',
  bogey: '#0B0B0B',
  double: '#0B0B0B',
};

export const F = {
  display: 'JosefinSans_300Light',
  displayMed: 'JosefinSans_500Medium',
  displayBold: 'JosefinSans_700Bold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semi: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  heavy: 'DMSans_800ExtraBold',
  black: 'DMSans_900Black',
};

export const R = { sm: 10, md: 14, lg: 22, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
});

export const teamColors = ['#0B0B0B', '#9A9A94', '#D9C7A0', '#5B5B57', '#B6A27A', '#2F2F2D', '#CFCFCA', '#7A6A4C'];
