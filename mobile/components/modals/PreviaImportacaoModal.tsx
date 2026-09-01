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
import { StyleSheet, Text, TextInput, View } from 'react-native'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import type { Leitura } from '../../src/utils/importar/extrato'
import {
  competenciaEmTexto,
  descreverLeitura,
  explicarRepeticao,
  resumirPrevia,
  type Destino,
  type ItemPrevia,
} from '../../src/utils/importar/previa'
import Icon, { type IconName } from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'
import SelectionModal from './SelectionModal'

type Filtro = 'tudo' | 'entradas' | 'saidas' | 'faturas' | 'repetidos'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  /** Nomes de tudo que foi escolhido, na ordem. */
  nomes: string[]
  /** Uma leitura por arquivo lido. */
  leituras: Leitura[]
  itens: ItemPrevia[]
  categorias: string[]
  onAlternarItem: (id: string) => void
  onMarcarTodos: (marcar: boolean) => void
  onDesmarcarRepetidos: () => void
  /** Cartoes cadastrados, para escolher de quem e a fatura. */
  cartoes: { id: string; nome: string }[]
  onTrocarDestino: (id: string, destino: Destino) => void
  onConfirmar: () => void
}

/** Quantos itens aparecem antes do botao de mostrar mais. */
const PASSO = 40

/** Marca as opcoes de cartao dentro da lista de destinos. */
const PREFIXO_CARTAO = 'fatura:'

