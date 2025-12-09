const term = require('terminal-kit').terminal;
const blessed = require('blessed');
const Player = require('./entities/Player');
const Enemy = require('./entities/Enemy');
const { render } = require('./engine/renderer');
const { setupInput, teardownInput } = require('./engine/input');
const { upgrades, rarityWeight } = require('./data/upgrades');
const { enemies } = require('./data/enemies');
const { levels } = require('./data/levels');
const { createWaveState, waveTick, waveDone } = require('./engine/spawner');

const width = 40;
const height = 18;
const MAX_SIMULTANEOUS_ENEMIES = 5;
const maxActiveEnemies = 5; // cap to prevent overwhelming swarms

const state = {
  width,
  height,
  player: new Player(5, 5),
  enemies: [],
  messages: ['Ready.'],
  menuOpen: false,
  levelIndex: 0,
  waveIndex: 0,
  waveState: null,
  tickCount: 0,
  levelComplete: false,
  totalLevels: levels.length,
  totalWaves: levels[0].waves.length,
  budgetRemaining: levels[0].budget,
};

let running = true;
let tickHandle = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnEnemy(type, levelScale = 0) {
  const template = enemies[type];
  if (!template) {
    state.messages.push(`Unknown enemy type: ${type}`);
    return false;
  }
  const alive = state.enemies.filter((e) => e.hp > 0).length;
  if (alive >= maxActiveEnemies) {
    return false; // do not overspawn; wait until space frees up
  }
  const cost = template.cost || 1;
  if (state.budgetRemaining - cost < 0) {
    state.messages.push('Spawn budget exhausted; skipping enemy.');
    return false;
  }
  state.budgetRemaining -= cost;

  let x = randInt(2, width - 3);
  let y = randInt(2, height - 3);
  if (x === state.player.x && y === state.player.y) {
    x = clamp(x + 2, 1, width - 2);
    y = clamp(y + 1, 1, height - 2);
  }
  const enemy = new Enemy(template, x, y, levelScale);
  state.enemies.push(enemy);
  return true;
}

function tryMove(dx, dy) {
  const nx = clamp(state.player.x + dx, 1, width - 2);
  const ny = clamp(state.player.y + dy, 1, height - 2);
  state.player.x = nx;
  state.player.y = ny;
}

function attack() {
  const now = Date.now();
  if (now - state.player.lastAttackAt < state.player.attackCooldownMs) {
    state.messages.push('Swing not ready.');
    return;
  }
  state.player.lastAttackAt = now;
  const targets = state.enemies.filter((e) => e.hp > 0 && Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) <= 1);
  if (targets.length === 0) {
    state.messages.push('Swing hits nothing.');
    return;
  }
  targets.forEach((enemy) => {
    enemy.hp -= state.player.weaponDamage;
  });
  state.messages.push('Pipeblade connects!');
}

function enemyAct(enemy) {
  if (enemy.hp <= 0) return;
  if (state.tickCount % enemy.moveCooldownTicks !== 0) return;
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - enemy.y;
  const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
  const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

  if (Math.abs(dx) > Math.abs(dy)) {
    enemy.x = clamp(enemy.x + stepX, 1, width - 2);
  } else {
    enemy.y = clamp(enemy.y + stepY, 1, height - 2);
  }

  const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
  if (dist === 0) {
    state.player.hp -= enemy.damage;
    state.messages.push('Enemy hits you!');
  }
}

function handleKey(name) {
  if (!running || state.menuOpen) return;

  switch (name) {
    case 'UP':
    case 'w':
      tryMove(0, -1);
      break;
    case 'DOWN':
    case 's':
      tryMove(0, 1);
      break;
    case 'LEFT':
    case 'a':
      tryMove(-1, 0);
      break;
    case 'RIGHT':
    case 'd':
      tryMove(1, 0);
      break;
    case ' ': // space
      attack();
      break;
    case 'q':
    case 'CTRL_C':
      exitGame('Quit.');
      return;
    default:
      break;
  }
}

function checkLevelAndWaveCompletion() {
  if (state.player.hp <= 0) {
    exitGame('You were defeated.');
    return true;
  }

  const alive = state.enemies.filter((e) => e.hp > 0);
  const currentLevel = levels[state.levelIndex];
  const waveFinished = state.waveState && waveDone(state.waveState);

  if (waveFinished && alive.length === 0 && !state.menuOpen) {
    if (state.waveIndex + 1 < currentLevel.waves.length) {
      state.waveIndex += 1;
      state.messages.push(`Starting wave ${state.waveIndex + 1}.`);
      state.waveState = createWaveState(currentLevel.waves[state.waveIndex]);
      state.totalWaves = currentLevel.waves.length;
    } else {
      state.levelComplete = true;
      openRewardMenu();
    }
  }
  return false;
}

