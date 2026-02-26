<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

Une boîte à outils pour jeux de société axée sur la physique. Moteur de physique 2D déterministe avec rendu SVG, un jeu de stratégie complet (SiegeGammon), et une extension Chrome DevTools pour le débogage des animations, le tout dans un dépôt monorepo Turborepo.

## Paquets

| Paquet | Description | Statut |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | Moteur de physique 2D déterministe avec des rendus SVG et Canvas. | Publié sur npm. |
| **@mcp-tool-shop/siege-types** | Types TypeScript partagés pour la physique, l'état du jeu et les animations. | Interne. |

## Applications

| Application | Description |
| ----- | ------------- |
| **SiegeGammon** | Jeu de stratégie inversé du backgammon : déployez, avancez et bloquez les pions dans la zone de siège. |
| **Anim DevTools** | Extension Chrome pour inspecter les simulations physiques et les chronologies des animations. |

## SiegeGammon

SiegeGammon inverse le backgammon : au lieu de retirer les pions, les joueurs les déploient depuis la réserve sur un plateau vide et courent pour bloquer les 15 pions dans le territoire de l'adversaire. L'inversion spatiale du plateau – votre garnison chevauche la zone de siège de l'adversaire – maintient un contact et une tension élevés du premier au dernier coup.

## Moteur de physique

Intégration semi-implicite d'Euler à un pas de temps fixe de 60 Hz, la même approche utilisée par Box2D et Rapier. Détection de collisions de cercle, AABB et SAT avec résolution basée sur l'impulsion. Les contraintes sont résolues via la méthode de Gauss-Seidel projetée. Les corps s'endorment lorsqu'ils sont immobiles. Le rendu SVG utilise des mises à jour de transformations impératives (zéro rendu React) ; un rendu Canvas de secours est utilisé lorsque le nombre de corps dépasse 200.

## Pile technologique

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** pour les applications et les bibliothèques.
- **Turbo 2.4** pour l'orchestration du dépôt monorepo.
- **Vitest 3** pour les tests.
- **React 19** + **GSAP 3** dans l'application de jeu.

## Premiers pas

```bash
pnpm install
pnpm dev
```

## Licence

[MIT](LICENSE)

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
