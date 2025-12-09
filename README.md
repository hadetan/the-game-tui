# The Cleaner’s March (Terminal Prototype)

Terminal-based real-time tactical roguelite prototype. Added a pick-3 reward menu (Blessed) after each wave, with upgrades that immediately affect player stats.

## Run
```bash
npm install
npm start
```

## Controls
- Move: WASD or Arrow keys
- Attack: Space
- Quit: q or Ctrl+C
- Pause: p

## features
- Pick-3 reward menu (Blessed) after clearing a level.
- Weighted rarity pool (common/uncommon/rare) with soft guarantees.
- Personalized upgrade weighting using playstyle stats (damage dealt, damage taken).
- Upgrades adjust stats live (damage, attack cooldown, HP).
- Scripted acts and levels (4 acts, 12 levels) with staggered waves and difficulty budgets.
- Boss fights each act with simple AoE pulse mechanics; spawn cap to prevent swarms.
- Bosses with health bar.
- Pause/options menu (sound toggle placeholder, high-contrast theme, attack key remap) — press `p` in-game.
- Quick-save/load from pause menu writes `savegame.json`.
- Difficulty modes via `--difficulty=easy|normal|hard` (or `DIFFICULTY` env) scaling enemy HP/damage.
- Telemetry logged to `telemetry.json` (death counts per level, upgrade picks per category) for balancing.
