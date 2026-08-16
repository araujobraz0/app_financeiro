// Roda o TypeScript e esconde os erros que vêm de dentro do node_modules.
//
// Motivo: o Expo SDK 54 tem um bug conhecido em que o caminho
// "expo-file-system/legacy" resolve para o código-fonte .ts da biblioteca
// em vez do .d.ts compilado, então o tsc tenta checar o código interno dela
// e reporta ~48 erros que não são nossos e não afetam o build.
//
// Uso: npm run typecheck
// Funciona igual no Windows, Mac e Linux.

const { spawnSync } = require('child_process')

const resultado = spawnSync(
  'npx',
  ['tsc', '--noEmit', '--pretty', 'false'],
  { encoding: 'utf8', shell: true }
)

const saida = `${resultado.stdout || ''}${resultado.stderr || ''}`

const linhas = saida
  .split(/\r?\n/)
  .filter((linha) => linha.trim().length > 0)
  // Descarta qualquer linha de erro originada no node_modules
  .filter((linha) => !linha.replace(/\\/g, '/').includes('node_modules/'))
  // Descarta o resumo do tsc, que conta também os erros filtrados
  .filter((linha) => !/^Found \d+ error/.test(linha))

if (linhas.length === 0) {
  console.log('✔ Nenhum erro de tipo no código do projeto.')
  process.exit(0)
}

console.log(linhas.join('\n'))
console.log(`\n✖ ${linhas.length} problema(s) encontrado(s) no código do projeto.`)
process.exit(1)
