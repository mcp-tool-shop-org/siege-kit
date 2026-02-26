<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/siege-kit/readme.png" alt="Siege Kit" width="400">
</p>

<p align="center">
  <a href="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/siege-kit" alt="License"></a>
  <a href="https://mcp-tool-shop-org.github.io/siege-kit/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

Un conjunto de herramientas para un juego de mesa centrado en la física. Motor de física 2D determinista con renderizado SVG, un juego de estrategia completo (SiegeGammon) y una extensión para Chrome DevTools para depurar animaciones, todo en un monorepositorio Turborepo.

## Paquetes

| Paquete | Descripción | Estado |
| --------- | ------------- | -------- |
| **@mcptoolshop/physics-svg** | Motor de física 2D con renderizadores SVG y Canvas. | Publicado en npm. |
| **@mcp-tool-shop/siege-types** | Tipos TypeScript compartidos para física, estado del juego y animaciones. | Interno. |

## Aplicaciones

| Aplicación | Descripción |
| ----- | ------------- |
| **SiegeGammon** | Juego de estrategia "al revés" del backgammon: en lugar de retirar las fichas, los jugadores las colocan desde la reserva en un tablero vacío y compiten para bloquear todas las 15 fichas en el territorio del oponente. La inversión espacial del tablero, donde tu "Garrison" se superpone a la "Zona de Asedio" del oponente, mantiene la tensión alta desde el primer movimiento hasta el último. |
| **Anim DevTools** | Extensión de Chrome para inspeccionar simulaciones de física y líneas de tiempo de animación. |

## SiegeGammon

SiegeGammon invierte el backgammon: en lugar de retirar las fichas, los jugadores las despliegan desde la reserva en un tablero vacío y compiten para bloquear las 15 fichas en el territorio del oponente. La inversión espacial del tablero, donde tu "Garrison" se superpone a la "Zona de Asedio" del oponente, mantiene la tensión alta desde el primer movimiento hasta el último.

## Motor de Física

Integración semi-implícita de Euler a un intervalo fijo de 60 Hz, el mismo enfoque utilizado por Box2D y Rapier. Detección de colisiones de círculos, AABB y SAT con resolución basada en impulsos. Las restricciones se resuelven mediante Gauss-Seidel proyectado. Los cuerpos se "duermen" cuando están en reposo. El renderizado SVG utiliza actualizaciones de transformaciones imperativas (sin re-renderizados de React); el renderizado con Canvas se activa como alternativa cuando hay 200 o más cuerpos.

## Pila Tecnológica

- **TypeScript 5.7** / **Node 22+** / **pnpm 10**
- **Vite 6** para la construcción de aplicaciones y bibliotecas.
- **Turbo 2.4** para la orquestación del monorepositorio.
- **Vitest 3** para pruebas.
- **React 19** + **GSAP 3** en la aplicación del juego.

## Cómo Empezar

```bash
pnpm install
pnpm dev
```

## Licencia

[MIT](LICENSE)

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
