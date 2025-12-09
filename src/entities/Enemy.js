class Enemy {
  constructor(template, x, y, scale = 0) {
    this.x = x;
    this.y = y;
    this.char = template.char || 'E';
    this.hp = template.hp + scale;
    this.damage = template.damage + Math.floor(scale / 2);
    this.moveCooldownTicks = template.moveCooldownTicks || 1;
    this.lastMovedTick = 0;
    this.name = template.name;
    this.type = template.id;
  }
}

module.exports = Enemy;
