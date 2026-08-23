// Lancar falando, um item atras do outro.
//
// O caminho normal — abrir, escolher tipo, digitar nome, escolher categoria,
// digitar valor, salvar — sao quatro toques e duas digitacoes por lancamento.
// Aqui a feira inteira cabe numa conversa: cada frase vira um item na lista e
// no fim tudo entra de uma vez.
//
// O microfone nao fica aberto para sempre: depois de um tempo em silencio ele
// se recolhe sozinho, e um toque retoma de onde parou — a lista continua.
//
// O campo de texto nao e so um consolo para quem nao tem reconhecimento: no
// iPhone, o microfone do proprio teclado dita para dentro dele. Entao a
// ferramenta funciona em qualquer aparelho, mudando so quem ouve.

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import {
  interpretarVarias,
  normalizar as normalizarFala,
  type ContextoFala,
  type FalaInterpretada,
} from '../../src/utils/fala'
import { explicarErro, navegadorOuve, ouvir } from '../../src/utils/reconhecimentoDeVoz'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import AppearIn from '../common/motion/AppearIn'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  categorias: string[]
  /** Tudo que o app sabe e ajuda a entender a fala. */
  contexto: ContextoFala
  onAprenderCategoria: (nome: string, categoria: string) => void
  onConfirmar: (lancamentos: FalaInterpretada[]) => void
}

/** Item ja capturado. O `chave` existe so para a lista nao se confundir. */
type ItemFalado = FalaInterpretada & { chave: string }

/**
 * Um toque curto de confirmacao.
 *
 * No aparelho e vibracao de verdade; no navegador, quando ele deixa. Nunca
 * derruba nada se nao existir — e so um reforco.
 */
function vibrar() {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as Navigator) : null
    if (nav && typeof nav.vibrate === 'function') nav.vibrate(28)
    return
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** Silencio que encerra a escuta. Mais que isto e microfone aberto a toa. */
const OCIOSO_MS = 15000

/**
 * Onde a lista em andamento fica guardada.
 *
 * Sair para o banco e voltar pode custar a pagina inteira: o navegador
 * descarta abas em segundo plano quando falta memoria. Sem isto, os itens ja
 * falados sumiam junto.
 */
const CHAVE_PENDENTE = 'brazllet-voz-pendente'

/** Depois disto a lista guardada e velha demais para ser retomada. */
const VALIDADE_PENDENTE_MS = 1000 * 60 * 30

const ALTURAS = [8, 16, 22, 14, 20, 10]

