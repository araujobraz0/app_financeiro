import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
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

const TAMANHO = 170
const CENTRO = TAMANHO / 2
const RAIO_EXTERNO = 74
const RAIO_INTERNO = 50

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
 * Saidas por categoria.
 *
 * A legenda ficava ao lado do donut, espremida em pouco mais de 170px com
 * ponto + nome + percentual + valor na mesma linha — por isso os nomes de
 * categoria eram cortados. Agora o donut fica em cima, centralizado, e cada
 * categoria ocupa a largura inteira abaixo dele, com uma barra proporcional
 * que torna a comparacao entre categorias imediata.
 */
function GraficoCategoriasCard({ theme, dadosPizza, formatarValorVisivel }: GraficoCategoriasCardProps) {
  const totalCategorias = dadosPizza.reduce((acc, item) => acc + item.valor, 0)
  const maiorValor = dadosPizza.reduce((acc, item) => Math.max(acc, item.valor), 0)

  let anguloAtual = 0

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.chartTitle, { color: theme.text }]}>Saídas por categoria</Text>

      {dadosPizza.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>
            Nenhuma saída categorizada ainda.
          </Text>
        </View>
      ) : (
        <>
          <View style={local.donutWrap}>
            <Svg width={TAMANHO} height={TAMANHO} viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}>
              <G rotation="0" origin={`${CENTRO}, ${CENTRO}`}>
                {dadosPizza.length === 1 ? (
                  <Circle
                    cx={CENTRO}
                    cy={CENTRO}
                    r={(RAIO_EXTERNO + RAIO_INTERNO) / 2}
                    stroke={dadosPizza[0].cor}
                    strokeWidth={RAIO_EXTERNO - RAIO_INTERNO}
                    fill="none"
                  />
                ) : (
                  dadosPizza.map((item) => {
                    const varredura = totalCategorias > 0 ? (item.valor / totalCategorias) * 360 : 0
                    const anguloInicial = anguloAtual
                    const anguloFinal = anguloAtual + varredura
                    anguloAtual = anguloFinal
                    return (
                      <Path
                        key={item.categoria}
                        d={createDonutSlicePath(
                          CENTRO,
                          CENTRO,
                          RAIO_EXTERNO,
                          RAIO_INTERNO,
                          anguloInicial,
                          anguloFinal
                        )}
                        fill={item.cor}
                      />
                    )
                  })
                )}
                <Circle cx={CENTRO} cy={CENTRO} r={RAIO_INTERNO - 1} fill={theme.card} />
              </G>
            </Svg>

            <View style={local.centro} pointerEvents="none">
              <Text style={[local.centroRotulo, { color: theme.muted }]}>Total</Text>
              <Text
                style={[local.centroValor, { color: theme.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatarValorVisivel(totalCategorias)}
              </Text>
            </View>
          </View>

          <View style={local.lista}>
            {dadosPizza.map((item) => {
              const proporcao = maiorValor > 0 ? item.valor / maiorValor : 0
              return (
                <View key={item.categoria} style={local.item}>
                  <View style={local.itemTopo}>
                    <View style={[local.ponto, { backgroundColor: item.cor }]} />
                    {/* Sem numberOfLines: nome de categoria nunca e cortado */}
                    <Text style={[local.nome, { color: theme.text }]}>{item.categoria}</Text>
                    <Text style={[local.valor, { color: theme.text }]} numberOfLines={1}>
                      {formatarValorVisivel(item.valor)}
                    </Text>
                  </View>

                  <View style={local.barraLinha}>
                    <View style={[local.trilha, { backgroundColor: theme.backgroundSoft }]}>
                      <View
                        style={[
                          local.preenchimento,
                          { width: `${Math.max(3, proporcao * 100)}%`, backgroundColor: item.cor },
                        ]}
                      />
                    </View>
                    <Text style={[local.percentual, { color: theme.muted }]}>
                      {item.percentual.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}

const local = StyleSheet.create({
  donutWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  centro: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 92 },
  centroRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  centroValor: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },

  lista: { marginTop: 12, gap: 14 },
  item: { gap: 7 },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ponto: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  nome: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  valor: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, flexShrink: 0 },
  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trilha: { flex: 1, height: 7, borderRadius: 999, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: 999 },
  percentual: { fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },
})

export default memo(GraficoCategoriasCard)
