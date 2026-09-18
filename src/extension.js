const os = require('node:os');
const vscode = require('vscode');

const {
  extractPathCandidate,
  formatPathForLanguage,
} = require('./core.js');

const PATH_PASTE_KIND = vscode.DocumentDropOrPasteEditKind.Text.append('path', 'macHome');

function collectFiles(dataTransfer) {
  const files = [];
  dataTransfer.forEach((item) => {
    const file = item.asFile();
    if (!file) {
      return;
    }

    if (file.uri?.scheme === 'file' && typeof file.uri.fsPath === 'string') {
      files.push(file.uri.fsPath);
    } else {
      files.push('__unsupported_file_uri__');
    }
  });
  return files;
}

async function readString(dataTransfer, mimeType) {
  const item = dataTransfer.get(mimeType);
  return item ? item.asString() : '';
}

function activate(context) {
  const provider = {
    async provideDocumentPasteEdits(document, _ranges, dataTransfer) {
      const files = collectFiles(dataTransfer);
      const uriList = files.length === 0
        ? await readString(dataTransfer, 'text/uri-list')
        : '';
      const plainText = files.length === 0 && !uriList
        ? await readString(dataTransfer, 'text/plain')
        : '';

      const candidate = extractPathCandidate({
        files,
        uriList,
        plainText,
      }, os.homedir());

      if (!candidate) {
        return undefined;
      }

      const insertText = formatPathForLanguage(
        candidate,
        document.languageId,
        os.homedir(),
      );
      if (!insertText) {
        return undefined;
      }

      return [
        new vscode.DocumentPasteEdit(
          insertText,
          'Paste macOS path for current language',
          PATH_PASTE_KIND,
        ),
      ];
    },
  };

  const registration = vscode.languages.registerDocumentPasteEditProvider(
    { language: '*' },
    provider,
    {
      pasteMimeTypes: ['files', 'text/uri-list', 'text/plain'],
      providedPasteEditKinds: [PATH_PASTE_KIND],
    },
  );

  context.subscriptions.push(registration);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
