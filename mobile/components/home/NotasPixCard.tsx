import { memo } from 'react'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { NoteItem, NoteModalMode, PixItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'

type NotasPixCardProps = {
  theme: Tema
  pixOrdenados: PixItem[]
  notasOrdenadas: NoteItem[]
  copiedPixId: string | null
  highlightedItemId: string | null
  registrarLayoutItem: (id: string, y: number, height?: number) => void
  renderHighlightOverlay: (id: string) => ReactNode
  renderTextoSecundario: (texto: string | undefined, fallback: string, color: string) => ReactNode
  renderListaLinks: (links?: string[]) => ReactNode
  onNovaNota: (tipo: NoteModalMode) => void
  onAbrirFiltro: () => void
  onCopiarPix: (id: string, chave: string) => void
  onEditarPix: (item: PixItem) => void
  onExcluirPix: (id: string, nome: string) => void
  onEditarNota: (item: NoteItem) => void
  onExcluirNota: (id: string, titulo: string) => void
}

/**
 * Chaves Pix salvas e anotacoes livres, em um unico card com duas listas.
 */
function NotasPixCard({
  theme,
  pixOrdenados,
  notasOrdenadas,
  copiedPixId,
  highlightedItemId,
  registrarLayoutItem,
  renderHighlightOverlay,
  renderTextoSecundario,
  renderListaLinks,
  onNovaNota,
  onAbrirFiltro,
  onCopiarPix,
  onEditarPix,
  onExcluirPix,
  onEditarNota,
  onExcluirNota,
}: NotasPixCardProps) {
  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Anotações e Pix</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            Guarde chaves Pix e lembretes importantes aqui.
          </Text>
        </View>
        <View style={styles.categoryToolbar}>
          <Pressable onPress={() => onNovaNota('pix')} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Pix</Text>
          </Pressable>
          <Pressable
            onPress={() => onNovaNota('nota')}
            style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.smallActionBtnText, { color: theme.text }]}>+ Nota</Text>
          </Pressable>
          <Pressable
            onPress={onAbrirFiltro}
            style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionBlockTitle, { color: theme.text }]}>Pix salvos</Text>
      {pixOrdenados.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum Pix salvo.</Text>
        </View>
      ) : (
        pixOrdenados.map((item) => (
          <View
            key={item.id}
            onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
            style={[
              styles.fullRowCard,
              highlightedItemId === item.id && styles.searchHighlightCard,
              { borderColor: theme.border, backgroundColor: theme.cardSoft },
            ]}
          >
            {renderHighlightOverlay(item.id)}
            <View style={styles.fullRowTop}>
              <View style={styles.fullRowTitleWrap}>
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                {renderTextoSecundario(item.chave, item.chave, theme.muted)}
                {!!item.observacao && renderTextoSecundario(item.observacao, item.observacao, theme.muted)}
                {renderListaLinks(item.links)}
              </View>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => onCopiarPix(item.id, item.chave)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: copiedPixId === item.id ? theme.green : theme.text }]}>
                    {copiedPixId === item.id ? '✓' : '⎘'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onEditarPix(item)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                </Pressable>
                <Pressable onPress={() => onExcluirPix(item.id, item.nome)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionBlockTitle, { color: theme.text, marginTop: 18 }]}>Outras anotações</Text>
      {notasOrdenadas.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma anotação salva.</Text>
        </View>
      ) : (
        notasOrdenadas.map((item) => (
          <View
            key={item.id}
            onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
            style={[
              styles.fullRowCard,
              highlightedItemId === item.id && styles.searchHighlightCard,
              { borderColor: theme.border, backgroundColor: theme.cardSoft },
            ]}
          >
            {renderHighlightOverlay(item.id)}
            <View style={styles.fullRowTop}>
              <View style={styles.fullRowTitleWrap}>
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.titulo}</Text>
                {renderTextoSecundario(item.conteudo, 'Sem conteúdo', theme.muted)}
                {renderListaLinks(item.links)}
              </View>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => onEditarNota(item)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                </Pressable>
                <Pressable onPress={() => onExcluirNota(item.id, item.titulo)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

export default memo(NotasPixCard)
