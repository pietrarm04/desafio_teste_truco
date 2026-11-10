const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const T = require('./truco');

const c = (valor, naipe = 'ouros') => ({ valor, naipe });

// coloca as mãos dos jogadores 0, 1, 2, 3 e a vira no começo do baralho
function baralhoCom(maos, vira) {
    const inicio = [...maos.flat(), vira];

    const resto = T.baralho().filter(x =>
        !inicio.some(y => y.valor === x.valor && y.naipe === x.naipe)
    );

    return [...inicio, ...resto];
}

// joga uma carta por jogador, começando por quem tem a vez
function jogarRodada(p, cartas) {
    for (const carta of cartas) {
        T.jogar(p, p.vez, carta);
    }
}

// vira 4 -> manilha 5. A dupla 0 tem as cartas mais fortes
const VIRA = c('4');

const MAOS_DUPLA0_FORTE = [
    [c('3'), c('2'), c('A')],
    [c('4', 'espadas'), c('4', 'copas'), c('4', 'paus')],
    [c('6'), c('6', 'espadas'), c('6', 'copas')],
    [c('7'), c('7', 'espadas'), c('7', 'copas')]
];

function dupla0GanhaAMao(p) {
    jogarRodada(p, [c('3'), c('4', 'espadas'), c('6'), c('7')]);
    jogarRodada(p, [c('2'), c('4', 'copas'), c('6', 'espadas'), c('7', 'espadas')]);
}

describe('Preparação da partida', () => {

    test('CT01: quatro jogadores em duas duplas alternadas', () => {
        const p = T.criarPartida();

        assert.equal(p.jogadores.length, 4);
        assert.deepEqual(p.jogadores.map(j => j.dupla), [0, 1, 0, 1]);
    });

    test('CT02: baralho tem 40 cartas sem repetição', () => {
        const b = T.baralho();

        assert.equal(b.length, 40);
        assert.equal(new Set(b.map(x => x.valor + x.naipe)).size, 40);
    });

    test('CT03: embaralhar mantém as mesmas 40 cartas', () => {
        const chaves = b => b.map(x => x.valor + '-' + x.naipe).sort();
        const original = T.baralho();

        assert.deepEqual(chaves(T.embaralhar(original)), chaves(original));
    });

    test('CT04: cada jogador recebe 3 cartas e uma vira é definida', () => {
        const p = T.distribuir(T.criarPartida());

        p.jogadores.forEach(j => assert.equal(j.cartas.length, 3));
        assert.ok(p.vira);
    });

    test('CT05: baralho com carta repetida é rejeitado', () => {
        const b = T.baralho();
        b[1] = b[0];

        assert.throws(() => T.distribuir(T.criarPartida(), b), /Baralho inválido/);
    });

});

describe('Força das cartas', () => {

    test('CT06: manilha é a carta seguinte à vira (3 volta para 4)', () => {
        assert.equal(T.proxima('5'), '6');
        assert.equal(T.proxima('7'), 'Q');
        assert.equal(T.proxima('3'), '4');
    });

    test('CT07: carta mais forte vence e manilha vence o 3', () => {
        const vira = c('5');

        assert.equal(T.comparar(c('3'), c('2'), vira), 1);
        assert.equal(T.comparar(c('6'), c('3'), vira), 1);
    });

    test('CT08: ordem das manilhas: paus > copas > espadas > ouros', () => {
        const vira = c('5');

        assert.equal(T.comparar(c('6', 'paus'), c('6', 'copas'), vira), 1);
        assert.equal(T.comparar(c('6', 'copas'), c('6', 'espadas'), vira), 1);
        assert.equal(T.comparar(c('6', 'espadas'), c('6', 'ouros'), vira), 1);
    });

});

