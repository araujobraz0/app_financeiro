import { memo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import type { Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'

export type FatiaPizza = {
  categoria: string
  valor: number
  percentual: number
  cor: string
}

type GraficoCategoriasCardProps = {
  theme: Tema
  dadosPizza: FatiaPizza[]
  formatarValorVisivel: (valor: number) => string
}

const CENTER_X = 68
const CENTER_Y = 68
const RAIO_EXTERNO = 58
const RAIO_INTERNO = 34

// Geometria do donut. Ficava no home.tsx, mas so este componente usa.
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  }
}

function createDonutSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle)
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle)
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

/**
 * Grafico de saidas por categoria, em formato donut, com legenda ao lado.
 */
function GraficoCategoriasCard({ theme, dadosPizza, formatarValorVisivel }: GraficoCategoriasCardProps) {
  const totalCategorias = dadosPizza.reduce((acc, item) => acc + item.valor, 0)

  // O angulo acumulado e calculado durante o map das fatias.
  let anguloAtual = 0

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.chartTitle, { color: theme.text }]}>Saídas por categoria</Text>

      {dadosPizza.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma saída categorizada ainda.</Text>
        </View>
      ) : (
        <View style={styles.chartContentRow}>
          <View style={styles.pieWrapSide}>
            <Svg width={136} height={136} viewBox='0 0 136 136'>
              <G rotation='0' origin='68, 68'>
                {dadosPizza.length === 1 ? (
                  <Circle
                    cx={CENTER_X}
                    cy={CENTER_Y}
                    r={(RAIO_EXTERNO + RAIO_INTERNO) / 2}
                    stroke={dadosPizza[0].cor}
                    strokeWidth={RAIO_EXTERNO - RAIO_INTERNO}
                    fill='none'
                  />
                ) : (
                  dadosPizza.map((item) => {
                    const varredura = totalCategorias > 0 ? (item.valor / totalCategorias) * 360 : 0
                    const anguloInicial = anguloAtual
                    const anguloFinal = anguloAtual + varredura
                    anguloAtual = anguloFinal
                    const path = createDonutSlicePath(
                      CENTER_X,
                      CENTER_Y,
                      RAIO_EXTERNO,
                      RAIO_INTERNO,
                      anguloInicial,
                      anguloFinal
                    )
                    return <Path key={item.categoria} d={path} fill={item.cor} />
                  })
                )}
                <Circle cx={CENTER_X} cy={CENTER_Y} r={RAIO_INTERNO - 2} fill={theme.card} />
              </G>
            </Svg>
            <View style={styles.pieCenterLabel}>
              <Text style={[styles.pieCenterSmall, { color: theme.muted }]}>Total</Text>
              <Text style={[styles.pieCenterValue, { color: theme.text }]}>{formatarValorVisivel(totalCategorias)}</Text>
            </View>
          </View>

          <View style={styles.legendSideList}>
            {dadosPizza.map((item) => (
              <View
                key={item.categoria}
                style={[styles.legendSideItem, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
              >
                <View style={styles.legendSideTop}>
                  <View style={[styles.legendDot, { backgroundColor: item.cor }]} />
                  <Text style={[styles.legendCategory, { color: theme.text }]} numberOfLines={1}>
                    {item.categoria}
                  </Text>
                </View>
                <Text style={[styles.legendPercentInline, { color: theme.muted }]}>
                  {item.percentual.toFixed(1).replace('.', ',')}%
                </Text>
                <Text style={[styles.legendValueInline, { color: theme.text }]} numberOfLines={1}>
                  {formatarValorVisivel(item.valor)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

export default memo(GraficoCategoriasCard)
