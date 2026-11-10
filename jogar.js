// Jogo de truco no terminal: você e seu parceiro (computador) contra dois adversários (computador).
// Para jogar: node jogar.js

const readline = require('node:readline');
const T = require('./truco');

const rl = readline.createInterface({ input: process.stdin });

// guarda as linhas digitadas até o jogo pedir uma resposta
const linhas = [];
let esperando = null;

rl.on('line', linha => {
    if (esperando) {
        const responder = esperando;
        esperando = null;
        responder(linha);
    } else {
        linhas.push(linha);
    }
});

rl.on('close', () => {
    if (esperando) {
        console.log('\nJogo interrompido.');
        process.exit(0);
    }
});

function perguntar(texto) {
    process.stdout.write(texto);

    if (linhas.length > 0) {
        return Promise.resolve(linhas.shift());
    }

    return new Promise(resolve => { esperando = resolve; });
}

const NOMES = ['Você', 'Adversário da direita', 'Seu parceiro', 'Adversário da esquerda'];
const DUPLAS = ['Nós', 'Eles'];
const PROXIMO_PEDIDO = { 1: 'TRUCO', 3: 'SEIS', 6: 'NOVE', 9: 'DOZE' };

function nomeCarta(carta, vira) {
    const manilha = carta.valor === T.proxima(vira.valor) ? ' (manilha)' : '';
    return `${carta.valor} de ${carta.naipe}${manilha}`;
}

function mostrarMao(p, jogador) {
    p.jogadores[jogador].cartas.forEach((carta, i) => {
        console.log(`  ${i + 1}) ${nomeCarta(carta, p.vira)}`);
    });
}

async function perguntarSimNao(pergunta) {
    while (true) {
        const r = (await perguntar(pergunta)).trim().toLowerCase();

        if (r === 's') return true;
        if (r === 'n') return false;

        console.log('Digite s ou n.');
    }
}

function jogarEMostrar(p, jogador, carta) {
    const vira = p.vira;
    const rodadasAntes = p.rodadas.length;

    T.jogar(p, jogador, carta);
    console.log(`${NOMES[jogador]} jogou ${nomeCarta(carta, vira)}`);

    if (p.rodadas.length > rodadasAntes) {
        const vencedor = p.rodadas[p.rodadas.length - 1];

        console.log(vencedor === null
            ? '→ Rodada empatou\n'
            : `→ Rodada para ${DUPLAS[vencedor]}\n`);
    }
}

// ---------- computador ----------

function forca(p, carta) {
    return T.forca(carta, p.vira);
}

// se o parceiro já está ganhando, joga a mais fraca;
// senão tenta ganhar com a menor carta que basta; se não der, joga a mais fraca
function botEscolheCarta(p, jogador) {
    const mao = [...p.jogadores[jogador].cartas].sort((a, b) => forca(p, a) - forca(p, b));

    if (p.jogadas.length === 0) {
        return mao[mao.length - 1];
    }

    const melhor = p.jogadas.reduce((a, b) => (forca(p, b.carta) > forca(p, a.carta) ? b : a));

    if (melhor.jogador % 2 === jogador % 2) {
        return mao[0];
    }

    return mao.find(c => forca(p, c) > forca(p, melhor.carta)) || mao[0];
}

function temCartaBoa(p, jogadores) {
    return jogadores.some(j =>
        p.jogadores[j].cartas.some(c => forca(p, c) >= 100 || c.valor === '3')
    );
}

function botAceita(p) {
    return temCartaBoa(p, [1, 3]) || Math.random() < 0.3;
}

function botQuerTrucar(p, jogador) {
    return !p.pontos.includes(11)
        && p.valorMao < 12
        && p.ultimoAumento !== 1
        && temCartaBoa(p, [jogador])
        && Math.random() < 0.3;
}

// ---------- turnos ----------