describe('Jogadas', () => {

    test('CT09: não permite jogar fora da vez', () => {
        const p = T.distribuir(T.criarPartida(), baralhoCom(MAOS_DUPLA0_FORTE, VIRA));

        assert.throws(() => T.jogar(p, 1, c('4', 'espadas')), /Fora da vez/);
    });

    test('CT10: não permite jogar carta que não está na mão', () => {
        const p = T.distribuir(T.criarPartida(), baralhoCom(MAOS_DUPLA0_FORTE, VIRA));

        assert.throws(() => T.jogar(p, 0, c('3', 'paus')), /não está na mão/);
    });

    test('CT11: não permite jogar com truco pendente', () => {
        const p = T.distribuir(T.criarPartida(), baralhoCom(MAOS_DUPLA0_FORTE, VIRA));
        T.pedirTruco(p, 0);

        assert.throws(() => T.jogar(p, 0, c('3')), /Truco pendente/);
    });

    test('CT12: quem ganha a rodada começa a próxima', () => {
        const maos = [
            [c('4', 'espadas'), c('4', 'copas'), c('4', 'paus')],
            [c('6'), c('6', 'espadas'), c('6', 'copas')],
            [c('7'), c('7', 'espadas'), c('7', 'copas')],
            [c('3'), c('2'), c('A')]
        ];
        const p = T.distribuir(T.criarPartida(), baralhoCom(maos, VIRA));

        jogarRodada(p, [c('4', 'espadas'), c('6'), c('7'), c('3')]);

        assert.deepEqual(p.rodadas, [1]);
        assert.equal(p.vez, 3);
    });

    test('CT13: parceiros empatando com a maior carta ganham a rodada', () => {
        const maos = [
            [c('K'), c('Q'), c('J')],
            [c('4', 'espadas'), c('4', 'copas'), c('4', 'paus')],
            [c('K', 'espadas'), c('Q', 'espadas'), c('J', 'espadas')],
            [c('6'), c('6', 'espadas'), c('6', 'copas')]
        ];
        const p = T.distribuir(T.criarPartida(), baralhoCom(maos, VIRA));

        jogarRodada(p, [c('K'), c('4', 'espadas'), c('K', 'espadas'), c('6')]);

        assert.deepEqual(p.rodadas, [0]);
    });

    test('CT14: adversários empatando com a maior carta empatam a rodada', () => {
        const maos = [
            [c('K'), c('Q'), c('J')],
            [c('K', 'espadas'), c('Q', 'espadas'), c('J', 'espadas')],
            [c('6'), c('6', 'espadas'), c('6', 'copas')],
            [c('7'), c('7', 'espadas'), c('7', 'copas')]
        ];
        const p = T.distribuir(T.criarPartida(), baralhoCom(maos, VIRA));

        jogarRodada(p, [c('K'), c('K', 'espadas'), c('6'), c('7')]);

        assert.deepEqual(p.rodadas, [null]);
    });

});

describe('Resultado da mão', () => {

    test('CT15: vencer duas rodadas ganha a mão e soma 1 ponto', () => {
        const p = T.distribuir(T.criarPartida(), baralhoCom(MAOS_DUPLA0_FORTE, VIRA));

        dupla0GanhaAMao(p);

        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.maoEmAndamento, false);
        assert.throws(() => T.jogar(p, p.vez, c('A')), /Nenhuma mão/);
    });

    test('CT16: mão continua enquanto ninguém decidiu', () => {
        assert.equal(T.resultadoMao([0]), undefined);
        assert.equal(T.resultadoMao([0, 1]), undefined);
    });

    test('CT17: empate na primeira rodada: quem ganhar a segunda leva', () => {
        assert.equal(T.resultadoMao([null, 1]), 1);
        assert.equal(T.resultadoMao([null, 0]), 0);
    });

    test('CT18: ganhou a primeira e empatou a segunda: leva a mão', () => {
        assert.equal(T.resultadoMao([0, null]), 0);
    });

    test('CT19: empate na terceira: leva quem ganhou a primeira', () => {
        assert.equal(T.resultadoMao([0, 1, null]), 0);
        assert.equal(T.resultadoMao([1, 0, null]), 1);
    });

    test('CT20: três empates: ninguém pontua', () => {
        assert.equal(T.resultadoMao([null, null, null]), null);
    });

});

