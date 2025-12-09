const term = require('terminal-kit').terminal;
const fs = require('fs');
const path = require('path');
const blessed = require('blessed');
const Player = require('./entities/Player');
const Enemy = require('./entities/Enemy');
const { render } = require('./engine/renderer');
const { setupInput, teardownInput } = require('./engine/input');
const { upgrades, rarityWeight } = require('./data/upgrades');
const { enemies } = require('./data/enemies');
const { levels } = require('./data/levels');
const { createWaveState, waveTick, waveDone } = require('./engine/spawner');

const SAVE_PATH = path.join(__dirname, '..', 'savegame.json');
const TELEMETRY_PATH = path.join(__dirname, '..', 'telemetry.json');
const DIFFICULTIES = {
  easy: { hp: 0.85, dmg: 0.85, label: 'Easy' },
  normal: { hp: 1, dmg: 1, label: 'Normal' },
  hard: { hp: 1.25, dmg: 1.2, label: 'Hard' },
};

function getDifficultySetting() {
  const arg = process.argv.find((a) => a.startsWith('--difficulty='));
  const env = process.env.DIFFICULTY;
  const pick = (arg && arg.split('=')[1]) || env || 'normal';
  const key = pick.toLowerCase();
  return DIFFICULTIES[key] ? { key, ...DIFFICULTIES[key] } : { key: 'normal', ...DIFFICULTIES.normal };
}

const width = 40;
const height = 18;
const MAX_SIMULTANEOUS_ENEMIES = 5;
const maxActiveEnemies = 5; // cap to prevent overwhelming swarms

const difficultySetting = getDifficultySetting();

const state = {
  width,
  height,
  player: new Player(5, 5),
  enemies: [],
  messages: ['Ready.'],
  menuOpen: false,
  paused: false,
  levelIndex: 0,
  waveIndex: 0,
  waveState: null,
  tickCount: 0,
  levelComplete: false,
  totalLevels: levels.length,
  totalWaves: levels[0].waves.length,
  budgetRemaining: levels[0].budget,
  currentAct: levels[0].act,
  cutsceneOpen: false,
  difficulty: difficultySetting,
  options: {
    soundOn: true,
    highContrast: false,
    attackKey: ' ',
  },
  telemetry: null,
};

let running = true;
let tickHandle = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function saveGame() {
  try {
    const payload = {
      levelIndex: state.levelIndex,
      waveIndex: state.waveIndex,
      tickCount: state.tickCount,
      budgetRemaining: state.budgetRemaining,
      difficulty: state.difficulty,
      player: {
        x: state.player.x,
        y: state.player.y,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        weaponDamage: state.player.weaponDamage,
        attackCooldownMs: state.player.attackCooldownMs,
        playstyle: state.player.playstyle,
      },
      enemies: state.enemies.map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        hp: e.hp,
        maxHp: e.maxHp,
        damage: e.damage,
        moveCooldownTicks: e.moveCooldownTicks,
        aoeRange: e.aoeRange,
        aoeDamage: e.aoeDamage,
        aoeCooldown: e.aoeCooldown,
        boss: e.boss,
        resistance: e.resistance,
      })),
      waveState: state.waveState,
      options: state.options,
    };
    fs.writeFileSync(SAVE_PATH, JSON.stringify(payload, null, 2));
    state.messages.push('Run saved.');
  } catch (err) {
    state.messages.push('Save failed.');
  }
}

function ensureTelemetry() {
  if (!state.telemetry) {
    if (fs.existsSync(TELEMETRY_PATH)) {
      try {
        state.telemetry = JSON.parse(fs.readFileSync(TELEMETRY_PATH, 'utf-8'));
      } catch (err) {
        state.telemetry = { deathsByLevel: {}, picksByCategory: {} };
      }
    } else {
      state.telemetry = { deathsByLevel: {}, picksByCategory: {} };
    }
  }
}

