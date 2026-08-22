// Ajustes de CSS que so fazem sentido na web.
//
// Ficam aqui, injetados em tempo de execucao, e nao no +html.tsx: o bloco
// <style> daquele arquivo e descartado na geracao do index.html, entao a
// regra nunca chegava ao navegador — foi por isso que o zoom ao focar campo
// continuou acontecendo mesmo depois de "corrigido".

import { Platform } from 'react-native'

const ID = 'brazllet-ajustes-web'

const CSS = `
  /* Navegador movel aproxima a tela ao focar um campo cuja fonte seja menor
     que 16px. O maximum-scale=1 do viewport nao resolve: o Safari o ignora
     desde o iOS 10, por acessibilidade. Garantir 16px no proprio campo e o
     unico jeito confiavel.

     O !important e necessario porque o React Native Web aplica os estilos
     inline, e so uma regra de folha com !important os sobrepoe. */
  input,
  textarea,
  select {
    font-size: 16px !important;
  }

  /* Tira o realce azul de toque do navegador, que aparecia por cima do
     feedback proprio do app. */
  * {
    -webkit-tap-highlight-color: transparent;
  }

  /* O contorno de foco padrao nao combina com o desenho dos campos; o app
     ja marca o campo focado pela cor da borda. */
  input:focus,
  textarea:focus {
    outline: none;
  }
`

/** Injeta os ajustes uma unica vez. Sem efeito fora da web. */
export function aplicarAjustesWeb() {
  if (Platform.OS !== 'web') return
  if (typeof document === 'undefined') return
  if (document.getElementById(ID)) return

  const tag = document.createElement('style')
  tag.id = ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}
