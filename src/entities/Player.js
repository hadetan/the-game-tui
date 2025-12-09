class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.char = '@';
    this.hp = 10;
    this.maxHp = 10;
    this.weaponDamage = 3; // Pipeblade damage
    this.attackCooldownMs = 400; // base swing speed
    this.lastAttackAt = 0;
  }
}

module.exports = Player;