/** Busca sem acento e sem caixa: "SAUDE" acha "Saúde". */
const semAcento = (texto: string) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

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
  nomes,
  leituras,
  itens,
  categorias,
  onAlternarItem,
  onMarcarTodos,
  onDesmarcarRepetidos,
  cartoes,
  onTrocarDestino,
  onConfirmar,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [limite, setLimite] = useState(PASSO)
  const [editandoDestino, setEditandoDestino] = useState<string | null>(null)
  /** Nome do arquivo que a lista esta mostrando; vazio mostra todos. */
  const [arquivoAtivo, setArquivoAtivo] = useState('')
  const [busca, setBusca] = useState('')

  const resumo = useMemo(() => resumirPrevia(itens), [itens])

  const contagens = useMemo(
    () => ({
      tudo: itens.length,
      entradas: itens.filter((i) => i.tipo === 'entrada').length,
      saidas: itens.filter((i) => i.tipo === 'saida').length,
      faturas: itens.filter((i) => i.tipo === 'cartao').length,
      repetidos: itens.filter((i) => i.repetido !== 'nao').length,
    }),
    [itens]
  )

  const filtrados = useMemo(() => {
    if (filtro === 'entradas') return itens.filter((i) => i.tipo === 'entrada')
    if (filtro === 'saidas') return itens.filter((i) => i.tipo === 'saida')
    if (filtro === 'faturas') return itens.filter((i) => i.tipo === 'cartao')
    if (filtro === 'repetidos') return itens.filter((i) => i.repetido !== 'nao')
    return itens
  }, [itens, filtro])

  /**
   * Um aviso por arquivo, com o nome na frente quando ha mais de um.
   *
   * Sem o nome, escolhendo quatro extratos de uma vez, "3 linhas antes da
   * tabela foram puladas" nao diz de qual arquivo se trata.
   */
  const avisos = useMemo(() => {
    const varios = leituras.length > 1
    return leituras.flatMap((leituraDoArquivo, indice) =>
      leituraDoArquivo.avisos.map((aviso) =>
        varios && nomes[indice] ? `${nomes[indice]}: ${aviso}` : aviso
      )
    )
  }, [leituras, nomes])

  /** Quantos lancamentos vieram de cada arquivo. */
  const porArquivo = useMemo(() => {
    const contagem = new Map<string, number>()
    itens.forEach((item) => {
      contagem.set(item.arquivo, (contagem.get(item.arquivo) || 0) + 1)
    })
    return nomes.map((nome) => ({ nome, quantidade: contagem.get(nome) || 0 }))
  }, [itens, nomes])

  const variosArquivos = nomes.length > 1

  const filtradosPorArquivo = useMemo(
    () => (arquivoAtivo ? filtrados.filter((item) => item.arquivo === arquivoAtivo) : filtrados),
    [filtrados, arquivoAtivo]
  )

  /**
   * A busca olha tudo que aparece na linha.
   *
   * Um extrato de banco tem centenas de linhas, e a duvida quase sempre e
   * sobre uma so ("aquele mercado entrou?"). Sem busca, so rolando.
   */
  const buscados = useMemo(() => {
    const alvo = semAcento(busca)
    if (!alvo) return filtradosPorArquivo

    return filtradosPorArquivo.filter((item) => {
      const valor = formatarMoeda(item.valor)
      const campos = [
        item.descricao,
        item.categoria,
        item.arquivo,
        competenciaEmTexto(item.competencia),
        `${String(item.dia).padStart(2, '0')}`,
        valor,
        // Sem o "R$" e sem o separador de milhar, para "45,90" e "4590"
        // acharem o mesmo lancamento.
        valor.replace(/[^\d,]/g, ''),
        item.valor.toFixed(2).replace('.', ','),
      ]
      return campos.some((campo) => semAcento(String(campo)).includes(alvo))
    })
  }, [filtradosPorArquivo, busca])

  const visiveis = buscados.slice(0, limite)
  const restantes = buscados.length - visiveis.length
  const vazio = itens.length === 0

  const trocarFiltro = (novo: Filtro) => {
    setFiltro(novo)
    setLimite(PASSO)
  }

  const trocarArquivo = (nome: string) => {
    setArquivoAtivo((atual) => (atual === nome ? '' : nome))
    setLimite(PASSO)
  }

  const itemEmEdicao = itens.find((i) => i.id === editandoDestino)

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
    const ehFatura = item.tipo === 'cartao'
    const cor = ehEntrada ? theme.green : ehFatura ? theme.accent : theme.red
    const explicacao = explicarRepeticao(item)
    // Fatura sem cartao escolhido nao tem para onde ir: a previa cobra a
    // escolha em vez de deixar o item entrar em lugar nenhum.
    const faltaCartao = ehFatura && !item.cartaoId

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
              {variosArquivos && item.arquivo ? ` · ${item.arquivo}` : ''}
            </Text>
          </View>

          <View style={styles.itemSelos}>
            {ehEntrada ? null : ehFatura ? (
              <PressableScale
                onPress={() => setEditandoDestino(item.id)}
                scaleTo={0.94}
                style={[
                  styles.selo,
                  faltaCartao
                    ? { backgroundColor: theme.redSoft, borderColor: theme.red }
                    : { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                ]}
              >
                <Icon name="cartao" size={11} color={faltaCartao ? theme.red : theme.accent} />
                <Text
                  style={[styles.seloTexto, { color: faltaCartao ? theme.red : theme.accent }]}
                >
                  {faltaCartao ? 'escolher cartão' : `fatura · ${item.cartaoNome}`}
                </Text>
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => setEditandoDestino(item.id)}
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

          {/* Com o que ele repete: sem isto o selo obrigava a sair
              procurando o par na lista ou no proprio app. */}
          {explicacao ? (
            <Text style={[styles.repeticao, { color: theme.accent }]} numberOfLines={2}>
              {explicacao}
            </Text>
          ) : null}
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
            ? nomes.length > 1
              ? 'Não consegui reconhecer lançamentos nestes arquivos.'
              : 'Não consegui reconhecer lançamentos neste arquivo.'
            : `${resumo.marcados} de ${itens.length} lançamentos marcados` +
              (variosArquivos ? `, de ${nomes.length} arquivos` : '')
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
        {/* ---------- Os arquivos ----------
            Um bloco por arquivo escolhido: da para escolher varios de uma
            vez, e sem isto nao daria para saber o que cada um trouxe — nem
            perceber o extrato que veio vazio no meio dos outros. */}
        <View style={styles.arquivos}>
          {nomes.map((nome, indice) => {
            const leituraDoArquivo = leituras[indice]
            const selecionado = arquivoAtivo === nome
            const quantidade = porArquivo[indice]?.quantidade ?? 0

            const conteudo = (
              <>
                <View style={[styles.arquivoIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Icon
                    name={ICONE_DO_FORMATO[leituraDoArquivo?.formato || 'desconhecido']}
                    size={18}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.arquivoTextos}>
                  <Text style={[styles.arquivoNome, { color: theme.text }]} numberOfLines={1}>
                    {nome}
                  </Text>
                  <Text style={[styles.arquivoDetalhe, { color: theme.muted }]} numberOfLines={2}>
                    {leituraDoArquivo ? descreverLeitura(leituraDoArquivo) : 'Não foi lido'}
                  </Text>
                </View>
                {variosArquivos && quantidade > 0 ? (
                  <Icon name={selecionado ? 'confirmar' : 'filtrar'} size={15} color={theme.faint} />
                ) : null}
              </>
            )

            const estilo = [
              styles.arquivo,
              {
                backgroundColor: selecionado ? theme.accentSoft : theme.cardSoft,
                borderColor: selecionado ? theme.accent : theme.border,
              },
            ]

            // Com varios arquivos, tocar no bloco filtra a lista por ele.
            return variosArquivos && quantidade > 0 ? (
              <PressableScale key={nome} onPress={() => trocarArquivo(nome)} scaleTo={0.985} style={estilo}>
                {conteudo}
              </PressableScale>
            ) : (
              <View key={nome} style={estilo}>
                {conteudo}
              </View>
            )
          })}
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
            Extratos em CSV, Excel e OFX funcionam, e dá para escolher vários de uma vez. Se o seu
            banco exporta em PDF, troque o formato para OFX ou CSV na hora de baixar — é a mesma
            tela do internet banking.
          </Text>
        ) : (
          <>
            {/* ---------- Os numeros ---------- */}
            {bloco(
              'O que vai entrar',
              <View style={styles.numeros}>
                {cartaoNumero('Entradas', resumo.entradas, theme.green, theme.greenSoft)}
                {cartaoNumero('Saídas', resumo.saidas, theme.red, theme.redSoft)}
                {/* A fatura sai da conta, mas nao e gasto do mes: as parcelas
                    do cartao ja entram por conta propria. Por isso ela tem o
                    seu proprio numero, em vez de somar com as saidas. */}
                {resumo.faturas
                  ? cartaoNumero('Faturas de cartão', resumo.faturas, theme.accent, theme.accentSoft, true)
                  : null}
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

            {/* ---------- Buscar ---------- */}
            <View style={[styles.busca, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Icon name="busca" size={15} color={theme.faint} />
              <TextInput
                value={busca}
                onChangeText={(texto) => {
                  setBusca(texto)
                  setLimite(PASSO)
                }}
                placeholder="Buscar nesta lista"
                placeholderTextColor={theme.faint}
                style={[styles.buscaEntrada, { color: theme.text }]}
                autoCorrect={false}
              />
              {busca ? (
                <PressableScale
                  onPress={() => {
                    setBusca('')
                    setLimite(PASSO)
                  }}
                  scaleTo={0.9}
                  accessibilityLabel="Limpar a busca"
                >
                  <Icon name="excluir" size={15} color={theme.faint} />
                </PressableScale>
              ) : null}
            </View>

            {/* ---------- Filtro e acoes em massa ---------- */}
            <View style={styles.chips}>
              {chipFiltro('tudo', 'Tudo')}
              {chipFiltro('entradas', 'Entradas')}
              {chipFiltro('saidas', 'Saídas')}
              {contagens.faturas ? chipFiltro('faturas', 'Faturas') : null}
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
                <Text style={[styles.vazio, { color: theme.muted }]}>
                  {busca
                    ? `Nada com "${busca}" por aqui.`
                    : arquivoAtivo
                      ? 'Nada deste arquivo neste filtro.'
                      : 'Nada neste filtro.'}
                </Text>
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

      {/* Para onde o lancamento vai: uma categoria de saida ou a fatura de
          um cartao. As duas escolhas moram na mesma lista porque sao a mesma
          pergunta — o app pode ter errado nos dois sentidos. */}
      <SelectionModal
        visible={Boolean(itemEmEdicao)}
        onClose={() => setEditandoDestino(null)}
        theme={theme}
        title="Onde este lançamento entra"
        hint={itemEmEdicao?.descricao}
        options={[
          ...cartoes.map((cartao) => ({
            value: `${PREFIXO_CARTAO}${cartao.id}`,
            label: `Fatura · ${cartao.nome}`,
          })),
          ...categorias.map((categoria) => ({ value: categoria, label: categoria })),
        ]}
        selectedValue={
          itemEmEdicao?.tipo === 'cartao'
            ? `${PREFIXO_CARTAO}${itemEmEdicao.cartaoId}`
            : itemEmEdicao?.categoria || ''
        }
        onSelect={(valor) => {
          const escolha = String(valor)
          if (editandoDestino) {
            if (escolha.startsWith(PREFIXO_CARTAO)) {
              const id = escolha.slice(PREFIXO_CARTAO.length)
              const cartao = cartoes.find((c) => c.id === id)
              if (cartao) {
                onTrocarDestino(editandoDestino, {
                  tipo: 'cartao',
                  cartaoId: cartao.id,
                  cartaoNome: cartao.nome,
                })
              }
            } else {
              onTrocarDestino(editandoDestino, { tipo: 'saida', categoria: escolha })
            }
          }
          setEditandoDestino(null)
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  arquivos: { gap: 8 },
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

  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 20,
  },
  // minWidth: 0 e obrigatorio: na web o TextInput vira <input>, que tem uma
  // largura minima propria e nao encolhe dentro da linha sem isso.
  buscaEntrada: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', paddingVertical: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
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
  repeticao: { fontSize: 10.5, fontWeight: '600', lineHeight: 14, marginTop: 5 },
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
