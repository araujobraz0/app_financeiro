// Lancar falando.
//
// O caminho normal — abrir, escolher tipo, digitar nome, escolher categoria,
// digitar valor, salvar — sao quatro toques e duas digitacoes para anotar um
// mercado. Aqui e um toque e uma frase.
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
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import { interpretarFala, type FalaInterpretada } from '../../src/utils/fala'
import { explicarErro, navegadorOuve, ouvir } from '../../src/utils/reconhecimentoDeVoz'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  categorias: string[]
  onConfirmar: (lancamento: FalaInterpretada) => void
}

export default function LancamentoPorVozModal({
  visible,
  onClose,
  theme,
  categorias,
  onConfirmar,
}: Props) {
  const [ouvindo, setOuvindo] = useState(false)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const pararRef = useRef<() => void>(() => {})

  const entendido = texto.trim() ? interpretarFala(texto, categorias) : null
  const podeOuvir = navegadorOuve()

  // Cada abertura comeca limpa — e ja escutando, onde da.
  useEffect(() => {
    if (!visible) {
      parar()
      setTexto('')
      setErro('')
      return
    }
    if (podeOuvir) iniciar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Se a tela inteira sair de cena o efeito de cima nao roda: sem isto o
  // microfone continuava aberto depois de fechar.
  useEffect(() => () => pararRef.current(), [])

  const iniciar = () => {
    setErro('')
    setTexto('')
    setOuvindo(true)
    pararRef.current = ouvir({
      onTexto: (ouvido) => {
        setTexto(ouvido)
        // Ja ouviu a frase: nao ha mais o que escutar.
        parar()
      },
      onErro: (motivo) => setErro(explicarErro(motivo)),
      onFim: () => setOuvindo(false),
    })
  }

  const parar = () => {
    pararRef.current()
    pararRef.current = () => {}
    setOuvindo(false)
  }

  const pulso = useSharedValue(0)
  useEffect(() => {
    pulso.value = ouvindo
      ? withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 200 })
  }, [ouvindo, pulso])

  const halo = useAnimatedStyle(() => ({
    opacity: 0.18 + pulso.value * 0.3,
    transform: [{ scale: 1 + pulso.value * 0.22 }],
  }))

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Lançar falando"
      subtitulo='Diga o que foi e quanto custou — "mercado oitenta e quatro e cinquenta".'
      acoes={[
        { label: 'Cancelar', onPress: onClose },
        {
          label: 'Lançar',
          onPress: () => entendido && onConfirmar(entendido),
          primaria: true,
          desabilitada: !entendido,
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
              style={[styles.halo, { backgroundColor: theme.primary }, halo]}
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
                size={26}
                color={ouvindo ? theme.textInverse : theme.muted}
              />
            </View>
          </PressableScale>

          <Text style={[styles.estado, { color: ouvindo ? theme.primary : theme.muted }]}>
            {ouvindo ? 'Ouvindo... pode falar' : texto ? 'Toque para falar de novo' : 'Toque e fale'}
          </Text>
        </View>
      ) : null}

      {/* No iPhone e onde o reconhecimento nao existe, o ditado do teclado
          escreve aqui dentro — o resultado e o mesmo. */}
      <Text style={[styles.rotulo, { color: theme.muted }]}>
        {podeOuvir ? 'O que eu entendi' : 'Escreva ou use o microfone do teclado'}
      </Text>
      <TextInput
        value={texto}
        onChangeText={(escrito) => {
          setTexto(escrito)
          // Quem comecou a escrever ja resolveu o problema do microfone.
          if (erro) setErro('')
        }}
        placeholder="mercado 84,50"
        placeholderTextColor={theme.faint}
        style={[
          styles.campo,
          { backgroundColor: theme.cardSoft, borderColor: theme.border, color: theme.text },
        ]}
        autoFocus={!podeOuvir}
        returnKeyType="done"
        onSubmitEditing={() => entendido && onConfirmar(entendido)}
      />

      {erro ? <Text style={[styles.erro, { color: theme.red }]}>{erro}</Text> : null}

      {entendido ? (
        <View style={[styles.previa, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <View
            style={[
              styles.previaTipo,
              {
                backgroundColor: entendido.tipo === 'entrada' ? theme.greenSoft : theme.redSoft,
                borderColor: entendido.tipo === 'entrada' ? theme.green : theme.red,
              },
            ]}
          >
            <Icon
              name={entendido.tipo === 'entrada' ? 'seta_cima' : 'seta_baixo'}
              size={12}
              color={entendido.tipo === 'entrada' ? theme.green : theme.red}
            />
            <Text
              style={[
                styles.previaTipoTexto,
                { color: entendido.tipo === 'entrada' ? theme.green : theme.red },
              ]}
            >
              {entendido.tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </Text>
          </View>

          <Text style={[styles.previaNome, { color: theme.text }]} numberOfLines={2}>
            {entendido.nome}
          </Text>
          <Text style={[styles.previaValor, { color: theme.text }]} numberOfLines={1}>
            {formatarMoeda(entendido.valor)}
          </Text>
          {entendido.tipo === 'saida' ? (
            <Text style={[styles.previaCategoria, { color: theme.muted }]} numberOfLines={1}>
              {entendido.categoria || categorias[0] || 'Sem categoria'}
            </Text>
          ) : null}
        </View>
      ) : texto.trim() ? (
        <Text style={[styles.erro, { color: theme.muted }]}>
          Não achei um valor nessa frase. Diga o nome e o preço — &quot;uber vinte e dois&quot;.
        </Text>
      ) : null}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  microfoneArea: { alignItems: 'center', marginBottom: 20 },
  microfoneToque: { alignItems: 'center', justifyContent: 'center', width: 96, height: 96 },
  halo: { position: 'absolute', width: 82, height: 82, borderRadius: 999 },
  microfone: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estado: { fontSize: 12.5, fontWeight: '700', marginTop: 10 },

  rotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  campo: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  erro: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 10 },

  previa: { borderWidth: 1, borderRadius: 16, padding: 14 },
  previaTipo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 9,
  },
  previaTipoTexto: { fontSize: 10.5, fontWeight: '800' },
  previaNome: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  previaValor: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 3 },
  previaCategoria: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
})
