const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

test('extension manifest does not set a default paste preference', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  assert.equal(typeof manifest.engines?.vscode, 'string');
  assert.equal(manifest.main, './src/extension.js');

  assert.equal(
    Object.hasOwn(manifest.contributes?.configurationDefaults ?? {}, 'editor.pasteAs.preferences'),
    false,
    'extension must not select its paste kind by default',
  );
});

test('extension manifest does not override normal paste shortcuts', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  const bindings = manifest.contributes?.keybindings ?? [];
  assert.ok(Array.isArray(bindings));
  assert.equal(
    bindings.some((binding) =>
      ['ctrl+v', 'cmd+v'].includes(binding.key?.toLowerCase()) ||
      ['ctrl+v', 'cmd+v'].includes(binding.mac?.toLowerCase())),
    false,
    'extension must not contribute a normal paste shortcut on any platform',
  );
});
