class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.char = '@';
    this.hp = 100;
    this.maxHp = 100;
    this.weaponDamage = 3; // Pipeblade damage
    this.attackCooldownMs = 400; // base swing speed
    this.lastAttackAt = 0;
    this.playstyle = {
      damageDealt: { melee: 0 },
      damageTaken: 0,
      kills: { melee: 0 },
    };
  }
}

module.exports = Player;
