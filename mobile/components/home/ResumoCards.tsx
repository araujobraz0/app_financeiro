import { memo } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import type { Tema } from '../../app/types'
import { formatarMoeda, handleMaskedMoneyInput } from '../../src/utils/currency'
import Icon from '../common/Icon'
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
 * Painel de topo da Home.
 *
 * Antes eram quatro caixas soltas de peso visual parecido — salario, saldo,
 * entradas e saidas — e nada dizia qual importava mais. Agora e um painel
 * unico: o saldo domina, entradas e saidas ficam como par comparavel na base,
 * e o salario vira uma linha discreta e editavel no topo.
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
  const positivo = saldoAtual >= 0
  const corSaldo = positivo ? theme.green : theme.red

  return (
    <AppearIn index={0}>
      <View
        style={[
          styles.painel,
          { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow },
        ]}
      >
        {/* Salario — linha discreta, editavel no proprio lugar */}
        <View style={styles.linhaSalario}>
          <Text style={[styles.rotuloSalario, { color: theme.muted }]}>Salário</Text>
          {salarioEmEdicao ? (
            <TextInput
              ref={salaryInputRef}
              value={salarioTexto}
              onChangeText={(value) => handleMaskedMoneyInput(value, onSalarioTextoChange)}
              onBlur={onSalvarSalario}
              onSubmitEditing={onSalvarSalario}
              keyboardType="number-pad"
              inputMode="numeric"
              style={[styles.inputSalario, { color: theme.text, borderColor: theme.primary }]}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.faint}
              returnKeyType="done"
            />
          ) : (
            <PressableScale onPress={onIniciarEdicaoSalario} scaleTo={0.96} style={styles.toqueSalario}>
              <AnimatedValue
                value={salario}
                format={formatarMoeda}
                hidden={ocultarValores}
                style={[styles.valorSalario, { color: theme.text }]}
              />
              <Icon name="editar" size={13} color={theme.faint} />
            </PressableScale>
          )}
        </View>

        <View style={[styles.divisor, { backgroundColor: theme.border }]} />

        {/* Saldo — o numero que importa */}
        <View style={styles.blocoSaldo}>
          <Text style={[styles.rotuloSaldo, { color: theme.muted }]}>Saldo do mês</Text>
          <AnimatedValue
            value={saldoAtual}
            format={formatarMoeda}
            hidden={ocultarValores}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.valorSaldo, { color: corSaldo }]}
          />
        </View>

        {/* Entradas x saidas — par comparavel */}
        <View style={styles.parInferior}>
          <View style={[styles.metade, { backgroundColor: theme.greenSoft }]}>
            <View style={styles.metadeTopo}>
              <Icon name="seta_cima" size={13} color={theme.green} />
              <Text style={[styles.metadeRotulo, { color: theme.muted }]}>Entradas</Text>
            </View>
            <AnimatedValue
              value={totalEntradas}
              format={formatarMoeda}
              hidden={ocultarValores}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.metadeValor, { color: theme.green }]}
            />
          </View>

          <View style={[styles.metade, { backgroundColor: theme.redSoft }]}>
            <View style={styles.metadeTopo}>
              <Icon name="seta_baixo" size={13} color={theme.red} />
              <Text style={[styles.metadeRotulo, { color: theme.muted }]}>Saídas</Text>
            </View>
            <AnimatedValue
              value={totalSaidas}
              format={formatarMoeda}
              hidden={ocultarValores}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.metadeValor, { color: theme.red }]}
            />
          </View>
        </View>
      </View>
    </AppearIn>
  )
}

const styles = StyleSheet.create({
  painel: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },

  linhaSalario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rotuloSalario: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  toqueSalario: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valorSalario: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  inputSalario: {
    minWidth: 140,
    borderBottomWidth: 2,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 2,
  },

  divisor: { height: 1, marginVertical: 16 },

  blocoSaldo: { alignItems: 'center' },
  rotuloSaldo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  valorSaldo: { fontSize: 38, fontWeight: '800', letterSpacing: -1.5, textAlign: 'center' },

  parInferior: { flexDirection: 'row', gap: 10, marginTop: 20 },
  metade: { flex: 1, minWidth: 0, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14 },
  metadeTopo: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  metadeRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  metadeValor: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
})

export default memo(ResumoCards)
