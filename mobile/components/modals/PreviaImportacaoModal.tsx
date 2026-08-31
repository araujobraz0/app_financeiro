// A previa da importacao.
//
// Antes daqui saiam oito entradas e oito saidas em texto corrido, sem escolha
// nenhuma: o botao "Importar" jogava tudo no mes aberto na tela. Se o extrato
// tivesse tres meses, os tres viravam um so; se o arquivo fosse importado de
// novo, tudo duplicava; e se a leitura falhasse, a unica explicacao era um
// alerta dizendo "nenhum lançamento reconhecido".
//
// Agora a previa e a tela de decisao: mostra o que o app entendeu do arquivo,
// separa por mes de destino, marca o que ja existe, deixa desmarcar item a
// item e trocar a categoria de cada saida antes de gravar.

import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import type { Leitura } from '../../src/utils/importar/extrato'
import {
  competenciaEmTexto,
  descreverLeitura,
  resumirPrevia,
  type ItemPrevia,
} from '../../src/utils/importar/previa'
import Icon, { type IconName } from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'
import SelectionModal from './SelectionModal'

type Filtro = 'tudo' | 'entradas' | 'saidas' | 'repetidos'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  nomeArquivo: string
  leitura: Leitura | null
  itens: ItemPrevia[]
  categorias: string[]
  onAlternarItem: (id: string) => void
  onMarcarTodos: (marcar: boolean) => void
  onDesmarcarRepetidos: () => void
  onTrocarCategoria: (id: string, categoria: string) => void
  onConfirmar: () => void
}

/** Quantos itens aparecem antes do botao de mostrar mais. */
const PASSO = 40

const ICONE_DO_FORMATO: Record<string, IconName> = {
  ofx: 'cartao',
  csv: 'documento',
  planilha: 'planilha',
  desconhecido: 'documento',
}

