import { memo } from 'react'
import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { EntradaItem, SaidaItem, Tema, TipoVariavelTab } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'

type VariavelTabProps = {
  theme: Tema
  chaveAtual: string
  tipoVariavelTab: TipoVariavelTab
  onTipoChange: (tipo: TipoVariavelTab) => void
  totalEntradas: number
  totalCategoriaSelecionada: number
  categoriasSaidas: string[]
  filtroCategoria: string
  onFiltroCategoriaChange: (categoria: string) => void
  entradas: EntradaItem[]
  entradasOrdenadas: EntradaItem[]
  saidasOrdenadas: SaidaItem[]
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarLayoutItem: (id: string, y: number, height?: number) => void
  renderHighlightOverlay: (id: string) => ReactNode
  onNovaCategoria: () => void
  onGerenciarCategorias: () => void
  onAbrirFiltro: (alvo: 'entradas' | 'saidas') => void
  onEditarEntrada: (item: EntradaItem) => void
  onExcluirEntrada: (id: string, nome: string) => void
  onEditarSaida: (item: SaidaItem) => void
  onExcluirSaida: (id: string, nome: string) => void
}

/**
 * Aba "Variável": alterna entre entradas e saidas do mes, com filtro por
 * categoria nas saidas.
 *
 * Envolvida em React.memo pelo mesmo motivo das outras abas.
 */
function VariavelTab({
  theme,
  chaveAtual,
  tipoVariavelTab,
  onTipoChange,
  totalEntradas,
  totalCategoriaSelecionada,
  categoriasSaidas,
  filtroCategoria,
  onFiltroCategoriaChange,
  entradas,
  entradasOrdenadas,
  saidasOrdenadas,
  highlightedItemId,
  formatarValorVisivel,
  registrarLayoutItem,
  renderHighlightOverlay,
  onNovaCategoria,
  onGerenciarCategorias,
  onAbrirFiltro,
  onEditarEntrada,
  onExcluirEntrada,
  onEditarSaida,
  onExcluirSaida,
}: VariavelTabProps) {
  return (
    <>
      <View style={[styles.manageCard, styles.sectionCardSpaced, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.manageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.manageTitle, { color: theme.text }]}>VARIÁVEL</Text>
            <Text style={[styles.manageSub, { color: theme.muted }]}>
              {tipoVariavelTab === 'entrada'
                ? `Total de entradas: ${formatarValorVisivel(totalEntradas)}`
                : `Total da categoria marcada: ${formatarMoeda(totalCategoriaSelecionada)}`}
            </Text>
          </View>
          <View style={styles.categoryToolbar}>
            {tipoVariavelTab === 'saida' && (
              <>
                <PressableScale onPress={onNovaCategoria} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Categoria</Text>
                </PressableScale>
                <PressableScale
                  onPress={onGerenciarCategorias}
                  style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  <Text style={[styles.smallActionBtnText, { color: theme.text }]}>Gerenciar</Text>
                </PressableScale>
              </>
            )}
            <PressableScale
              onPress={() => onAbrirFiltro(tipoVariavelTab === 'entrada' ? 'entradas' : 'saidas')}
              style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
            </PressableScale>
          </View>
        </View>

        <View style={styles.variableSwitchRow}>
          <PressableScale
            onPress={() => onTipoChange('entrada')}
            style={[
              styles.variableSwitchBtn,
              {
                backgroundColor: tipoVariavelTab === 'entrada' ? theme.primary : theme.cardSoft,
                borderColor: tipoVariavelTab === 'entrada' ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.variableSwitchBtnText, { color: tipoVariavelTab === 'entrada' ? theme.white : theme.text }]}>
              Entradas
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => onTipoChange('saida')}
            style={[
              styles.variableSwitchBtn,
              {
                backgroundColor: tipoVariavelTab === 'saida' ? theme.primary : theme.cardSoft,
                borderColor: tipoVariavelTab === 'saida' ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.variableSwitchBtnText, { color: tipoVariavelTab === 'saida' ? theme.white : theme.text }]}>
              Saídas
            </Text>
          </PressableScale>
        </View>

        {tipoVariavelTab === 'saida' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <PressableScale
              onPress={() => onFiltroCategoriaChange('Todas')}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filtroCategoria === 'Todas' ? theme.primary : theme.cardSoft,
                  borderColor: filtroCategoria === 'Todas' ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.filterPillText, { color: filtroCategoria === 'Todas' ? theme.white : theme.text }]}>Todas</Text>
            </PressableScale>
            {categoriasSaidas.map((categoria) => (
              <PressableScale
                key={categoria}
                onPress={() => onFiltroCategoriaChange(categoria)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: filtroCategoria === categoria ? theme.primary : theme.cardSoft,
                    borderColor: filtroCategoria === categoria ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.filterPillText, { color: filtroCategoria === categoria ? theme.white : theme.text }]}>
                  {categoria}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {tipoVariavelTab === 'entrada' ? (
          entradas.length === 0 ? (
            <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
              <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma entrada cadastrada.</Text>
            </View>
          ) : (
            entradasOrdenadas.map((item) => (
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
                    <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{formatarDiaMes(item.dia, chaveAtual)}</Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Text style={[styles.rowItemValue, { color: theme.green }]}>{formatarValorVisivel(item.valor)}</Text>
                    <PressableScale onPress={() => onEditarEntrada(item)} style={styles.iconBtn}>
                      <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                    </PressableScale>
                    <PressableScale onPress={() => onExcluirEntrada(item.id, item.nome)} style={styles.iconBtn}>
                      <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                    </PressableScale>
                  </View>
                </View>
              </View>
            ))
          )
        ) : saidasOrdenadas.length === 0 ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma saída nesta categoria.</Text>
          </View>
        ) : (
          saidasOrdenadas.map((item) => (
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
                  <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                    {item.categoria} · {formatarDiaMes(item.dia, chaveAtual)}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <Text style={[styles.rowItemValue, { color: theme.red }]}>{formatarValorVisivel(item.valor)}</Text>
                  <PressableScale onPress={() => onEditarSaida(item)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                  </PressableScale>
                  <PressableScale onPress={() => onExcluirSaida(item.id, item.nome)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  )
}

export default memo(VariavelTab)
