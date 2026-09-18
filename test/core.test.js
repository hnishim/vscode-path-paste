const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractPathCandidate,
  formatPathForLanguage,
} = require('../src/core.js');

const HOME = '/Users/alice';

test('prefers one Finder/OS file over URI list and plain text', () => {
  const actual = extractPathCandidate({
    files: ['file:///Users/alice/Finder%20File.txt'],
    uriList: 'file:///Users/alice/from-uri.txt',
    plainText: '/Users/alice/from-text.txt',
  }, HOME);

  assert.equal(actual, '/Users/alice/Finder File.txt');
});

test('rejects multiple Finder/OS files without falling back to lower-priority text', () => {
  const actual = extractPathCandidate({
    files: [
      'file:///Users/alice/one.txt',
      'file:///Users/alice/two.txt',
    ],
    uriList: 'file:///Users/alice/from-uri.txt',
    plainText: '/Users/alice/from-text.txt',
  }, HOME);

  assert.equal(actual, undefined);
});

test('accepts one file URI and decodes spaces, Japanese text, and percent encoding', () => {
  const actual = extractPathCandidate({
    files: [],
    uriList: 'file:///Users/alice/My%20Files/%E8%B3%87%E6%96%99%231.txt',
    plainText: '',
  }, HOME);

  assert.equal(actual, '/Users/alice/My Files/資料#1.txt');
});

test('rejects URI lists containing more than one resource', () => {
  const actual = extractPathCandidate({
    files: [],
    uriList: [
      'file:///Users/alice/one.txt',
      'file:///Users/alice/two.txt',
    ].join('\r\n'),
    plainText: '/Users/alice/from-text.txt',
  }, HOME);

  assert.equal(actual, undefined);
});

test('rejects a non-file URI without falling back to plain text', () => {
  const actual = extractPathCandidate({
    files: [],
    uriList: 'https://example.com/Users/alice/from-web.txt',
    plainText: '/Users/alice/from-text.txt',
  }, HOME);

  assert.equal(actual, undefined);
});

test('accepts one absolute plain-text path under the current home', () => {
  const actual = extractPathCandidate({
    files: [],
    uriList: '',
    plainText: '/Users/alice/Projects/My App/file.txt',
  }, HOME);

  assert.equal(actual, '/Users/alice/Projects/My App/file.txt');
});

test('rejects relative, multiline, and home-external plain text', () => {
  const cases = [
    'Projects/file.txt',
    '/Users/alice/one.txt\n/Users/alice/two.txt',
    '/Users/bob/file.txt',
    '/Users/alice2/file.txt',
    '/tmp/file.txt',
  ];

  for (const plainText of cases) {
    assert.equal(extractPathCandidate({
      files: [],
      uriList: '',
      plainText,
    }, HOME), undefined, plainText);
  }
});

test('formats a home path for supported language ids', () => {
  const path = '/Users/alice/Projects/My App/file.txt';

  assert.equal(
    formatPathForLanguage(path, 'shellscript', HOME),
    '"$HOME/Projects/My App/file.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'lua', HOME),
    'os.getenv("HOME") .. "/Projects/My App/file.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'python', HOME),
    'Path.home() / "Projects/My App/file.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'markdown', HOME),
    '~/Projects/My App/file.txt',
  );
  assert.equal(
    formatPathForLanguage(path, 'plaintext', HOME),
    '~/Projects/My App/file.txt',
  );
});

test('preserves the iCloud Drive physical path below the home directory', () => {
  const path = '/Users/alice/Library/Mobile Documents/com~apple~CloudDocs/Work/file.txt';

  assert.equal(
    formatPathForLanguage(path, 'shellscript', HOME),
    '"$HOME/Library/Mobile Documents/com~apple~CloudDocs/Work/file.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'markdown', HOME),
    '~/Library/Mobile Documents/com~apple~CloudDocs/Work/file.txt',
  );
});

test('escapes shell and source-language string syntax without losing filename characters', () => {
  const path = '/Users/alice/a "quote" $cash `tick` \\ backslash.txt';

  assert.equal(
    formatPathForLanguage(path, 'shellscript', HOME),
    '"$HOME/a \\"quote\\" \\$cash \\`tick\\` \\\\ backslash.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'lua', HOME),
    'os.getenv("HOME") .. "/a \\"quote\\" $cash `tick` \\\\ backslash.txt"',
  );
  assert.equal(
    formatPathForLanguage(path, 'python', HOME),
    'Path.home() / "a \\"quote\\" $cash `tick` \\\\ backslash.txt"',
  );
});

test('does not transform unsupported languages or paths outside the current home', () => {
  const path = '/Users/alice/Projects/file.txt';

  for (const languageId of ['json', 'jsonc', 'yaml', 'toml', 'javascript', 'unknown']) {
    assert.equal(formatPathForLanguage(path, languageId, HOME), undefined, languageId);
  }

  assert.equal(
    formatPathForLanguage('/tmp/file.txt', 'shellscript', HOME),
    undefined,
  );
});
