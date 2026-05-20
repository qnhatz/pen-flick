# Pen Flick — Development Plan

> **Mechanic:** Straight line-shot (not arc physics) — drag to aim, release to fire an
> animated ink line across the notebook. If it crosses the opponent's figure, it's a hit.
> Lines stay on the paper as marks, just like the real classroom game.

---

## Progress

| # | Session | Focus | Status |
|---|---|---|---|
| 1 | Static Scene | Notebook canvas, spiral binding, stick figures, HUD shell | ✅ Done |
| 2 | Pen Physics | Arc physics built — superseded by line-shot pivot | ✅ Done (replaced in S4) |
| 3 | Drag Input & Aim | Slingshot drag, rubber-band line, trajectory preview, touch support | ✅ Done |
| 4 | Line-Shot Mechanic | Replace arc physics with animated straight ink line + paper marks | ✅ Done |
| 5 | Hit Detection & Turns | Line-rect intersection, lives system, state machine, win/lose | ✅ Done |
| 6 | CPU AI | Angle calculation + random spread, difficulty levels | ⬜ Next |
| 7 | Polish & Feel | Hit flash, ink splatter, Web Audio sounds, personality messages | ⬜ |

---

## Session Details

### ✅ Session 1 — Static Scene
- HTML + canvas setup, `requestAnimationFrame` game loop
- Notebook paper: ruled lines, red margin, spiral binding rings
- Ground surface, two ink-style stick figures (YOU / CPU), labels
- HUD: lives row + status bar (wired up, not yet driven)

### ✅ Session 2 — Pen Physics *(superseded)*
- Pen visual: cap, barrel, grip ridges, ink tube, metallic tip
- Physics: gravity, ground bounce with damping, spin decay
- `createPen / stepPen / drawPen` — will be removed in Session 4
- Test auto-launch (already removed in Session 3)

### ✅ Session 3 — Drag Input & Aim
- Click/touch near YOUR figure (grab cursor within 55 px) to start drag
- Rubber-band red dashed line from figure to cursor — thickens with power
- Blue dotted arc trajectory preview *(becomes straight line in Session 4)*
- `Power: N%` shown in status bar while dragging
- `launchFromDrag()` fires pen on mouse/touch release

### ✅ Session 4 — Line-Shot Mechanic
- Remove `createPen / stepPen / drawPen` and arc physics constants
- Add `Shot { x1, y1, x2, y2, progress, done }` object
- `stepShot()` advances progress 0→1 over ~18 frames
- `drawShot()` renders bold ink stroke to current progress point
- Trajectory preview → faint straight line (no more arc)
- `marks[]` array — finished shots persist as faint ink lines on paper
- `onShotDone()` stub for game logic (replaces `onPenSettled`)

### ⬜ Session 5 — Hit Detection & Turn System
- Line-segment vs bounding-box intersection (checked when line reaches opponent x)
- Lives system (3 each), HUD hearts update on hit
- State machine: `player_aim → shot_flying → cpu_turn → shot_flying → …`
- Win/lose detection → game-over overlay + restart button

### ⬜ Session 6 — CPU AI
- Angle from CPU figure center → player figure center
- Random angular spread (easy = wide, hard = tight)
- ~700 ms delay before CPU fires (gives time to react)
- Optional: Easy / Medium / Hard toggle

### ⬜ Session 7 — Polish & Feel
- Hit flash: target figure turns red briefly + wobble
- Ink splatter particle burst at hit point
- Web Audio API sounds (synthesized — no external files): whoosh on shot, thud on hit
- Status bar personality messages ("Nice shot!", "That was close…")
- Optional: 2-player local mode (same device, alternate turns)

---

## Branch
`claude/pen-flick-game-LdQ7d` — all development happens here.

## Resume
Top of `index.html` always contains a `<!-- RESUME: Session N — ... -->` comment
with the exact next step. Read that line to pick up after any interruption.
