import { memo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NoteItem, NoteModalMode, PixItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

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
  /** Abre um link salvo no navegador. */
  onAbrirLink: (link: string) => void
}

/** Iniciais do contato, para o circulo colorido do Pix. */
function iniciaisDe(nome: string) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const CORES_CONTATO = ['#2FA765', '#E0A82E', '#4A90C4', '#8B6FC7', '#E0685F', '#2FA79A']

function corDe(id: string) {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma += id.charCodeAt(i)
  return CORES_CONTATO[soma % CORES_CONTATO.length]
}

/**
 * Chaves Pix e anotacoes.
 *
 * Antes eram duas listas verticais de linhas iguais, com cada item ocupando a
 * largura inteira — muito espaco para conteudo curto, e nada distinguia um
 * contato Pix de uma anotacao. Agora cada tipo usa a forma que lhe cabe:
 * Pix vira uma faixa horizontal de contatos (como uma agenda), com o toque
 * copiando a chave direto; anotacoes viram uma grade de dois blocos, no
 * formato de mural, onde o texto e visivel sem precisar abrir.
 */
function NotasPixCard({
  theme,
  pixOrdenados,
  notasOrdenadas,
  copiedPixId,
  highlightedItemId,
  registrarLayoutItem,
  renderHighlightOverlay,
  onNovaNota,
  onAbrirFiltro,
  onCopiarPix,
  onEditarPix,
  onExcluirPix,
  onEditarNota,
  onExcluirNota,
  onAbrirLink,
}: NotasPixCardProps) {
  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* ---------- Pix ---------- */}
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Chaves Pix</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {pixOrdenados.length === 0 ? 'Nenhuma chave salva' : 'Toque no contato para copiar a chave'}
          </Text>
        </View>
        <PressableScale
          onPress={() => onNovaNota('pix')}
          style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        >
          <Icon name="adicionar" size={18} color={theme.textInverse} />
        </PressableScale>
      </View>

      {pixOrdenados.length === 0 ? (
        <PressableScale
          onPress={() => onNovaNota('pix')}
          style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
        >
          <Icon name="pix" size={22} color={theme.muted} />
          <Text style={[local.vazioTexto, { color: theme.muted }]}>Salve uma chave Pix para copiar rápido</Text>
        </PressableScale>
      ) : (
        <View style={local.gradeContatos}>
          {pixOrdenados.map((item) => {
            const copiado = copiedPixId === item.id
            return (
              <View
                key={item.id}
                onLayout={(e) => registrarLayoutItem(item.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
                style={[
                  local.contato,
                  {
                    backgroundColor: theme.cardSoft,
                    borderColor: highlightedItemId === item.id ? theme.accent : theme.border,
                  },
                ]}
              >
                {renderHighlightOverlay(item.id)}
                <PressableScale onPress={() => onCopiarPix(item.id, item.chave)} style={local.contatoToque}>
                  <View style={[local.circulo, { backgroundColor: copiado ? theme.green : corDe(item.id) }]}>
                    {copiado ? (
                      <Icon name="confirmar" size={17} color="#FFFFFF" />
                    ) : (
                      <Text style={local.circuloTexto}>{iniciaisDe(item.nome)}</Text>
                    )}
                  </View>
                  <Text style={[local.contatoNome, { color: theme.text }]} numberOfLines={2}>
                    {item.nome}
                  </Text>
                  <Text style={[local.contatoChave, { color: copiado ? theme.green : theme.muted }]} numberOfLines={1}>
                    {copiado ? 'Copiado!' : item.chave}
                  </Text>
                </PressableScale>

                <PressableScale
                  onPress={() => onEditarPix(item)}
                  hitSlop={6}
                  style={[local.cantoEsquerdo, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Icon name="editar" size={11} color={theme.faint} />
                </PressableScale>

                <PressableScale
                  onPress={() => onExcluirPix(item.id, item.nome)}
                  hitSlop={6}
                  style={[local.cantoDireito, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Icon name="excluir" size={12} color={theme.red} />
                </PressableScale>

                {item.links && item.links.filter(Boolean).length > 0 ? (
                  <PressableScale
                    onPress={() => onAbrirLink(item.links!.filter(Boolean)[0])}
                    hitSlop={6}
                    style={[local.linkContato, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
                  >
                    <Icon name="abrir_link" size={11} color={theme.accent} />
                  </PressableScale>
                ) : null}
              </View>
            )
          })}
        </View>
      )}

      {/* ---------- Anotacoes ---------- */}
      <View style={[styles.manageHeaderRow, { marginTop: 22 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Anotações</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {notasOrdenadas.length === 0
              ? 'Nenhuma anotação'
              : `${notasOrdenadas.length} ${notasOrdenadas.length === 1 ? 'anotação' : 'anotações'}`}
          </Text>
        </View>
        <View style={styles.categoryToolbar}>
          <PressableScale
            onPress={() => onNovaNota('nota')}
            style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          >
            <Icon name="adicionar" size={18} color={theme.textInverse} />
          </PressableScale>
          <PressableScale
            onPress={onAbrirFiltro}
            style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Icon name="filtrar" size={15} color={theme.text} />
          </PressableScale>
        </View>
      </View>

      {notasOrdenadas.length === 0 ? (
        <PressableScale
          onPress={() => onNovaNota('nota')}
          style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
        >
          <Icon name="nota" size={22} color={theme.muted} />
          <Text style={[local.vazioTexto, { color: theme.muted }]}>Anote um lembrete</Text>
        </PressableScale>
      ) : (
        <View style={local.mural}>
          {notasOrdenadas.map((item) => (
            <View
              key={item.id}
              onLayout={(e) => registrarLayoutItem(item.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
              style={[
                local.nota,
                {
                  backgroundColor: theme.cardSoft,
                  borderColor: highlightedItemId === item.id ? theme.accent : theme.border,
                },
              ]}
            >
              {renderHighlightOverlay(item.id)}
              <PressableScale onPress={() => onEditarNota(item)} scaleTo={0.98} style={local.notaToque}>
                <Text style={[local.notaTitulo, { color: theme.text }]} numberOfLines={2}>
                  {item.titulo}
                </Text>
                {item.conteudo ? (
                  <Text style={[local.notaTexto, { color: theme.muted }]} numberOfLines={5}>
                    {item.conteudo}
                  </Text>
                ) : null}
              </PressableScale>

              {/* Fora do toque de editar: assim tocar o link abre o link, e
                  nao o formulario da anotacao. */}
              {(item.links || []).filter(Boolean).map((link) => (
                <PressableScale
                  key={link}
                  onPress={() => onAbrirLink(link)}
                  style={[local.linkChip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
                >
                  <Icon name="abrir_link" size={11} color={theme.accent} />
                  <Text style={[local.linkTexto, { color: theme.accent }]} numberOfLines={1}>
                    {link.replace(/^https?:\/\//, '')}
                  </Text>
                </PressableScale>
              ))}

              <PressableScale
                onPress={() => onExcluirNota(item.id, item.titulo)}
                hitSlop={6}
                style={[local.notaExcluir, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Icon name="excluir" size={13} color={theme.red} />
              </PressableScale>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const local = StyleSheet.create({
  vazio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 7,
  },
  vazioTexto: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  gradeContatos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contato: {
    position: 'relative',
    overflow: 'hidden',
    width: '31.3%',
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 30,
    paddingBottom: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  contatoToque: { alignItems: 'center', width: '100%' },
  circulo: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  circuloTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  contatoNome: { fontSize: 11, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center', width: '100%', lineHeight: 14 },
  contatoChave: { fontSize: 9, fontWeight: '600', marginTop: 1, textAlign: 'center', width: '100%' },
  cantoEsquerdo: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantoDireito: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mural: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nota: {
    position: 'relative',
    overflow: 'hidden',
    width: '47.6%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    minHeight: 96,
  },
  notaToque: { width: '100%' },
  notaTitulo: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2, paddingRight: 22 },
  notaTexto: { fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 6 },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 7,
  },
  linkTexto: { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  linkContato: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notaExcluir: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default memo(NotasPixCard)
