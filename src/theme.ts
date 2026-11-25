export const lightColors = {
  green: '#0F8A5F',
  greenDark: '#086A49',
  greenSoft: '#DFF4EA',
  cream: '#F8F4EA',
  surface: '#FFFFFF',
  surfaceAlt: '#F4FFF9',
  ink: '#17342A',
  muted: '#6D7F78',
  line: '#E5E8E3',
  red: '#C54A4A',
  amber: '#F2B134',
  white: '#FFFFFF',
  panel: '#17342A',
  featuredSurface: '#F4FFF9',
  featuredBorder: '#CDEBDD',
  sampleSurface: '#E7EFEA',
  sampleAccent: '#CBE5D9',
  noticeSurface: '#FFF9E8',
  noticeBorder: '#F3E1A6',
  noticeText: '#725B1A',
  bestSurface: '#F8FFFB',
  tabInactive: '#EEF1EF',
  heroEyebrow: '#CFF2E2',
  heroText: '#E2F6EC',
  panelMuted: '#C7D4CF',
  panelAccent: '#9CE5C6',
};

export const darkColors = {
  green: '#27B77D',
  greenDark: '#7DE0B8',
  greenSoft: '#173D2E',
  cream: '#0C1410',
  surface: '#151F1A',
  surfaceAlt: '#1A2B22',
  ink: '#F2F7F4',
  muted: '#9AAEA4',
  line: '#2B3A32',
  red: '#FF7A7A',
  amber: '#F6C453',
  white: '#FFFFFF',
  panel: '#111A16',
  featuredSurface: '#12251C',
  featuredBorder: '#28543F',
  sampleSurface: '#1D2B24',
  sampleAccent: '#284A3B',
  noticeSurface: '#2A2415',
  noticeBorder: '#55451E',
  noticeText: '#E6CD7A',
  bestSurface: '#12251C',
  tabInactive: '#202B25',
  heroEyebrow: '#CFF2E2',
  heroText: '#E2F6EC',
  panelMuted: '#AFC1B8',
  panelAccent: '#8FE0BC',
};

export type ThemeColors = typeof lightColors;

// Kept for compatibility with any existing imports outside App.tsx.
export const colors = lightColors;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
