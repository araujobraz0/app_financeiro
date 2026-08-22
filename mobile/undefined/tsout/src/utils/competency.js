import { meses } from './dates';
export function listaAnosAtual() {
    const anoAtual = new Date().getFullYear();
    return [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];
}
export function addMonthsToCompetencia(chaveBase, offset) {
    const [anoTexto, mesNome] = chaveBase.split('-');
    const ano = Number(anoTexto);
    const mesIndex = meses.indexOf(mesNome);
    const data = new Date(ano, mesIndex >= 0 ? mesIndex : 0, 1);
    data.setMonth(data.getMonth() + offset);
    return `${data.getFullYear()}-${meses[data.getMonth()]}`;
}
export function competenciaToNumber(chave) {
    const [anoTexto, mesNome] = String(chave || '').split('-');
    const ano = Number(anoTexto);
    const mesIndex = meses.indexOf(mesNome);
    if (!Number.isFinite(ano) || mesIndex < 0)
        return 0;
    return ano * 12 + mesIndex;
}
export function competenciaMaiorOuIgual(chave, referencia) {
    return competenciaToNumber(chave) >= competenciaToNumber(referencia);
}
/**
 * Dados de um mes, herdando os gastos fixos recorrentes quando o mes ainda
 * nao existe no banco.
 *
 * Sem isso, um fixo cadastrado em agosto so aparecia nos meses ja gravados:
 * ao avancar para um mes nunca aberto, o app caia num mes vazio e o gasto
 * "sumia". Aqui o mes novo nasce com os recorrentes do mes anterior mais
 * proximo — sempre o mais proximo, para que uma exclusao feita no meio do
 * caminho continue valendo dali para a frente.
 *
 * O `pago` volta para false: cada mes tem a sua propria conta a pagar.
 */
export function resolverMesComRecorrentes(banco, chave, mesVazio) {
    const existente = banco[chave];
    if (existente)
        return existente;
    const alvo = competenciaToNumber(chave);
    const anterior = Object.keys(banco)
        .filter((outra) => competenciaToNumber(outra) < alvo)
        .sort((a, b) => competenciaToNumber(b) - competenciaToNumber(a))[0];
    if (!anterior)
        return mesVazio;
    const recorrentes = (banco[anterior].fixo || []).filter((item) => item.recorrenteId);
    if (recorrentes.length === 0)
        return mesVazio;
    return {
        ...mesVazio,
        salario: banco[anterior].salario,
        categoriasSaidas: banco[anterior].categoriasSaidas,
        fixo: recorrentes.map((item) => ({
            ...item,
            id: `${item.recorrenteId}-${chave}`,
            pago: false,
        })),
    };
}
/**
 * Garante que a competencia exista no banco antes de altera-la.
 *
 * Um mes nunca aberto nao esta gravado: ele so e montado na leitura, herdando
 * os fixos recorrentes. Isso basta para exibir, mas nao para editar — sem o
 * mes no banco, `banco[chave]` e undefined e qualquer alteracao se perde no
 * vazio (era por isso que mudar o valor de um fixo num mes recem-aberto nao
 * surtia efeito nenhum).
 *
 * Devolve sempre um banco novo, para nao mutar o estado anterior.
 */
export function garantirCompetencia(banco, chave, mesVazio) {
    if (banco[chave])
        return { ...banco };
    return {
        ...banco,
        [chave]: resolverMesComRecorrentes(banco, chave, mesVazio),
    };
}