export default function LancamentoPorVozModal({
  visible,
  onClose,
  theme,
  categorias,
  contexto,
  onAprenderCategoria,
  onConfirmar,
}: Props) {
  const [ouvindo, setOuvindo] = useState(false)
  const [itens, setItens] = useState<ItemFalado[]>([])
  const [escolhendo, setEscolhendo] = useState<string | null>(null)
  const [ultimaFrase, setUltimaFrase] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const pararRef = useRef<() => void>(() => {})
  // Enquanto isto for verdade o microfone volta sozinho depois de cada frase:
  // e o que permite falar "mercado 50", ver aparecer, e emendar "uber 20".
  const seguirRef = useRef(false)
  const ociosoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contadorRef = useRef(0)
  // O callback de erro precisa saber se ja ha itens, e ele nasce antes deles.
  const itensRef = useRef<ItemFalado[]>([])
  // O microfone se reabre de dentro do proprio callback, entao o que ele
  // enxerga e sempre o render em que a escuta comecou. Sem estas duas
  // referencias, a categoria ensinada agora nao valia para a proxima frase.
  const contextoRef = useRef(contexto)
  // Estava ouvindo quando a tela saiu de vista: e o que manda voltar sozinho.
  const retomarRef = useRef(false)
  const jaAbriuRef = useRef(false)
  // A leitura do que ficou guardado e assincrona: ate ela terminar, gravar por
  // cima apagaria justamente a lista que estava sendo recuperada.
  const recuperadoRef = useRef(false)

  const podeOuvir = navegadorOuve()
  const somaEntradas = itens
    .filter((item) => item.tipo === 'entrada')
    .reduce((soma, item) => soma + item.valor, 0)
  const somaSaidas = itens
    .filter((item) => item.tipo === 'saida')
    .reduce((soma, item) => soma + item.valor, 0)

  const visibleRef = useRef(visible)
  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    itensRef.current = itens
  }, [itens])

  // A lista em andamento fica guardada enquanto o modal estiver aberto.
  useEffect(() => {
    if (!visible || !recuperadoRef.current) return
    if (!itens.length) {
      AsyncStorage.removeItem(CHAVE_PENDENTE)
      return
    }
    AsyncStorage.setItem(CHAVE_PENDENTE, JSON.stringify({ em: Date.now(), itens })).catch(() => {})
  }, [itens, visible])

  useEffect(() => {
    contextoRef.current = contexto
  }, [contexto])

  // Cada abertura comeca limpa — e ja escutando, onde da.
  useEffect(() => {
    if (!visible) {
      parar()
      retomarRef.current = false
      recuperadoRef.current = false
      // So limpa o que ficou guardado se o modal chegou a abrir nesta sessao:
      // na primeira montagem ele ja nasce fechado, e apagar ali jogava fora
      // justamente a lista que a pagina descartada tinha deixado para tras.
      if (jaAbriuRef.current) AsyncStorage.removeItem(CHAVE_PENDENTE)
      setItens([])
      setEscolhendo(null)
      setTexto('')
      setUltimaFrase('')
      setErro('')
      setAviso('')
      return
    }
    jaAbriuRef.current = true
    recuperarPendente()
    if (podeOuvir) iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  /** Volta com o que tinha sido falado antes de a pagina ser descartada. */
  const recuperarPendente = async () => {
    try {
      const guardado = await AsyncStorage.getItem(CHAVE_PENDENTE)
      if (!guardado) return

      const { em, itens: salvos } = JSON.parse(guardado) as { em: number; itens: ItemFalado[] }
      if (!Array.isArray(salvos) || !salvos.length || Date.now() - em > VALIDADE_PENDENTE_MS) {
        AsyncStorage.removeItem(CHAVE_PENDENTE)
        return
      }

      if (!visibleRef.current) return

      contadorRef.current += salvos.length
      setItens(salvos)
      setAviso(
        salvos.length === 1
          ? 'Recuperei 1 item que você tinha falado.'
          : `Recuperei ${salvos.length} itens que você tinha falado.`
      )
    } catch {
      AsyncStorage.removeItem(CHAVE_PENDENTE)
    } finally {
      recuperadoRef.current = true
    }
  }

  /**
   * Sair do app pausa o microfone — e voltar religa.
   *
   * O navegador corta o reconhecimento quando a aba deixa de aparecer; nao ha
   * como gravar de verdade em segundo plano numa pagina web. Entao, em vez de
   * mostrar um erro, o app se recolhe e retoma sozinho quando a tela volta,
   * com a lista intacta. Assim da para ir ao extrato do banco, voltar e
   * continuar falando de onde parou.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return

    const aoTrocarDeTela = () => {
      if (document.visibilityState === 'hidden') {
        if (!seguirRef.current) return
        retomarRef.current = true
        parar()
        setAviso('Pausei o microfone porque você saiu. Volto assim que esta tela aparecer.')
        return
      }

      if (retomarRef.current && visibleRef.current) {
        retomarRef.current = false
        iniciar()
      }
    }

    document.addEventListener('visibilitychange', aoTrocarDeTela)
    return () => document.removeEventListener('visibilitychange', aoTrocarDeTela)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se a tela inteira sair de cena o efeito de cima nao roda: sem isto o
  // microfone continuava aberto depois de fechar.
  useEffect(
    () => () => {
      pararRef.current()
      if (ociosoRef.current) clearTimeout(ociosoRef.current)
    },
    []
  )

  const limparOcioso = () => {
    if (ociosoRef.current) clearTimeout(ociosoRef.current)
    ociosoRef.current = null
  }

  /** Recomeca a contagem do silencio. Cada frase dita adia o fechamento. */
  const armarOcioso = () => {
    limparOcioso()
    ociosoRef.current = setTimeout(() => {
      parar()
      setAviso('Pausei o microfone depois do silêncio. Toque para falar mais.')
    }, OCIOSO_MS)
  }

  /** So a saida variavel precisa de categoria: cartao e fixo nao tem. */
  const precisaDeCategoria = (item: ItemFalado) =>
    item.destino === 'variavel' && item.tipo === 'saida' && !item.categoria

  /** Guarda o que a frase tiver dentro. Devolve quantos itens entraram. */
  const guardar = (frase: string) => {
    const lidos = interpretarVarias(frase, contextoRef.current)
    if (!lidos.length) {
      setAviso(`Não achei valor em "${frase.trim()}".`)
      return 0
    }

    const novos = lidos.map((lido) => {
      contadorRef.current += 1
      return { ...lido, chave: `f${contadorRef.current}` }
    })

    setAviso('')
    setItens((antes) => [...antes, ...novos])
    // Um toque a cada item entendido: da para falar a lista inteira olhando
    // para o carrinho, sem conferir a tela a cada frase.
    vibrar()

    // Nome que o app nunca viu: pergunta a categoria agora, uma vez so.
    const semCategoria = novos.find(precisaDeCategoria)
    if (semCategoria) setEscolhendo(semCategoria.chave)

    return novos.length
  }

  const escutarUmaVez = () => {
    pararRef.current = ouvir({
      onTexto: (frase) => {
        setUltimaFrase(frase)
        guardar(frase)
        armarOcioso()
      },
      onErro: (motivo) => {
        seguirRef.current = false
        limparOcioso()
        // Silencio depois de ja ter anotado alguma coisa nao e erro: e o fim
        // natural da conversa.
        if (motivo === 'no-speech' && itensRef.current.length) {
          setAviso('Pausei o microfone depois do silêncio. Toque para falar mais.')
        } else {
          setErro(explicarErro(motivo))
        }
      },
      onFim: () => {
        if (!seguirRef.current) {
          setOuvindo(false)
          return
        }
        // Uma frase por sessao e o que o Safari aguenta: em vez de pedir
        // `continuous`, o app reabre o microfone assim que a frase fecha.
        setTimeout(() => {
          if (seguirRef.current) escutarUmaVez()
        }, 260)
      },
    })
  }

  const iniciar = () => {
    setErro('')
    setAviso('')
    seguirRef.current = true
    setOuvindo(true)
    armarOcioso()
    escutarUmaVez()
  }

  const parar = () => {
    seguirRef.current = false
    limparOcioso()
    pararRef.current()
    pararRef.current = () => {}
    setOuvindo(false)
  }

  const adicionarEscrito = () => {
    if (!texto.trim()) return
    setUltimaFrase(texto)
    if (guardar(texto)) setTexto('')
  }

  const remover = (chave: string) => {
    setItens((antes) => antes.filter((item) => item.chave !== chave))
    setEscolhendo((atual) => (atual === chave ? null : atual))
  }

  /** O que fica na memoria: o lugar, se houver, senao o proprio nome. */
  const chaveDeMemoria = (item: ItemFalado) => item.referencia || normalizarFala(item.nome)

  /** Escolhe a categoria e ensina o lugar — vale para tudo que vier dali. */
  const definirCategoria = (chave: string, categoria: string) => {
    const alvo = itens.find((item) => item.chave === chave)
    if (!alvo) return

    const aprendida = chaveDeMemoria(alvo)
    onAprenderCategoria(aprendida, categoria)

    const atualizados = itens.map((item) => {
      if (item.chave === chave) return { ...item, categoria }
      // O bolo e o pao da mesma padaria nao precisam perguntar de novo.
      const mesmoLugar = precisaDeCategoria(item) && chaveDeMemoria(item) === aprendida
      return mesmoLugar ? { ...item, categoria } : item
    })
    setItens(atualizados)

    // Emenda na proxima pergunta, se ainda houver alguma.
    const proximo = atualizados.find(precisaDeCategoria)
    setEscolhendo(proximo ? proximo.chave : null)
  }

  const confirmar = () => {
    if (!itens.length) return

    // Em vez de um botao morto, leva direto para a pergunta que falta.
    const semCategoria = itens.find(precisaDeCategoria)
    if (semCategoria) {
      setEscolhendo(semCategoria.chave)
      setAviso(`Falta dizer onde entra "${semCategoria.nome}".`)
      return
    }

    AsyncStorage.removeItem(CHAVE_PENDENTE)
    onConfirmar(itens.map(({ chave: _chave, ...resto }) => resto))
  }

  const pulso = useSharedValue(0)
  useEffect(() => {
    pulso.value = ouvindo
      ? withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 280 })
  }, [ouvindo, pulso])

  // Um anel so, e que cresce dentro da propria caixa: o par de halos antigo
  // passava do tamanho do bloco e era cortado pelo campo de cima.
  const anel = useAnimatedStyle(() => ({
    opacity: 0.12 + pulso.value * 0.2,
    transform: [{ scale: 1 + pulso.value * 0.16 }],
  }))

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Lançar falando"
      subtitulo="Diga um item por vez. Ele anota e continua ouvindo."
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        {
          label: itens.length > 1 ? `Lançar ${itens.length} itens` : 'Lançar',
          onPress: confirmar,
          primaria: true,
          desabilitada: !itens.length,
        },
      ]}
    >
      {podeOuvir ? (
        <View style={styles.microfoneArea}>
          <PressableScale
            onPress={ouvindo ? parar : iniciar}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={ouvindo ? 'Parar de ouvir' : 'Falar'}
            style={styles.microfoneToque}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.anel, { backgroundColor: theme.primary }, anel]}
            />
            <View
              style={[
                styles.microfone,
                {
                  backgroundColor: ouvindo ? theme.primary : theme.cardSoft,
                  borderColor: ouvindo ? theme.primary : theme.borderStrong,
                },
              ]}
            >
              <Icon
                name={ouvindo ? 'microfone' : 'microfone_vazio'}
                size={24}
                color={ouvindo ? theme.textInverse : theme.muted}
              />
            </View>
          </PressableScale>

          <View style={styles.abaixoDoMicrofone}>
            <Onda ativo={ouvindo} cor={theme.primary} />

            <Text style={[styles.estado, { color: ouvindo ? theme.primary : theme.muted }]}>
              {ouvindo
                ? itens.length
                  ? 'Pode falar o próximo'
                  : 'Ouvindo... pode falar'
                : itens.length
                  ? 'Toque para continuar a lista'
                  : 'Toque e fale'}
            </Text>

            {ultimaFrase ? (
              <Text style={[styles.ouvido, { color: theme.faint }]} numberOfLines={2}>
                &quot;{ultimaFrase}&quot;
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* No iPhone e onde o reconhecimento nao existe, o ditado do teclado
          escreve aqui dentro — o resultado e o mesmo. */}
      <Text style={[styles.rotulo, { color: theme.muted }]}>
        {podeOuvir ? 'Ou escreva o item' : 'Escreva ou use o microfone do teclado'}
      </Text>
      <View style={styles.linhaCampo}>
        <TextInput
          value={texto}
          onChangeText={(escrito) => {
            setTexto(escrito)
            // Quem comecou a escrever ja resolveu o problema do microfone.
            if (erro) setErro('')
            if (aviso) setAviso('')
          }}
          placeholder="mercado 84,50 e uber 22"
          placeholderTextColor={theme.faint}
          style={[
            styles.campo,
            { backgroundColor: theme.cardSoft, borderColor: theme.border, color: theme.text },
          ]}
          autoFocus={!podeOuvir}
          returnKeyType="done"
          onSubmitEditing={adicionarEscrito}
        />
        <PressableScale
          onPress={adicionarEscrito}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Adicionar o que está escrito"
          style={[
            styles.botaoAdicionar,
            {
              backgroundColor: texto.trim() ? theme.primary : theme.cardSoft,
              borderColor: texto.trim() ? theme.primary : theme.border,
            },
          ]}
        >
          <Icon name="adicionar" size={20} color={texto.trim() ? theme.textInverse : theme.faint} />
        </PressableScale>
      </View>

      {erro ? <Text style={[styles.erro, { color: theme.red }]}>{erro}</Text> : null}
      {aviso ? <Text style={[styles.erro, { color: theme.muted }]}>{aviso}</Text> : null}

      {itens.length ? (
        <>
          <View style={styles.cabecalhoLista}>
            <Text style={[styles.rotulo, styles.rotuloLista, { color: theme.muted }]}>
              {itens.length === 1 ? '1 item' : `${itens.length} itens`}
            </Text>
            <View style={styles.somas}>
              {somaEntradas > 0 ? (
                <Text style={[styles.somaTexto, { color: theme.green }]} numberOfLines={1}>
                  + {formatarMoeda(somaEntradas)}
                </Text>
              ) : null}
              {somaSaidas > 0 ? (
                <Text style={[styles.somaTexto, { color: theme.red }]} numberOfLines={1}>
                  − {formatarMoeda(somaSaidas)}
                </Text>
              ) : null}
            </View>
          </View>

          {itens.map((item, i) => {
            const precisa = precisaDeCategoria(item)
            const aberto = escolhendo === item.chave
            const quando = etiquetaDeData(item)

            return (
              <AppearIn key={item.chave} index={i} distance={10}>
                <View
                  style={[
                    styles.item,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: precisa ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <View style={styles.itemLinha}>
                    <View
                      style={[
                        styles.trilhoTipo,
                        { backgroundColor: item.tipo === 'entrada' ? theme.green : theme.red },
                      ]}
                    />

                    <View style={styles.itemTextos}>
                      <Text style={[styles.itemNome, { color: theme.text }]} numberOfLines={1}>
                        {item.nome}
                      </Text>

                      {item.destino !== 'variavel' ? (
                        <Text
                          style={[styles.itemCategoria, { color: theme.accent }]}
                          numberOfLines={1}
                        >
                          {etiquetaDeDestino(item)}
                        </Text>
                      ) : item.tipo === 'entrada' ? (
                        <Text style={[styles.itemCategoria, { color: theme.muted }]}>Entrada</Text>
                      ) : (
                        <PressableScale
                          onPress={() => setEscolhendo(aberto ? null : item.chave)}
                          scaleTo={0.96}
                          accessibilityRole="button"
                          accessibilityLabel={`Categoria de ${item.nome}`}
                          style={styles.categoriaToque}
                        >
                          <Text
                            style={[
                              styles.itemCategoria,
                              { color: precisa ? theme.accent : theme.muted },
                            ]}
                            numberOfLines={1}
                          >
                            {item.categoria || 'Qual categoria?'}
                          </Text>
                          <Icon
                            name={aberto ? 'seta_cima' : 'seta_baixo'}
                            size={11}
                            color={precisa ? theme.accent : theme.faint}
                          />
                        </PressableScale>
                      )}
                    </View>

                    <View style={styles.itemDireita}>
                      <Text
                        style={[
                          styles.itemValor,
                          { color: item.tipo === 'entrada' ? theme.green : theme.red },
                        ]}
                        numberOfLines={1}
                      >
                        {formatarMoeda(item.valor)}
                      </Text>
                      {quando ? (
                        <Text style={[styles.itemDia, { color: theme.faint }]}>{quando}</Text>
                      ) : null}
                      {item.valorDeMemoria ? (
                        <Text style={[styles.itemDia, { color: theme.accent }]}>
                          valor do último
                        </Text>
                      ) : null}
                    </View>

                    <PressableScale
                      onPress={() => remover(item.chave)}
                      scaleTo={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={`Tirar ${item.nome} da lista`}
                      style={[styles.tirar, { borderColor: theme.border }]}
                    >
                      <Icon name="excluir" size={14} color={theme.muted} />
                    </PressableScale>
                  </View>

                  {aberto ? (
                    <View style={[styles.escolha, { borderTopColor: theme.border }]}>
                      <Text style={[styles.escolhaTitulo, { color: theme.muted }]}>
                        {item.referencia && item.referencia !== normalizarFala(item.nome)
                          ? `Em que categoria entra o que vem da ${item.referencia}? Da próxima vez eu já sei.`
                          : `Onde entra "${item.nome}"? Da próxima vez eu já sei.`}
                      </Text>
                      <View style={styles.chips}>
                        {categorias.map((categoria) => {
                          const ativa = item.categoria === categoria
                          return (
                            <PressableScale
                              key={categoria}
                              onPress={() => definirCategoria(item.chave, categoria)}
                              scaleTo={0.95}
                              accessibilityRole="button"
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: ativa ? theme.primary : theme.card,
                                  borderColor: ativa ? theme.primary : theme.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipTexto,
                                  { color: ativa ? theme.textInverse : theme.text },
                                ]}
                                numberOfLines={1}
                              >
                                {categoria}
                              </Text>
                            </PressableScale>
                          )
                        })}
                      </View>
                    </View>
                  ) : null}
                </View>
              </AppearIn>
            )
          })}
        </>
      ) : (
        <Text style={[styles.dica, { color: theme.faint }]}>
          Diga o item e o preço: &quot;mercado oitenta e quatro e cinquenta&quot;. Dá para emendar
          vários numa frase só, dizer quando foi — &quot;padaria 12 ontem&quot; —, mandar para o
          cartão — &quot;300 no cartão em 3 vezes&quot; — ou marcar como fixo: &quot;todo mês 129
          de internet&quot;.
        </Text>
      )}
    </ModalSheet>
  )
}

