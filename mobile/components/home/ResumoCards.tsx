import { memo } from 'react'
import { Text, TextInput, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import type { Tema } from '../../app/types'
import { formatarMoeda, handleMaskedMoneyInput } from '../../src/utils/currency'
import { styles } from '../../src/theme/homeStyles'
import AnimatedValue from '../common/motion/AnimatedValue'
import AppearIn from '../common/motion/AppearIn'
import PressableScale from '../common/motion/PressableScale'

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
  /**
   * A contagem animada precisa do numero cru mais o estado de ocultacao — por
   * isso o flag vem separado, em vez de um formatador que ja devolve mascara.
   */
  ocultarValores: boolean
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
  ocultarValores,
}: ResumoCardsProps) {
  return (
    <>
      <AppearIn index={0}>
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
                <AnimatedValue
                  value={salario}
                  format={formatarMoeda}
                  hidden={ocultarValores}
                  style={[styles.salaryValueCentered, { color: theme.green }]}
                />
                <PressableScale style={styles.salaryEditButton} onPress={onIniciarEdicaoSalario}>
                  <Text style={[styles.salaryEditText, { color: theme.muted }]}>✎</Text>
                </PressableScale>
              </>
            )}
          </View>
        </View>
      </AppearIn>

      <AppearIn index={1}>
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: theme.card,
              borderColor: saldoAtual >= 0 ? theme.border : theme.redSoft,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Text style={[styles.cardLabelCentered, { color: theme.muted }]}>Saldo atual</Text>
          <AnimatedValue
            value={saldoAtual}
            format={formatarMoeda}
            hidden={ocultarValores}
            style={[styles.balanceValueCentered, { color: saldoAtual >= 0 ? theme.green : theme.red }]}
          />
        </View>
      </AppearIn>

      <AppearIn index={2}>
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.greenSoft, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.smallLabel, { color: theme.muted }]}>Entradas</Text>
            <AnimatedValue
              value={totalEntradas}
              format={formatarMoeda}
              hidden={ocultarValores}
              numberOfLines={1}
              style={[styles.smallValue, { color: theme.green }]}
            />
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.redSoft, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.smallLabel, { color: theme.muted }]}>Saídas</Text>
            <AnimatedValue
              value={totalSaidas}
              format={formatarMoeda}
              hidden={ocultarValores}
              numberOfLines={1}
              style={[styles.smallValue, { color: theme.red }]}
            />
          </View>
        </View>
      </AppearIn>
    </>
  )
}

export default memo(ResumoCards)
