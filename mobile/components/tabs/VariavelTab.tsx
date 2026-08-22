import { memo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { EntradaItem, SaidaItem, Tema, TipoVariavelTab } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'
import ListRow from '../common/ListRow'
import Segmentado from '../common/Segmentado'
import Icon from '../common/Icon'

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
            <Text style={[styles.manageTitle, { color: theme.text }]}>Entradas e saídas</Text>
            <Text style={[styles.manageSub, { color: theme.muted }]}>
              {tipoVariavelTab === 'entrada'
                ? `Total de entradas: ${formatarValorVisivel(totalEntradas)}`
                : `Total da categoria marcada: ${formatarMoeda(totalCategoriaSelecionada)}`}
            </Text>
          </View>
          <View style={styles.categoryToolbar}>
            <PressableScale
              onPress={() => onAbrirFiltro(tipoVariavelTab === 'entrada' ? 'entradas' : 'saidas')}
              style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Icon name="filtrar" size={15} color={theme.text} />
            </PressableScale>
          </View>
        </View>

        <Segmentado
          theme={theme}
          selecionado={tipoVariavelTab}
          onSelecionar={onTipoChange}
          opcoes={[
            { valor: 'entrada', label: 'Entradas', icone: 'seta_cima', cor: theme.green },
            { valor: 'saida', label: 'Saídas', icone: 'seta_baixo', cor: theme.red },
          ]}
        />

        {tipoVariavelTab === 'saida' && (
          <View style={local.categorias}>
            {/* Grade em vez de faixa horizontal: numa faixa as ultimas
                categorias ficam escondidas fora da tela e nada indica que ha
                mais. Aqui todas aparecem de uma vez. */}
            <View style={local.grade}>
              {['Todas', ...categoriasSaidas].map((categoria) => {
                const ativo = filtroCategoria === categoria
                return (
                  <PressableScale
                    key={categoria}
                    onPress={() => onFiltroCategoriaChange(categoria)}
                    scaleTo={0.95}
                    style={[
                      local.chip,
                      {
                        backgroundColor: ativo ? theme.primary : theme.cardSoft,
                        borderColor: ativo ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[local.chipTexto, { color: ativo ? theme.textInverse : theme.muted }]}
                      numberOfLines={1}
                    >
                      {categoria}
                    </Text>
                  </PressableScale>
                )
              })}
            </View>
          </View>
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
              <ListRow
                key={item.id}
                theme={theme}
                titulo={item.nome}
                meta={formatarDiaMes(item.dia, chaveAtual)}
                valor={formatarValorVisivel(item.valor)}
                valorCor={theme.green}
                onEditar={() => onEditarEntrada(item)}
                onExcluir={() => onExcluirEntrada(item.id, item.nome)}
                destacado={highlightedItemId === item.id}
                overlay={renderHighlightOverlay(item.id)}
                onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
              />
            ))
          )
        ) : saidasOrdenadas.length === 0 ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma saída nesta categoria.</Text>
          </View>
        ) : (
          saidasOrdenadas.map((item) => (
            <ListRow
              key={item.id}
              theme={theme}
              titulo={item.nome}
              meta={`${item.categoria} · ${formatarDiaMes(item.dia, chaveAtual)}`}
              valor={formatarValorVisivel(item.valor)}
              valorCor={theme.red}
              onEditar={() => onEditarSaida(item)}
              onExcluir={() => onExcluirSaida(item.id, item.nome)}
              destacado={highlightedItemId === item.id}
              overlay={renderHighlightOverlay(item.id)}
              onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
            />
          ))
        )}
      </View>
    </>
  )
}

const local = StyleSheet.create({
  categorias: { marginTop: 12 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexto: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
})

export default memo(VariavelTab)