describe('Truco', () => {

    test('CT21: pedir truco não muda o valor antes da resposta', () => {
        const p = T.criarPartida();
        T.pedirTruco(p, 0);

        assert.equal(p.pedido.valor, 3);
        assert.equal(p.valorMao, 1);
    });

    test('CT22: truco aceito faz a mão valer 3', () => {
        const p = T.criarPartida();
        T.pedirTruco(p, 0);
        T.responderTruco(p, 1, true);

        assert.equal(p.valorMao, 3);
    });

    test('CT23: truco recusado dá 1 ponto a quem pediu e a partida continua', () => {
        const p = T.criarPartida();
        T.pedirTruco(p, 0);
        T.responderTruco(p, 1, false);

        assert.deepEqual(p.pontos, [1, 0]);
        assert.equal(p.encerrada, false);
    });

    test('CT24: escalada 3, 6, 9, 12 e nada acima de 12', () => {
        const p = T.criarPartida();

        for (const [pede, responde, valor] of [[0, 1, 3], [1, 0, 6], [0, 1, 9], [1, 0, 12]]) {
            T.pedirTruco(p, pede);
            T.responderTruco(p, responde, true);
            assert.equal(p.valorMao, valor);
        }

        assert.throws(() => T.pedirTruco(p, 0), /Limite/);
    });

    test('CT25: a mesma dupla não pode aumentar duas vezes seguidas', () => {
        const p = T.criarPartida();
        T.pedirTruco(p, 0);
        T.responderTruco(p, 1, true);

        assert.throws(() => T.pedirTruco(p, 0), /outra dupla/);
    });

    test('CT26: só a dupla adversária pode responder', () => {
        const p = T.criarPartida();
        T.pedirTruco(p, 0);

        assert.throws(() => T.responderTruco(p, 0, true), /Resposta inválida/);
    });

    test('CT27: mão trucada vale 3 pontos para quem ganha', () => {
        const p = T.distribuir(T.criarPartida(), baralhoCom(MAOS_DUPLA0_FORTE, VIRA));
        T.pedirTruco(p, 0);
        T.responderTruco(p, 1, true);

        dupla0GanhaAMao(p);

        assert.deepEqual(p.pontos, [3, 0]);
    });

});

describe('Mão de onze e fim de jogo', () => {

    test('CT28: mão de onze vale 3 e não aceita truco', () => {
        const p = T.criarPartida();
        p.pontos = [11, 7];
        T.distribuir(p, baralhoCom(MAOS_DUPLA0_FORTE, VIRA));

        assert.equal(T.maoDeOnze(p), 0);
        assert.equal(p.valorMao, 3);
        assert.throws(() => T.pedirTruco(p, 1), /mão de onze/);
    });

    test('CT29: correr da mão de onze dá 1 ponto ao adversário', () => {
        const p = T.criarPartida();
        p.pontos = [11, 7];
        T.distribuir(p, baralhoCom(MAOS_DUPLA0_FORTE, VIRA));

        T.correrMaoDeOnze(p);

        assert.deepEqual(p.pontos, [11, 8]);
    });

    test('CT30: com as duas duplas em 11 também não tem truco', () => {
        const p = T.criarPartida();
        p.pontos = [11, 11];

        assert.throws(() => T.pedirTruco(p, 0), /mão de onze/);
    });

    test('CT31: chegar a 12 pontos vence e encerra a partida', () => {
        const p = T.criarPartida();
        p.pontos = [9, 5];
        T.distribuir(p, baralhoCom(MAOS_DUPLA0_FORTE, VIRA));
        T.pedirTruco(p, 0);
        T.responderTruco(p, 1, true);

        dupla0GanhaAMao(p);

        assert.deepEqual(p.pontos, [12, 5]);
        assert.equal(p.encerrada, true);
        assert.equal(T.vencedorPartida(p), 0);
        assert.throws(() => T.jogar(p, p.vez, c('A')), /Partida encerrada/);
    });

});
