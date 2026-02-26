<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

一个以物理为基础的棋盘游戏工具包。包含一个确定性的2D物理引擎，使用SVG进行渲染，一个完整的策略棋盘游戏（SiegeGammon），以及一个Chrome DevTools扩展程序，用于调试动画——所有这些都集成在一个Turborepo单仓库项目中。

## 包

| 包 | 描述 | 状态 |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | 具有SVG和Canvas渲染器的确定性2D物理引擎。 | 已发布到npm |
| **@mcp-tool-shop/siege-types** | 用于物理、游戏状态和动画的共享TypeScript类型。 | 内部 |

## 应用程序

| 应用程序 | 描述 |
| ----- | ------------- |
| **SiegeGammon** | 一种反向跳棋策略游戏——部署棋子，推进棋子，并将棋子锁定在“围攻区”。 |
| **Anim DevTools** | 一个Chrome扩展程序，用于检查物理模拟和动画时间线。 |

## SiegeGammon

SiegeGammon颠覆了传统的跳棋：玩家不再是将棋子移出棋盘，而是从储备区将棋子部署到空白的棋盘上，并争夺将所有15个棋子锁定在对手的家区。棋盘的空间反转——你的“驻防区”与对手的“围攻区”重叠——使得从第一步到最后一步，始终保持紧张和刺激。

## 物理引擎

采用固定60Hz时间步长的半隐式欧拉积分法，与Box2D和Rapier采用的方法相同。圆形、AABB和SAT碰撞检测，并使用基于冲量的解决方案。约束通过投影高斯-赛德尔法求解。静止的物体会进入休眠状态。SVG渲染使用强制转换更新（零React重新渲染）；当物体数量超过200个时，Canvas会作为备用方案。

## 技术栈

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** 用于应用程序和库的构建
- **Turbo 2.4** 用于单仓库项目的管理
- **Vitest 3** 用于测试
- **React 19** + **GSAP 3** 用于游戏应用程序

## 入门

```bash
pnpm install
pnpm dev
```

## 许可证

[MIT](LICENSE)

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建。