/** "Cartão Nubank · 3x", "Todo mês", "Assinatura · Inter". */
function etiquetaDeDestino(item: ItemFalado) {
  if (item.destino === 'fixo') return 'Todo mês'
  if (item.destino === 'assinatura') {
    return item.cartao ? `Assinatura · ${item.cartao}` : 'Assinatura do cartão'
  }
  const cartao = item.cartao ? `Cartão ${item.cartao}` : 'No cartão'
  return item.parcelas && item.parcelas > 1 ? `${cartao} · ${item.parcelas}x` : cartao
}

/** "30/Jul" quando o mes foi dito, "dia 30" quando so o dia. */
function etiquetaDeData(item: ItemFalado) {
  if (item.mes) return `${item.dia || new Date().getDate()}/${item.mes.slice(0, 3)}`
  return item.dia ? `dia ${item.dia}` : ''
}

/** Barrinhas que sobem e descem enquanto o microfone esta aberto. */
function Onda({ ativo, cor }: { ativo: boolean; cor: string }) {
  return (
    <View style={styles.onda}>
      {ALTURAS.map((altura, i) => (
        <Barra key={i} ativo={ativo} cor={cor} altura={altura} indice={i} />
      ))}
    </View>
  )
}

function Barra({
  ativo,
  cor,
  altura,
  indice,
}: {
  ativo: boolean
  cor: string
  altura: number
  indice: number
}) {
  const nivel = useSharedValue(0)

  useEffect(() => {
    if (!ativo) {
      nivel.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) })
      return
    }
    // Cada barra tem seu proprio ritmo e sua propria largada: em compasso
    // igual pareceria um equalizador de brinquedo.
    nivel.value = withDelay(
      indice * 70,
      withRepeat(
        withTiming(1, { duration: 440 + indice * 90, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    )
  }, [ativo, indice, nivel])

  const estilo = useAnimatedStyle(() => ({
    height: 3 + nivel.value * altura,
    opacity: 0.35 + nivel.value * 0.65,
  }))

  return <Animated.View style={[styles.barra, { backgroundColor: cor }, estilo]} />
}

