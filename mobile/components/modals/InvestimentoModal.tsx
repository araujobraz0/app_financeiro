// Cadastrar e editar um ativo da carteira.
//
// O saldo de hoje e o campo central: e o unico numero que a pessoa precisa
// voltar aqui para mexer, porque e o que muda sozinho no extrato da
// corretora. Os aportes ficam logo abaixo, so para conferencia — quem
// registra aporte e o outro modal, com um toque a menos.

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { InvestimentoItem, Tema, TipoInvestimento } from '../../app/types'
import { formatarMoeda, handleMaskedMoneyInput } from '../../src/utils/currency'
import { ORDEM_TIPOS, TIPOS_INVESTIMENTO, aportesRecentes, totalAportado } from '../../src/utils/investimentos'
import Campo from '../common/Campo'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

export type InvestimentoFormValues = {
  nome: string
  instituicao: string
  /** Saldo de hoje, mascarado. */
  saldo: string
  /** Quanto ja foi colocado. So aparece na criacao. */
  aporteInicial: string
}

export const valoresVaziosDeInvestimento = (): InvestimentoFormValues => ({
  nome: '',
  instituicao: '',
  saldo: 'R$ 0,00',
  aporteInicial: 'R$ 0,00',
})

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  /** O ativo em edicao, ou null quando e um novo. */
  editando: InvestimentoItem | null
  initialValues: InvestimentoFormValues
  tipo: TipoInvestimento
  onTipoChange: (tipo: TipoInvestimento) => void
  onSave: (values: InvestimentoFormValues) => void
  onExcluir: () => void
}

export default function InvestimentoModal({
  visible,
  onClose,
  theme,
  editando,
  initialValues,
  tipo,
  onTipoChange,
  onSave,
  onExcluir,
}: Props) {
  const [nome, setNome] = useState(initialValues.nome)
  const [instituicao, setInstituicao] = useState(initialValues.instituicao)
  const [saldo, setSaldo] = useState(initialValues.saldo)
  const [aporteInicial, setAporteInicial] = useState(initialValues.aporteInicial)

  const aplicado = editando ? totalAportado(editando) : 0
  const historico = editando ? aportesRecentes(editando) : []

  const acoes = [
    { label: 'Cancelar', onPress: onClose },
    {
      label: editando ? 'Salvar' : 'Adicionar',
      onPress: () => onSave({ nome, instituicao, saldo, aporteInicial }),
      primaria: true,
      desabilitada: !nome.trim(),
    },
  ]

  if (editando) acoes.unshift({ label: 'Excluir', onPress: onExcluir, perigo: true } as any)

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={editando ? 'Editar investimento' : 'Novo investimento'}
      subtitulo={
        editando
          ? 'Atualize o saldo com o que a corretora mostra hoje. O rendimento sai da diferença.'
          : 'Cadastre o que você já tem aplicado. O app cuida do resto da conta.'
      }
      acoes={acoes}
    >
      <Campo
        theme={theme}
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Tesouro Selic 2029, CDB do Inter..."
        returnKeyType="next"
      />

      <Text style={[local.rotulo, { color: theme.muted }]}>Tipo</Text>
      <View style={local.tipos}>
        {ORDEM_TIPOS.map((chave) => {
          const estilo = TIPOS_INVESTIMENTO[chave]
          const ativo = tipo === chave
          return (
            <PressableScale
              key={chave}
              onPress={() => onTipoChange(chave)}
              scaleTo={0.95}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={estilo.rotulo}
              style={[
                local.tipo,
                {
                  backgroundColor: ativo ? estilo.cor : theme.cardSoft,
                  borderColor: ativo ? estilo.cor : theme.border,
                },
              ]}
            >
              <Text style={[local.tipoTexto, { color: ativo ? '#FFFFFF' : theme.text }]}>
                {estilo.rotulo}
              </Text>
            </PressableScale>
          )
        })}
      </View>
      <Text style={[local.exemplo, { color: theme.faint }]}>
        Ex.: {TIPOS_INVESTIMENTO[tipo].exemplo}
      </Text>

      <Campo
        theme={theme}
        rotulo="Onde está"
        value={instituicao}
        onChangeText={setInstituicao}
        placeholder="Nubank, Inter, XP..."
        returnKeyType="next"
      />

      <Campo
        theme={theme}
        rotulo="Saldo hoje"
        value={saldo}
        onChangeText={(texto) => handleMaskedMoneyInput(texto, setSaldo)}
        keyboardType="number-pad"
        placeholder="R$ 0,00"
        dica="O valor que aparece no extrato da corretora agora."
        returnKeyType={editando ? 'done' : 'next'}
      />

      {editando ? (
        <View style={local.historico}>
          <View style={local.historicoTopo}>
            <Text style={[local.rotulo, { color: theme.muted, marginBottom: 0 }]}>Aportes</Text>
            <Text style={[local.historicoTotal, { color: theme.text }]}>
              {formatarMoeda(aplicado)}
            </Text>
          </View>

          {historico.length === 0 ? (
            <Text style={[local.historicoVazio, { color: theme.faint }]}>
              Nenhum aporte registrado. Sem eles o app não tem como calcular o rendimento.
            </Text>
          ) : (
            historico.slice(0, 6).map((aporte) => (
              <View key={aporte.id} style={[local.linha, { borderBottomColor: theme.border }]}>
                <Text style={[local.linhaQuando, { color: theme.muted }]} numberOfLines={1}>
                  {aporte.competencia ? aporte.competencia.replace('-', ' · ') : 'Saldo inicial'}
                </Text>
                <Text style={[local.linhaValor, { color: theme.text }]}>
                  {formatarMoeda(aporte.valor)}
                </Text>
              </View>
            ))
          )}

          {historico.length > 6 ? (
            <Text style={[local.historicoVazio, { color: theme.faint }]}>
              e mais {historico.length - 6}.
            </Text>
          ) : null}
        </View>
      ) : (
        <Campo
          theme={theme}
          rotulo="Quanto você já colocou"
          value={aporteInicial}
          onChangeText={(texto) => handleMaskedMoneyInput(texto, setAporteInicial)}
          keyboardType="number-pad"
          placeholder="R$ 0,00"
          dica="A soma do que saiu do seu bolso. É dela que sai o rendimento."
          returnKeyType="done"
        />
      )}
    </ModalSheet>
  )
}

const local = StyleSheet.create({
  rotulo: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tipo: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
  tipoTexto: { fontSize: 12.5, fontWeight: '800' },
  exemplo: { fontSize: 11, fontWeight: '600', marginTop: 8, marginBottom: 16 },

  historico: { marginTop: 4 },
  historicoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historicoTotal: { fontSize: 13.5, fontWeight: '900', letterSpacing: -0.3 },
  historicoVazio: { fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  linhaQuando: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600' },
  linhaValor: { fontSize: 12.5, fontWeight: '800' },
})
