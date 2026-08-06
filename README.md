# Régua de Viagem de Arton para Owlbear Rodeo

Extensão privada/pessoal para medir viagens em linha reta diretamente na cena do Owlbear Rodeo. O MVP inclui calibração para os mapas fornecidos de **Arton** e **Lamnor**, régua nativa, dias de viagem e persistência compartilhada.

Os mapas **não fazem parte deste repositório**. O mestre escolhe um arquivo local e o envia diretamente para o próprio Atlas do Owlbear Rodeo.

## O que está implementado

- Projeto TypeScript usando `@owlbear-rodeo/sdk`.
- Build estático com Vite, compatível com subpastas do GitHub Pages.
- Importação local de PNG, JPG ou WebP pelo mestre.
- Leitura automática da largura e altura reais da imagem.
- Calibração independente em cada cena/mapa.
- Perfis iniciais de Arton e Lamnor baseados nas barras impressas de 1000 km.
- Suporte a cópias redimensionadas proporcionalmente.
- Ferramenta nativa de dois cliques na barra lateral do Owlbear.
- Prévia local durante a medição e, ao concluir, régua e dois marcadores compartilhados.
- Rótulo com quilômetros e dias de viagem.
- Velocidade configurável em quilômetros por dia; o total de dias é arredondado para cima.
- Medições gravadas como itens da cena, visíveis para todos e preservadas ao reabrir a cena.
- Ações para cancelar, apagar a última medição e apagar todas as medições da extensão.

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

O Vite exibirá um endereço local, normalmente `http://localhost:5173`.

No Owlbear Rodeo:

1. Abra o perfil e escolha **Add Extension**.
2. Informe `http://localhost:5173/manifest.json`.
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
8. Clique no ponto inicial, mova o cursor e clique no ponto final.

As ações do menu da ferramenta permitem:

- cancelar a medição em andamento — a tecla `Esc` também cancela;
- apagar somente a medição mais recente;
- apagar todas as medições criadas por esta extensão.

As ações de apagar filtram os metadados próprios da extensão e não removem réguas ou desenhos comuns.

## Publicar no GitHub Pages

O workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) testa, compila e publica a pasta `dist` automaticamente.

1. Crie um repositório no GitHub e envie este projeto para a branch `main`.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Execute o workflow **Publicar no GitHub Pages** ou envie um novo commit para `main`.
5. Depois da publicação, instale a extensão usando:

   ```text
   https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/manifest.json
   ```

O `base: "./"` do Vite e os caminhos relativos do manifesto permitem que a extensão funcione nessa subpasta.

## Verificações automatizadas

```bash
npm test
npm run typecheck
npm run build
```

Os testes cobrem:

- calibração original de Arton e Lamnor;
- redimensionamento proporcional;
- rejeição de proporção incompatível;
- distância euclidiana;
- escala e rotação do item de mapa;
- cálculo e arredondamento dos dias de viagem.

## Roteiro de testes manuais no Owlbear

Faça estes testes antes de usar a extensão em uma sessão real.

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
- Faça uma medição de aproximadamente 1000 km e confirme a exibição de aproximadamente 10 dias.
- Inicie outra medição e pressione `Esc`; a prévia deve desaparecer sem criar itens compartilhados.
- Conclua duas medições, apague a última e confirme que somente a primeira permanece.
- Use **Apagar todas** e confirme que as medições da extensão desapareceram.

### 5. Compartilhamento e persistência

- Entre na mesma sala em outra janela ou navegador como jogador.
- Conclua uma medição como mestre e confirme que ela aparece para o jogador.
- Recarregue as duas páginas e reabra a cena; a medição deve continuar presente.
- Confirme que o jogador vê a linha, os dois marcadores, a distância e os dias.

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
  measurements/     itens visuais, rótulos e exclusão persistente
  owlbear/           leitura e gravação da calibração na cena
  panel/             interface de importação e configuração
  shared/            constantes e modelos de dados
  tool/              fluxo de dois cliques e ações nativas
tests/               testes da matemática
public/              manifesto e ícones
```

O cadastro em `src/maps/definitions.ts` isola os perfis de mapa. As medições são agrupadas por um identificador próprio, o que deixa a base preparada para novos mapas e para uma futura representação de rotas com vários trechos. Localidades clicáveis podem ser adicionadas em um módulo separado, sem mudar a calibração ou a persistência atuais.

## Limitações reais do MVP

- A distância é uma linha reta; não existem rotas com vários trechos.
- Não existem marcadores de localidades nem cartões clicáveis.
- Somente o mestre cria e apaga medições; os jogadores veem os resultados sincronizados.
- Há um mapa calibrado por cena.
- Os dois perfis dependem da mesma arte/proporção das imagens de referência. Uma edição recortada exige um novo perfil.
- A precisão física está limitada à barra impressa e à cartografia da própria ilustração.
- **Importar localmente** significa que o arquivo vai do navegador do mestre para o Atlas da conta no Owlbear. O GitHub Pages e a extensão não recebem, hospedam nem versionam a imagem.

## Conteúdo protegido

O `.gitignore` impede a inclusão acidental de PNG, JPG, JPEG e WebP. Mantenha no repositório apenas o código e use somente mapas que você tenha autorização para enviar ao Owlbear Rodeo.
