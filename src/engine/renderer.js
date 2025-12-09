const term = require('terminal-kit').terminal;

function render(state) {
  const { width, height, player, enemies, messages } = state;
  term.clear();

  const grid = [];
  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      // Border walls around the arena
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('#');
      } else {
        row.push(' ');
      }
    }
    grid.push(row);
  }

  // Place entities
  grid[player.y][player.x] = player.char;
  enemies.forEach((enemy) => {
    if (enemy.hp > 0) {
      grid[enemy.y][enemy.x] = enemy.char;
    }
  });

  // Draw grid
  for (let y = 0; y < height; y += 1) {
    term.moveTo(1, y + 1, grid[y].join(''));
  }

  // HUD
  const aliveEnemies = enemies.filter(e => e.hp > 0).length;
  term.moveTo(1, height + 1, `HP: ${player.hp}/${player.maxHp}  DMG: ${player.weaponDamage}  ATK CD: ${player.attackCooldownMs}ms  Enemies: ${aliveEnemies}`);
  term.moveTo(1, height + 2, `Level: ${state.levelIndex + 1}/${state.totalLevels}  Wave: ${state.waveIndex + 1}/${state.totalWaves}`);
  term.moveTo(1, height + 3, 'Move: WASD/Arrows  Attack: Space  Quit: q or Ctrl+C');

  // Messages
  const lastMessage = messages[messages.length - 1] || '';
  term.moveTo(1, height + 4, `Log: ${lastMessage}`);
}

module.exports = { render };