function persistTelemetry() {
  ensureTelemetry();
  try {
    fs.writeFileSync(TELEMETRY_PATH, JSON.stringify(state.telemetry, null, 2));
  } catch (err) {
    // ignore telemetry write errors to keep game running
  }
}

function logDeath(levelId) {
  ensureTelemetry();
  if (!levelId) return;
  const deaths = state.telemetry.deathsByLevel || {};
  deaths[levelId] = (deaths[levelId] || 0) + 1;
  state.telemetry.deathsByLevel = deaths;
  persistTelemetry();
}

function logPick(category) {
  ensureTelemetry();
  if (!category) return;
  const picks = state.telemetry.picksByCategory || {};
  picks[category] = (picks[category] || 0) + 1;
  state.telemetry.picksByCategory = picks;
  persistTelemetry();
}

function loadGame() {
  if (!fs.existsSync(SAVE_PATH)) return false;
  try {
    const raw = fs.readFileSync(SAVE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    state.levelIndex = data.levelIndex || 0;
    state.waveIndex = data.waveIndex || 0;
    state.tickCount = data.tickCount || 0;
    state.budgetRemaining = data.budgetRemaining || levels[state.levelIndex].budget;
    state.difficulty = data.difficulty || state.difficulty;
    state.options = data.options || state.options;

    const level = levels[state.levelIndex];
    state.waveState = data.waveState || createWaveState(level.waves[state.waveIndex]);
    state.totalWaves = level.waves.length;
    state.currentAct = level.act;

    const p = data.player || {};
    state.player.x = p.x || state.player.x;
    state.player.y = p.y || state.player.y;
    state.player.hp = p.hp || state.player.hp;
    state.player.maxHp = p.maxHp || state.player.maxHp;
    state.player.weaponDamage = p.weaponDamage || state.player.weaponDamage;
    state.player.attackCooldownMs = p.attackCooldownMs || state.player.attackCooldownMs;
    state.player.playstyle = p.playstyle || state.player.playstyle;

    state.enemies = (data.enemies || []).map((rec) => {
      const base = enemies[rec.type] || enemies.scrapper;
      const enemy = new Enemy(base, rec.x || 1, rec.y || 1, state.levelIndex);
      enemy.hp = rec.hp;
      enemy.maxHp = rec.maxHp;
      enemy.damage = rec.damage;
      enemy.moveCooldownTicks = rec.moveCooldownTicks;
      enemy.aoeRange = rec.aoeRange;
      enemy.aoeDamage = rec.aoeDamage;
      enemy.aoeCooldown = rec.aoeCooldown;
      enemy.boss = rec.boss;
      enemy.resistance = rec.resistance;
      return enemy;
    });

    state.messages.push('Save loaded.');
    return true;
  } catch (err) {
    state.messages.push('Load failed.');
    return false;
  }
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
  enemy.hp = Math.ceil(enemy.hp * state.difficulty.hp);
  enemy.maxHp = Math.ceil(enemy.maxHp * state.difficulty.hp);
  enemy.damage = Math.max(1, Math.ceil(enemy.damage * state.difficulty.dmg));
  enemy.aoeDamage = Math.max(1, Math.ceil(enemy.aoeDamage * state.difficulty.dmg));
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
    const before = enemy.hp;
    const resistance = enemy.resistance || 0;
    const raw = state.player.weaponDamage;
    const reduced = enemy.boss ? Math.max(1, Math.floor(raw * (1 - resistance))) : raw;
    enemy.hp -= reduced;
    const dealt = Math.max(0, before - Math.max(0, enemy.hp));
    state.player.playstyle.damageDealt.melee += dealt;
    if (enemy.hp <= 0 && !enemy._dead) {
      enemy._dead = true;
      state.player.playstyle.kills.melee += 1;
    }
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
    state.player.playstyle.damageTaken += enemy.damage;
    state.messages.push('Enemy hits you!');
  }

  if (enemy.boss && enemy.aoeCooldown > 0 && state.tickCount % enemy.aoeCooldown === 0) {
    if (dist <= enemy.aoeRange) {
      state.player.hp -= enemy.aoeDamage;
      state.player.playstyle.damageTaken += enemy.aoeDamage;
      state.messages.push(`${enemy.name} pulses!`);
    }
  }
}

