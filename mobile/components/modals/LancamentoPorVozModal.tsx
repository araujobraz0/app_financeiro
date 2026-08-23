// Lancar falando, um item atras do outro.
//
// O caminho normal — abrir, escolher tipo, digitar nome, escolher categoria,
// digitar valor, salvar — sao quatro toques e duas digitacoes por lancamento.
// Aqui a feira inteira cabe numa conversa: o microfone fica aberto, cada frase
// vira um item na lista e no fim tudo entra de uma vez.
//
// O campo de texto nao e so um consolo para quem nao tem reconhecimento: no
// iPhone, o microfone do proprio teclado dita para dentro dele. Entao a
// ferramenta funciona em qualquer aparelho, mudando so quem ouve.

import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
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
import { interpretarVarias, type FalaInterpretada } from '../../src/utils/fala'
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
  onConfirmar: (lancamentos: FalaInterpretada[]) => void
}

/** Item ja capturado. O `chave` existe so para a lista nao se confundir. */
type ItemFalado = FalaInterpretada & { chave: string }

const ALTURAS = [10, 20, 30, 22, 34, 18, 12]

export default function LancamentoPorVozModal({
  visible,
  onClose,
  theme,
  categorias,
  onConfirmar,
}: Props) {
  const [ouvindo, setOuvindo] = useState(false)
  const [itens, setItens] = useState<ItemFalado[]>([])
  const [ultimaFrase, setUltimaFrase] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const pararRef = useRef<() => void>(() => {})
  // Enquanto isto for verdade o microfone volta sozinho depois de cada frase:
  // e o que permite falar "mercado 50", ver aparecer, e emendar "uber 20".
  const seguirRef = useRef(false)
  const contadorRef = useRef(0)
  // O callback de erro precisa saber se ja ha itens, e ele nasce antes deles.
  const itensRef = useRef<ItemFalado[]>([])

  const podeOuvir = navegadorOuve()
  const somaEntradas = itens
    .filter((item) => item.tipo === 'entrada')
    .reduce((soma, item) => soma + item.valor, 0)
  const somaSaidas = itens
    .filter((item) => item.tipo === 'saida')
    .reduce((soma, item) => soma + item.valor, 0)

  useEffect(() => {
    itensRef.current = itens
  }, [itens])

  // Cada abertura comeca limpa — e ja escutando, onde da.
  useEffect(() => {
    if (!visible) {
      parar()
      setItens([])
      setTexto('')
      setUltimaFrase('')
      setErro('')
      setAviso('')
      return
    }
    if (podeOuvir) iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Se a tela inteira sair de cena o efeito de cima nao roda: sem isto o
  // microfone continuava aberto depois de fechar.
  useEffect(() => () => pararRef.current(), [])

  /** Guarda o que a frase tiver dentro. Devolve quantos itens entraram. */
  const guardar = (frase: string) => {
    const lidos = interpretarVarias(frase, categorias)
    if (!lidos.length) {
      setAviso(`Não achei valor em "${frase.trim()}".`)
      return 0
    }

    setAviso('')
    setItens((antes) => [
      ...antes,
      ...lidos.map((lido) => {
        contadorRef.current += 1
        return { ...lido, chave: `f${contadorRef.current}` }
      }),
    ])
    return lidos.length
  }

  const escutarUmaVez = () => {
    pararRef.current = ouvir({
      onTexto: (frase) => {
        setUltimaFrase(frase)
        guardar(frase)
      },
      onErro: (motivo) => {
        seguirRef.current = false
        // Silencio depois de ja ter anotado alguma coisa nao e erro: e o fim
        // natural da conversa.
        if (motivo !== 'no-speech' || !itensRef.current.length) setErro(explicarErro(motivo))
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
    seguirRef.current = true
    setOuvindo(true)
    escutarUmaVez()
  }

  const parar = () => {
    seguirRef.current = false
    pararRef.current()
    pararRef.current = () => {}
    setOuvindo(false)
  }

  const adicionarEscrito = () => {
    if (!texto.trim()) return
    setUltimaFrase(texto)
    if (guardar(texto)) setTexto('')
  }

  const remover = (chave: string) =>
    setItens((antes) => antes.filter((item) => item.chave !== chave))

  const confirmar = () => {
    if (!itens.length) return
    onConfirmar(itens.map(({ chave: _chave, ...resto }) => resto))
  }

  const pulso = useSharedValue(0)
  useEffect(() => {
    pulso.value = ouvindo
      ? withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 260 })
  }, [ouvindo, pulso])

  const haloExterno = useAnimatedStyle(() => ({
    opacity: 0.08 + pulso.value * 0.16,
    transform: [{ scale: 0.9 + pulso.value * 0.24 }],
  }))
  const haloInterno = useAnimatedStyle(() => ({
    opacity: 0.16 + pulso.value * 0.28,
    transform: [{ scale: 1 + pulso.value * 0.14 }],
  }))

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Lançar falando"
      subtitulo="Fale um item por vez — o microfone continua aberto e vai anotando."
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
              style={[styles.haloExterno, { backgroundColor: theme.primary }, haloExterno]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.halo, { backgroundColor: theme.primary }, haloInterno]}
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

          <Onda ativo={ouvindo} cor={ouvindo ? theme.primary : theme.border} />

          <Text style={[styles.estado, { color: ouvindo ? theme.primary : theme.muted }]}>
            {ouvindo
              ? itens.length
                ? 'Pode falar o próximo'
                : 'Ouvindo... pode falar'
              : itens.length
                ? 'Toque para falar mais'
                : 'Toque e fale'}
          </Text>

          {ultimaFrase ? (
            <Text style={[styles.ouvido, { color: theme.faint }]} numberOfLines={2}>
              &quot;{ultimaFrase}&quot;
            </Text>
          ) : null}
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

          {itens.map((item, i) => (
            <AppearIn key={item.chave} index={i} distance={10}>
              <View
                style={[styles.item, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
              >
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
                  <Text style={[styles.itemCategoria, { color: theme.muted }]} numberOfLines={1}>
                    {item.tipo === 'entrada'
                      ? 'Entrada'
                      : item.categoria || categorias[0] || 'Sem categoria'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.itemValor,
                    { color: item.tipo === 'entrada' ? theme.green : theme.red },
                  ]}
                  numberOfLines={1}
                >
                  {formatarMoeda(item.valor)}
                </Text>

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
            </AppearIn>
          ))}
        </>
      ) : (
        <Text style={[styles.dica, { color: theme.faint }]}>
          Diga o item e o preço: &quot;mercado oitenta e quatro e cinquenta&quot;. Dá para emendar
          vários numa frase só — &quot;padaria 12 e uber 22&quot;.
        </Text>
      )}
    </ModalSheet>
  )
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
        withTiming(1, { duration: 420 + indice * 90, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    )
  }, [ativo, indice, nivel])

  const estilo = useAnimatedStyle(() => ({ height: 4 + nivel.value * altura }))

  return <Animated.View style={[styles.barra, { backgroundColor: cor }, estilo]} />
}

const styles = StyleSheet.create({
  microfoneArea: { alignItems: 'center', marginBottom: 14 },
  microfoneToque: { alignItems: 'center', justifyContent: 'center', width: 92, height: 92 },
  haloExterno: { position: 'absolute', width: 92, height: 92, borderRadius: 999 },
  halo: { position: 'absolute', width: 76, height: 76, borderRadius: 999 },
  microfone: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
  },
  barra: { width: 3.5, borderRadius: 999 },
  estado: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  ouvido: { fontSize: 11.5, fontWeight: '600', marginTop: 5, textAlign: 'center' },

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

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    paddingRight: 10,
    marginBottom: 7,
    overflow: 'hidden',
  },
  trilhoTipo: { width: 4, alignSelf: 'stretch', borderRadius: 999 },
  itemTextos: { flex: 1, minWidth: 0 },
  itemNome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  itemCategoria: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  itemValor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  tirar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
