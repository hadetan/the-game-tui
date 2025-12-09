// Wave spawner utilities
function createWaveState(waveSpec) {
  const events = waveSpec.spawns.map((s) => ({
    type: s.type,
    remaining: s.count,
    intervalTicks: s.intervalTicks || 1,
    nextTick: s.startTick || 0,
  }));
  return {
    tick: 0,
    events,
  };
}

function waveTick(waveState, spawnCb) {
  waveState.tick += 1;
  waveState.events.forEach((evt) => {
    if (evt.remaining <= 0) return;
    if (waveState.tick >= evt.nextTick) {
      spawnCb(evt.type);
      evt.remaining -= 1;
      evt.nextTick += evt.intervalTicks;
    }
  });
}

function waveDone(waveState) {
  return waveState.events.every((evt) => evt.remaining <= 0);
}

module.exports = { createWaveState, waveTick, waveDone };
