class Enemy {
  constructor(template, x, y, scale = 0) {
    this.x = x;
    this.y = y;
    this.char = template.char || 'E';
    this.maxHp = template.hp + scale;
    this.hp = this.maxHp;
    this.damage = template.damage + Math.floor(scale / 2);
    this.moveCooldownTicks = template.moveCooldownTicks || 1;
    this.lastMovedTick = 0;
    this.name = template.name;
    this.type = template.id;
    this.boss = Boolean(template.boss);
    this.aoeRange = template.aoeRange || 0;
    this.aoeDamage = template.aoeDamage || 0;
    this.aoeCooldown = template.aoeCooldown || 0;

    const minRes = template.resistanceMin || 0;
    const maxRes = template.resistanceMax || 0;
    const roll = Math.random() * (maxRes - minRes) + minRes;
    this.resistance = this.boss ? Number(roll.toFixed(2)) : 0;
  }
}

module.exports = Enemy;
