import { memo } from 'react'
import { Platform, Text, TextInput, View } from 'react-native'
import type { GlobalData, InvestmentBaseMode, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
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

const ATALHOS_PERCENTUAL = [5, 10, 15, 20]

/**
 * Card de investimentos: escolhe a base de calculo (salario ou salario mais
 * entradas) e o percentual, e mostra o aporte sugerido.
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

  const chipBase = (modo: InvestmentBaseMode, label: string) => (
    <PressableScale
      onPress={() => onPreferenciasChange({ investmentBaseMode: modo })}
      style={[
        styles.investmentBaseChip,
        {
          backgroundColor: baseModo === modo ? theme.primary : theme.cardSoft,
          borderColor: baseModo === modo ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={[styles.investmentBaseChipText, { color: baseModo === modo ? theme.white : theme.text }]}>
        {label}
      </Text>
    </PressableScale>
  )

  return (
    <View style={[styles.investmentCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View style={styles.investmentHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.investmentTitle, { color: theme.text }]}>Investimentos do mês</Text>
          <Text style={[styles.investmentSub, { color: theme.muted }]}>
            Defina um percentual para separar automaticamente.
          </Text>
        </View>
        <View style={[styles.investmentBadge, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}>
          <Text style={[styles.investmentBadgeText, { color: theme.text }]}>
            {formatarPercentualVisivel(percentualExibicao)}
          </Text>
        </View>
      </View>

      <View style={styles.investmentBaseRow}>
        {chipBase('salary', 'Salário')}
        {chipBase('salary_plus_entries', 'Salário + entradas')}
      </View>

      <View style={[styles.investmentHighlightCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderStrong }]}>
        <View style={styles.investmentHighlightTopRow}>
          <View>
            <Text style={[styles.investmentHighlightLabel, { color: theme.muted }]}>Aporte sugerido</Text>
            <Text style={[styles.investmentHighlightValue, { color: theme.text }]}>
              {formatarValorVisivel(valorSugerido)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.investmentMiniLabel, { color: theme.muted }]}>Base usada</Text>
            <Text style={[styles.investmentMiniValue, { color: theme.text }]}>{formatarValorVisivel(baseValor)}</Text>
          </View>
        </View>
        <Text style={[styles.investmentHelperText, { color: theme.muted }]}>
          Padrão Brazllet para construir constância sem perder flexibilidade.
        </Text>
      </View>

      <View style={styles.investmentSliderBlock}>
        <View style={styles.investmentSliderHeader}>
          <Text style={[styles.investmentSliderLabel, { color: theme.text }]}>Percentual desejado</Text>
        </View>

        <View style={styles.investmentSliderScale}>
          {ATALHOS_PERCENTUAL.map((step) => (
            <PressableScale
              key={step}
              onPress={() => {
                onManualInputChange(String(step))
                onPercentualChange(step)
              }}
              style={[
                styles.investmentScalePill,
                {
                  backgroundColor: percentualExibicao === step ? theme.primary : theme.cardSoft,
                  borderColor: percentualExibicao === step ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.investmentScalePillText, { color: percentualExibicao === step ? theme.white : theme.text }]}>
                {step}%
              </Text>
            </PressableScale>
          ))}
        </View>

        <View
          style={[styles.modalField, styles.investmentManualField]}
          onLayout={(event) => onManualFieldLayout(event.nativeEvent.layout.y + 26)}
        >
          <Text style={[styles.modalLabel, { color: theme.muted }]}>Percentual manual</Text>
          <View style={styles.investmentManualField}>
            <View style={styles.investmentManualInputRow}>
              <TextInput
                value={manualInput}
                onChangeText={aplicarPercentualManual}
                onFocus={onManualFieldFocus}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                placeholder='12,5'
                placeholderTextColor={theme.muted}
                style={[
                  styles.modalInput,
                  styles.investmentManualInput,
                  { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                ]}
              />
              <Text style={[styles.investmentManualSuffix, { color: theme.text }]}>%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(InvestimentosCard)