const styles = StyleSheet.create({
  microfoneArea: { alignItems: 'center', marginBottom: 16 },
  // A caixa e maior que o anel no seu tamanho maximo: e isso que garante que
  // nada dele seja cortado por quem esta em volta.
  microfoneToque: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100 },
  anel: { position: 'absolute', width: 82, height: 82, borderRadius: 999 },
  microfone: {
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abaixoDoMicrofone: { alignItems: 'center', marginTop: 2 },
  onda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 24,
  },
  barra: { width: 3, borderRadius: 999 },
  estado: { fontSize: 12.5, fontWeight: '800', marginTop: 4 },
  ouvido: { fontSize: 11.5, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rotuloLista: { marginBottom: 0 },
  linhaCampo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  campo: {
    flex: 1,
    // Sem isto o TextInput cobra a largura do texto inteiro e empurra o
    // botao de adicionar para fora da tela.
    minWidth: 0,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  botaoAdicionar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  erro: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 10 },
  dica: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

  cabecalhoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  somas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  somaTexto: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },

  item: { borderWidth: 1, borderRadius: 14, marginBottom: 7, overflow: 'hidden' },
  itemLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingRight: 10 },
  trilhoTipo: { width: 4, alignSelf: 'stretch', borderRadius: 999 },
  itemTextos: { flex: 1, minWidth: 0 },
  itemNome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  categoriaToque: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  itemCategoria: { fontSize: 11.5, fontWeight: '600' },
  itemDireita: { alignItems: 'flex-end' },
  itemValor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  itemDia: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
  tirar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  escolha: { borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
  escolhaTitulo: { fontSize: 11.5, fontWeight: '700', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 999, borderWidth: 1 },
  chipTexto: { fontSize: 12, fontWeight: '700' },
})
