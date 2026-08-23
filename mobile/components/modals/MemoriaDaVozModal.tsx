// O que a voz aprendeu.
//
// Quando o app pergunta "em que categoria entra o que vem da padaria?", a
// resposta fica guardada para sempre — e ate agora nao havia como ver nem
// desfazer isso. Aqui esta a lista inteira: trocar a categoria de um lugar ou
// apagar o que foi ensinado errado.

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  /** Nome ensinado -> categoria. */
  aprendidas: Record<string, string>
  categorias: string[]
  onTrocar: (nome: string, categoria: string) => void
  onApagar: (nome: string) => void
}

export default function MemoriaDaVozModal({
  visible,
  onClose,
  theme,
  aprendidas,
  categorias,
  onTrocar,
  onApagar,
}: Props) {
  const [abrindo, setAbrindo] = useState<string | null>(null)

  const lista = Object.entries(aprendidas).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      level={60}
      titulo="O que a voz aprendeu"
      subtitulo="Cada lugar que você ensinou uma vez entra sozinho na categoria daqui em diante."
      acoes={[{ label: 'Fechar', onPress: onClose, primaria: true }]}
    >
      {lista.length ? (
        lista.map(([nome, categoria]) => {
          const aberto = abrindo === nome

          return (
            <View
              key={nome}
              style={[styles.item, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <View style={styles.linha}>
                <View style={styles.textos}>
                  <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
                    {nome}
                  </Text>
                  <PressableScale
                    onPress={() => setAbrindo(aberto ? null : nome)}
                    scaleTo={0.96}
                    accessibilityRole="button"
                    accessibilityLabel={`Trocar a categoria de ${nome}`}
                    style={styles.categoriaToque}
                  >
                    <Text style={[styles.categoria, { color: theme.muted }]} numberOfLines={1}>
                      {categoria}
                    </Text>
                    <Icon name={aberto ? 'seta_cima' : 'seta_baixo'} size={11} color={theme.faint} />
                  </PressableScale>
                </View>

                <PressableScale
                  onPress={() => {
                    setAbrindo((atual) => (atual === nome ? null : atual))
                    onApagar(nome)
                  }}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`Esquecer ${nome}`}
                  style={[styles.apagar, { borderColor: theme.border }]}
                >
                  <Icon name="excluir" size={14} color={theme.muted} />
                </PressableScale>
              </View>

              {aberto ? (
                <View style={[styles.escolha, { borderTopColor: theme.border }]}>
                  <View style={styles.chips}>
                    {categorias.map((opcao) => {
                      const ativa = opcao === categoria
                      return (
                        <PressableScale
                          key={opcao}
                          onPress={() => {
                            onTrocar(nome, opcao)
                            setAbrindo(null)
                          }}
                          scaleTo={0.95}
                          accessibilityRole="button"
                          style={[
                            styles.chip,
                            {
                              backgroundColor: ativa ? theme.primary : theme.card,
                              borderColor: ativa ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipTexto,
                              { color: ativa ? theme.textInverse : theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {opcao}
                          </Text>
                        </PressableScale>
                      )
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          )
        })
      ) : (
        <Text style={[styles.vazio, { color: theme.faint }]}>
          Nada ainda. Quando você lançar falando algo que o app não conhece — &quot;comprei um bolo
          na padaria&quot; —, ele pergunta a categoria uma vez e guarda a resposta aqui.
        </Text>
      )}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  item: { borderWidth: 1, borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textos: { flex: 1, minWidth: 0 },
  nome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, textTransform: 'capitalize' },
  categoriaToque: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  categoria: { fontSize: 11.5, fontWeight: '600' },
  apagar: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escolha: { borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTexto: { fontSize: 12, fontWeight: '700' },
  vazio: { fontSize: 12.5, fontWeight: '600', lineHeight: 19 },
})
