// Upgrade pool for pick-3 menu
// rarity: common, uncommon, rare
// category: strength, durability, handling

const upgrades = [
  {
    id: 'edge-reinforcement',
    name: 'Edge Reinforcement',
    rarity: 'common',
    category: 'strength',
    description: '+2 weapon damage.',
    apply: (player) => {
      player.weaponDamage += 2;
    },
  },
  {
    id: 'braced-grip',
    name: 'Braced Grip',
    rarity: 'common',
    category: 'handling',
    description: '-20% attack cooldown (faster swings).',
    apply: (player) => {
      player.attackCooldownMs = Math.max(50, Math.floor(player.attackCooldownMs * 0.8));
    },
  },
  {
    id: 'patched-armor',
    name: 'Patched Armor',
    rarity: 'common',
    category: 'durability',
    description: '+3 max HP and heal 3.',
    apply: (player) => {
      player.maxHp += 3;
      player.hp = Math.min(player.maxHp, player.hp + 3);
    },
  },
  {
    id: 'impact-frame',
    name: 'Impact Frame',
    rarity: 'uncommon',
    category: 'strength',
    description: '+4 weapon damage.',
    apply: (player) => {
      player.weaponDamage += 4;
    },
  },
  {
    id: 'shock-absorbers',
    name: 'Shock Absorbers',
    rarity: 'uncommon',
    category: 'durability',
    description: '+5 max HP and heal 5.',
    apply: (player) => {
      player.maxHp += 5;
      player.hp = Math.min(player.maxHp, player.hp + 5);
    },
  },
  {
    id: 'servo-boost',
    name: 'Servo Boost',
    rarity: 'rare',
    category: 'handling',
    description: '-40% attack cooldown (much faster swings).',
    apply: (player) => {
      player.attackCooldownMs = Math.max(30, Math.floor(player.attackCooldownMs * 0.6));
    },
  },
  {
    id: 'plated-cover',
    name: 'Plated Cover',
    rarity: 'uncommon',
    category: 'durability',
    description: '+8 max HP and heal 8.',
    apply: (player) => {
      player.maxHp += 8;
      player.hp = Math.min(player.maxHp, player.hp + 8);
    },
  },
  {
    id: 'fine-hone',
    name: 'Fine Hone',
    rarity: 'rare',
    category: 'strength',
    description: '+6 weapon damage.',
    apply: (player) => {
      player.weaponDamage += 6;
    },
  },
];

const rarityWeight = {
  common: 5,
  uncommon: 3,
  rare: 1,
};

module.exports = { upgrades, rarityWeight };
