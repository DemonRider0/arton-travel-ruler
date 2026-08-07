# Régua de Viagem de Arton para Owlbear Rodeo

Extensão não oficial para medir distâncias e estimar dias de viagem diretamente nas cenas do Owlbear Rodeo. A versão 1.0.0 oferece suporte aos mapas de **Arton** e **Lamnor**.

Os mapas oficiais **não estão incluídos neste repositório**. A extensão usa arquivos locais escolhidos pelo mestre e os envia diretamente ao Atlas da própria conta no Owlbear Rodeo.

## Funcionalidades

- Importação local de imagens PNG, JPG ou WebP.
- Detecção automática das dimensões da imagem.
- Calibração independente para cada cena e mapa.
- Régua com rotas de dois ou mais trechos.
- Linha pontilhada, marcadores e rótulo com quilômetros e dias de viagem.
- Velocidade configurável em quilômetros por dia.
- Consulta da distância acumulada até qualquer ponto da rota.
- Rotas compartilhadas com todos os participantes e preservadas na cena.
- Fila de consulta para evitar conflitos entre participantes.
- Opções para cancelar, apagar a última rota, apagar uma rota específica ou apagar todas.
- Interface compatível com computador e dispositivos móveis.

## Requisitos

- Uma conta no [Owlbear Rodeo](https://www.owlbear.rodeo/).
- Uma sala na qual a extensão esteja habilitada.
- Os arquivos dos mapas de Arton ou Lamnor que você tenha autorização para usar.

## Instalação

Use a seguinte URL do manifesto:

```text
https://demonrider0.github.io/arton-travel-ruler/manifest.json
```

1. No Owlbear Rodeo, abra o seu perfil e escolha **Adicionar extensão** (*Add Extension*).
2. Cole a URL do manifesto.
3. Adicione a extensão à sua conta.
4. Habilite **Régua de Viagem** ao criar ou editar uma sala.

## Importar e calibrar um mapa

1. Entre na sala como mestre e abra **Régua de Viagem** no canto superior esquerdo.
2. No cartão de Arton ou Lamnor, selecione **Importar mapa**.
3. Escolha o arquivo correspondente em seu computador ou dispositivo.
4. Aguarde o envio e abra no Atlas a cena criada pela extensão.
5. Reabra o painel para conferir a calibração.

Para uma cena que já tenha um mapa na camada `MAP`, use **Calibrar cena atual** no cartão correspondente.

A extensão foi calibrada com imagens de referência nas seguintes proporções:

| Mapa | Dimensões de referência |
| --- | ---: |
| Arton | 3229×2166 px |
| Lamnor | 1215×991 px |

Cópias redimensionadas proporcionalmente são aceitas. Imagens recortadas, esticadas ou com outra proporção precisam de uma calibração própria e não são aceitas pelos perfis atuais.

## Usar a régua

1. Ajuste **Quilômetros percorridos por dia** no painel, se necessário. O padrão é 36 km por dia.
2. Selecione a ferramenta **Régua de viagem** na barra da cena.
3. Clique no ponto inicial e depois em cada parada ou desvio.
4. Clique novamente no último ponto amarelo para concluir e salvar a rota.

Uma rota simples usa os cliques `A → B → B`. Uma rota com desvios pode usar, por exemplo, `A → B → C → D → D`.

Depois de salvar, clique em qualquer ponto amarelo com a ferramenta ativa para mostrar a distância e os dias acumulados desde o primeiro ponto. Clique novamente no mesmo ponto, clique fora da rota, pressione `Esc` ou troque de ferramenta para encerrar a consulta.

Quando outra pessoa já estiver consultando uma rota, os novos pedidos entram em uma fila e são atendidos em ordem.

## Apagar rotas

O menu da ferramenta permite:

- cancelar a medição atual;
- apagar a rota mais recente;
- apagar todas as rotas da extensão.

Para apagar uma rota específica no computador:

1. Use a ferramenta normal de seleção do Owlbear.
2. Dê um clique duplo em qualquer ponto amarelo da rota.
3. Escolha **Apagar rota selecionada** no menu contextual.

## Permissões dos jogadores

Mestre e jogadores podem traçar e consultar rotas. Para jogadores, a sala deve permitir a criação de itens na camada **Régua**. Para que também possam apagar rotas, habilite a permissão de exclusão nessa camada.

## Limitações da versão 1.0.0

- Apenas Arton e Lamnor possuem perfis de calibração.
- Há um mapa calibrado por cena.
- Pontos de uma rota salva não podem ser movidos ou editados; apague a rota e crie outra.
- Há somente uma consulta compartilhada ativa por cena; as demais aguardam na fila.
- Marcadores de localidades e cartões informativos ainda não estão disponíveis.
- A precisão depende das barras de escala e da cartografia das imagens originais.

## Autoria e créditos

Desenvolvido por **DemonRider**.

Projeto independente e não oficial. Os nomes e materiais relacionados a Tormenta, Arton e Lamnor pertencem aos respectivos titulares. Este repositório não distribui mapas oficiais e não possui afiliação com o Owlbear Rodeo.
