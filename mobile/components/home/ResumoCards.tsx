import { memo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import type { Tema } from '../../app/types'
import { handleMaskedMoneyInput } from '../../src/utils/currency'
import { styles } from '../../src/theme/homeStyles'

type ResumoCardsProps = {
  theme: Tema
  salario: number
  saldoAtual: number
  totalEntradas: number
  totalSaidas: number
  salarioEmEdicao: boolean
  salarioTexto: string
  onSalarioTextoChange: (value: string) => void
  onIniciarEdicaoSalario: () => void
  onSalvarSalario: () => void
  salaryInputRef: React.RefObject<RNTextInput | null>
  formatarValorVisivel: (valor: number) => string
}

/**
 * Bloco de topo da aba Home: salario editavel, saldo do mes e o par
 * entradas/saidas.
 */
function ResumoCards({
  theme,
  salario,
  saldoAtual,
  totalEntradas,
  totalSaidas,
  salarioEmEdicao,
  salarioTexto,
  onSalarioTextoChange,
  onIniciarEdicaoSalario,
  onSalvarSalario,
  salaryInputRef,
  formatarValorVisivel,
}: ResumoCardsProps) {
  return (
    <>
      <View style={[styles.salaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardLabelCentered, { color: theme.muted }]}>Salário</Text>
        <View style={styles.salaryRowCentered}>
          {salarioEmEdicao ? (
            <TextInput
              ref={salaryInputRef}
              value={salarioTexto}
              onChangeText={(value) => handleMaskedMoneyInput(value, onSalarioTextoChange)}
              onBlur={onSalvarSalario}
              onSubmitEditing={onSalvarSalario}
              keyboardType='number-pad'
              inputMode='numeric'
              style={[styles.salaryInput, { color: theme.green }]}
              placeholder='R$ 0,00'
              placeholderTextColor={theme.muted}
              returnKeyType='done'
            />
          ) : (
            <>
              <Text style={[styles.salaryValueCentered, { color: theme.green }]}>{formatarValorVisivel(salario)}</Text>
              <Pressable style={styles.salaryEditButton} onPress={onIniciarEdicaoSalario}>
                <Text style={[styles.salaryEditText, { color: theme.text }]}>✎</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardLabelCentered, { color: theme.muted }]}>Saldo atual</Text>
        <Text style={[styles.balanceValueCentered, { color: saldoAtual >= 0 ? theme.green : theme.red }]}>
          {formatarValorVisivel(saldoAtual)}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.smallLabel, { color: theme.muted }]}>Entradas</Text>
          <Text style={[styles.smallValue, { color: theme.green }]} numberOfLines={1}>
            {formatarValorVisivel(totalEntradas)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.smallLabel, { color: theme.muted }]}>Saídas</Text>
          <Text style={[styles.smallValue, { color: theme.red }]} numberOfLines={1}>
            {formatarValorVisivel(totalSaidas)}
          </Text>
        </View>
      </View>
    </>
  )
}

export default memo(ResumoCards)
