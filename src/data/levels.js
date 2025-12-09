// Scripted levels with acts, budgets, waves, and optional cutscenes
// Each wave has spawns: type, count, intervalTicks, startTick

const levels = [
  // Act 1: Outer Wards
  {
    id: 'lvl-1-1',
    act: 'Act 1 — Outer Wards',
    name: 'Perimeter Sweep',
    budget: 15,
    cutscene: 'Prologue: The city edge reeks of rust and ozone. You are the Cleaner, sent to secure the perimeter.',
    waves: [
      { id: '1-1a', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 5, startTick: 3 }] },
      { id: '1-1b', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 5, startTick: 4 }] },
    ],
  },
  {
    id: 'lvl-1-2',
    act: 'Act 1 — Outer Wards',
    name: 'Collapsed Street',
    budget: 16,
    waves: [
      { id: '1-2a', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 4, startTick: 3 }, { type: 'roamer', count: 1, intervalTicks: 8, startTick: 9 }] },
      { id: '1-2b', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 5, startTick: 5 }] },
    ],
  },
  {
    id: 'lvl-1-3',
    act: 'Act 1 — Outer Wards',
    name: 'Gatehouse Boss',
    budget: 18,
    boss: true,
    waves: [
      { id: '1-3a', spawns: [{ type: 'boss_sentinel', count: 1, intervalTicks: 10, startTick: 4 }] },
    ],
    cutscene: 'Boss: A gatehouse sentinel scrapper stitched from ruined loaders blocks the way.',
  },

  // Act 2: Factory Belt
  {
    id: 'lvl-2-1',
    act: 'Act 2 — Factory Belt',
    name: 'Assembly Lanes',
    budget: 20,
    cutscene: 'Act 2: The factory belt hums. Conveyor spirits? No—drones. Keep moving.',
    waves: [
      { id: '2-1a', spawns: [{ type: 'scrapper', count: 3, intervalTicks: 4, startTick: 3 }, { type: 'roamer', count: 1, intervalTicks: 8, startTick: 10 }] },
    ],
  },
  {
    id: 'lvl-2-2',
    act: 'Act 2 — Factory Belt',
    name: 'Maintenance Crawl',
    budget: 22,
    waves: [
      { id: '2-2a', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 4, startTick: 2 }, { type: 'roamer', count: 2, intervalTicks: 7, startTick: 8 }] },
      { id: '2-2b', spawns: [{ type: 'grenadier', count: 1, intervalTicks: 12, startTick: 12 }] },
    ],
  },
  {
    id: 'lvl-2-3',
    act: 'Act 2 — Factory Belt',
    name: 'Linebreaker Boss',
    budget: 24,
    boss: true,
    waves: [
      { id: '2-3a', spawns: [{ type: 'boss_linebreaker', count: 1, intervalTicks: 12, startTick: 5 }] },
    ],
    cutscene: 'Boss: Linebreaker, a refitted press-frame with a shock-stomp every few beats.',
  },

  // Act 3: Downtown Reclamation
  {
    id: 'lvl-3-1',
    act: 'Act 3 — Downtown Reclamation',
    name: 'Transit Hub',
    budget: 24,
    cutscene: 'Act 3: Downtown is a maze of stalled trams and hungry sensors.',
    waves: [
      { id: '3-1a', spawns: [{ type: 'scrapper', count: 3, intervalTicks: 4, startTick: 2 }, { type: 'roamer', count: 2, intervalTicks: 6, startTick: 8 }] },
    ],
  },
  {
    id: 'lvl-3-2',
    act: 'Act 3 — Downtown Reclamation',
    name: 'Plaza Sweep',
    budget: 26,
    waves: [
      { id: '3-2a', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 4, startTick: 2 }, { type: 'roamer', count: 2, intervalTicks: 6, startTick: 7 }, { type: 'grenadier', count: 1, intervalTicks: 12, startTick: 10 }] },
    ],
  },
  {
    id: 'lvl-3-3',
    act: 'Act 3 — Downtown Reclamation',
    name: 'Plaza Warden Boss',
    budget: 28,
    boss: true,
    waves: [
      { id: '3-3a', spawns: [{ type: 'boss_warden', count: 1, intervalTicks: 12, startTick: 5 }] },
    ],
    cutscene: 'Boss: The Plaza Warden projects a pulse that burns if you stay too close.',
  },

  // Act 4: Treatment Plant
  {
    id: 'lvl-4-1',
    act: 'Act 4 — Treatment Plant',
    name: 'Intake Channel',
    budget: 26,
    cutscene: 'Act 4: The treatment plant breathes corrosive mist. The core is near.',
    waves: [
      { id: '4-1a', spawns: [{ type: 'scrapper', count: 3, intervalTicks: 3, startTick: 2 }, { type: 'roamer', count: 2, intervalTicks: 6, startTick: 8 }] },
    ],
  },
  {
    id: 'lvl-4-2',
    act: 'Act 4 — Treatment Plant',
    name: 'Clarifier Ring',
    budget: 28,
    waves: [
      { id: '4-2a', spawns: [{ type: 'scrapper', count: 2, intervalTicks: 3, startTick: 2 }, { type: 'roamer', count: 2, intervalTicks: 5, startTick: 7 }, { type: 'grenadier', count: 1, intervalTicks: 10, startTick: 10 }] },
    ],
  },
  {
    id: 'lvl-4-3',
    act: 'Act 4 — Treatment Plant',
    name: 'Corrosive Core Boss',
    budget: 32,
    boss: true,
    waves: [
      { id: '4-3a', spawns: [{ type: 'boss_core', count: 1, intervalTicks: 12, startTick: 5 }] },
    ],
    cutscene: 'Final Boss: The Corrosive Core vents acidic pulses; keep moving and strike between breaths.',
  },
];

module.exports = { levels };
