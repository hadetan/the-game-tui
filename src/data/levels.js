// Scripted levels with budgets and staggered waves
// Each wave has spawns: type, count, intervalTicks, startTick

const levels = [
  {
    id: 'lvl-1',
    name: 'Outer Wards A',
    budget: 18,
    waves: [
      {
        id: '1-1',
        spawns: [
          { type: 'scrapper', count: 2, intervalTicks: 5, startTick: 3 },
        ],
      },
      {
        id: '1-2',
        spawns: [
          { type: 'scrapper', count: 2, intervalTicks: 5, startTick: 5 },
          { type: 'roamer', count: 1, intervalTicks: 8, startTick: 10 },
        ],
      },
    ],
  },
  {
    id: 'lvl-2',
    name: 'Factory Belt',
    budget: 23,
    waves: [
      {
        id: '2-1',
        spawns: [
          { type: 'scrapper', count: 3, intervalTicks: 5, startTick: 3 },
          { type: 'roamer', count: 1, intervalTicks: 7, startTick: 9 },
        ],
      },
      {
        id: '2-2',
        spawns: [
          { type: 'scrapper', count: 2, intervalTicks: 5, startTick: 4 },
          { type: 'grenadier', count: 1, intervalTicks: 12, startTick: 14 },
          { type: 'roamer', count: 1, intervalTicks: 8, startTick: 12 },
        ],
      },
    ],
  },
  {
    id: 'lvl-3',
    name: 'Downtown Reclamation',
    budget: 30,
    waves: [
      {
        id: '3-1',
        spawns: [
          { type: 'scrapper', count: 4, intervalTicks: 3, startTick: 2 },
          { type: 'roamer', count: 2, intervalTicks: 5, startTick: 6 },
        ],
      },
      {
        id: '3-2',
        spawns: [
          { type: 'scrapper', count: 3, intervalTicks: 3, startTick: 2 },
          { type: 'roamer', count: 2, intervalTicks: 5, startTick: 5 },
          { type: 'grenadier', count: 1, intervalTicks: 12, startTick: 10 },
        ],
      },
    ],
  },
];

module.exports = { levels };
