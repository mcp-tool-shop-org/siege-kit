<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

Un kit di strumenti per giochi da tavolo incentrato sulla fisica. Motore fisico 2D deterministico con rendering SVG, un gioco da tavolo strategico completo (SiegeGammon) e un'estensione per Chrome DevTools per il debug delle animazioni, il tutto in un monorepo Turborepo.

## Pacchetti

| Pacchetto | Descrizione | Stato |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | Motore fisico 2D con rendering SVG e Canvas. | Pubblicato su npm. |
| **@mcp-tool-shop/siege-types** | Tipi TypeScript condivisi per la fisica, lo stato del gioco e le animazioni. | Interno. |

## Applicazioni

| Applicazione | Descrizione |
| ----- | ------------- |
| **SiegeGammon** | Gioco di strategia "inverse-backgammon": i giocatori schierano le pedine dalla riserva su una tavola vuota e corrono per bloccare tutte le 15 pedine nel territorio avversario. L'inversione spaziale della tavola (la tua "Garrison" sovrappone la "Siege Zone" dell'avversario) mantiene alta la tensione dall'inizio alla fine. |
| **Anim DevTools** | Estensione per Chrome per l'analisi delle simulazioni fisiche e delle sequenze di animazione. |

## SiegeGammon

SiegeGammon ribalta il backgammon: invece di togliere le pedine, i giocatori le schierano dalla riserva su una tavola vuota e corrono per bloccare tutte le 15 pedine nel territorio avversario. L'inversione spaziale della tavola – la tua "Garrison" sovrappone la "Siege Zone" dell'avversario – mantiene alta la tensione dall'inizio alla fine.

## Motore Fisico

Integrazione semi-implicita di Eulero a un intervallo fisso di 60 Hz, lo stesso approccio utilizzato da Box2D e Rapier. Rilevamento delle collisioni di cerchi, AABB e SAT con risoluzione basata sull'impulso. Vincoli risolti tramite Gauss-Seidel proiettato. I corpi diventano inattivi quando sono fermi. Il rendering SVG utilizza aggiornamenti di trasformazione imperativi (nessun re-rendering di React); il rendering Canvas di fallback viene utilizzato con più di 200 corpi.

## Tecnologie Utilizzate

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** per la creazione di applicazioni e librerie.
- **Turbo 2.4** per l'organizzazione del monorepo.
- **Vitest 3** per i test.
- **React 19** + **GSAP 3** nell'applicazione di gioco.

## Come Iniziare

```bash
pnpm install
pnpm dev
```

## Licenza

[MIT](LICENSE)

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
