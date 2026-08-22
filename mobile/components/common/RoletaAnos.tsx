// Roleta de anos.
//
// A escolha do ano era so um par de setas: chegar em 2019 pedia dez toques.
// Aqui o ano vira uma roleta — arrasta e para no que quiser —, com os itens
// distantes menores e mais apagados, para o do meio ficar obvio.

import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

import type { Tema } from '../../app/types'
import PressableScale from './motion/PressableScale'

const ALTURA_ITEM = 44
const VISIVEIS = 5
const CENTRO = Math.floor(VISIVEIS / 2)

type Props = {
  theme: Tema
  anos: number[]
  ano: number
  onSelecionar: (ano: number) => void
  /** Chamado quando a escolha esta feita: o toque, ou a rolagem que parou. */
  onEscolhido?: (ano: number) => void
}

function ItemAno({
  theme,
  ano,
  indice,
  deslocamento,
  selecionado,
  onPress,
}: {
  theme: Tema
  ano: number
  indice: number
  deslocamento: SharedValue<number>
  selecionado: boolean
  onPress: () => void
}) {
  const estilo = useAnimatedStyle(() => {
    const distancia = Math.abs(deslocamento.value / ALTURA_ITEM - indice)
    return {
      opacity: interpolate(distancia, [0, 1, 2, 3], [1, 0.5, 0.25, 0.1], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(distancia, [0, 1, 2], [1, 0.84, 0.72], Extrapolation.CLAMP) },
      ],
    }
  })

  return (
    <Animated.View style={[styles.item, estilo]}>
      <PressableScale onPress={onPress} scaleTo={0.94} style={styles.toque}>
        <Text
          style={[
            styles.texto,
            { color: selecionado ? theme.accent : theme.text },
          ]}
        >
          {ano}
        </Text>
      </PressableScale>
    </Animated.View>
  )
}

export default function RoletaAnos({ theme, anos, ano, onSelecionar, onEscolhido }: Props) {
  const deslocamento = useSharedValue(0)
  const ultimoIndice = useSharedValue(-1)
  const lista = useRef<Animated.ScrollView>(null)

  const indiceDe = (valor: number) => {
    const encontrado = anos.indexOf(valor)
    return encontrado >= 0 ? encontrado : Math.floor(anos.length / 2)
  }

  const escolherPorIndice = (indice: number) => {
    const seguro = Math.min(anos.length - 1, Math.max(0, indice))
    if (anos[seguro] !== undefined && anos[seguro] !== ano) onSelecionar(anos[seguro])
  }

  // Posiciona no ano em uso ao abrir, sem animacao.
  useEffect(() => {
    const y = indiceDe(ano) * ALTURA_ITEM
    deslocamento.value = y
    ultimoIndice.value = indiceDe(ano)
    const t = setTimeout(() => lista.current?.scrollTo({ y, animated: false }), 0)
    return () => clearTimeout(t)
    // Roda so na montagem: depois disso quem manda no scroll e o dedo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aoRolar = useAnimatedScrollHandler({
    onScroll: (evento) => {
      deslocamento.value = evento.contentOffset.y
      const indice = Math.round(evento.contentOffset.y / ALTURA_ITEM)
      if (indice !== ultimoIndice.value) {
        ultimoIndice.value = indice
        runOnJS(escolherPorIndice)(indice)
      }
    },
  })

  /**
   * Encaixa no item mais proximo quando o dedo solta (o snap nativo nem sempre
   * pega na web) e trata isso como a escolha feita.
   */
  const encaixar = (y: number) => {
    const indice = Math.min(anos.length - 1, Math.max(0, Math.round(y / ALTURA_ITEM)))
    const destino = indice * ALTURA_ITEM
    if (Math.abs(destino - y) > 1) lista.current?.scrollTo({ y: destino, animated: true })

    const escolhido = anos[indice]
    if (escolhido === undefined || !onEscolhido) return
    // Um respiro antes de fechar: o encaixe precisa terminar na tela, senao a
    // roleta some no meio do movimento e parece que engoliu o toque.
    setTimeout(() => onEscolhido(escolhido), 320)
  }

  return (
    <View style={styles.wrap}>
      {/* Faixa fixa no meio: marca qual item esta valendo */}
      <View
        pointerEvents="none"
        style={[
          styles.faixa,
          { top: CENTRO * ALTURA_ITEM, backgroundColor: theme.accentSoft, borderColor: theme.accent },
        ]}
      />

      <Animated.ScrollView
        ref={lista}
        onScroll={aoRolar}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={ALTURA_ITEM}
        decelerationRate="fast"
        onMomentumScrollEnd={(evento) => encaixar(evento.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(evento) => encaixar(evento.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: CENTRO * ALTURA_ITEM }}
      >
        {anos.map((valor, indice) => (
          <ItemAno
            key={valor}
            theme={theme}
            ano={valor}
            indice={indice}
            deslocamento={deslocamento}
            selecionado={valor === ano}
            onPress={() => {
              lista.current?.scrollTo({ y: indice * ALTURA_ITEM, animated: true })
              onSelecionar(valor)
              onEscolhido?.(valor)
            }}
          />
        ))}
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: ALTURA_ITEM * VISIVEIS, position: 'relative' },
  faixa: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ALTURA_ITEM,
    borderRadius: 14,
    borderWidth: 1,
  },
  item: { height: ALTURA_ITEM, alignItems: 'center', justifyContent: 'center' },
  toque: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
})
