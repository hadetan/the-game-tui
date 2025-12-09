class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.char = '@';
    this.hp = 50;
    this.maxHp = 50;
    this.weaponDamage = 3; // Pipeblade damage
    this.attackCooldownMs = 400; // base swing speed
    this.lastAttackAt = 0;
  }
}

module.exports = Player;