function handleKey(name) {
  if (!running) return;

  // Allow pause/resume while not in reward menus/cutscenes
  if (name === 'p') {
    if (!state.menuOpen && !state.cutsceneOpen) {
      togglePause();
    }
    return;
  }

  if (state.paused || state.menuOpen) return;

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
    case state.options.attackKey:
      attack();
      return;
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
    exitGame('You were defeated.', { deathLevel: levels[state.levelIndex].id });
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

function exitGame(message, opts = {}) {
  if (!running) return;
  running = false;
  clearInterval(tickHandle);
  teardownInput();
  if (opts.deathLevel) {
    logDeath(opts.deathLevel);
  }
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
  if (state.menuOpen || state.paused) return;
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

function categoryBias(category) {
  const { playstyle } = state.player;
  let bias = 1;
  const meleeDamage = playstyle.damageDealt.melee;
  const damageTaken = playstyle.damageTaken;
  if ((category === 'strength' || category === 'handling') && meleeDamage > 30) {
    bias += 0.5;
  }
  if (category === 'durability' && damageTaken > state.player.maxHp * 0.5) {
    bias += 0.8;
  }
  return bias;
}

function weightedSample(pool, count) {
  const result = [];
  const items = [...pool];
  while (result.length < count && items.length > 0) {
    const total = items.reduce((acc, u) => acc + (rarityWeight[u.rarity] || 1) * categoryBias(u.category), 0);
    let roll = Math.random() * total;
    let chosenIndex = 0;
    for (let i = 0; i < items.length; i += 1) {
      roll -= (rarityWeight[items[i].rarity] || 1) * categoryBias(items[i].category);
      if (roll <= 0) {
        chosenIndex = i;
        break;
      }
    }
    const [picked] = items.splice(chosenIndex, 1);
    result.push(picked);
  }

  // Soft guarantee: ensure at least one uncommon+ if available
  const hasBetter = pool.some((u) => u.rarity !== 'common');
  const allCommon = result.every((u) => u.rarity === 'common');
  if (hasBetter && allCommon) {
    const betterPool = pool.filter((u) => u.rarity !== 'common');
    if (betterPool.length > 0) {
      result[0] = betterPool[Math.floor(Math.random() * betterPool.length)];
    }
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
    logPick(chosen.category);
    // Small heal between levels
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
  state.currentAct = level.act;
  render({ ...state, totalLevels: levels.length, totalWaves: level.waves.length });
  if (level.cutscene) {
    showCutscene(level.cutscene, () => startTick());
  } else {
    startTick();
  }
}

function start() {
  term.fullscreen(true);
  setupInput(handleKey);
  const loaded = loadGame();
  const level = levels[state.levelIndex];
  if (!loaded) {
    state.waveState = createWaveState(level.waves[state.waveIndex]);
    state.totalWaves = level.waves.length;
    state.budgetRemaining = level.budget;
    state.messages.push(`Starting level ${state.levelIndex + 1}: ${level.name}`);
  } else {
    state.totalWaves = level.waves.length;
    state.messages.push(`Resumed level ${state.levelIndex + 1}: ${level.name}`);
  }
  render({ ...state, totalLevels: levels.length, totalWaves: level.waves.length });
  if (level.cutscene && !loaded) {
    showCutscene(level.cutscene, () => startTick());
  } else {
    startTick();
  }
}

function showCutscene(text, onDone) {
  state.cutsceneOpen = true;
  term.fullscreen(false);
  term.clear();

  const cols = Math.max(50, Math.min(term.width || 80, 110));
  const boxWidth = cols - 2;
  const header = ' CUTSCENE ';
  const body = (text || '...').trim();

  term.color('white');
  term.moveTo(1, 1);
  term(`┌${'─'.repeat(boxWidth)}┐`);
  term.moveTo(1, 2);
  term(`│${header.padEnd(boxWidth, ' ')}│`);
  term.moveTo(1, 3);
  term(`├${'─'.repeat(boxWidth)}┤`);

  // Render body text with a simple word-wrap so content is always visible
  const bodyWidth = boxWidth - 2;
  const words = body.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > bodyWidth) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  });
  if (current) lines.push(current.trim());

  const maxBodyLines = 14;
  for (let i = 0; i < Math.min(lines.length, maxBodyLines); i += 1) {
    term.moveTo(2, 4 + i);
    term(lines[i].padEnd(bodyWidth, ' '));
  }
  // If text was shorter, pad remaining lines so frame looks filled
  for (let i = lines.length; i < maxBodyLines; i += 1) {
    term.moveTo(2, 4 + i);
    term(' '.repeat(bodyWidth));
  }

  const promptY = 19;
  term.moveTo(1, promptY);
  term(`├${'─'.repeat(boxWidth)}┤`);
  term.moveTo(1, promptY + 1);
  const prompt = 'Press Enter to continue...';
  term(`│${prompt.padEnd(boxWidth, ' ')}│`);
  term.moveTo(1, promptY + 2);
  term(`└${'─'.repeat(boxWidth)}┘`);

  term.grabInput(true);
  const handler = (name) => {
    if (name === 'ENTER' || name === 'RETURN' || name === 'SPACE' || name === 'q') {
      term.removeListener('key', handler);
      term.clear();
      term.fullscreen(true);
      state.cutsceneOpen = false;
      if (onDone) onDone();
    }
  };
  term.on('key', handler);
}

