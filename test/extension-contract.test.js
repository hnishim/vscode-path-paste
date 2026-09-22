const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');

class FakeKind {
  constructor(value) {
    this.value = value;
  }

  append(...parts) {
    return new FakeKind([this.value, ...parts].filter(Boolean).join('.'));
  }
}

FakeKind.Empty = new FakeKind('');
FakeKind.Text = new FakeKind('text');

class FakePasteEdit {
  constructor(insertText, title, kind) {
    this.insertText = insertText;
    this.title = title;
    this.kind = kind;
  }
}

function stringItem(value) {
  return {
    asFile: () => undefined,
    asString: async () => value,
  };
}

function fileItem(uri) {
  return {
    asFile: () => ({
      name: path.posix.basename(uri),
      uri: { scheme: 'file', fsPath: uri },
    }),
    asString: async () => '',
  };
}

function dataTransfer(entries) {
  const map = new Map(entries);
  return {
    get: (mime) => map.get(mime),
    forEach: (callback, thisArg) => {
      for (const [mime, item] of map.entries()) {
        callback.call(thisArg, item, mime, undefined);
      }
    },
    [Symbol.iterator]: () => map[Symbol.iterator](),
  };
}

function loadExtensionWithFakeVscode() {
  let registration;
  const fakeVscode = {
    DocumentDropOrPasteEditKind: FakeKind,
    DocumentPasteEdit: FakePasteEdit,
    languages: {
      registerDocumentPasteEditProvider(selector, provider, metadata) {
        registration = { selector, provider, metadata };
        return { dispose() {} };
      },
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
      return fakeVscode;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const extensionPath = require.resolve('../src/extension.js');
  delete require.cache[extensionPath];

  try {
    const extension = require(extensionPath);
    const context = { subscriptions: [] };
    extension.activate(context);
  } finally {
    Module._load = originalLoad;
  }

  return registration;
}

test('registers a paste provider for OS files, URI lists, and plain text', () => {
  const registration = loadExtensionWithFakeVscode();

  assert.ok(registration);
  assert.deepEqual(
    [...registration.metadata.pasteMimeTypes].sort(),
    ['files', 'text/plain', 'text/uri-list'].sort(),
  );
  assert.ok(
    registration.metadata.providedPasteEditKinds
      .some((kind) => kind.value === 'text.path.macHome'),
  );
});

test('paste provider returns one language-aware edit for a Finder file', async () => {
  const registration = loadExtensionWithFakeVscode();
  const home = os.homedir();
  const transfer = dataTransfer([
    ['application/octet-stream', fileItem(path.join(home, 'My App', 'file.txt'))],
    ['text/plain', stringItem(path.join(home, 'fallback.txt'))],
  ]);

  const edits = await registration.provider.provideDocumentPasteEdits(
    { languageId: 'markdown' },
    [],
    transfer,
    { only: FakeKind.Empty, triggerKind: 0 },
    { isCancellationRequested: false },
  );

  assert.equal(edits.length, 1);
  assert.equal(edits[0].insertText, '~/My App/file.txt');
  assert.equal(edits[0].kind.value, 'text.path.macHome');
});

test('multiple Finder files do not fall back to text and unsupported languages return no edit', async () => {
  const registration = loadExtensionWithFakeVscode();
  const home = os.homedir();

  const multipleFiles = dataTransfer([
    ['application/x-file-one', fileItem(path.join(home, 'one.txt'))],
    ['application/x-file-two', fileItem(path.join(home, 'two.txt'))],
    ['text/plain', stringItem(path.join(home, 'fallback.txt'))],
  ]);

  const multipleResult = await registration.provider.provideDocumentPasteEdits(
    { languageId: 'markdown' },
    [],
    multipleFiles,
    { only: FakeKind.Empty, triggerKind: 0 },
    { isCancellationRequested: false },
  );

  assert.ok(!multipleResult || multipleResult.length === 0);

  const unsupported = dataTransfer([
    ['text/plain', stringItem(path.join(home, 'file.txt'))],
  ]);

  const unsupportedResult = await registration.provider.provideDocumentPasteEdits(
    { languageId: 'json' },
    [],
    unsupported,
    { only: FakeKind.Empty, triggerKind: 0 },
    { isCancellationRequested: false },
  );

  assert.ok(!unsupportedResult || unsupportedResult.length === 0);
});
