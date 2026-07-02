# Lead Wars — Development Plan

> **Mechanic:** Turn-based pencil-and-paper war sim. Each turn a unit gets a
> **Move** and/or a **Shot** budget. Touch-hold a unit → drag away to set a
> path within its radius ring → release to confirm → animate. Same
> drag-to-set / release-to-confirm gesture drives both movement and firing.
> A hit resolves with a **"BOOM!!!"** banner. See `LEAD_WARS_REFERENCE.md`
> for the full mechanic breakdown this plan is built from.

---

## Stack

- **Vite** — dev server + build, outputs static `dist/` (HTML/CSS/JS).
- **Vanilla JS/TS** — no game framework dependency; canvas rendering, hand-rolled game loop.
- **Capacitor** — wraps the built web app for Android/iOS when we're ready to port; added in a later session, doesn't affect earlier work.
- **GitHub Pages** — hosts the web build (`vite build` → `dist/` → deployed via GitHub Actions). `base` in `vite.config.js` set to `/pen-flick/` for the project-page subpath.

## Architecture Principles

- **Data-driven maps** — each map is a JSON file (`src/maps/*.json`) describing terrain, obstacles, and unit spawn points. Adding a map means adding a JSON + art assets, not touching game code.
- **Object registry** — units/obstacles are defined by a type registry (`src/entities/`), so adding a new unit type (e.g. artillery, bunker) is a new entity file + registry entry, not a rewrite of move/shot logic.
- **Logic/render split** — game rules live in `src/systems/` (move, shot, turns, AI) and know nothing about canvas; `src/render/` draws whatever state the systems produce. Keeps the door open for swapping the renderer (e.g. different mobile resolution handling) without touching rules.
- **Input abstraction** — `src/core/InputManager.ts` normalizes mouse + touch (Pointer Events) from day one, since touch is the primary target (tablet/phone) and mouse is just for dev.
- **Networking abstraction** — turns are driven through a `Player` interface (`src/net/`) with a `LocalPlayer` (hot-seat/CPU) implementation now and a `NetworkPlayer` implementation later. Game systems call the interface, not a specific transport, so multiplayer slots in without a rules rewrite.
- **Mobile-ready from the start** — no browser-only APIs assumed (e.g. avoid `alert`/`prompt`, keep everything touch-driven); Capacitor wrap in Session 8 should require no gameplay code changes, only native shell config.

## Project Structure

```
pen-flick/
├── index.html
├── vite.config.js
├── package.json
├── .github/workflows/deploy.yml   # build + deploy to GitHub Pages
├── src/
│   ├── main.ts                    # entry: mounts canvas, starts game loop
│   ├── core/
│   │   ├── GameLoop.ts
│   │   ├── SceneManager.ts
│   │   ├── InputManager.ts        # unified pointer/touch handling
│   │   └── AssetLoader.ts
│   ├── scenes/
│   │   ├── MenuScene.ts
│   │   ├── MapScene.ts            # generic: loads a map JSON + runs a match
│   │   └── GameOverScene.ts
│   ├── entities/
│   │   ├── Unit.ts                # base class
│   │   ├── Tank.ts
│   │   ├── Plane.ts
│   │   └── registry.ts            # type name -> constructor
│   ├── systems/
│   │   ├── MoveSystem.ts
│   │   ├── ShotSystem.ts
│   │   ├── TurnManager.ts
│   │   └── AIController.ts
│   ├── net/
│   │   ├── Player.ts              # interface
│   │   ├── LocalPlayer.ts
│   │   └── NetworkPlayer.ts       # stub until multiplayer session
│   ├── maps/
│   │   ├── map-01.json
│   │   └── map-02.json
│   ├── render/
│   │   ├── MapRenderer.ts
│   │   ├── UnitRenderer.ts
│   │   └── style.ts               # sketch/hand-drawn style constants
│   ├── ui/
│   │   ├── HUD.ts
│   │   └── hud.css
│   └── assets/
│       ├── sprites/
│       └── sounds/
└── PLAN.md
```

---

## Progress

