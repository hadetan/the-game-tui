const term = require('terminal-kit').terminal;
const Player = require('./entities/Player');
const Enemy = require('./entities/Enemy');
const { render } = require('./engine/renderer');
const { setupInput, teardownInput } = require('./engine/input');

const width = 40;
const height = 18;

const state = {
  width,
  height,
  player: new Player(5, 5),
  enemies: [new Enemy(30, 10)],
  messages: ['Ready.']
};

let running = true;
let tickHandle = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tryMove(dx, dy) {
  const nx = clamp(state.player.x + dx, 1, width - 2);
  const ny = clamp(state.player.y + dy, 1, height - 2);
  state.player.x = nx;
  state.player.y = ny;
}

function attack() {
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

  // Move horizontally if further on x, else y.
  if (Math.abs(dx) > Math.abs(dy)) {
    enemy.x = clamp(enemy.x + stepX, 1, width - 2);
  } else {
    enemy.y = clamp(enemy.y + stepY, 1, height - 2);
  }

  // Attack if adjacent
  const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
  if (dist === 0) {
    state.player.hp -= enemy.damage;
    state.messages.push('Enemy hits you!');
  }
}

function handleKey(name) {
  if (!running) return;

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
  const aliveEnemies = state.enemies.filter((e) => e.hp > 0);
  if (aliveEnemies.length === 0) {
    exitGame('You cleared the room.');
  }
  if (state.player.hp <= 0) {
    exitGame('You were defeated.');
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
  state.enemies.forEach(enemyAct);
  checkEndConditions();
  render(state);
}

function start() {
  term.fullscreen(true);
  setupInput(handleKey);
  render(state);
  tickHandle = setInterval(gameTick, 100); // 10 ticks per second
}

start();
