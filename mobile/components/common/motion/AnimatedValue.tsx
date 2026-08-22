// Valor numerico que "conta" ate o novo numero em vez de saltar.
//
// Continua renderizando um <Text> comum — nao um TextInput animado — de
// proposito: os valores-destaque do app ja tem estilos de fonte/alinhamento
// bem ajustados, e trocar o elemento mudaria o layout. Como so os numeros
// principais usam isso (saldo, salario, resumo), interpolar no JS e barato.

import { useEffect, useRef, useState } from 'react'
import { Text, type TextProps } from 'react-native'

import { duration as motionDuration } from '../../../src/theme/motion'

type Props = Omit<TextProps, 'children'> & {
  value: number
  /** Formatador aplicado ao valor corrente. Ex.: formatarMoeda. */
  format: (valor: number) => string
  /** Quando true, mostra `hiddenText` e nao anima. */
  hidden?: boolean
  hiddenText?: string
  durationMs?: number
}

/** Mesma curva do resto do app (standard easing), resolvida em JS. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function AnimatedValue({
  value,
  format,
  hidden = false,
  hiddenText = '••••••',
  durationMs = motionDuration.slower,
  ...textProps
}: Props) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const currentRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    // Sem animacao quando os valores estao ocultos: nao ha numero visivel para
    // interpolar, e ao reexibir queremos o valor certo imediatamente.
    if (hidden) {
      fromRef.current = value
      currentRef.current = value
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const to = value

    if (from === to) return

    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / durationMs, 1)
      const current = from + (to - from) * easeOutCubic(progress)

      currentRef.current = progress === 1 ? to : current
      setDisplay(currentRef.current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      // Guarda onde a animacao parou — nao o alvo — para que uma troca de mes
      // no meio da contagem continue de onde estava, sem salto.
      fromRef.current = currentRef.current
    }
  }, [durationMs, hidden, value])

  return <Text {...textProps}>{hidden ? hiddenText : format(display)}</Text>
}
