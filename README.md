# Régua de Viagem de Arton para Owlbear Rodeo

Extensão privada/pessoal para traçar rotas de viagem diretamente na cena do Owlbear Rodeo. A versão 0.4.1 inclui calibração para os mapas fornecidos de **Arton** e **Lamnor**, rotas com vários trechos, consulta coordenada de pontos, dias de viagem e persistência compartilhada.

Os mapas **não fazem parte deste repositório**. O mestre escolhe um arquivo local e o envia diretamente para o próprio Atlas do Owlbear Rodeo.

## O que está implementado

- Projeto TypeScript usando `@owlbear-rodeo/sdk`.
- Build estático com Vite, compatível com subpastas do GitHub Pages.
- Importação local de PNG, JPG ou WebP pelo mestre.
- Leitura automática da largura e altura reais da imagem.
- Calibração independente em cada cena/mapa.
- Perfis iniciais de Arton e Lamnor baseados nas barras impressas de 1000 km.
- Suporte a cópias redimensionadas proporcionalmente.
- Ferramenta de rota disponível na barra lateral para mestre e jogadores.
- Rotas com dois ou mais pontos e soma correta da distância de todos os trechos.
- Linha amarela fina e pontilhada e marcadores pequenos, normalizados pela largura efetiva de cada mapa.
- Rótulo compacto no ponto final ou no ponto intermediário selecionado.
- Prévia local durante o traçado; a rota concluída é compartilhada com toda a sala.
- Rótulo com quilômetros e dias de viagem.
- Velocidade configurável em quilômetros por dia; o total de dias é arredondado para cima.
- Medições gravadas como itens da cena, visíveis para todos e preservadas ao reabrir a cena.
- Ações para cancelar, apagar a última rota e apagar todas as rotas da extensão.
- Exclusão individual pelo menu contextual de qualquer ponto da rota.
- Leitura e exclusão compatíveis com medições salvas pela versão 0.1.
- Rotas bloqueadas contra deslocamento acidental, inclusive durante a navegação no celular.
- Ajuste automático do visual e do rótulo das rotas criadas na versão 0.2 ao reabrir a cena.
- Pontos clicáveis pela própria ferramenta, sem abrir a barra de transformação nativa sobre o rótulo.
- Fila compartilhada de consulta: a primeira pessoa mantém prioridade e as demais aguardam a liberação.

## Mapas e calibração

| Mapa | Imagem de referência | Barra usada | Escala de referência |
| --- | ---: | ---: | ---: |
| Arton | 3229×2166 px | 394 px = 1000 km | ~2,5381 km/px |
| Lamnor | 1215×991 px | 147 px = 1000 km | ~6,8027 km/px |

Uma imagem com a mesma proporção, mas outra resolução, é recalibrada automaticamente. Uma imagem recortada ou deformada é rejeitada, pois reutilizar o perfil nela produziria distâncias incorretas.

Cada cena guarda sua própria calibração nos metadados do Owlbear. A transformação atual do item de mapa também é lida durante a medição, então mover, girar ou redimensionar o mapa não altera a distância calculada.

## Requisitos

