export const RIVER_DIGITAL = {
  name: 'River Digital',
  tag: 'river_digital' as const,
  primary: '#3A6FD8',
  dark: '#2F57AA',
  light: '#7FA6FF',
  veryLight: '#C9D9FF',
}

export const RIVER_SOFTWARE = {
  name: 'River Software',
  tag: 'river_software' as const,
  primary: '#1F8A9B',
  dark: '#176C79',
  light: '#5FBBC7',
  veryLight: '#A9DDE4',
}

export function getBedrijfConfig(tag: 'river_digital' | 'river_software') {
  return tag === 'river_digital' ? RIVER_DIGITAL : RIVER_SOFTWARE
}
