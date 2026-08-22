import { memo } from 'react'
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { NoteItem, NoteModalMode, PixItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'
import Icon from '../common/Icon'
import ListRow from '../common/ListRow'

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
          <PressableScale onPress={() => onNovaNota('pix')} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Pix</Text>
          </PressableScale>
          <PressableScale
            onPress={() => onNovaNota('nota')}
            style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[styles.smallActionBtnText, { color: theme.text }]}>+ Nota</Text>
          </PressableScale>
          <PressableScale
            onPress={onAbrirFiltro}
            style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Icon name="filtrar" size={15} color={theme.text} />
          </PressableScale>
        </View>
      </View>

      <Text style={[styles.sectionBlockTitle, { color: theme.text }]}>Pix salvos</Text>
      {pixOrdenados.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum Pix salvo.</Text>
        </View>
      ) : (
        pixOrdenados.map((item) => (
          <ListRow
            key={item.id}
            theme={theme}
            titulo={item.nome}
            meta={item.chave}
            onEditar={() => onEditarPix(item)}
            onExcluir={() => onExcluirPix(item.id, item.nome)}
            acoesExtras={
              <PressableScale
                onPress={() => onCopiarPix(item.id, item.chave)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: copiedPixId === item.id ? theme.greenSoft : theme.card,
                  borderColor: copiedPixId === item.id ? theme.green : theme.border,
                }}
              >
                <Icon
                  name={copiedPixId === item.id ? 'confirmar' : 'copiar'}
                  size={15}
                  color={copiedPixId === item.id ? theme.green : theme.muted}
                />
              </PressableScale>
            }
            destacado={highlightedItemId === item.id}
            overlay={renderHighlightOverlay(item.id)}
            onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
          >
            {!!item.observacao && renderTextoSecundario(item.observacao, item.observacao, theme.muted)}
            {renderListaLinks(item.links)}
          </ListRow>
        ))
      )}

      <Text style={[styles.sectionBlockTitle, { color: theme.text, marginTop: 18 }]}>Outras anotações</Text>
      {notasOrdenadas.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma anotação salva.</Text>
        </View>
      ) : (
        notasOrdenadas.map((item) => (
          <ListRow
            key={item.id}
            theme={theme}
            titulo={item.titulo}
            onEditar={() => onEditarNota(item)}
            onExcluir={() => onExcluirNota(item.id, item.titulo)}
            destacado={highlightedItemId === item.id}
            overlay={renderHighlightOverlay(item.id)}
            onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
          >
            {renderTextoSecundario(item.conteudo, 'Sem conteúdo', theme.muted)}
            {renderListaLinks(item.links)}
          </ListRow>
        ))
      )}
    </View>
  )
}

export default memo(NotasPixCard)
