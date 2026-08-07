# Desenvolvimento e manutenção

Este documento reúne as informações técnicas necessárias para manter e publicar a extensão. As instruções de instalação e uso estão no `README.md`.

## Requisitos de desenvolvimento

- Node.js 24 ou mais recente.
- npm.
- Uma conta no Owlbear Rodeo para testes manuais.

## Instalação local

```bash
npm ci
npm run dev
```

O Vite disponibiliza o projeto em `http://localhost:5173/arton-travel-ruler/`. Para testar no Owlbear Rodeo, adicione temporariamente este manifesto:

```text
http://localhost:5173/arton-travel-ruler/manifest.json
```

Mantenha o servidor local em execução durante o teste.

## Comandos disponíveis

```bash
npm test          # executa os testes automatizados
npm run typecheck # verifica os tipos TypeScript
npm run build     # verifica os tipos e gera a pasta docs
npm run prepare-pages # executa os testes e gera a pasta docs
```

A versão 1.0.0 não possui uma etapa separada de lint. O typecheck e os testes formam a verificação automatizada do projeto.

## Estrutura principal

```text
src/
  background/       registro da ferramenta em segundo plano
  import/           dimensões, envio da cena e importações pendentes
  maps/             perfis de mapa e matemática de calibração
  measurements/     rotas, cálculos, itens visuais e persistência
  owlbear/           calibração armazenada na cena
  panel/             interface de importação e configuração
  shared/            constantes e modelos de dados
  tool/              fluxo da ferramenta e ações
tests/               testes automatizados
public/              manifesto e ícones de origem
docs/                arquivos compilados publicados pelo GitHub Pages
.github/workflows/   integração contínua
```

## Mapas e calibração

Os perfis ficam em `src/maps/definitions.ts` e usam as barras impressas nas imagens de referência.

| Mapa | Imagem de referência | Barra usada | Escala de referência |
| --- | ---: | ---: | ---: |
| Arton | 3229×2166 px | 394 px = 1000 km | aproximadamente 2,5381 km/px |
| Lamnor | 1215×991 px | 147 px = 1000 km | aproximadamente 6,8027 km/px |

Imagens com a mesma proporção são recalibradas conforme sua resolução. Imagens recortadas ou deformadas são rejeitadas. A transformação atual do item de mapa é considerada na medição, incluindo posição, escala e rotação.

## Testes automatizados

Os testes cobrem:

- calibração e redimensionamento proporcional de Arton e Lamnor;
- rejeição de proporções incompatíveis;
- distância, escala, rotação e arredondamento dos dias;
- rotas com vários trechos e distância acumulada;
- seleção de pontos e áreas clicáveis;
- normalização visual entre os mapas;
- fila compartilhada de consulta;
- leitura dos formatos persistentes anteriores;
- versão, caminhos e recursos do GitHub Pages.

## Roteiro de verificação manual

Antes de uma nova versão:

1. Instale o manifesto local e confirme o painel para mestre e jogador.
2. Importe Arton e Lamnor e confira as dimensões detectadas.
3. Meça a barra de 1000 km em cada mapa.
4. Crie uma rota `A → B → C → D → E` e finalize clicando novamente em E.
5. Consulte C, B, D, A e E e confira distância e dias acumulados.
6. Repita a consulta como jogador e teste a fila com duas pessoas.
7. Confirme persistência após recarregar e reabrir a cena.
8. Teste cancelar, apagar a última, apagar uma rota específica e apagar todas.
9. Confirme que linhas, pontos e rótulos não podem ser arrastados.
10. Repita o fluxo principal em um dispositivo móvel.

## GitHub Pages

O Vite gera o site estático na pasta versionada `docs/`. O GitHub Pages deve usar **Deploy from a branch**, com a branch `main` e a pasta `/docs`.

Para preparar uma publicação:

```bash
npm ci
npm run prepare-pages
git add .
git commit -m "Descreva a atualização"
git push
```

O workflow `.github/workflows/ci.yml` executa testes e build, mas não publica nem atualiza a pasta `docs`. Por isso, a pasta precisa ser gerada localmente antes do commit.

O projeto usa `base: "/arton-travel-ruler/"` no Vite e caminhos absolutos com essa subpasta no manifesto. Se o repositório for renomeado, atualize `vite.config.ts`, `public/manifest.json` e os testes de publicação.

## Arquivos de mapas

Os mapas oficiais não devem ser adicionados ao repositório. O `.gitignore` bloqueia os formatos de imagem usados na importação. Durante o uso, o arquivo segue do navegador do mestre diretamente para o Atlas da conta no Owlbear Rodeo.
