const path = require('node:path');

function normalizeHome(home) {
  if (typeof home !== 'string' || !path.posix.isAbsolute(home)) {
    return undefined;
  }
  return path.posix.resolve(home);
}

function normalizeHomePath(candidate, home) {
  const normalizedHome = normalizeHome(home);
  if (!normalizedHome || typeof candidate !== 'string' || !path.posix.isAbsolute(candidate)) {
    return undefined;
  }

  const normalized = path.posix.resolve(candidate);
  if (normalized === normalizedHome || normalized.startsWith(`${normalizedHome}/`)) {
    return normalized;
  }
  return undefined;
}

function pathFromFileUri(value) {
  try {
    const uri = new URL(value);
    if (uri.protocol !== 'file:' || (uri.hostname && uri.hostname !== 'localhost')) {
      return undefined;
    }
    return decodeURIComponent(uri.pathname);
  } catch {
    return undefined;
  }
}

function pathFromFileInput(value) {
  if (typeof value !== 'string') {
    return undefined;
  }
  if (value.startsWith('file:')) {
    return pathFromFileUri(value);
  }
  if (path.posix.isAbsolute(value)) {
    return value;
  }
  return undefined;
}

function uriListResources(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function extractPathCandidate(input, home) {
  const files = Array.isArray(input?.files) ? input.files : [];
  if (files.length > 0) {
    if (files.length !== 1) {
      return undefined;
    }
    const filePath = pathFromFileInput(files[0]);
    return filePath ? normalizeHomePath(filePath, home) : undefined;
  }

  if (typeof input?.uriList === 'string' && input.uriList.length > 0) {
    const resources = uriListResources(input.uriList);
    if (resources.length !== 1) {
      return undefined;
    }
    const uriPath = pathFromFileUri(resources[0]);
    return uriPath ? normalizeHomePath(uriPath, home) : undefined;
  }

  if (typeof input?.plainText !== 'string' || input.plainText.length === 0) {
    return undefined;
  }
  if (/[\r\n]/.test(input.plainText)) {
    return undefined;
  }
  return normalizeHomePath(input.plainText, home);
}

function escapeDoubleQuotedSource(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function escapeDoubleQuotedShell(value) {
  return escapeDoubleQuotedSource(value)
    .replace(/\$/g, '\\$')
    .replace(/\x60/g, '\\`');
}

function formatPathForLanguage(candidate, languageId, home) {
  const normalizedHome = normalizeHome(home);
  const normalized = normalizeHomePath(candidate, home);
  if (!normalizedHome || !normalized) {
    return undefined;
  }

  const relative = path.posix.relative(normalizedHome, normalized);
  if (/[\r\n]/.test(relative)) {
    return undefined;
  }

  switch (languageId) {
    case 'shellscript': {
      const suffix = relative ? `/${escapeDoubleQuotedShell(relative)}` : '';
      return `"$HOME${suffix}"`;
    }
    case 'lua':
      return relative
        ? `os.getenv("HOME") .. "/${escapeDoubleQuotedSource(relative)}"`
        : 'os.getenv("HOME")';
    case 'python':
      return relative
        ? `Path.home() / "${escapeDoubleQuotedSource(relative)}"`
        : 'Path.home()';
    case 'markdown':
    case 'plaintext':
      return relative ? `~/${relative}` : '~';
    default:
      return undefined;
  }
}

module.exports = {
  extractPathCandidate,
  formatPathForLanguage,
};
