// Enemy definitions with difficulty cost and movement pacing (moveCooldownTicks: lower is faster)
const enemies = {
  scrapper: {
    id: 'scrapper',
    name: 'Scrapper Drone',
    char: 'e',
    hp: 6,
    damage: 1,
    moveCooldownTicks: 2,
    cost: 2,
  },
  roamer: {
    id: 'roamer',
    name: 'Roamer',
    char: 'r',
    hp: 9,
    damage: 2,
    moveCooldownTicks: 3,
    cost: 3,
  },
  grenadier: {
    id: 'grenadier',
    name: 'Scrap Grenadier',
    char: 'g',
    hp: 10,
    damage: 3,
    moveCooldownTicks: 5,
    cost: 4,
  },
};

module.exports = { enemies };
