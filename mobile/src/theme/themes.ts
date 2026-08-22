// Paleta do Brazllet — redesign "moderno, mesma alma".
//
// A identidade continua verde + dourado, mas a execucao mudou: mais
// contraste, escuros com fundo verde-carvao (nao preto puro), acentos mais
// saturados e um conjunto de tokens novos para profundidade, gradiente,
// estados semanticos e skeleton.
//
// Regra que o app ja seguia e foi mantida: `primary` e a cor de acao de cada
// tema (verde no claro, dourado no escuro). `accent` e sempre o dourado da
// marca, nos dois temas, para premium e destaques.

import type { Tema } from '../../app/types'

export const THEME_KEY = 'controle-financeiro-tema-mobile'
export const THEME_MODE_KEY = 'controle-financeiro-tema-modo-mobile'

export const lightTheme: Tema = {
  background: '#F8F7F2',
  backgroundSoft: '#F1F0E7',
  card: '#FFFFFF',
  cardSoft: '#F7F6F0',
  text: '#12251A',
  muted: '#5F7267',
  border: '#E5E3D7',
  borderStrong: '#CDBE92',
  primary: '#1B7A45',
  green: '#159455',
  red: '#D2453F',
  blue: '#2F6F92',
  shadow: 'rgba(24, 43, 32, 0.10)',
  white: '#FFFFFF',

  surface: '#FFFFFF',
  accent: '#C89B2C',
  accentSoft: 'rgba(200, 155, 44, 0.13)',
  textInverse: '#FFFFFF',
  faint: '#8C9A90',
  overlay: 'rgba(14, 30, 21, 0.42)',
  shadowStrong: 'rgba(24, 43, 32, 0.20)',
  gradientFrom: '#1B7A45',
  gradientTo: '#2FA765',
  greenSoft: 'rgba(21, 148, 85, 0.12)',
  redSoft: 'rgba(210, 69, 63, 0.11)',
  blueSoft: 'rgba(47, 111, 146, 0.11)',
  skeleton: '#E9E7DC',
  skeletonHighlight: '#F5F4EE',
}

export const darkTheme: Tema = {
  background: '#0A100D',
  backgroundSoft: '#0F1712',
  card: '#121A16',
  cardSoft: '#18231D',
  text: '#F4F7F2',
  muted: '#94A79C',
  border: '#22302A',
  borderStrong: '#3A4F44',
  primary: '#E8C462',
  green: '#34D77F',
  red: '#FF6B7A',
  blue: '#6FB3E8',
  shadow: 'rgba(0, 0, 0, 0.55)',
  white: '#FFFFFF',

  surface: '#18231D',
  accent: '#E8C462',
  accentSoft: 'rgba(232, 196, 98, 0.15)',
  textInverse: '#08120C',
  faint: '#6B8074',
  overlay: 'rgba(2, 7, 5, 0.68)',
  shadowStrong: 'rgba(0, 0, 0, 0.72)',
  gradientFrom: '#123A26',
  gradientTo: '#1E5C3A',
  greenSoft: 'rgba(52, 215, 127, 0.14)',
  redSoft: 'rgba(255, 107, 122, 0.13)',
  blueSoft: 'rgba(111, 179, 232, 0.13)',
  skeleton: '#1A241F',
  skeletonHighlight: '#24312A',
}
