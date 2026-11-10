const ORDEM = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NAIPES = ['ouros', 'espadas', 'copas', 'paus'];
const AUMENTOS = { 1: 3, 3: 6, 6: 9, 9: 12 };

function baralho() {
    return ORDEM.flatMap(valor => NAIPES.map(naipe => ({ valor, naipe })));
}

function embaralhar(cartas) {
    const deck = [...cartas];

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function indice(valor) {
    const i = ORDEM.indexOf(valor);

    if (i < 0) {
        throw Error('Carta inválida');
    }

    return i;
}

function proxima(valor) {
    return ORDEM[(indice(valor) + 1) % ORDEM.length];
}

// manilha soma 100 para ficar acima de qualquer carta comum
function forca(carta, vira) {
    if (carta.valor === proxima(vira.valor)) {
        return 100 + NAIPES.indexOf(carta.naipe);
    }

    return indice(carta.valor);
}

function comparar(a, b, vira) {
    return Math.sign(forca(a, vira) - forca(b, vira));
}

function criarPartida() {
    return {
        jogadores: [0, 1, 2, 3].map(id => ({ id, dupla: id % 2, cartas: [] })),
        pontos: [0, 0],
        quemComeca: 0,
        vez: 0,
        valorMao: 1,
        pedido: null,
        ultimoAumento: null,
        rodadas: [],
        jogadas: [],
        vira: null,
        maoEmAndamento: false,
        encerrada: false
    };
}

// retorna a dupla que está com 11 pontos (só uma), ou null
function maoDeOnze(p) {
    if (p.pontos[0] === 11 && p.pontos[1] !== 11) return 0;
    if (p.pontos[1] === 11 && p.pontos[0] !== 11) return 1;
    return null;
}

function distribuir(p, cartas = embaralhar(baralho())) {
    if (p.encerrada) {
        throw Error('Partida encerrada');
    }

    const chaves = new Set(cartas.map(c => c.valor + '-' + c.naipe));

    if (cartas.length !== 40 || chaves.size !== 40) {
        throw Error('Baralho inválido');
    }

    const deck = [...cartas];

    for (const j of p.jogadores) {
        j.cartas = deck.splice(0, 3);
    }

    p.vira = deck.shift();
    p.rodadas = [];
    p.jogadas = [];
    p.pedido = null;
    p.ultimoAumento = null;
    p.valorMao = maoDeOnze(p) === null ? 1 : 3;
    p.vez = p.quemComeca;
    p.maoEmAndamento = true;

    return p;
}

function jogar(p, jogador, carta) {
    if (p.encerrada) {
        throw Error('Partida encerrada');
    }

    if (!p.maoEmAndamento) {
        throw Error('Nenhuma mão em andamento');
    }

    if (p.pedido) {
        throw Error('Truco pendente');
    }

    if (jogador !== p.vez) {
        throw Error('Fora da vez');
    }

    const mao = p.jogadores[jogador].cartas;
    const i = mao.findIndex(c => c.valor === carta.valor && c.naipe === carta.naipe);

    if (i < 0) {
        throw Error('Carta não está na mão');
    }

    mao.splice(i, 1);
    p.jogadas.push({ jogador, carta });
    p.vez = (jogador + 1) % 4;

    if (p.jogadas.length === 4) {
        fecharRodada(p);
    }
}

function fecharRodada(p) {
    const maior = Math.max(...p.jogadas.map(j => forca(j.carta, p.vira)));
    const melhores = p.jogadas.filter(j => forca(j.carta, p.vira) === maior);
    const duplas = new Set(melhores.map(j => j.jogador % 2));

    // se só uma dupla fez a maior carta, ela ganha (mesmo se os dois parceiros empatarem)
    p.rodadas.push(duplas.size === 1 ? melhores[0].jogador % 2 : null);

    // quem fez a maior carta começa a próxima rodada
    p.vez = melhores[0].jogador;
    p.jogadas = [];

    const vencedor = resultadoMao(p.rodadas);

    if (vencedor !== undefined) {
        fimDaMao(p, vencedor);
    }
}

// undefined = mão continua | null = ninguém pontua | 0 ou 1 = dupla vencedora
function resultadoMao(r) {
    if (r.length < 2) {
        return undefined;
    }

    const [a, b, c] = r;

    // primeira rodada empatou: quem ganhar a próxima leva
    if (a === null) {
        if (b !== null) return b;
        if (r.length < 3) return undefined;
        return c;
    }

    // ganhou duas, ou ganhou a primeira e empatou a segunda
    if (b === a || b === null) {
        return a;
    }

    if (r.length < 3) {
        return undefined;
    }

    // empate na terceira: vale quem ganhou a primeira
    return c === null ? a : c;
}

function fimDaMao(p, dupla) {
    if (dupla !== null) {
        p.pontos[dupla] += p.valorMao;
    }

    p.pedido = null;
    p.maoEmAndamento = false;
    p.encerrada = p.pontos.some(x => x >= 12);
    p.quemComeca = (p.quemComeca + 1) % 4;
}

function pedirTruco(p, dupla) {
    if (p.encerrada) {
        throw Error('Partida encerrada');
    }

    if (![0, 1].includes(dupla)) {
        throw Error('Dupla inválida');
    }

    if (p.pedido) {
        throw Error('Pedido pendente');
    }

    if (p.pontos.includes(11)) {
        throw Error('Não pode pedir truco na mão de onze');
    }

    if (p.valorMao === 12) {
        throw Error('Limite de pontos');
    }

    if (dupla === p.ultimoAumento) {
        throw Error('Só a outra dupla pode aumentar');
    }

    p.pedido = { dupla, valor: AUMENTOS[p.valorMao] };
}

function responderTruco(p, dupla, aceita) {
    if (!p.pedido || ![0, 1].includes(dupla) || dupla === p.pedido.dupla) {
        throw Error('Resposta inválida');
    }

    const quemPediu = p.pedido.dupla;

    if (aceita) {
        p.valorMao = p.pedido.valor;
        p.ultimoAumento = quemPediu;
        p.pedido = null;
    } else {
        // quem correu dá o valor que a mão valia antes do pedido
        fimDaMao(p, quemPediu);
    }
}

// na mão de onze, a dupla com 11 pode correr e o adversário ganha 1 ponto
function correrMaoDeOnze(p) {
    const dupla = maoDeOnze(p);

    if (dupla === null || !p.maoEmAndamento) {
        throw Error('Não é mão de onze');
    }

    p.valorMao = 1;
    fimDaMao(p, 1 - dupla);
}

function vencedorPartida(p) {
    return p.pontos.findIndex(x => x >= 12);
}

module.exports = {
    ORDEM,
    NAIPES,
    baralho,
    embaralhar,
    proxima,
    forca,
    comparar,
    criarPartida,
    maoDeOnze,
    distribuir,
    jogar,
    resultadoMao,
    pedirTruco,
    responderTruco,
    correrMaoDeOnze,
    vencedorPartida
};
