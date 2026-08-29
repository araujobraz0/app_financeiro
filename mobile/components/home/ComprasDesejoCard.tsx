// Coisas para comprar.
//
// A versao anterior era uma grade de dois cartoes por linha, e cada item
// media o preco contra o saldo inteiro, um de cada vez. Com R$ 700 no bolso e
// dois itens de R$ 600, o cabecalho anunciava "2 cabem no saldo": os dois
// cabem sozinhos, mas comprar um deixa o outro fora. A conta agora e
// cumulativa, do mais barato ao mais caro, ate o dinheiro acabar.
//
// A leitura tambem mudou. Em cima, o proximo item — o mais perto de dar — num
// cartao grande com o quanto falta e em quantos meses da, prazo que o app tem
// como calcular pela sobra dos meses passados e nunca calculava. Abaixo, a
// lista em largura inteira, que cabia mal em duas colunas apertadas. E os
// comprados descem para uma secao propria, em vez de ficarem esmaecidos no
// meio dos que ainda faltam.

import { memo, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { ShoppingWishItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import { avaliarDesejos, prazoEmTexto, resumirDesejos } from '../../src/utils/desejos'
import Icon from '../common/Icon'
import CaixaDestacavel from '../common/motion/CaixaDestacavel'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  itens: ShoppingWishItem[]
  /** Quanto existe de verdade hoje, somando todos os meses. */
  saldoAcumulado: number
  /** A sobra media dos meses com movimento, para estimar o prazo. */
  sobraMensal: number
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarItem: (id: string) => (node: View | null) => void
  onNovo: () => void
  onEditar: (item: ShoppingWishItem) => void
  onAlternarComprado: (id: string, comprado: boolean) => void
  onExcluir: (id: string, nome: string) => void
}

function ComprasDesejoCard({
  theme,
  itens,
  saldoAcumulado,
  sobraMensal,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
  onNovo,
  onEditar,
  onAlternarComprado,
  onExcluir,
}: Props) {
  const [mostrarComprados, setMostrarComprados] = useState(false)

  const comprados = useMemo(() => itens.filter((item) => item.comprado), [itens])
  const avaliados = useMemo(
    () => avaliarDesejos(itens, saldoAcumulado, sobraMensal),
    [itens, saldoAcumulado, sobraMensal]
  )
  const resumo = useMemo(
    () => resumirDesejos(avaliados, comprados.length),
    [avaliados, comprados.length]
  )

  const proximo = resumo.proximo
  const restantes = avaliados.slice(1)

  const acoes = (item: ShoppingWishItem, comprado: boolean) => (
    <View style={local.acoes}>
      <PressableScale
        onPress={() => onAlternarComprado(item.id, !comprado)}
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={comprado ? `Reabrir ${item.nome}` : `Marcar ${item.nome} como comprado`}
        style={[
          local.marcar,
          {
            backgroundColor: comprado ? theme.cardSoft : theme.primary,
            borderColor: comprado ? theme.border : theme.primary,
          },
        ]}
      >
        <Icon
          name={comprado ? 'desfazer' : 'carrinho'}
          size={13}
          color={comprado ? theme.muted : theme.textInverse}
        />
        <Text
          style={[local.marcarTexto, { color: comprado ? theme.muted : theme.textInverse }]}
          numberOfLines={1}
        >
          {comprado ? 'Reabrir' : 'Comprei'}
        </Text>
      </PressableScale>

      <PressableScale
        onPress={() => onExcluir(item.id, item.nome)}
        scaleTo={0.9}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Excluir ${item.nome}`}
        style={[local.icone, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Icon name="excluir" size={14} color={theme.red} />
      </PressableScale>
    </View>
  )

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={local.tituloWrap}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Coisas para comprar</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {resumo.quantosPendentes === 0
              ? comprados.length > 0
                ? `Nada na fila · ${comprados.length} já ${comprados.length === 1 ? 'comprado' : 'comprados'}`
                : 'Nada na lista'
              : resumo.quantosCabemJuntos > 0
                ? `${resumo.quantosCabemJuntos} ${resumo.quantosCabemJuntos === 1 ? 'cabe' : 'cabem'} de uma vez · ${formatarValorVisivel(resumo.custoDaCesta)}`
                : `${resumo.quantosPendentes} na fila · ${formatarValorVisivel(resumo.totalPendente)}`}
          </Text>
        </View>
        <PressableScale
          onPress={onNovo}
          accessibilityRole="button"
          accessibilityLabel="Novo desejo"
          style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        >
          <Icon name="adicionar" size={18} color={theme.textInverse} />
        </PressableScale>
      </View>

      {itens.length === 0 ? (
        <PressableScale
          onPress={onNovo}
          accessibilityRole="button"
          style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
        >
          <Icon name="carrinho" size={22} color={theme.muted} />
          <Text style={[local.vazioTexto, { color: theme.muted }]}>
            Anote o que você quer. O app diz quanto falta e em quantos meses dá.
          </Text>
        </PressableScale>
      ) : null}

      {/* O proximo da fila em destaque: e nele que a decisao acontece. */}
      {proximo ? (
        <CaixaDestacavel
          ref={registrarItem(proximo.item.id)}
          theme={theme}
          destacado={highlightedItemId === proximo.item.id}
          corBorda={proximo.cabeJunto ? theme.green : theme.accent}
          collapsable={false}
          style={[
            local.destaque,
            {
              backgroundColor: proximo.cabeJunto ? theme.greenSoft : theme.cardSoft,
              borderColor: proximo.cabeJunto ? theme.green : theme.border,
            },
          ]}
        >
          <PressableScale
            onPress={() => onEditar(proximo.item)}
            scaleTo={0.99}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${proximo.item.nome}`}
          >
            <View style={local.destaqueTopo}>
              <Text
                style={[
                  local.etiqueta,
                  { color: proximo.cabeJunto ? theme.green : theme.accent },
                ]}
              >
                {proximo.cabeJunto ? 'Dá para comprar' : 'O mais perto de dar'}
              </Text>
              {proximo.falta > 0 && proximo.mesesParaDar !== null ? (
                <View style={[local.prazo, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Icon name="calendario" size={10} color={theme.muted} />
                  <Text style={[local.prazoTexto, { color: theme.muted }]}>
                    {prazoEmTexto(proximo.mesesParaDar)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[local.destaqueNome, { color: theme.text }]} numberOfLines={2}>
              {proximo.item.nome}
            </Text>

            <View style={local.destaqueLinha}>
              <Text style={[local.destaquePreco, { color: theme.text }]} numberOfLines={1}>
                {formatarValorVisivel(proximo.preco)}
              </Text>
              {proximo.item.loja ? (
                <Text style={[local.loja, { color: theme.muted }]} numberOfLines={1}>
                  {proximo.item.loja}
                </Text>
              ) : null}
            </View>

            <View style={[local.trilha, { backgroundColor: theme.background }]}>
              <View
                style={[
                  local.preenchimento,
                  {
                    width: `${Math.max(proximo.proporcao * 100, 3)}%`,
                    backgroundColor: proximo.cabeJunto ? theme.green : theme.accent,
                  },
                ]}
              />
            </View>

            <Text style={[local.destaqueNota, { color: theme.muted }]}>
              {proximo.falta === 0
                ? 'O saldo cobre este item inteiro.'
                : `Faltam ${formatarValorVisivel(proximo.falta)} — você tem ${formatarValorVisivel(Math.max(0, saldoAcumulado))}.`}
            </Text>
          </PressableScale>

          {acoes(proximo.item, false)}
        </CaixaDestacavel>
      ) : null}

      {/* O resto da fila, em largura inteira: em duas colunas os nomes
          quebravam em tres linhas e a barra ficava do tamanho de um dedo. */}
      {restantes.length > 0 ? (
        <View style={local.lista}>
          {restantes.map((desejo) => (
            <CaixaDestacavel
              key={desejo.item.id}
              ref={registrarItem(desejo.item.id)}
              theme={theme}
              destacado={highlightedItemId === desejo.item.id}
              corBorda={theme.border}
              collapsable={false}
              style={[local.linha, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <PressableScale
                onPress={() => onEditar(desejo.item)}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${desejo.item.nome}`}
              >
                <View style={local.linhaTopo}>
                  <View style={local.linhaTextos}>
                    <Text style={[local.linhaNome, { color: theme.text }]} numberOfLines={1}>
                      {desejo.item.nome}
                    </Text>
                    <Text style={[local.linhaMeta, { color: theme.muted }]} numberOfLines={1}>
                      {desejo.item.loja ? `${desejo.item.loja} · ` : ''}
                      {desejo.falta === 0
                        ? 'já dá'
                        : `faltam ${formatarValorVisivel(desejo.falta)}${
                            desejo.mesesParaDar === null ? '' : ` · ${prazoEmTexto(desejo.mesesParaDar)}`
                          }`}
                    </Text>
                  </View>
                  <Text style={[local.linhaPreco, { color: theme.text }]} numberOfLines={1}>
                    {formatarValorVisivel(desejo.preco)}
                  </Text>
                </View>

                <View style={[local.trilhaFina, { backgroundColor: theme.background }]}>
                  <View
                    style={[
                      local.preenchimento,
                      {
                        width: `${Math.max(desejo.proporcao * 100, 3)}%`,
                        backgroundColor: desejo.falta === 0 ? theme.green : theme.accent,
                      },
                    ]}
                  />
                </View>
              </PressableScale>

              {acoes(desejo.item, false)}
            </CaixaDestacavel>
          ))}
        </View>
      ) : null}

      {/* Comprados no fim, recolhidos: eles ja sairam da decisao, mas apagar
          seria perder o registro do que a lista rendeu. */}
      {comprados.length > 0 ? (
        <View style={local.compradosWrap}>
          <PressableScale
            onPress={() => setMostrarComprados((antes) => !antes)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityState={{ expanded: mostrarComprados }}
            style={[local.compradosTopo, { borderTopColor: theme.border }]}
          >
            <Icon name="confirmar" size={13} color={theme.green} />
            <Text style={[local.compradosTexto, { color: theme.muted }]}>
              Já comprei ({comprados.length})
            </Text>
            <Icon name={mostrarComprados ? 'seta_cima' : 'seta_baixo'} size={14} color={theme.faint} />
          </PressableScale>

          {mostrarComprados
            ? comprados.map((item) => (
                <View
                  key={item.id}
                  style={[local.compradoLinha, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  <View style={local.linhaTextos}>
                    <Text style={[local.compradoNome, { color: theme.muted }]} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    {item.compradoEmCompetencia ? (
                      <Text style={[local.linhaMeta, { color: theme.faint }]} numberOfLines={1}>
                        {item.compradoEmCompetencia.replace('-', ' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[local.compradoPreco, { color: theme.faint }]} numberOfLines={1}>
                    {formatarValorVisivel(Number(item.precoAtual || 0))}
                  </Text>
                  {acoes(item, true)}
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}

const local = StyleSheet.create({
  tituloWrap: { flex: 1, minWidth: 0 },

  vazio: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  vazioTexto: { fontSize: 12.5, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  destaque: { borderRadius: 20, borderWidth: 1, padding: 14 },
  destaqueTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  etiqueta: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  prazo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  prazoTexto: { fontSize: 10, fontWeight: '800' },
  destaqueNome: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4, lineHeight: 21 },
  destaqueLinha: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  destaquePreco: { fontSize: 22, fontWeight: '900', letterSpacing: -0.7 },
  loja: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '600' },
  destaqueNota: { fontSize: 11, fontWeight: '600', marginTop: 7 },

  trilha: { height: 7, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  trilhaFina: { height: 4, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  preenchimento: { height: '100%', borderRadius: 999 },

  lista: { gap: 8, marginTop: 10 },
  linha: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  linhaTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // Sem o `overflow`, o nome longo estica a caixa por dentro mesmo com o
  // corte de uma linha, e a linha passa da borda do cartao.
  linhaTextos: { flex: 1, minWidth: 0, overflow: 'hidden' },
  linhaNome: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  linhaMeta: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
  linhaPreco: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3, flexShrink: 0 },

  acoes: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  marcar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  marcarTexto: { fontSize: 12, fontWeight: '800' },
  icone: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  compradosWrap: { marginTop: 14 },
  compradosTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  compradosTexto: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '800' },
  compradoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  compradoNome: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  compradoPreco: { fontSize: 12.5, fontWeight: '800', flexShrink: 0 },
})

export default memo(ComprasDesejoCard)
