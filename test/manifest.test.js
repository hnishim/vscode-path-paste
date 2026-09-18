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
