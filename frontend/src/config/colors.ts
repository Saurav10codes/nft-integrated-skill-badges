// Neobrutalism Design System Color Palette
// Using vibrant colors for bold, playful UI

// CSS Custom Properties (for use in components)
export const cssVariables = {
  // Light theme
  light: {
    background: 'oklch(93.46% 0.0304 254.32)',
    secondaryBackground: 'oklch(100% 0 0)',
    foreground: 'oklch(0% 0 0)',
    mainForeground: 'oklch(0% 0 0)',
    main: 'oklch(67.47% 0.1725 259.61)', // Primary blue
    border: 'oklch(0% 0 0)',
    ring: 'oklch(0% 0 0)',
    overlay: 'oklch(0% 0 0 / 0.8)',
  },
  // Dark theme
  dark: {
    background: 'oklch(29.12% 0.0633 270.86)',
    secondaryBackground: 'oklch(23.93% 0 0)',
    foreground: 'oklch(92.49% 0 0)',
    mainForeground: 'oklch(0% 0 0)',
    border: 'oklch(0% 0 0)',
    ring: 'oklch(100% 0 0)',
  }
};

// Vibrant accent colors for neobrutalism design
export const accentColors = {
  // Primary colors
  purple: '#A855F7',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  teal: '#14B8A6',
  green: '#10B981',
  lime: '#84CC16',
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#EF4444',
  pink: '#EC4899',
  
  // Pastel backgrounds
  purpleLight: '#F3E8FF',
  blueLight: '#DBEAFE',
  cyanLight: '#CFFAFE',
  tealLight: '#CCFBF1',
  greenLight: '#D1FAE5',
  limeLight: '#ECFCCB',
  yellowLight: '#FEF9C3',
  orangeLight: '#FFEDD5',
  redLight: '#FEE2E2',
  pinkLight: '#FCE7F3',
};

// Named colors for specific use cases
export const colors = {
  // Neobrutalism vibrant palette
  primary: '#6366f1', // Indigo
  secondary: '#f59e0b', // Amber
  accent: '#ec4899', // Pink
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  error: '#ef4444', // Red
  info: '#3b82f6', // Blue
  
  // Chart colors (vibrant)
  chart1: '#6366f1', // Indigo
  chart2: '#f59e0b', // Amber
  chart3: '#10b981', // Green/Lime
  chart4: '#06b6d4', // Cyan
  chart5: '#8b5cf6', // Purple
  
  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  background: '#eef1ff',
  secondaryBackground: '#ffffff',
  
  // Spread accent colors
  ...accentColors,
};

// All available colors array
export const allColors = [
  colors.primary,
  colors.secondary,
  colors.accent,
  colors.success,
  colors.warning,
  colors.error,
  colors.purple,
  colors.blue,
  colors.teal,
  colors.orange,
  colors.pink,
];

// Background styles using vibrant colors
export const backgrounds = {
  primary: colors.blueLight,
  secondary: colors.yellowLight,
  accent: colors.pinkLight,
  success: colors.greenLight,
  warning: colors.orangeLight,
  error: colors.redLight,
  purple: colors.purpleLight,
  teal: colors.tealLight,
  gradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
};

// Box shadow configuration
export const shadows = {
  base: '4px 4px 0px 0px #000',
  reverse: '-4px -4px 0px 0px #000',
  lg: '6px 6px 0px 0px #000',
  none: 'none',
};
