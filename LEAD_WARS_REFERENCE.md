# Lead Wars — Reference Notes

> Notes from a promo video (`FSave_Reels_WisefoolElliotonReels_Media_304926159011372_001_720p.mp4`,
> ~54s, by Demon Studios) documenting **Lead Wars**, a pencil-and-paper war game and its
> digital sim. Captured here as inspiration/reference for Pen Flick — several mechanics
> overlap (drag-to-aim, ink marks left on paper).

## Tagline
> "Lead Wars is a sim of a REAL LIFE pencil & paper war game"

## Real-life mechanic (the paper game it's based on)
1. Hold the pencil with your index finger, pressing down firmly.
2. Tilt the pencil beyond its **"skid threshold"** — past this angle it suddenly
   slips and shoots away across the paper.
3. That flick leaves **a line drawn on the paper**. The line's length/direction
   determines whether it counts as your **Move** or your **Shot** for the turn.

## Digital sim — core loop
Units (tanks, planes) sit on a hand-drawn-style map (roads, rivers, hedges,
trees/bushes, buildings). Each turn a unit has a budget shown top-right:
`N Moves` / `N Shots`.

### Moving a unit
1. Touch and hold a unit → a **radius circle** appears around it (max move range).
2. Drag away from the unit → status bar reads **"Drag pencil away to set path"**,
   a line/arrow is drawn from the unit toward the drag point.
3. Release → **"Path set, ready to move"** → tap/confirm → **"Move in progress…"**
   while the unit animates along the path. Remaining `Moves` counter decrements.

### Firing a weapon
1. Touch and hold a unit → status bar reads **"Hold unit to fire weapon"**, radius
   ring shown again (this time representing range/arc, not move distance).
2. Drag to aim → **"Path set, ready to fire"**.
3. Release/confirm → shot resolves → **"BOOM!!!"** banner + hit effect on impact.
   Remaining `Shots` counter decrements.

### Turn structure
- HUD: player/army name (e.g. "DemonJim" / "Demon Studios"), remaining
  `Moves` and `Shots` counters top-right, a `Pause` (`II`) button top-left,
  an **"End Turn"** button to pass to the opponent.
- Small unit-count tally along the bottom (tanks / planes, "x0", "x1", etc.)
  tracking losses.

### Multiplayer
- Final shot shows **two devices (iPad + iPhone) displaying the same
  synced map** side by side — implying an online/pass-and-play multiplayer
  mode where both players see live board state.

## Visual style
- Hand-drawn / sketchbook aesthetic: pencil-outline roads, scribble-shaded
  trees and hedgerows, cross-hatched buildings, simple icon-style tanks and
  planes (side/top-down silhouettes).
- Background is a wood-grain desk texture — reinforces the "real paper on a
  table" framing even in the digital sim.
- Radius/aim indicators are dashed circles with a directional arrow, drawn
  in the same sketchy ink style as the map.

## Mechanics relevant to Pen Flick
- **Drag-to-aim, release-to-fire** is the same base interaction as Pen
  Flick's slingshot drag (`PLAN.md` Session 3).
- **Marks/lines persisting on the paper** after a shot mirrors Pen Flick's
  `marks[]` faint-ink-line system (Session 4).
- Lead Wars adds on top: per-turn **Move vs. Shot budget**, a **range-limited
  radius** for both movement and firing, and a **hit banner ("BOOM!!!")**
  Pen Flick could borrow for its own Session 7 hit-flash/polish pass.
