import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import AppModal from '../common/AppModal'

type ImageCropModalProps = {
  visible: boolean
  imageUri: string | null
  theme: Tema
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

const FRAME_SIZE = 260
const OUTPUT_SIZE = 480

export default function ImageCropModal({ visible, imageUri, theme, onCancel, onConfirm }: ImageCropModalProps) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [coverScale, setCoverScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startOffsetX: number; startOffsetY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })
  const imgElRef = useRef<HTMLImageElement | null>(null)

  const resetState = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleImageLoad = (event: any) => {
    const el: HTMLImageElement = event.target
    const width = el.naturalWidth
    const height = el.naturalHeight
    setNaturalSize({ width, height })
    setCoverScale(Math.max(FRAME_SIZE / width, FRAME_SIZE / height))
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const displayScale = coverScale * zoom

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    }
  }

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return
    const dx = clientX - dragState.current.startX
    const dy = clientY - dragState.current.startY
    setOffset({ x: dragState.current.startOffsetX + dx, y: dragState.current.startOffsetY + dy })
  }

  const endDrag = () => {
    dragState.current.dragging = false
  }

  const handleConfirm = () => {
    const img = imgElRef.current
    if (!img || !naturalSize.width || !naturalSize.height) return

    const displayedWidth = naturalSize.width * displayScale
    const displayedHeight = naturalSize.height * displayScale
    const imageTopLeftX = FRAME_SIZE / 2 + offset.x - displayedWidth / 2
    const imageTopLeftY = FRAME_SIZE / 2 + offset.y - displayedHeight / 2

    let sx = (0 - imageTopLeftX) / displayScale
    let sy = (0 - imageTopLeftY) / displayScale
    let sSize = FRAME_SIZE / displayScale

    sx = Math.max(0, Math.min(sx, naturalSize.width - sSize))
    sy = Math.max(0, Math.min(sy, naturalSize.height - sSize))
    sSize = Math.min(sSize, naturalSize.width - sx, naturalSize.height - sy)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    resetState()
    onConfirm(dataUrl)
  }

  const handleCancel = () => {
    resetState()
    onCancel()
  }

  return (
    <AppModal visible={visible} onClose={handleCancel}>
      <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Ajustar foto</Text>
        <Text style={[styles.modalHint, { color: theme.muted }]}>Arraste para posicionar e use o controle para dar zoom</Text>

        {/* Área de corte: usa elementos HTML puros, pois é um recurso exclusivo da versão web */}
        <div
          style={{
            width: FRAME_SIZE,
            height: FRAME_SIZE,
            borderRadius: 999,
            overflow: 'hidden',
            alignSelf: 'center',
            position: 'relative',
            background: theme.backgroundSoft,
            border: `1px solid ${theme.border}`,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            if (touch) startDrag(touch.clientX, touch.clientY)
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0]
            if (touch) moveDrag(touch.clientX, touch.clientY)
          }}
          onTouchEnd={endDrag}
        >
          {imageUri ? (
            <img
              ref={imgElRef}
              src={imageUri}
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: naturalSize.width * displayScale,
                height: naturalSize.height * displayScale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </div>

        <input
          type='range'
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e: any) => setZoom(Number(e.target.value))}
          style={{ width: '100%', marginTop: 16 }}
        />

        <View style={styles.modalActions}>
          <Pressable onPress={handleCancel} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.modalActionText, { color: theme.white }]}>Usar foto</Text>
          </Pressable>
        </View>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  modalCard: {
    width: '84%',
    maxWidth: 380,
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  modalHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16, width: '100%' },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
})