async function vezDoJogador(p) {
    while (true) {
        console.log('Sua mão:');
        mostrarMao(p, 0);

        const pedido = PROXIMO_PEDIDO[p.valorMao];
        const extra = pedido ? ` ou T para pedir ${pedido}` : '';
        const r = (await perguntar(`Escolha a carta (número)${extra}: `)).trim().toLowerCase();

        if (r === 't') {
            try {
                T.pedirTruco(p, 0);
            } catch (e) {
                console.log(`Não pode: ${e.message}\n`);
                continue;
            }

            console.log(`Você pediu ${PROXIMO_PEDIDO[p.valorMao]}!`);

            if (botAceita(p)) {
                T.responderTruco(p, 1, true);
                console.log(`Eles aceitaram. A mão vale ${p.valorMao}.\n`);
                continue;
            }

            T.responderTruco(p, 1, false);
            console.log('Eles correram!');
            return;
        }

        const carta = p.jogadores[0].cartas[Number(r) - 1];

        if (!carta) {
            console.log('Opção inválida.\n');
            continue;
        }

        jogarEMostrar(p, 0, carta);
        return;
    }
}

async function vezDoBot(p, jogador) {
    if (jogador % 2 === 1 && botQuerTrucar(p, jogador)) {
        T.pedirTruco(p, 1);
        console.log(`\n${NOMES[jogador]} pediu ${PROXIMO_PEDIDO[p.valorMao]}!`);
        console.log('Sua mão:');
        mostrarMao(p, 0);

        const aceita = await perguntarSimNao('Aceitar? (s/n): ');
        T.responderTruco(p, 0, aceita);

        if (!aceita) {
            console.log('Vocês correram.');
            return;
        }

        console.log(`Aceito! A mão vale ${p.valorMao}.\n`);
    }

    jogarEMostrar(p, jogador, botEscolheCarta(p, jogador));
}

// ---------- partida ----------

async function main() {
    const p = T.criarPartida();
    let numero = 0;

    console.log('TRUCO PAULISTA — você e seu parceiro contra o computador');

    while (!p.encerrada) {
        numero++;
        T.distribuir(p);

        const antes = [...p.pontos];

        console.log(`\n========== MÃO ${numero} ==========`);
        console.log(`Placar: Nós ${p.pontos[0]} x ${p.pontos[1]} Eles`);
        console.log(`Vira: ${p.vira.valor} de ${p.vira.naipe}  |  Manilha: ${T.proxima(p.vira.valor)}`);
        console.log(`Quem começa: ${NOMES[p.vez]}\n`);

        const onze = T.maoDeOnze(p);

        if (onze === 0) {
            console.log('MÃO DE ONZE! A mão vale 3 e não tem truco.');
            console.log('Suas cartas:');
            mostrarMao(p, 0);
            console.log('Cartas do seu parceiro:');
            mostrarMao(p, 2);

            if (!(await perguntarSimNao('Jogar a mão? (s/n): '))) {
                T.correrMaoDeOnze(p);
                console.log('Vocês correram. Eles ganham 1 ponto.');
                continue;
            }
        } else if (onze === 1) {
            console.log('Eles estão na mão de onze e decidiram jogar. A mão vale 3.\n');
        }

        while (p.maoEmAndamento) {
            if (p.vez === 0) {
                await vezDoJogador(p);
            } else {
                await vezDoBot(p, p.vez);
            }
        }

        const nos = p.pontos[0] - antes[0];
        const eles = p.pontos[1] - antes[1];

        if (nos > 0) console.log(`Nós ganhamos ${nos} ponto(s).`);
        else if (eles > 0) console.log(`Eles ganharam ${eles} ponto(s).`);
        else console.log('Ninguém marcou ponto.');
    }

    console.log(`\nFIM DE JOGO: Nós ${p.pontos[0]} x ${p.pontos[1]} Eles`);
    console.log(T.vencedorPartida(p) === 0 ? 'VOCÊS VENCERAM!' : 'Eles venceram.');
    rl.close();
}

main();