export default function PreviaImportacaoModal({
  visible,
  onClose,
  theme,
  nomeArquivo,
  leitura,
  itens,
  categorias,
  onAlternarItem,
  onMarcarTodos,
  onDesmarcarRepetidos,
  onTrocarCategoria,
  onConfirmar,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [limite, setLimite] = useState(PASSO)
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null)

  const resumo = useMemo(() => resumirPrevia(itens), [itens])

  const contagens = useMemo(
    () => ({
      tudo: itens.length,
      entradas: itens.filter((i) => i.tipo === 'entrada').length,
      saidas: itens.filter((i) => i.tipo === 'saida').length,
      repetidos: itens.filter((i) => i.repetido !== 'nao').length,
    }),
    [itens]
  )

  const filtrados = useMemo(() => {
    if (filtro === 'entradas') return itens.filter((i) => i.tipo === 'entrada')
    if (filtro === 'saidas') return itens.filter((i) => i.tipo === 'saida')
    if (filtro === 'repetidos') return itens.filter((i) => i.repetido !== 'nao')
    return itens
  }, [itens, filtro])

  const visiveis = filtrados.slice(0, limite)
  const restantes = filtrados.length - visiveis.length
  const avisos = leitura?.avisos || []
  const vazio = itens.length === 0

  const trocarFiltro = (novo: Filtro) => {
    setFiltro(novo)
    setLimite(PASSO)
  }

  const itemEmEdicao = itens.find((i) => i.id === editandoCategoria)

  // ------------------------------------------------------------ pedacos

  const bloco = (titulo: string, filhos: React.ReactNode) => (
    <View style={styles.bloco}>
      <Text style={[styles.blocoTitulo, { color: theme.faint }]}>{titulo}</Text>
      {filhos}
    </View>
  )

  const cartaoNumero = (rotulo: string, valor: number, cor: string, fundo: string, largo = false) => (
    <View
      style={[
        styles.numero,
        largo && styles.numeroLargo,
        { backgroundColor: fundo, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.numeroRotulo, { color: theme.muted }]}>{rotulo}</Text>
      <Text style={[styles.numeroValor, { color: cor }]} numberOfLines={1}>
        {formatarMoeda(valor)}
      </Text>
    </View>
  )

  const chipFiltro = (chave: Filtro, rotulo: string) => {
    const ativo = filtro === chave
    const quantidade = contagens[chave]

    return (
      <PressableScale
        key={chave}
        onPress={() => trocarFiltro(chave)}
        scaleTo={0.95}
        style={[
          styles.chip,
          {
            backgroundColor: ativo ? theme.primary : theme.cardSoft,
            borderColor: ativo ? theme.primary : theme.border,
          },
        ]}
      >
        <Text style={[styles.chipTexto, { color: ativo ? theme.textInverse : theme.muted }]}>
          {rotulo} {quantidade}
        </Text>
      </PressableScale>
    )
  }

  const botaoAcao = (rotulo: string, aoTocar: () => void, desabilitado = false) => (
    <PressableScale
      onPress={aoTocar}
      disabled={desabilitado}
      scaleTo={0.96}
      style={[
        styles.acao,
        { borderColor: theme.border, backgroundColor: theme.cardSoft, opacity: desabilitado ? 0.45 : 1 },
      ]}
    >
      <Text style={[styles.acaoTexto, { color: theme.text }]}>{rotulo}</Text>
    </PressableScale>
  )

  const linhaItem = (item: ItemPrevia) => {
    const ehEntrada = item.tipo === 'entrada'
    const cor = ehEntrada ? theme.green : theme.red

    return (
      <PressableScale
        key={item.id}
        onPress={() => onAlternarItem(item.id)}
        scaleTo={0.99}
        style={[
          styles.item,
          {
            borderColor: item.incluir ? theme.border : 'transparent',
            backgroundColor: item.incluir ? theme.cardSoft : 'transparent',
            opacity: item.incluir ? 1 : 0.55,
          },
        ]}
      >
        <View
          style={[
            styles.caixa,
            {
              backgroundColor: item.incluir ? theme.primary : 'transparent',
              borderColor: item.incluir ? theme.primary : theme.borderStrong,
            },
          ]}
        >
          {item.incluir ? <Icon name="confirmar" size={13} color={theme.textInverse} /> : null}
        </View>

        <View style={styles.itemTextos}>
          <Text style={[styles.itemNome, { color: theme.text }]} numberOfLines={2}>
            {item.descricao}
          </Text>

          <View style={styles.itemMeta}>
            <Text style={[styles.itemMetaTexto, { color: theme.muted }]} numberOfLines={1}>
              {String(item.dia).padStart(2, '0')} de {competenciaEmTexto(item.competencia)}
              {item.temData ? '' : ' · sem data no arquivo'}
            </Text>
          </View>

          <View style={styles.itemSelos}>
            {ehEntrada ? null : (
              <PressableScale
                onPress={() => setEditandoCategoria(item.id)}
                scaleTo={0.94}
                style={[styles.selo, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="etiqueta" size={11} color={theme.muted} />
                <Text style={[styles.seloTexto, { color: theme.muted }]}>{item.categoria}</Text>
              </PressableScale>
            )}

            {item.repetido !== 'nao' ? (
              <View style={[styles.selo, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                <Icon name="repetido" size={11} color={theme.accent} />
                <Text style={[styles.seloTexto, { color: theme.accent }]}>
                  {item.repetido === 'app' ? 'já lançado' : 'repetido no arquivo'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={[styles.itemValor, { color: cor }]} numberOfLines={1}>
          {ehEntrada ? '+' : '−'} {formatarMoeda(item.valor)}
        </Text>
      </PressableScale>
    )
  }

  // ------------------------------------------------------------ a tela

  return (
    <>
      <ModalSheet
        theme={theme}
        visible={visible}
        onClose={onClose}
        titulo="Conferir antes de importar"
        subtitulo={
          vazio
            ? 'Não consegui reconhecer lançamentos neste arquivo.'
            : `${resumo.marcados} de ${itens.length} lançamentos marcados para entrar`
        }
        alto={!vazio}
        acoes={[
          { label: 'Cancelar', onPress: onClose },
          {
            label: resumo.marcados ? `Importar ${resumo.marcados}` : 'Importar',
            onPress: onConfirmar,
            primaria: true,
            desabilitada: resumo.marcados === 0,
          },
        ]}
      >
        {/* ---------- O arquivo ---------- */}
        <View style={[styles.arquivo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <View style={[styles.arquivoIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Icon name={ICONE_DO_FORMATO[leitura?.formato || 'desconhecido']} size={18} color={theme.primary} />
          </View>
          <View style={styles.arquivoTextos}>
            <Text style={[styles.arquivoNome, { color: theme.text }]} numberOfLines={1}>
              {nomeArquivo}
            </Text>
            <Text style={[styles.arquivoDetalhe, { color: theme.muted }]} numberOfLines={2}>
              {leitura ? descreverLeitura(leitura) : 'Arquivo lido'}
            </Text>
          </View>
        </View>

        {/* ---------- Avisos da leitura ---------- */}
        {avisos.length ? (
          <View style={[styles.avisos, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
            {avisos.map((aviso) => (
              <View key={aviso} style={styles.aviso}>
                <Icon name="alerta" size={14} color={theme.accent} />
                <Text style={[styles.avisoTexto, { color: theme.text }]}>{aviso}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {vazio ? (
          <Text style={[styles.vazio, { color: theme.muted }]}>
            Extratos em CSV, Excel e OFX funcionam. Se o seu banco exporta em PDF, troque o formato
            para OFX ou CSV na hora de baixar — é a mesma tela do internet banking.
          </Text>
        ) : (
          <>
            {/* ---------- Os numeros ---------- */}
            {bloco(
              'O que vai entrar',
              <View style={styles.numeros}>
                {cartaoNumero('Entradas', resumo.entradas, theme.green, theme.greenSoft)}
                {cartaoNumero('Saídas', resumo.saidas, theme.red, theme.redSoft)}
                {cartaoNumero(
                  'Diferença',
                  resumo.saldo,
                  resumo.saldo >= 0 ? theme.green : theme.red,
                  theme.cardSoft,
                  true
                )}
              </View>
            )}

            {/* ---------- Meses de destino ---------- */}
            {resumo.porCompetencia.length
              ? bloco(
                  resumo.porCompetencia.length > 1 ? 'Vai cair em mais de um mês' : 'Mês de destino',
                  <View style={styles.meses}>
                    {resumo.porCompetencia.map((mes) => (
                      <View
                        key={mes.competencia}
                        style={[styles.mes, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                      >
                        <Text style={[styles.mesNome, { color: theme.text }]}>
                          {competenciaEmTexto(mes.competencia)}
                        </Text>
                        <Text style={[styles.mesContagem, { color: theme.muted }]}>
                          {mes.quantidade} {mes.quantidade === 1 ? 'lançamento' : 'lançamentos'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )
              : null}

            {/* ---------- Filtro e acoes em massa ---------- */}
            <View style={styles.chips}>
              {chipFiltro('tudo', 'Tudo')}
              {chipFiltro('entradas', 'Entradas')}
              {chipFiltro('saidas', 'Saídas')}
              {contagens.repetidos ? chipFiltro('repetidos', 'Repetidos') : null}
            </View>

            <View style={styles.acoes}>
              {botaoAcao('Marcar tudo', () => onMarcarTodos(true))}
              {botaoAcao('Limpar', () => onMarcarTodos(false))}
              {contagens.repetidos
                ? botaoAcao('Tirar repetidos', onDesmarcarRepetidos)
                : null}
            </View>

            {/* ---------- Lista ---------- */}
            <View style={styles.lista}>
              {visiveis.length === 0 ? (
                <Text style={[styles.vazio, { color: theme.muted }]}>Nada neste filtro.</Text>
              ) : (
                visiveis.map(linhaItem)
              )}
            </View>

            {restantes > 0 ? (
              <PressableScale
                onPress={() => setLimite((atual) => atual + PASSO)}
                scaleTo={0.97}
                style={[styles.mostrarMais, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
              >
                <Text style={[styles.mostrarMaisTexto, { color: theme.text }]}>
                  Mostrar mais {Math.min(PASSO, restantes)} de {restantes}
                </Text>
              </PressableScale>
            ) : null}
          </>
        )}
      </ModalSheet>

      {/* Trocar a categoria de uma saida, sem sair da previa. */}
      <SelectionModal
        visible={Boolean(itemEmEdicao)}
        onClose={() => setEditandoCategoria(null)}
        theme={theme}
        title="Categoria"
        hint={itemEmEdicao?.descricao}
        options={categorias.map((categoria) => ({ value: categoria, label: categoria }))}
        selectedValue={itemEmEdicao?.categoria || ''}
        onSelect={(valor) => {
          if (editandoCategoria) onTrocarCategoria(editandoCategoria, String(valor))
          setEditandoCategoria(null)
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  arquivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
  },
  arquivoIcone: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arquivoTextos: { flex: 1, minWidth: 0 },
  arquivoNome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  arquivoDetalhe: { fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 15 },

  avisos: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8, marginTop: 12 },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  avisoTexto: { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '600', lineHeight: 16 },

  bloco: { marginTop: 18 },
  blocoTitulo: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numero: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  /** O saldo ocupa a linha inteira: e o numero que a pessoa procura. */
  numeroLargo: { flexBasis: '100%' },
  numeroRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  numeroValor: { fontSize: 15, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },

  meses: { gap: 8 },
  mes: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mesNome: { fontSize: 12.5, fontWeight: '800', flexShrink: 1, minWidth: 0 },
  mesContagem: { fontSize: 11, fontWeight: '600' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 20 },
  chip: {
    minHeight: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: { fontSize: 11.5, fontWeight: '800' },

  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  acao: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoTexto: { fontSize: 11, fontWeight: '700' },

  lista: { marginTop: 12, gap: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  caixa: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextos: { flex: 1, minWidth: 0 },
  itemNome: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  itemMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
  itemMetaTexto: { fontSize: 10.5, fontWeight: '600', flexShrink: 1, minWidth: 0 },
  itemSelos: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seloTexto: { fontSize: 10, fontWeight: '700' },
  itemValor: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2 },

  mostrarMais: {
    marginTop: 10,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostrarMaisTexto: { fontSize: 12, fontWeight: '800' },

  vazio: { fontSize: 12.5, fontWeight: '600', lineHeight: 18, paddingVertical: 14 },
})
