// Sistema de movimento do Brazllet.
//
// Centraliza curvas, duracoes e presets de mola para que toda animacao do app
// tenha a mesma personalidade. Preferir sempre estes valores a numeros soltos
// espalhados pelos componentes.

import { Easing, ReduceMotion } from 'react-native-reanimated'

/** Duracoes base, em ms. */
export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 340,
  slower: 480,
} as const

/**
 * Curva padrao do app (equivalente ao "standard easing" do Material 3):
 * sai rapido, chega devagar. Boa para fade e mudanca de cor.
 */
export const easing = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  emphasized: Easing.bezier(0.05, 0.7, 0.1, 1),
} as const

/**
 * Presets de mola. `damping` alto = menos balanco.
 * `reduceMotion: System` respeita "reduzir movimento" do sistema — acessibilidade
 * sem custo, o Reanimated troca por um salto direto quando o usuario pediu isso.
 */
export const spring = {
  /** Padrao: resposta viva, quase sem overshoot. Botoes, chips, indicadores. */
  snappy: {
    damping: 20,
    stiffness: 260,
    mass: 0.7,
    reduceMotion: ReduceMotion.System,
  },
  /** Modais e cards: um leve overshoot que da sensacao de material real. */
  gentle: {
    damping: 17,
    stiffness: 170,
    mass: 0.9,
    reduceMotion: ReduceMotion.System,
  },
  /** Mais elastico, para o botao "+" e acoes de destaque. */
  bouncy: {
    damping: 12,
    stiffness: 220,
    mass: 0.8,
    reduceMotion: ReduceMotion.System,
  },
} as const

/** Atraso entre itens numa entrada em cascata. */
export const STAGGER_MS = 40
/** Teto de itens que recebem atraso — evita o ultimo card demorar demais. */
export const STAGGER_MAX_ITEMS = 8

/** Atraso da cascata para o item de indice `index`. */
export function staggerDelay(index: number, step: number = STAGGER_MS) {
  return Math.min(index, STAGGER_MAX_ITEMS) * step
}

/** Escala aplicada no toque. */
export const PRESS_SCALE = 0.97
/** Escala inicial da entrada de modal. */
export const MODAL_SCALE_FROM = 0.92
