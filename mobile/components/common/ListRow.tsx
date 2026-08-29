// Linha padrao das listas do app (fixos, variaveis, parcelas, compras, notas).
//
// Antes cada lista montava a propria linha com `inlineActions`, que empilhava
// valor + status + editar + excluir numa unica faixa de 62% da largura. Nao
// cabia: o conteudo vazava a borda do card e so se reacomodava quando um toque
// forcava novo layout — era o "x colado na lateral que desbuga ao clicar".
//
// Aqui o titulo ocupa a linha inteira e valor/acoes descem para a segunda,
// entao nao existe disputa por largura, por mais longo que seja o nome.

import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from './Icon'
import CaixaDestacavel from './motion/CaixaDestacavel'
import PressableScale from './motion/PressableScale'

type Status = {
  label: string
  ativo: boolean
  onPress: () => void
}

type Props = {
  theme: Tema
  titulo: string
  meta?: string
  valor?: string
  /** Cor do valor. Padrao: cor de texto do tema. */
  valorCor?: string
  status?: Status
  onEditar?: () => void
  onExcluir?: () => void
  /** 0 a 1. Mostra quanto do item ja foi cumprido. */
  progresso?: number
  progressoCor?: string
  destacado?: boolean
  /** Referencia do card, para a busca medir onde ele esta na rolagem. */
  refItem?: (node: View | null) => void
  /** Conteudo extra abaixo do titulo (links, observacoes). */
  children?: ReactNode
  /** Botoes adicionais, exibidos antes de editar/excluir. */
  acoesExtras?: ReactNode
  /**
   * Versao de uma linha so: titulo + meta a esquerda, valor e botoes a direita.
   * Usada nas listas longas (entradas e saidas), onde o formato de duas linhas
   * gastava altura demais para pouca informacao.
   */
  compacto?: boolean
  /** O item mudou e ainda nao chegou ao servidor. */
  pendente?: boolean
  /** Toque no selo de pendente: forca a subida agora. */
  onPendentePress?: () => void
}

export default function ListRow({
  theme,
  titulo,
  meta,
  valor,
  valorCor,
  status,
  onEditar,
  onExcluir,
  progresso,
  progressoCor,
  destacado = false,
  refItem,
  children,
  acoesExtras,
  compacto = false,
  pendente = false,
  onPendentePress,
}: Props) {
  const temRodape = Boolean(valor || status || onEditar || onExcluir || acoesExtras)

  /**
   * O selo de "ainda nao salvo".
   *
   * Fica antes dos outros botoes porque e informacao, nao acao secundaria:
   * quem bate o olho na linha precisa ver que aquele lancamento so existe
   * neste aparelho. Tocar nele manda subir na hora.
   */
  const seloPendente = pendente ? (
    <PressableScale
      onPress={onPendentePress}
      disabled={!onPendentePress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ainda não salvo na nuvem. Toque para salvar agora.`}
      style={[styles.pendente, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
    >
      <Icon name="atualizar" size={12} color={theme.accent} />
    </PressableScale>
  ) : null

  const botoes = (
    <View style={styles.acoes}>
      {seloPendente}
      {acoesExtras}

      {status ? (
        <PressableScale
          onPress={status.onPress}
          style={[
            styles.status,
            {
              backgroundColor: status.ativo ? theme.greenSoft : theme.redSoft,
              borderColor: status.ativo ? theme.green : theme.red,
            },
          ]}
        >
          <Icon
            name={status.ativo ? 'confirmar' : 'excluir'}
            size={13}
            color={status.ativo ? theme.green : theme.red}
          />
          <Text style={[styles.statusTexto, { color: status.ativo ? theme.green : theme.red }]}>
            {status.label}
          </Text>
        </PressableScale>
      ) : null}

      {onEditar ? (
        <PressableScale
          onPress={onEditar}
          style={[styles.iconeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${titulo}`}
        >
          <Icon name="editar" size={14} color={theme.muted} />
        </PressableScale>
      ) : null}

      {onExcluir ? (
        <PressableScale
          onPress={onExcluir}
          style={[styles.iconeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${titulo}`}
        >
          <Icon name="excluir" size={16} color={theme.red} />
        </PressableScale>
      ) : null}
    </View>
  )

  const barraProgresso =
    typeof progresso === 'number' ? (
      <View style={[styles.trilha, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.preenchimento,
            {
              width: `${Math.min(100, Math.max(0, progresso * 100))}%`,
              backgroundColor: progressoCor || theme.green,
            },
          ]}
        />
      </View>
    ) : null


  if (compacto) {
    return (
      <CaixaDestacavel
        ref={refItem}
        theme={theme}
        destacado={destacado}
        corBorda={theme.border}
        collapsable={false}
        style={[styles.card, styles.cardCompacto, { backgroundColor: theme.cardSoft }]}
      >
        <View style={styles.linhaCompacta}>
          {/* O texto encolhe e quebra em duas linhas; o valor nunca encolhe,
              entao nao ha como sobrar reticencias em cima do numero. */}
          <View style={styles.infoCompacta}>
            <Text style={[styles.tituloCompacto, { color: theme.text }]} numberOfLines={2}>
              {titulo}
            </Text>
            {meta ? (
              <Text style={[styles.metaCompacta, { color: theme.muted }]} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>

          {valor ? (
            <Text style={[styles.valorCompacto, { color: valorCor || theme.text }]} numberOfLines={1}>
              {valor}
            </Text>
          ) : null}

          {botoes}
        </View>

        {children}
        {barraProgresso}
      </CaixaDestacavel>
    )
  }

  return (
    <CaixaDestacavel
      ref={refItem}
      theme={theme}
      destacado={destacado}
      corBorda={theme.border}
      collapsable={false}
      style={[styles.card, { backgroundColor: theme.cardSoft }]}
    >
      <Text style={[styles.titulo, { color: theme.text }]} numberOfLines={2}>
        {titulo}
      </Text>

      {children}

      {temRodape ? (
        <View style={styles.rodape}>
          <View style={styles.rodapeInfo}>
            {valor ? (
              <Text style={[styles.valor, { color: valorCor || theme.text }]} numberOfLines={1}>
                {valor}
              </Text>
            ) : null}
            {meta ? (
              <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>

          {botoes}
        </View>
      ) : null}

      {barraProgresso}
    </CaixaDestacavel>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
    width: '100%',
  },
  titulo: { fontSize: 14, fontWeight: '700', lineHeight: 19, letterSpacing: -0.2 },

  cardCompacto: { paddingVertical: 9, paddingHorizontal: 12, marginTop: 7 },
  linhaCompacta: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoCompacta: { flex: 1, minWidth: 0 },
  tituloCompacto: { fontSize: 13.5, fontWeight: '700', lineHeight: 18, letterSpacing: -0.2 },
  metaCompacta: { fontSize: 10.5, fontWeight: '500', marginTop: 1 },
  valorCompacto: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3, flexShrink: 0 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rodapeInfo: { flex: 1, minWidth: 0 },
  valor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  meta: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  pendente: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusTexto: { fontSize: 10, fontWeight: '800' },
  iconeBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trilha: { height: 4, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  preenchimento: { height: '100%', borderRadius: 999 },
})