- Node.js 24 ou mais recente.
- Uma conta no [Owlbear Rodeo](https://www.owlbear.rodeo/).
- Os arquivos de mapa que você tem autorização para usar.

## Executar localmente

```bash
npm install
npm run dev
```

O Vite exibirá um endereço local. Como o projeto usa a mesma subpasta do GitHub Pages, o painel fica normalmente em `http://localhost:5173/arton-travel-ruler/`.

No Owlbear Rodeo:

1. Abra o perfil e escolha **Add Extension**.
2. Informe `http://localhost:5173/arton-travel-ruler/manifest.json`.
3. Ative a extensão ao criar ou editar uma sala.
4. Mantenha o terminal com o servidor local aberto durante o teste.

O uso de `localhost` para desenvolvimento segue o fluxo recomendado na documentação oficial de extensões do Owlbear Rodeo.

## Usar a extensão

1. Entre na sala como mestre e abra **Régua de Viagem** no canto superior esquerdo.
2. Em Arton ou Lamnor, clique em **Importar mapa** e escolha o arquivo local correspondente.
3. Aguarde o Owlbear concluir o envio e abra, no Atlas, a cena recém-criada.
4. A extensão reconhecerá o nome e as dimensões do mapa e salvará a calibração automaticamente.
5. Se uma cena já existente tiver o mapa na camada `MAP`, use **Calibrar cena atual** no cartão correto.
6. Ajuste **Quilômetros percorridos por dia** se não quiser usar o padrão de 36 km/dia.
7. Selecione a ferramenta **Régua de viagem** na barra da cena.
8. Clique no ponto inicial e depois em cada parada ou desvio da viagem.
9. Para concluir, clique novamente no último ponto amarelo. Uma rota simples de A até B usa os cliques `A → B → B`.

Depois que a rota estiver salva, clique em um de seus pontos com a ferramenta **Régua de viagem** ativa. O rótulo irá para esse ponto e mostrará a distância e os dias acumulados desde A. A área de clique é um pouco maior do que a bolinha visível e sempre escolhe o ponto mais próximo. A linha e o rótulo não capturam o clique, evitando que escondam os pontos intermediários.

Para liberar a consulta, clique novamente no mesmo ponto, clique fora da rota, pressione `Esc` ou troque de ferramenta. Se outra pessoa já estiver consultando, seu pedido entra na fila e assume automaticamente quando chegar a vez. Sair da sala ou trocar de cena também deixa de bloquear os demais participantes.

Mestre e jogadores podem usar a ferramenta. Para jogadores, a sala precisa permitir **criar** itens na camada **Régua**. Para que também possam apagar rotas, permita **excluir** itens dessa camada nas configurações de permissões da sala.

As ações do menu da ferramenta permitem:

- cancelar a medição em andamento — a tecla `Esc` também cancela;
- apagar somente a rota mais recente;
- apagar todas as rotas criadas por esta extensão.

Para apagar uma rota específica no computador:

1. Troque para a ferramenta normal de seleção e dê um clique duplo em qualquer ponto amarelo da rota.
2. Como a rota está bloqueada, ela pode ser selecionada, mas não arrastada.
3. No menu contextual que aparecer, escolha **Apagar rota selecionada**.

O comando remove todos os trechos, pontos e o rótulo daquela rota, e não apenas o item clicado.

As ações de apagar filtram os metadados próprios da extensão e não removem réguas ou desenhos comuns.

## Publicar no GitHub Pages

O Vite gera o site estático na pasta versionada `docs/`. O GitHub Pages publica diretamente essa pasta da branch `main`, sem usar um artefato de deploy personalizado. O arquivo `docs/.nojekyll` impede que o GitHub tente processar a extensão como um site Jekyll.

### Primeira publicação

1. Instale as dependências e prepare os arquivos publicados:

   ```bash
   npm install
   npm run prepare-pages
   ```

2. Envie o código e a pasta `docs/` para a branch `main`.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
5. Selecione a branch **main**, a pasta **/docs** e clique em **Save**.
6. Depois da publicação, instale esta extensão usando:

   ```text
   https://demonrider0.github.io/arton-travel-ruler/manifest.json
   ```

### Atualizações seguintes

Sempre gere novamente os arquivos publicados antes do commit:

```bash
npm run prepare-pages
git add .
git commit -m "Descreva a atualização"
git push
```

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) repete testes e build no GitHub, mas não altera nem publica arquivos. A publicação é disparada pelo próprio GitHub Pages quando um commit feito pelo usuário modifica a fonte `main/docs`.

O `base: "/arton-travel-ruler/"` do Vite e os caminhos do manifesto incluem explicitamente a subpasta do repositório. Isso é necessário porque o Owlbear resolve páginas e ícones do manifesto a partir da raiz do domínio. Se o repositório for renomeado, atualize essa base em `vite.config.ts` e `public/manifest.json`; o teste de publicação verificará se os dois continuam alinhados.

## Verificações automatizadas

```bash
npm test
npm run typecheck
npm run build
```

Os testes automatizados são testes de regressão: mesmo quando uma função não foi alterada diretamente, eles garantem que mudanças na rota não quebraram calibração, escala, persistência ou publicação. Não é necessário repetir manualmente todos eles a cada ajuste visual.

Eles cobrem:

- calibração original de Arton e Lamnor;
- redimensionamento proporcional;
- rejeição de proporção incompatível;
- distância euclidiana;
- escala e rotação do item de mapa;
- cálculo e arredondamento dos dias de viagem;
- soma de rotas com vários trechos;
- distância acumulada de A até cada ponto;
- identificação consistente dos pontos intermediários de uma rota A–E, inclusive quando áreas de clique se sobrepõem;
- somente os pontos da rota capturam cliques; linha e rótulo permanecem fora da seleção nativa;
- tolerância de clique para concluir no último ponto em diferentes níveis de zoom;
- posição do rótulo no último ponto;
- normalização visual entre as larguras de Arton e Lamnor;
- prioridade determinística e avanço da fila de consulta;
- isolamento da fila por cena e descarte de pedidos de rotas apagadas;
- compatibilidade entre os metadados das versões 0.1 e 0.2;
- caminhos e recursos necessários à publicação no GitHub Pages.

## Roteiro de testes manuais no Owlbear

Faça estes testes antes de usar a extensão em uma sessão real.

Para uma atualização apenas visual, priorize as seções **4** e **5**. As demais formam o roteiro completo de regressão para uma publicação maior.

### 1. Instalação e painel

- Instale o `manifest.json` local ou publicado.
- Confirme que o ícone **Régua de Viagem** aparece no canto superior esquerdo.
- Como jogador, confirme que o painel é somente leitura.
- Como mestre, confirme que os botões de importação estão habilitados.

### 2. Importação de Arton

- Importe `Mapa de Arton 1420 - high definition.png`.
- Confirme no painel a detecção de `3229×2166px`.
- Abra a cena criada no Atlas.
- Reabra o painel e confirme **Cena calibrada para Arton**.
- Meça de uma extremidade à outra da barra impressa de 1000 km. O resultado deve ficar próximo de 1000 km; alguns quilômetros de diferença são normais conforme a precisão dos cliques.

