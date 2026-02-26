<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

Um conjunto de ferramentas para jogos de tabuleiro com foco em física. Inclui um motor de física 2D determinístico com renderização SVG, um jogo de estratégia completo (SiegeGammon) e uma extensão para o Chrome DevTools para depurar animações — tudo em um monorepório Turborepo.

## Pacotes

| Pacote | Descrição | Status |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | Motor de física 2D com renderizadores SVG e Canvas. | Publicado no npm. |
| **@mcp-tool-shop/siege-types** | Tipos TypeScript compartilhados para física, estado do jogo e animações. | Interno. |

## Aplicativos

| Aplicativo | Descrição |
| ----- | ------------- |
| **SiegeGammon** | Jogo de estratégia "inverse-backgammon" — posicione, avance e bloqueie as peças na Zona de Cerco. |
| **Anim DevTools** | Extensão para o Chrome para inspecionar simulações de física e linhas do tempo de animação. |

## SiegeGammon

SiegeGammon inverte o jogo de backgammon: em vez de remover as peças do tabuleiro, os jogadores posicionam as peças da reserva em um tabuleiro vazio e competem para bloquear todas as 15 peças no território do oponente. A inversão espacial do tabuleiro — sua "Garrison" sobrepõe a "Zona de Cerco" do oponente — mantém o contato e a tensão elevados do primeiro ao último movimento.

## Motor de Física

Integração semi-implícita de Euler em um intervalo de tempo fixo de 60 Hz, a mesma abordagem usada pelo Box2D e Rapier. Detecção de colisão de círculos, AABB e SAT com resolução baseada em impulsos. Restrições resolvidas via Gauss-Seidel projetado. Os corpos ficam inativos quando estão parados. A renderização SVG usa atualizações de transformação imperativas (sem re-renderizações do React); o Canvas é usado como alternativa quando há mais de 200 corpos.

## Tecnologias Utilizadas

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** para aplicativos e builds de bibliotecas.
- **Turbo 2.4** para orquestração do monorepório.
- **Vitest 3** para testes.
- **React 19** + **GSAP 3** no aplicativo do jogo.

## Como Começar

```bash
pnpm install
pnpm dev
```

## Licença

[MIT](LICENSE)

---

Desenvolvido por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
