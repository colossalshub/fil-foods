import type { Appearance } from './types';

export interface Palette {
  page: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  green: string;
  greenDeep: string;
  primary: string;
  mint: string;
  header: string;
  danger: string;
  input: string;
  positive: string;
  chip: string;
}

export const lightPalette: Palette = {
  page: '#F3F6EF',
  card: '#FFFFFF',
  text: '#1C2B22',
  muted: '#6E7A72',
  border: '#E3E8E2',
  green: '#146B38',
  greenDeep: '#0E542C',
  primary: '#1C773A',
  mint: '#E5F6E8',
  header: '#146B38',
  danger: '#D76566',
  input: '#FFFFFF',
  positive: '#1C773A',
  chip: '#FFFFFF',
};

export const darkPalette: Palette = {
  page: '#101612',
  card: '#1A2420',
  text: '#F3F7F4',
  muted: '#A9B5AE',
  border: '#2C3B33',
  green: '#1C773A',
  greenDeep: '#8ED7A8',
  primary: '#8ED7A8',
  mint: '#1B3324',
  header: '#0E542C',
  danger: '#E07A7B',
  input: '#15201B',
  positive: '#8ED7A8',
  chip: '#1A2420',
};

export function paletteFor(mode: 'light' | 'dark') {
  return mode === 'dark' ? darkPalette : lightPalette;
}

export function resolvedMode(appearance: Appearance, device: string | null | undefined): 'light' | 'dark' {
  if (appearance === 'system') return device === 'dark' ? 'dark' : 'light';
  return appearance;
}