function exitGame(message) {
  if (!running) return;
  running = false;
  clearInterval(tickHandle);
  teardownInput();
  state.messages.push(message);
  render({ ...state, totalLevels: levels.length, totalWaves: levels[state.levelIndex].waves.length });
  term.moveTo(1, height + 4, 'Press Enter to exit...');
  term.grabInput(false);
  term.on('key', (name) => {
    if (name === 'ENTER' || name === 'RETURN' || name === 'CTRL_C' || name === 'q') {
      term.clear();
      term.processExit();
    }
  });
}

function gameTick() {
  if (state.menuOpen) return;
  state.tickCount += 1;

  if (state.waveState) {
    waveTick(state.waveState, (type) => {
      const alive = state.enemies.filter((e) => e.hp > 0).length;
      if (alive >= MAX_SIMULTANEOUS_ENEMIES) return;
      spawnEnemy(type, state.levelIndex);
    });
  }

  state.enemies.forEach(enemyAct);
  const ended = checkLevelAndWaveCompletion();
  if (!ended) {
    render({ ...state, totalLevels: levels.length, totalWaves: levels[state.levelIndex].waves.length });
  }
}

function startTick() {
  tickHandle = setInterval(gameTick, 100);
}

function weightedSample(pool, count) {
  const result = [];
  const items = [...pool];
  while (result.length < count && items.length > 0) {
    const total = items.reduce((acc, u) => acc + (rarityWeight[u.rarity] || 1), 0);
    let roll = Math.random() * total;
    let chosenIndex = 0;
    for (let i = 0; i < items.length; i += 1) {
      roll -= (rarityWeight[items[i].rarity] || 1);
      if (roll <= 0) {
        chosenIndex = i;
        break;
      }
    }
    const [picked] = items.splice(chosenIndex, 1);
    result.push(picked);
  }
  return result;
}

function openRewardMenu() {
  state.menuOpen = true;
  clearInterval(tickHandle);
  teardownInput();
  term.fullscreen(false);
  term.clear();

  const options = weightedSample(upgrades, 3);
  const screen = blessed.screen({ smartCSR: true });
  const box = blessed.box({
    top: 'center',
    left: 'center',
    width: '70%',
    height: '60%',
    content: 'Rewards (press 1/2/3 to choose)\n',
    tags: false,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
    },
  });

  const lines = options.map((opt, idx) => `${idx + 1}. ${opt.name} [${opt.rarity}] — ${opt.description}`);
  box.setContent(`Rewards (press 1/2/3 to choose)\n\n${lines.join('\n')}`);
  screen.append(box);
  screen.render();

  function choose(index) {
    if (!options[index]) return;
    const chosen = options[index];
    chosen.apply(state.player);
    // Small heal between levels to smooth difficulty
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
    state.messages.push(`Picked ${chosen.name}.`);
    screen.destroy();
    resumeFromMenu();
  }

  screen.key(['1'], () => choose(0));
  screen.key(['2'], () => choose(1));
  screen.key(['3'], () => choose(2));
  screen.key(['q', 'escape', 'C-c'], () => {
    screen.destroy();
    resumeFromMenu();
  });
}

function resumeFromMenu() {
  term.fullscreen(true);
  setupInput(handleKey);
  state.menuOpen = false;
  state.levelIndex = (state.levelIndex + 1) % levels.length;
  state.waveIndex = 0;
  const level = levels[state.levelIndex];
  state.enemies = [];
  state.levelComplete = false;
  state.waveState = createWaveState(level.waves[state.waveIndex]);
  state.totalWaves = level.waves.length;
  state.budgetRemaining = level.budget;
  state.messages.push(`Starting level ${state.levelIndex + 1}: ${level.name}`);
  render({ ...state, totalLevels: levels.length, totalWaves: level.waves.length });
  startTick();
}

function start() {
  term.fullscreen(true);
  setupInput(handleKey);
  const level = levels[state.levelIndex];
  state.waveState = createWaveState(level.waves[state.waveIndex]);
  state.totalWaves = level.waves.length;
  state.budgetRemaining = level.budget;
  state.messages.push(`Starting level ${state.levelIndex + 1}: ${level.name}`);
  render({ ...state, totalLevels: levels.length, totalWaves: level.waves.length });
  startTick();
}

start();