| # | Session | Focus | Status |
|---|---|---|---|
| 0 | Project Scaffolding | Vite + TS project, folder structure, GitHub Pages deploy | ✅ Done |
| 1 | Static Scene | Map renderer, HUD shell, unit sprites, first map JSON | ✅ Done |
| 2 | Unit Selection & Radius Ring | Touch-hold to select, draw range circle | ⬜ Next |
| 3 | Move Mechanic | Drag-to-path, path preview, animate move, budget decrement | ⬜ |
| 4 | Shot Mechanic | Aim drag, fire on release, line-of-fire resolve, BOOM effect | ⬜ |
| 5 | Turn System | Move/Shot budget per unit, End Turn, player↔opponent switch | ⬜ |
| 6 | Opponent AI | Basic CPU: pick unit, move toward/away, fire at nearest target | ⬜ |
| 7 | Win/Lose & Polish | Unit-loss tally, game-over state, hit flash, sound | ⬜ |
| 8 | Mobile Port | Capacitor wrap, Android/iOS build config, touch QA | ⬜ |
| 9 | Multiplayer | `NetworkPlayer` implementation, matchmaking/sync | ⬜ |

---

## Session Details

### ⬜ Session 0 — Project Scaffolding
- `npm create vite@latest` (vanilla-ts template), set up folder structure above.
- `vite.config.js` with `base: '/pen-flick/'` for GitHub Pages.
- GitHub Actions workflow: build on push to main/deploy branch → publish `dist/` to `gh-pages`.
- Empty `Player` interface, `SceneManager`, `GameLoop` wired to a blank canvas as a smoke test.

### ⬜ Session 1 — Static Scene
- `MapRenderer` reads a map JSON (terrain shapes, obstacles, spawn points) and draws the hand-drawn-style scene: sketchy roads/rivers, cross-hatched buildings, scribble-shaded hedges/trees, wood-grain desk background.
- `map-01.json` as the first map; place starting units (tanks, planes) for two sides per spawn points.
- HUD shell: `Pause`, `Moves` / `Shots` counters, player/army name label, unit-loss tally strip — wired up but not yet driven by game state.

### ⬜ Session 2 — Unit Selection & Radius Ring
- `InputManager` hit-tests pointer/touch against unit entities.
- Touch-and-hold a unit → `MoveSystem`/`ShotSystem` (whichever is active) reports a range → renderer draws dashed radius ring.
- Status bar text swaps contextually: `"Hold unit to fire weapon"` vs. move-hold state, based on remaining Shots/Moves.

### ⬜ Session 3 — Move Mechanic
- On hold+drag: `MoveSystem` computes a path clamped to the radius ring; renderer draws the path line/arrow.
- Status bar: `"Drag pencil away to set path"` → on release `"Path set, ready to move"`.
- Confirm → `"Move in progress…"` → animate unit along the path.
- Decrement `Moves` on the unit; disallow further move once budget hits 0.

### ⬜ Session 4 — Shot Mechanic
- Same gesture, `ShotSystem` in fire mode: `"Hold unit to fire weapon"` → `"Path set, ready to fire"`.
- On release: resolve trajectory against enemy unit bounding boxes.
- Hit → `"BOOM!!!"` banner + hit flash/particle, damage/remove target via `entities/registry.ts` type stats.
- Miss → line fades as a faint mark on the map (paper-ink persistence).
- Decrement `Shots`.

### ⬜ Session 5 — Turn System
- `TurnManager` tracks per-unit Move/Shot remaining; HUD counters reflect the selected unit.
- `End Turn` → reset budgets for the next `Player`, switch active player via the `Player` interface, clear selection.
- State machine: `player_turn (select → act → …) → end_turn → opponent_turn → end_turn → …`.

### ⬜ Session 6 — Opponent AI
- `AIController` implements the same `Player` interface as `LocalPlayer`: picks a unit with budget, chooses move (advance/flank) or shot (nearest/weakest target in range).
- Small delay before each AI action for readability.
- Reuses `MoveSystem`/`ShotSystem` — no special-cased AI physics.

### ⬜ Session 7 — Win/Lose & Polish
- Unit-loss tally strip updates live from entity state.
- Win when one side's units are all destroyed → game-over overlay + restart.
- Hit flash, Web Audio synthesized sounds (skid/flick, whoosh, boom).

### ⬜ Session 8 — Mobile Port
- Add Capacitor, `npx cap add android` / `npx cap add ios`.
- Verify touch-only input path (already unified in `InputManager` since Session 0), safe-area/viewport handling, asset loading from bundled `dist/`.
- No gameplay code changes expected — this session is native shell + build config + device QA.

### ⬜ Session 9 — Multiplayer
- Implement `NetworkPlayer` (transport TBD — WebSocket relay is the likely default) satisfying the same `Player` interface.
- Sync map state / turn actions between two `NetworkPlayer` instances; reconcile with the reference video's two-device synced-map scene.

---

## Resume
Top of `src/main.ts` will contain a `// RESUME: Session N — ...` comment
with the exact next step, once Session 0 lands. Read that line to pick up
after any interruption.
