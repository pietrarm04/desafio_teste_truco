# Truco Paulista em Duplas

Implementação das regras do Truco Paulista em duplas em JavaScript, com casos de teste usando o test runner nativo do Node.js (`node:test`).

## Como rodar

Precisa do Node.js 18 ou mais novo. Não precisa instalar nenhuma dependência.

```bash
npm test
```

(ou `node --test truco.test.js`)

## Como jogar

```bash
npm run jogar
```

(ou `node jogar.js`)

Você joga com um parceiro controlado pelo computador contra dois adversários também controlados pelo computador.

- Digite o **número** da carta para jogar.
- Digite **T** para pedir truco (ou seis, nove e doze).
- Quando os adversários pedirem truco, responda **s** para aceitar ou **n** para correr.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `truco.js` | Regras do jogo |
| `truco.test.js` | Casos de teste (CT01 a CT31) |
| `jogar.js` | Jogo no terminal usando as regras do `truco.js` |

---

## Regras do jogo

### Jogadores e duplas

- São 4 jogadores, numerados de 0 a 3.
- Os jogadores formam duas duplas, sentados alternados:
  - **Dupla 0:** jogadores 0 e 2
  - **Dupla 1:** jogadores 1 e 3
- A ordem de jogo é 0 → 1 → 2 → 3 → 0.

### Baralho

- Usa o baralho sem 8, 9, 10 e coringas: **40 cartas**.
- Valores: 4, 5, 6, 7, Q, J, K, A, 2, 3.
- Naipes: ouros, espadas, copas e paus.
- O baralho é embaralhado antes de cada distribuição.
- Um baralho com carta repetida ou com quantidade diferente de 40 é rejeitado.

### Distribuição

- Cada jogador recebe **3 cartas**.
- A próxima carta do baralho é a **vira**, que fica virada na mesa.

### Força das cartas

Ordem das cartas comuns, da mais fraca para a mais forte:

```
4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3
```

### Manilha

- A manilha é a carta **seguinte à vira** na ordem acima.
  - Exemplo: vira 5 → manilha 6.
  - Vira 7 → manilha Q.
  - Vira 3 → manilha 4 (a ordem volta ao começo).
- As 4 manilhas são mais fortes que qualquer carta comum, inclusive o 3.
- Entre as manilhas, quem desempata é o naipe:

```
ouros < espadas < copas < paus
```

### Jogadas

- Cada jogador joga na sua vez. Jogar fora da vez é proibido.
- Só é possível jogar uma carta que está na própria mão.
- Não é possível jogar enquanto houver um pedido de truco sem resposta.
- Não é possível jogar depois que a mão ou a partida acabou.

### Rodadas

- Uma rodada termina quando os 4 jogadores jogam uma carta.
- Vence a rodada a dupla que jogou a carta mais forte.
- Se os **dois parceiros** empatam com a maior carta, a dupla deles ganha a rodada.
- Se jogadores de **duplas diferentes** empatam com a maior carta, a rodada fica empatada.
- Quem jogou a maior carta começa a próxima rodada.

### Resultado da mão

Uma mão tem no máximo 3 rodadas.

| Situação | Quem ganha a mão |
|---|---|
| Uma dupla vence duas rodadas | Essa dupla |
| Primeira rodada empatada | Quem vencer a segunda (se empatar de novo, quem vencer a terceira) |
| Uma dupla vence a primeira e a segunda empata | Quem venceu a primeira |
| Cada dupla vence uma e a terceira empata | Quem venceu a primeira |
| As três rodadas empatam | Ninguém marca ponto |

- Uma mão normal vale **1 ponto**.
- Ao fim de cada mão, quem começa jogando passa para o próximo jogador.

### Truco

- Qualquer dupla pode pedir truco durante a mão.
- O valor da mão só muda depois que a outra dupla **aceita**.
- Somente a **dupla adversária** pode responder ao pedido.
- Escala de valores:

| Pedido | Valor da mão |
|---|---|
| Truco | 3 |
| Seis | 6 |
| Nove | 9 |
| Doze | 12 |

- Não existe aumento acima de 12.
- A mesma dupla não pode aumentar duas vezes seguidas. Depois que uma dupla pede e a outra aceita, só quem aceitou pode pedir o próximo aumento.
- Se a dupla **recusa** (corre), a mão acaba e quem pediu ganha o valor que a mão valia **antes** do pedido.
  - Exemplo: correr do truco dá 1 ponto. Correr do seis dá 3 pontos.
- Recusar o truco encerra apenas a mão, não a partida.

### Mão de onze

- Acontece quando **uma** das duplas está com 11 pontos.
- A mão de onze vale **3 pontos**.
- Não é permitido pedir truco.
- A dupla que está com 11 pode correr da mão. Nesse caso, a dupla adversária ganha **1 ponto**.
- Quando as duas duplas estão com 11, também não é permitido pedir truco.

### Fim da partida

- Vence a partida a primeira dupla que chegar a **12 pontos**.
- Depois disso, nenhuma jogada, pedido ou distribuição é aceito.

---

## Casos de teste

### Preparação da partida

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT01 | Criar partida | 4 jogadores em duas duplas alternadas |
| CT02 | Validar baralho | 40 cartas sem repetição |
| CT03 | Embaralhar | Mesmas 40 cartas, em outra ordem |
| CT04 | Distribuir | 3 cartas por jogador e uma vira |
| CT05 | Baralho repetido | Distribuição rejeitada |

### Força das cartas

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT06 | Definir manilha | Carta seguinte à vira, com 3 voltando para 4 |
| CT07 | Comparar cartas | A mais forte vence e a manilha vence o 3 |
| CT08 | Comparar manilhas | paus > copas > espadas > ouros |

### Jogadas

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT09 | Jogar fora da vez | Jogada rejeitada |
| CT10 | Jogar carta que não está na mão | Jogada rejeitada |
| CT11 | Jogar com truco pendente | Jogada rejeitada |
| CT12 | Vencer uma rodada | O vencedor começa a próxima |
| CT13 | Parceiros empatam na maior carta | A dupla ganha a rodada |
| CT14 | Adversários empatam na maior carta | Rodada empatada |

### Resultado da mão

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT15 | Vencer duas rodadas | Dupla ganha a mão e soma 1 ponto |
| CT16 | Mão ainda indefinida | A mão continua |
| CT17 | Empate na primeira rodada | Leva quem vencer a segunda |
| CT18 | Vence a primeira e empata a segunda | Leva quem venceu a primeira |
| CT19 | Empate na terceira rodada | Leva quem venceu a primeira |
| CT20 | Três rodadas empatadas | Ninguém marca ponto |

### Truco

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT21 | Pedir truco | Valor só muda após a resposta |
| CT22 | Aceitar truco | Mão passa a valer 3 |
| CT23 | Recusar truco | Quem pediu ganha 1 ponto e a partida continua |
| CT24 | Escalada | 3, 6, 9 e 12, sem passar de 12 |
| CT25 | Mesma dupla aumentar duas vezes | Pedido rejeitado |
| CT26 | Responder o próprio pedido | Resposta rejeitada |
| CT27 | Ganhar mão trucada | Dupla soma 3 pontos |

### Mão de onze e fim de jogo

| Nº | Caso | Resultado esperado |
|---|---|---|
| CT28 | Mão de onze | Vale 3 e não aceita truco |
| CT29 | Correr da mão de onze | Adversário ganha 1 ponto |
| CT30 | Duas duplas com 11 | Truco não é permitido |
| CT31 | Chegar a 12 pontos | Dupla vence e a partida encerra |
