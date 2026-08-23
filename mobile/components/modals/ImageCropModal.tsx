// Ajustar a foto de perfil.
//
// O recorte segue o que virou padrao nos apps de hoje: a foto e que se move
// dentro de um circulo fixo, com dois dedos para o zoom, roda do mouse no
// computador e um botao para girar. E ela nunca sai de dentro do circulo —
// antes dava para arrastar a foto para longe e salvar um avatar com um canto
// vazio.
//
// A tela usa elementos HTML direto porque recorte e canvas so existem na web,
// que e onde o app roda.

import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'

import type { Tema } from '../../app/types'
import AppModal from '../common/AppModal'
import Icon, { type IconName } from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type ImageCropModalProps = {
  visible: boolean
  imageUri: string | null
  theme: Tema
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

const SAIDA = 512
const ZOOM_MIN = 1
const ZOOM_MAX = 4

export default function ImageCropModal({
  visible,
  imageUri,
  theme,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const { width: larguraTela } = useWindowDimensions()
  // O circulo acompanha a tela: 260 fixos estouravam em aparelho estreito.
  const quadro = Math.round(Math.max(210, Math.min(300, larguraTela * 0.68)))

  const [tamanhoReal, setTamanhoReal] = useState({ largura: 0, altura: 0 })
  const [escalaBase, setEscalaBase] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [giro, setGiro] = useState(0)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })

  const imagemRef = useRef<HTMLImageElement | null>(null)
  const arrasto = useRef({ ativo: false, x: 0, y: 0, inicioX: 0, inicioY: 0 })
  const pinca = useRef({ ativa: false, distancia: 0, zoom: 1 })

  const escala = escalaBase * zoom
  // Girada de lado, o que era altura passa a ocupar a largura.
  const deitada = giro % 180 !== 0
  const larguraVisivel = (deitada ? tamanhoReal.altura : tamanhoReal.largura) * escala
  const alturaVisivel = (deitada ? tamanhoReal.largura : tamanhoReal.altura) * escala

  const limitar = (bruto: { x: number; y: number }) => {
    const limiteX = Math.max(0, (larguraVisivel - quadro) / 2)
    const limiteY = Math.max(0, (alturaVisivel - quadro) / 2)
    return {
      x: Math.max(-limiteX, Math.min(limiteX, bruto.x)),
      y: Math.max(-limiteY, Math.min(limiteY, bruto.y)),
    }
  }

  const comecarDoZero = () => {
    setZoom(1)
    setGiro(0)
    setPosicao({ x: 0, y: 0 })
  }

  // Zoom e giro mudam o quanto sobra para arrastar: sem reencaixar, a foto
  // ficaria fora de posicao, com um pedaco vazio aparecendo no circulo.
  useEffect(() => {
    setPosicao((atual) => limitar(atual))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, giro, escalaBase, quadro])

  useEffect(() => {
    if (!visible) comecarDoZero()
  }, [visible])

  const aoCarregar = (evento: any) => {
    const el: HTMLImageElement = evento.target
    const largura = el.naturalWidth
    const altura = el.naturalHeight
    setTamanhoReal({ largura, altura })
    setEscalaBase(Math.max(quadro / largura, quadro / altura))
    comecarDoZero()
  }

  const distanciaEntreDedos = (toques: any) =>
    Math.hypot(toques[0].clientX - toques[1].clientX, toques[0].clientY - toques[1].clientY)

  const iniciarArrasto = (x: number, y: number) => {
    arrasto.current = { ativo: true, x, y, inicioX: posicao.x, inicioY: posicao.y }
  }

  const moverArrasto = (x: number, y: number) => {
    if (!arrasto.current.ativo) return
    setPosicao(
      limitar({
        x: arrasto.current.inicioX + (x - arrasto.current.x),
        y: arrasto.current.inicioY + (y - arrasto.current.y),
      })
    )
  }

  const soltar = () => {
    arrasto.current.ativo = false
    pinca.current.ativa = false
  }

  const aplicarZoom = (novo: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(novo.toFixed(3)))))
  }

  const aoTocar = (evento: any) => {
    if (evento.touches.length === 2) {
      pinca.current = { ativa: true, distancia: distanciaEntreDedos(evento.touches), zoom }
      arrasto.current.ativo = false
      return
    }
    const toque = evento.touches[0]
    if (toque) iniciarArrasto(toque.clientX, toque.clientY)
  }

  const aoMover = (evento: any) => {
    if (pinca.current.ativa && evento.touches.length === 2) {
      const agora = distanciaEntreDedos(evento.touches)
      if (pinca.current.distancia > 0) aplicarZoom(pinca.current.zoom * (agora / pinca.current.distancia))
      return
    }
    const toque = evento.touches[0]
    if (toque) moverArrasto(toque.clientX, toque.clientY)
  }

  const girar = () => setGiro((atual) => (atual + 90) % 360)

  /**
   * Desenha exatamente o que esta na tela, so que maior.
   *
   * Repetir as mesmas transformacoes no canvas — mover, girar, desenhar
   * centralizado — sai mais simples e mais fiel do que calcular o retangulo de
   * origem, ainda mais com a foto girada.
   */
  const confirmar = () => {
    const img = imagemRef.current
    if (!img || !tamanhoReal.largura) return

    const canvas = document.createElement('canvas')
    canvas.width = SAIDA
    canvas.height = SAIDA
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fator = SAIDA / quadro
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SAIDA, SAIDA)

    ctx.save()
    ctx.translate(SAIDA / 2 + posicao.x * fator, SAIDA / 2 + posicao.y * fator)
    ctx.rotate((giro * Math.PI) / 180)
    const largura = tamanhoReal.largura * escala * fator
    const altura = tamanhoReal.altura * escala * fator
    ctx.drawImage(img, -largura / 2, -altura / 2, largura, altura)
    ctx.restore()

    onConfirm(canvas.toDataURL('image/jpeg', 0.92))
  }

  const cancelar = () => {
    comecarDoZero()
    onCancel()
  }

  const redondo = (aoPressionar: () => void, icone: IconName, rotulo: string) => (
    <PressableScale
      onPress={aoPressionar}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={[styles.redondo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
    >
      <Icon name={icone} size={16} color={theme.text} />
    </PressableScale>
  )

  return (
    <AppModal visible={visible} onClose={cancelar}>
      <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.titulo, { color: theme.text }]}>Ajustar foto</Text>
        <Text style={[styles.dica, { color: theme.muted }]}>
          Arraste para enquadrar. Dois dedos ou a roda do mouse dão zoom.
        </Text>

        {/* Recorte e canvas so existem na web: aqui vale HTML puro. */}
        <div
          style={{
            width: quadro,
            height: quadro,
            borderRadius: 999,
            overflow: 'hidden',
            margin: '0 auto',
            position: 'relative',
            background: theme.backgroundSoft,
            border: `1px solid ${theme.border}`,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onMouseDown={(e) => iniciarArrasto(e.clientX, e.clientY)}
          onMouseMove={(e) => moverArrasto(e.clientX, e.clientY)}
          onMouseUp={soltar}
          onMouseLeave={soltar}
          onWheel={(e) => aplicarZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92))}
          onTouchStart={aoTocar}
          onTouchMove={aoMover}
          onTouchEnd={soltar}
          onDoubleClick={comecarDoZero}
        >
          {imageUri ? (
            <img
              ref={imagemRef}
              src={imageUri}
              onLoad={aoCarregar}
              draggable={false}
              alt=""
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: tamanhoReal.largura * escala,
                height: tamanhoReal.altura * escala,
                transform: `translate(-50%, -50%) translate(${posicao.x}px, ${posicao.y}px) rotate(${giro}deg)`,
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </div>

        <View style={styles.controles}>
          {redondo(() => aplicarZoom(zoom - 0.25), 'menos', 'Diminuir zoom')}

          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e: any) => aplicarZoom(Number(e.target.value))}
            aria-label="Zoom"
            style={{ flex: 1, accentColor: theme.primary, cursor: 'pointer' }}
          />

          {redondo(() => aplicarZoom(zoom + 0.25), 'adicionar', 'Aumentar zoom')}
          {redondo(girar, 'girar', 'Girar a foto')}
        </View>

        <View style={styles.acoes}>
          <PressableScale
            onPress={cancelar}
            scaleTo={0.97}
            accessibilityRole="button"
            style={[styles.acao, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.acaoTexto, { color: theme.text }]}>Cancelar</Text>
          </PressableScale>

          <PressableScale
            onPress={confirmar}
            scaleTo={0.97}
            accessibilityRole="button"
            style={[styles.acao, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          >
            <Text style={[styles.acaoTexto, { color: theme.textInverse }]}>Usar foto</Text>
          </PressableScale>
        </View>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  cartao: {
    width: '88%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
  },
  titulo: { fontSize: 17, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  dica: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 16,
  },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  redondo: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  acao: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acaoTexto: { fontSize: 13.5, fontWeight: '900' },
})
