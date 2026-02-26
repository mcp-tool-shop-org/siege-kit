<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

物理演算を重視したボードゲーム開発ツールキット。SVGレンダリングを搭載した決定論的な2次元物理エンジン、完全な戦略ボードゲーム（SiegeGammon）、アニメーションのデバッグのためのChrome DevTools拡張機能など、すべてTurborepoによるモノレポで構成されています。

## パッケージ

| パッケージ | 説明 | ステータス |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | SVGとCanvasレンダラーを搭載した決定論的な2次元物理エンジン | npmで公開済み |
| **@mcp-tool-shop/siege-types** | 物理演算、ゲームの状態、アニメーションに関する共通のTypeScript型 | 内部利用 |

## アプリケーション

| アプリケーション | 説明 |
| ----- | ------------- |
| **SiegeGammon** | バックギャモンを逆転させた戦略ゲーム。プレイヤーは駒を配置し、前進させ、Siege Zoneに駒を固定します。 |
| **Anim DevTools** | 物理シミュレーションとアニメーションのタイムラインを検査するためのChrome拡張機能。 |

## SiegeGammon

SiegeGammonはバックギャモンを逆転させたゲームです。駒を盤面から取り除く代わりに、プレイヤーは駒を予備から取り出し、空の盤面に配置し、相手のホームテリトリーにすべての駒を固定するレースを行います。盤面の空間的な逆転により（あなたのGarrisonが相手のSiege Zoneと重なる）、常に緊張感が高く、最初の一手から最後まで目が離せません。

## 物理エンジン

Box2DやRapierで使用されているのと同じ、固定された60Hzのタイムステップでの準陰関数オイラー積分。円、AABB、SATによる衝突検出、およびインパルスベースの衝突解決。制約は、投影されたガウス・ザイデル法で解決されます。静止したオブジェクトはスリープ状態になります。SVGレンダリングでは、命令型の変換更新を使用し（Reactのリレンダリングはゼロ）、200体以上のオブジェクトの場合にCanvasへのフォールバックを行います。

## 技術スタック

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- アプリケーションとライブラリのビルドに**Vite 6**を使用
- モノレポのオーケストレーションに**Turbo 2.4**を使用
- テストに**Vitest 3**を使用
- ゲームアプリケーションには**React 19**と**GSAP 3**を使用

## 始め方

```bash
pnpm install
pnpm dev
```

## ライセンス

[MIT](LICENSE)

---

<a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>によって作成されました。
