const term = require('terminal-kit').terminal;

function setupInput(onKey) {
  term.grabInput({ mouse: 'motion' });

  term.on('key', (name) => {
    onKey(name);
  });
}

function teardownInput() {
  term.grabInput(false);
}

module.exports = { setupInput, teardownInput };
