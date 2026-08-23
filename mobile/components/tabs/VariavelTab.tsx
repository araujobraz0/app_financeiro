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
import AnelProgresso from '../common/AnelProgresso'
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
  registrarItem: (id: string) => (node: View | null) => void
  renderHighlightOverlay: (id: string) => ReactNode
  /** Categorias com teto mensal, ja com quanto foi gasto. */
  limitesDoMes: { categoria: string; limite: number; gasto: number; proporcao: number }[]
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
  registrarItem,
  renderHighlightOverlay,
  limitesDoMes,
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
            <View style={local.categoriasTopo}>
              <Text style={[local.categoriasRotulo, { color: theme.muted }]}>Categorias</Text>
              <View style={local.categoriasAcoes}>
                <PressableScale
                  onPress={onNovaCategoria}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Nova categoria"
                  style={[local.botaoCategoria, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  <Icon name="adicionar" size={15} color={theme.text} />
                </PressableScale>
                <PressableScale
                  onPress={onGerenciarCategorias}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Gerenciar categorias"
                  style={[local.botaoCategoria, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  <Icon name="editar" size={14} color={theme.text} />
                </PressableScale>
              </View>
            </View>

            {/* Limites como aneis: a fracao aparece na volta do circulo e o
                numero fica no meio, sem os dois disputarem a mesma linha. Duas
                colunas cabem na largura e sobra espaco para os valores em
                reais embaixo — que e o que a barra sozinha nao dizia. */}
            {limitesDoMes.length > 0 ? (
              <View style={local.limites}>
                {limitesDoMes.map(({ categoria, limite, gasto, proporcao }) => {
                  const estourou = gasto > limite
                  const cor = estourou ? theme.red : proporcao >= 0.8 ? theme.accent : theme.green

                  return (
                    <PressableScale
                      key={categoria}
                      onPress={() => onFiltroCategoriaChange(categoria)}
                      scaleTo={0.97}
                      accessibilityRole="button"
                      accessibilityLabel={`${categoria}: ${formatarMoeda(gasto)} de ${formatarMoeda(limite)}`}
                      style={[local.limite, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                    >
                      <AnelProgresso
                        progresso={proporcao}
                        tamanho={76}
                        espessura={8}
                        cor={cor}
                        corFundo={theme.background}
                        valor={`${Math.round(proporcao * 100)}%`}
                        rotulo=""
                        corValor={cor}
                        corRotulo={theme.muted}
                        tamanhoValor={16}
                      />

                      <Text style={[local.limiteNome, { color: theme.text }]} numberOfLines={1}>
                        {categoria}
                      </Text>
                      <Text style={[local.limiteValor, { color: theme.muted }]} numberOfLines={1}>
                        {formatarValorVisivel(gasto)} de {formatarValorVisivel(limite)}
                      </Text>
                      <Text
                        style={[local.limiteSaldo, { color: estourou ? theme.red : theme.green }]}
                        numberOfLines={1}
                      >
                        {estourou
                          ? `${formatarValorVisivel(gasto - limite)} acima`
                          : `${formatarValorVisivel(limite - gasto)} livres`}
                      </Text>
                    </PressableScale>
                  )
                })}
              </View>
            ) : null}

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
                compacto
                onEditar={() => onEditarEntrada(item)}
                onExcluir={() => onExcluirEntrada(item.id, item.nome)}
                destacado={highlightedItemId === item.id}
                overlay={renderHighlightOverlay(item.id)}
                refItem={registrarItem(item.id)}
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
              compacto
              onEditar={() => onEditarSaida(item)}
              onExcluir={() => onExcluirSaida(item.id, item.nome)}
              destacado={highlightedItemId === item.id}
              overlay={renderHighlightOverlay(item.id)}
              refItem={registrarItem(item.id)}
            />
          ))
        )}
      </View>
    </>
  )
}

const local = StyleSheet.create({
  categorias: { marginTop: 12 },
  categoriasTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
  },
  categoriasRotulo: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    minWidth: 0,
  },
  categoriasAcoes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  limites: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  limite: {
    // Largura fixa em vez de flexGrow: com um limite so, o cartao esticava a
    // linha inteira e o anel de 76px boiava no meio de um retangulo largo.
    width: '48%',
    minWidth: 0,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 11,
    paddingHorizontal: 10,
  },
  limiteNome: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2, marginTop: 9 },
  limiteValor: { fontSize: 10.5, fontWeight: '600', marginTop: 3 },
  limiteSaldo: { fontSize: 10.5, fontWeight: '800', marginTop: 2 },
  botaoCategoria: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