function togglePause() {
  if (state.paused) {
    state.paused = false;
    term.clear();
    term.fullscreen(true);
    render({ ...state, totalLevels: levels.length, totalWaves: levels[state.levelIndex].waves.length });
    return;
  }

  state.paused = true;
  term.fullscreen(false);
  term.clear();
  term.moveTo(1, 1, 'PAUSED');
  term.moveTo(1, 3, 'Options:');
  term.moveTo(3, 4, `1) Sound: ${state.options.soundOn ? 'On' : 'Off'}`);
  term.moveTo(3, 5, `2) High-contrast: ${state.options.highContrast ? 'On' : 'Off'}`);
  term.moveTo(3, 6, `3) Attack key: ${state.options.attackKey === ' ' ? 'Space' : state.options.attackKey}`);
  term.moveTo(1, 7, 'Press p to resume');
  term.moveTo(1, 8, 'Press 1/2 to toggle options');
  term.moveTo(1, 9, 'Press 3 to remap attack key');
  term.moveTo(1, 10, 'Press s to quick-save, l to load');

  let waitingRemap = false;

  const handler = (name) => {
    if (name === '1') {
      state.options.soundOn = !state.options.soundOn;
      term.moveTo(3, 4, `1) Sound: ${state.options.soundOn ? 'On ' : 'Off'}`);
    }
    if (name === '2') {
      state.options.highContrast = !state.options.highContrast;
      term.moveTo(3, 5, `2) High-contrast: ${state.options.highContrast ? 'On ' : 'Off'}`);
    }
    if (name === '3') {
      waitingRemap = true;
      term.moveTo(1, 12, 'Press new attack key...               ');
      return;
    }
    if (waitingRemap) {
      state.options.attackKey = name;
      term.moveTo(3, 6, `3) Attack key: ${name === ' ' ? 'Space' : name}              `);
      term.moveTo(1, 12, 'Attack key set.                       ');
      waitingRemap = false;
      return;
    }
    if (name === 's' || name === 'S') {
      saveGame();
      term.moveTo(1, 11, 'Saved.                                ');
    }
    if (name === 'l' || name === 'L') {
      loadGame();
      term.moveTo(1, 11, 'Loaded.                               ');
    }
    if (name === 'p' || name === 'P') {
      term.removeListener('key', handler);
      togglePause();
    }
  };
  term.on('key', handler);
}

start();
