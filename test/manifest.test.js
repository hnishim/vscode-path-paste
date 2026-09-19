const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

test('extension manifest makes the path paste kind the default paste preference', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  assert.equal(typeof manifest.engines?.vscode, 'string');
  assert.equal(manifest.main, './src/extension.js');

  const preferences =
    manifest.contributes?.configurationDefaults?.['editor.pasteAs.preferences'];

  assert.ok(Array.isArray(preferences));
  assert.ok(preferences.includes('text.path.macHome'));
});

test('normal paste uses the standard command only in writable text editors', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  const bindings = manifest.contributes?.keybindings;
  assert.ok(Array.isArray(bindings), 'paste must be contributed as a keybinding');
  const pasteBindings = bindings.filter(
    (binding) => binding.key === 'ctrl+v' && binding.mac === 'cmd+v',
  );
  assert.equal(pasteBindings.length, 1, 'contribute exactly one normal paste binding');

  const [binding] = pasteBindings;
  assert.equal(binding.command, 'editor.action.clipboardPasteAction');
  assert.equal(typeof binding.when, 'string');
  const conditions = binding.when.split(/\s*&&\s*/).map((term) => term.trim());
  assert.ok(conditions.includes('editorTextFocus'), 'must require text-editor focus');
  assert.ok(conditions.includes('!editorReadonly'), 'must exclude read-only editors');
});