### 3. Importação de Lamnor

- Repita o fluxo com `Mapa de Lamnor - High Definition.png`.
- Confirme a detecção de `1215×991px` e a calibração de Lamnor.
- Repita o teste da barra de 1000 km.

### 4. Régua e dias

- Defina 100 km/dia.
- Faça uma rota de aproximadamente 1000 km e confirme a exibição de aproximadamente 10 dias.
- Confirme que a linha é fina e pontilhada, os pontos são discretos e o rótulo não fica girado sobre a linha.
- Compare Arton e Lamnor enquadrados na mesma largura de tela; linha e pontos devem ter tamanhos visuais equivalentes.
- Crie uma rota `A → B → C → D → E` e clique novamente em E. Confirme que a distância corresponde à soma dos quatro trechos, não à linha reta `A–E`.
- Consulte, nesta ordem, C, B, D, A e E. Todos os pontos devem responder, o rótulo deve acompanhar o ponto escolhido e mostrar somente a distância acumulada desde A.
- Confirme que nenhuma barra de transformação do Owlbear aparece sobre o rótulo durante essa consulta.
- Clique novamente no ponto selecionado, clique fora ou pressione `Esc`; confirme que o rótulo volta para E e mostra o total da rota.
- Tente arrastar uma linha, um ponto e o rótulo; nenhum item da rota deve se mover.
- Inicie outra rota e pressione `Esc`; a prévia deve desaparecer sem criar itens compartilhados.
- Conclua duas rotas, apague a última e confirme que somente a primeira permanece.
- Use **Apagar todas** e confirme que as rotas da extensão desapareceram.
- Selecione um ponto de uma rota com a ferramenta de seleção e use **Apagar rota selecionada**; confirme que a rota inteira desaparece.

### 5. Compartilhamento e persistência

- Entre na mesma sala em outra janela ou navegador como jogador.
- Conclua uma rota como mestre e confirme que ela aparece para o jogador.
- Com as permissões de Régua liberadas, crie outra rota como jogador e confirme que ela aparece para o mestre.
- Como jogador, consulte C, B, D, A e E em uma rota de cinco pontos e confirme que mestre e jogador veem o mesmo rótulo em cada tentativa.
- Como mestre, consulte um ponto e, sem liberar, tente consultar outro ponto como jogador. O mestre deve manter a prioridade e o jogador deve receber a posição na fila.
- Libere a consulta do mestre e confirme que a consulta do jogador assume automaticamente.
- Feche a janela de quem está consultando e confirme que o próximo participante deixa de ficar bloqueado.
- Recarregue as duas páginas e reabra a cena; a medição deve continuar presente.
- Confirme que todos veem os trechos, os pontos, a distância e os dias.

### 6. Transformação do mapa

- Como mestre, desbloqueie temporariamente o mapa, altere sua escala e volte a bloqueá-lo.
- Meça novamente a mesma barra impressa; o resultado deve continuar próximo de 1000 km.
- Se também testar uma rotação, use os mesmos pontos da arte e confirme que a distância permanece equivalente.

## Estrutura principal

```text
src/
  background/       registro da ferramenta em segundo plano
  import/           dimensões, upload da cena e importações pendentes
  maps/             cadastro dos mapas e matemática de calibração
  measurements/     rotas, matemática, itens visuais, metadados e exclusão
  owlbear/           leitura e gravação da calibração na cena
  panel/             interface de importação e configuração
  shared/            constantes e modelos de dados
  tool/              fluxo de vários pontos, ações e menu contextual
tests/               testes da matemática
public/              manifesto e ícones
docs/                site compilado e publicado pelo GitHub Pages
.github/workflows/   verificação automática de testes e build
```

O cadastro em `src/maps/definitions.ts` isola os perfis de mapa. Cada rota é agrupada por um identificador próprio e seus trechos e pontos têm índices independentes. Isso deixa a base preparada para novos mapas e para futuras edições de rotas. Localidades clicáveis podem ser adicionadas em um módulo separado, sem mudar a calibração atual.

## Limitações reais do MVP

- Não existem marcadores de localidades nem cartões clicáveis.
- A rota pode ter vários trechos, mas os pontos não podem ser movidos ou editados depois de salva; apague e refaça a rota.
- Há somente uma consulta compartilhada ativa por cena; os demais pedidos aguardam em ordem de chegada.
- A disponibilidade para jogadores depende das permissões de criação e exclusão da camada **Régua** definidas pelo mestre no Owlbear.
- Há um mapa calibrado por cena.
- Os dois perfis dependem da mesma arte/proporção das imagens de referência. Uma edição recortada exige um novo perfil.
- A precisão física está limitada à barra impressa e à cartografia da própria ilustração.
- **Importar localmente** significa que o arquivo vai do navegador do mestre para o Atlas da conta no Owlbear. O GitHub Pages e a extensão não recebem, hospedam nem versionam a imagem.

## Conteúdo protegido

O `.gitignore` impede a inclusão acidental de PNG, JPG, JPEG e WebP. Mantenha no repositório apenas o código e use somente mapas que você tenha autorização para enviar ao Owlbear Rodeo.
