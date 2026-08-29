// Quanto do mes vai para investimento.
//
// A porcentagem existia no app desde sempre — guardada, com valor padrao de
// 10% — mas nao havia tela nenhuma para muda-la, e ela nao alimentava nada.
// Agora ela e a meta da barra de aporte da carteira, entao precisa ficar ao
// alcance de quem olha essa barra.

import { StyleSheet, Text, View } from 'react-native'

import type { InvestmentBaseMode, Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import { metaDeAporte } from '../../src/utils/investimentos'
import Interruptor from '../common/Interruptor'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

/** Os degraus que as pessoas de fato usam. Nada de campo livre para isso. */
const DEGRAUS = [5, 10, 15, 20, 25, 30]

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  percentual: number
  base: InvestmentBaseMode
  salario: number
  entradas: number
  onMudar: (payload: { investmentPercentage?: number; investmentBaseMode?: InvestmentBaseMode }) => void
}

export default function MetaAporteModal({
  visible,
  onClose,
  theme,
  percentual,
  base,
  salario,
  entradas,
  onMudar,
}: Props) {
  const comEntradas = base === 'salary_plus_entries'
  const valorBase = comEntradas ? salario + entradas : salario
  const meta = metaDeAporte(valorBase, percentual)

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      level={70}
      titulo="Meta de aporte"
      subtitulo="Quanto do que entra no mês você quer guardar. É o alvo da barra na carteira."
      acoes={[{ label: 'Pronto', onPress: onClose, primaria: true }]}
    >
      <View style={local.degraus}>
        {DEGRAUS.map((valor) => {
          const ativo = percentual === valor
          return (
            <PressableScale
              key={valor}
              onPress={() => onMudar({ investmentPercentage: valor })}
              scaleTo={0.94}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`${valor} por cento`}
              style={[
                local.degrau,
                {
                  backgroundColor: ativo ? theme.primary : theme.cardSoft,
                  borderColor: ativo ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[local.degrauTexto, { color: ativo ? theme.textInverse : theme.text }]}>
                {valor}%
              </Text>
            </PressableScale>
          )
        })}
      </View>

      <View style={[local.previa, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <Text style={[local.previaRotulo, { color: theme.accent }]}>Meta deste mês</Text>
        <Text style={[local.previaValor, { color: theme.accent }]}>{formatarMoeda(meta)}</Text>
      </View>

      <View style={[local.linha, { borderTopColor: theme.border }]}>
        <View style={local.linhaTextos}>
          <Text style={[local.linhaTitulo, { color: theme.text }]}>Contar as entradas extras</Text>
          <Text style={[local.linhaSub, { color: theme.muted }]}>
            {comEntradas
              ? `Sobre ${formatarMoeda(salario)} de salário mais ${formatarMoeda(entradas)} de entradas.`
              : `Só sobre o salário, ${formatarMoeda(salario)}. Freelas e extras ficam de fora.`}
          </Text>
        </View>
        <Interruptor
          theme={theme}
          ativo={comEntradas}
          onAlternar={() =>
            onMudar({ investmentBaseMode: comEntradas ? 'salary' : 'salary_plus_entries' })
          }
        />
      </View>
    </ModalSheet>
  )
}

const local = StyleSheet.create({
  degraus: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  degrau: {
    minWidth: 62,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  degrauTexto: { fontSize: 14, fontWeight: '900' },

  previa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  previaRotulo: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  previaValor: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  linhaTextos: { flex: 1, minWidth: 0 },
  linhaTitulo: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  linhaSub: { fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 2 },
})
