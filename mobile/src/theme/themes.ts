import type { Tema } from '../../app/types'

export const THEME_KEY = 'controle-financeiro-tema-mobile'
export const THEME_MODE_KEY = 'controle-financeiro-tema-modo-mobile'

export const lightTheme: Tema = {
  background: '#f6f4ee',
  backgroundSoft: '#eeeadf',
  card: '#fffdf8',
  cardSoft: '#f4efe4',
  text: '#17361f',
  muted: '#6f7c67',
  border: '#ddd3be',
  borderStrong: '#ccb98f',
  primary: '#1f5a34',
  green: '#2c7a4a',
  red: '#c24f4f',
  blue: '#3c6d88',
  shadow: 'rgba(49, 41, 17, 0.12)',
  white: '#ffffff',
}

export const darkTheme: Tema = {
  background: '#000000',
  backgroundSoft: '#0d1512',
  card: '#111a16',
  cardSoft: '#16231d',
  text: '#f7f4ea',
  muted: '#ddd7c9',
  border: '#2b3d33',
  borderStrong: '#ffffff',
  primary: '#d4a93e',
  green: '#57ba77',
  red: '#f17373',
  blue: '#8ab8df',
  shadow: 'rgba(0, 0, 0, 0.46)',
  white: '#ffffff',
}
