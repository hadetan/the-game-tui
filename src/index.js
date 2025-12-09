const term = require('terminal-kit').terminal;
const blessed = require('blessed');
const Player = require('./entities/Player');
const Enemy = require('./entities/Enemy');
const { render } = require('./engine/renderer');
const { setupInput, teardownInput } = require('./engine/input');
const { upgrades, rarityWeight } = require('./data/upgrades');

const width = 40;
const height = 18;

const state = {
  width,
  height,
  player: new Player(5, 5),
  enemies: [],
  messages: ['Ready.'],
  wave: 1,
  menuOpen: false,
};

let running = true;
let tickHandle = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnEnemy(strength = 0) {
  let x = randInt(2, width - 3);
  let y = randInt(2, height - 3);
  if (x === state.player.x && y === state.player.y) {
    x = clamp(x + 2, 1, width - 2);
    y = clamp(y + 1, 1, height - 2);
  }
  const enemy = new Enemy(x, y);
  enemy.hp += strength;
  enemy.damage += Math.floor(strength / 2);
  state.enemies.push(enemy);
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

function checkEndConditions() {
  if (state.player.hp <= 0) {
    exitGame('You were defeated.');
    return;
  }
  const alive = state.enemies.filter((e) => e.hp > 0);
  if (alive.length === 0 && !state.menuOpen) {
    openRewardMenu();
  }
}

function exitGame(message) {
  if (!running) return;
  running = false;
  clearInterval(tickHandle);
  teardownInput();
  state.messages.push(message);
  render(state);
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
  state.enemies.forEach(enemyAct);
  checkEndConditions();
  render(state);
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
  spawnEnemy(state.wave);
  state.wave += 1;
  render(state);
  startTick();
}

function start() {
  term.fullscreen(true);
  setupInput(handleKey);
  spawnEnemy(0);
  render(state);
  startTick();
}

start();
