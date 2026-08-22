import { memo } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { GlobalData, InvestmentBaseMode, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type InvestimentosCardProps = {
  theme: Tema
  percentualExibicao: number
  baseModo: InvestmentBaseMode
  baseValor: number
  valorSugerido: number
  manualInput: string
  onManualInputChange: (value: string) => void
  onPercentualChange: (valor: number) => void
  onPreferenciasChange: (
    payload: Partial<Pick<GlobalData, 'investmentPercentage' | 'investmentBaseMode' | 'hideValues'>>
  ) => void
  onManualFieldLayout: (y: number) => void
  onManualFieldFocus: () => void
  formatarValorVisivel: (valor: number) => string
  formatarPercentualVisivel: (valor: number) => string
}

const ATALHOS_PERCENTUAL = [5, 10, 15, 20, 30]

/**
 * Card de investimentos.
 *
 * A versao anterior tinha uma trilha arrastavel, uma escala de pilulas, um
 * campo manual e varios blocos de apoio disputando a mesma area — muita
 * mecanica para uma decisao simples. Aqui a pergunta vem primeiro ("quanto
 * guardar por mes"), a resposta aparece grande, e os controles ficam abaixo:
 * atalhos para os percentuais comuns e um campo para ajuste fino.
 */
function InvestimentosCard({
  theme,
  percentualExibicao,
  baseModo,
  baseValor,
  valorSugerido,
  manualInput,
  onManualInputChange,
  onPercentualChange,
  onPreferenciasChange,
  onManualFieldLayout,
  onManualFieldFocus,
  formatarValorVisivel,
  formatarPercentualVisivel,
}: InvestimentosCardProps) {
  const aplicarPercentualManual = (value: string) => {
    const sanitized = String(value || '').replace(/[^\d,.]/g, '').replace('.', ',')
    const partes = sanitized.split(',')
    const valorFinal = partes.length > 2 ? `${partes[0]},${partes.slice(1).join('')}` : sanitized
    onManualInputChange(valorFinal)
    const normalizado = Number(valorFinal.replace(',', '.'))
    if (!Number.isNaN(normalizado)) {
      onPercentualChange(normalizado)
    }
  }

  const baseRotulo = baseModo === 'salary' ? 'salário' : 'salário + entradas'

  return (
    <View
      style={[
        styles.investmentCard,
        { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow },
      ]}
    >
      {/* Cabecalho */}
      <View style={local.cabecalho}>
        <View style={[local.icone, { backgroundColor: theme.greenSoft }]}>
          <Icon name="investir" size={19} color={theme.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.investmentTitle, { color: theme.text }]}>Investimentos</Text>
          <Text style={[local.subtitulo, { color: theme.muted }]}>
            Quanto guardar por mês
          </Text>
        </View>
      </View>

      {/* A resposta, em destaque */}
      <View style={[local.destaque, { backgroundColor: theme.greenSoft, borderColor: theme.border }]}>
        <Text style={[local.destaqueValor, { color: theme.green }]} numberOfLines={1}>
          {formatarValorVisivel(valorSugerido)}
        </Text>
        <Text style={[local.destaqueMeta, { color: theme.muted }]}>
          {formatarPercentualVisivel(percentualExibicao)} de {formatarValorVisivel(baseValor)} ({baseRotulo})
        </Text>
      </View>

      {/* Base de calculo */}
      <Text style={[local.rotuloSecao, { color: theme.muted }]}>Calcular sobre</Text>
      <View style={local.linhaBase}>
        {([
          ['salary', 'Salário'],
          ['salary_plus_entries', 'Salário + entradas'],
        ] as [InvestmentBaseMode, string][]).map(([modo, label]) => {
          const ativo = baseModo === modo
          return (
            <PressableScale
              key={modo}
              onPress={() => onPreferenciasChange({ investmentBaseMode: modo })}
              style={[
                local.chipBase,
                {
                  backgroundColor: ativo ? theme.primary : theme.cardSoft,
                  borderColor: ativo ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[local.chipBaseTexto, { color: ativo ? theme.textInverse : theme.text }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      {/* Percentual */}
      <Text style={[local.rotuloSecao, { color: theme.muted }]}>Percentual</Text>
      <View style={local.linhaPercentual}>
        {ATALHOS_PERCENTUAL.map((valor) => {
          const ativo = Math.abs(percentualExibicao - valor) < 0.01
          return (
            <PressableScale
              key={valor}
              onPress={() => {
                onPercentualChange(valor)
                onManualInputChange(String(valor))
              }}
              style={[
                local.chipPercentual,
                {
                  backgroundColor: ativo ? theme.accentSoft : theme.cardSoft,
                  borderColor: ativo ? theme.accent : theme.border,
                },
              ]}
            >
              <Text style={[local.chipPercentualTexto, { color: ativo ? theme.accent : theme.text }]}>
                {valor}%
              </Text>
            </PressableScale>
          )
        })}
      </View>

      <View
        style={local.campoManualWrap}
        onLayout={(event) => onManualFieldLayout(event.nativeEvent.layout.y)}
      >
        <Text style={[local.campoManualRotulo, { color: theme.muted }]}>Outro valor</Text>
        <View style={[local.campoManual, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <TextInput
            value={manualInput}
            onChangeText={aplicarPercentualManual}
            onFocus={onManualFieldFocus}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor={theme.faint}
            style={[local.campoManualInput, { color: theme.text }]}
            maxLength={5}
          />
          <Text style={[local.campoManualSufixo, { color: theme.muted }]}>%</Text>
        </View>
      </View>
    </View>
  )
}

const local = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  icone: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subtitulo: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  destaque: { borderRadius: 20, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' },
  destaqueValor: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  destaqueMeta: { fontSize: 12, fontWeight: '600', marginTop: 5, textAlign: 'center', lineHeight: 17 },

  rotuloSecao: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },

  linhaBase: { flexDirection: 'row', gap: 8 },
  chipBase: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  chipBaseTexto: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  linhaPercentual: { flexDirection: 'row', gap: 8 },
  chipPercentual: { flex: 1, minHeight: 42, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipPercentualTexto: { fontSize: 13, fontWeight: '800' },

  campoManualWrap: { marginTop: 14 },
  campoManualRotulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  campoManual: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
    gap: 4,
  },
  campoManualInput: { width: 58, fontSize: 16, fontWeight: '800', paddingVertical: 0, textAlign: 'right' },
  campoManualSufixo: { fontSize: 15, fontWeight: '800' },
})

export default memo(InvestimentosCard)
