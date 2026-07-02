# Lead Wars — Development Plan

> **Mechanic:** Turn-based pencil-and-paper war sim. Each turn a unit gets a
> **Move** and/or a **Shot** budget. Touch-hold a unit → drag away to set a
> path within its radius ring → release to confirm → animate. Same
> drag-to-set / release-to-confirm gesture drives both movement and firing.
> A hit resolves with a **"BOOM!!!"** banner. See `LEAD_WARS_REFERENCE.md`
> for the full mechanic breakdown this plan is built from.

---

## Progress

| # | Session | Focus | Status |
|---|---|---|---|
| 1 | Static Scene | Hand-drawn map canvas, HUD shell, unit sprites | ⬜ Next |
| 2 | Unit Selection & Radius Ring | Touch-hold to select, draw range circle | ⬜ |
| 3 | Move Mechanic | Drag-to-path, path preview, animate move, budget decrement | ⬜ |
| 4 | Shot Mechanic | Aim drag, fire on release, line-of-fire resolve, BOOM effect | ⬜ |
| 5 | Turn System | Move/Shot budget per unit, End Turn, player↔opponent switch | ⬜ |
| 6 | Opponent AI | Basic CPU: pick unit, move toward/away, fire at nearest target | ⬜ |
| 7 | Win/Lose & Polish | Unit-loss tally, game-over state, hit flash, sound | ⬜ |

---

## Session Details

### ⬜ Session 1 — Static Scene
- Single `index.html` + `<canvas>`, `requestAnimationFrame` loop (same pattern as prior Pen Flick prototype).
- Hand-drawn-style map: sketchy roads/rivers, cross-hatched buildings, scribble-shaded hedges/trees, wood-grain desk background.
- Place starting units (tanks, planes) for two sides on opposite ends of the map.
- HUD shell: `Pause` (top-left `II`), `Moves` / `Shots` counters (top-right), player/army name label, unit-loss tally strip (bottom) — wired up but not yet driven by game state.

### ⬜ Session 2 — Unit Selection & Radius Ring
- Hit-test touch/click against unit sprites.
- Touch-and-hold a unit → draw dashed radius ring around it (range for the pending action).
- Status bar text swaps contextually: `"Hold unit to fire weapon"` vs. default hold state for movement, based on whether Shots or Moves remain.

### ⬜ Session 3 — Move Mechanic
- On hold+drag from a selected unit: draw a path line/arrow from unit to drag point, clamped to the radius ring.
- Status bar: `"Drag pencil away to set path"` → on release `"Path set, ready to move"`.
- Confirm (tap again / auto-confirm) → `"Move in progress…"` → animate unit along the path over N frames.
- Decrement `Moves` counter; disallow further move once budget hits 0.

### ⬜ Session 4 — Shot Mechanic
- Same hold+drag gesture, but when in "fire" mode: status bar `"Hold unit to fire weapon"` → `"Path set, ready to fire"`.
- On release: resolve trajectory (straight line from unit through aim point to max range) against enemy unit bounding boxes.
- Hit → `"BOOM!!!"` banner + hit flash/particle at impact point, remove or damage target unit.
- Miss → line fades as a faint mark (paper-ink persistence, echoing the real-life pencil-skid mechanic).
- Decrement `Shots` counter.

### ⬜ Session 5 — Turn System
- Each unit tracks its own remaining Move/Shot for the turn; HUD counters reflect the *currently selected* unit.
- `End Turn` button → reset budgets for the next side, switch active player, clear selection.
- Simple state machine: `player_turn (select → act → …) → end_turn → opponent_turn → end_turn → …`.

### ⬜ Session 6 — Opponent AI
- On opponent's turn: pick a unit with remaining budget, choose a move (advance/flank) or a shot (target nearest/weakest enemy in range).
- Small delay before each AI action so moves are readable.
- Reuse the same path/aim/resolve code paths as the player (no special-cased AI physics).

### ⬜ Session 7 — Win/Lose & Polish
- Track unit counts per side (tally strip updates live: `tank x2`, `plane x1`, etc.).
- Win when one side's units all destroyed → game-over overlay + restart.
- Hit flash (target briefly reddens/wobbles), Web Audio synthesized sounds (skid/flick, whoosh, boom).
- Optional stretch: online/pass-and-play multiplayer sync (seen in the reference video's two-device shot) — out of scope until core loop is solid.

---

## Open Questions
- Single-file `index.html` + vanilla JS/canvas (matches prior prototype's stack), unless you'd rather bring in a framework or dedicated renderer.
- Local hot-seat 2-player vs. CPU opponent first — plan defaults to CPU (Session 6) since it's testable solo; hot-seat can slot in as a toggle later.

## Resume
Top of `index.html` will contain a `<!-- RESUME: Session N — ... -->` comment
with the exact next step, once Session 1 lands. Read that line to pick up
after any interruption.
