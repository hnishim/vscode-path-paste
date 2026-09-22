# vscode-path-paste

Finderやターミナル等からコピーしたmacOSのホームディレクトリ配下のパスを、VS Code / Cursorの貼り付け先言語に応じた表現へ変換する拡張機能です。

## 変換

| 貼り付け先 | 例 |
| --- | --- |
| shell | `"$HOME/Projects/My App/file.txt"` |
| Lua | `os.getenv("HOME") .. "/Projects/My App/file.txt"` |
| Python | `Path.home() / "Projects/My App/file.txt"` |
| Markdown / plaintext | `~/Projects/My App/file.txt` |

Pythonでは `Path` が既にスコープにあることを前提とし、importは追加しません。

iCloud Driveの `Library/Mobile Documents/com~apple~CloudDocs` 以下は物理パスを保持し、ホームディレクトリ部分だけを変換します。

## 対象入力

入力は次の優先順位で判定します。

1. Finder等から渡される単一ファイル／ディレクトリ
2. 単一の `file://` URI
3. 単一の絶対パス文字列

複数ファイル、複数URI、複数行、相対パス、ホームディレクトリ外、通常テキストは変換しません。JSON / JSONC / YAML / TOML、および未対応言語でも通常の貼り付けへ戻します。ファイルの実在確認は行いません。

## 貼り付け動作

VS Code / Cursorの編集先で `Paste As...` を開き、`Paste macOS path for current language` を明示的に選択すると、対応する単一のmacOSパスを貼り付け先言語に合わせて変換します。拡張機能は独自の貼り付け種別 `text.path.macHome` を登録しますが、通常の `Cmd+V`（macOS）／`Ctrl+V` を再割当せず、`editor.pasteAs.preferences` の既定値も変更しません。通常の貼り付けでは独自変換を自動選択しません。

`Paste As...` に独自候補が表示されない場合は、対応言語のテキストエディタで対象の単一パスをコピーしたことと、拡張機能が有効であることを確認してください。対象外入力・未対応言語では独自候補を返さず、通常の貼り付けや他の候補を妨げません。

## インストール

リポジトリからVSIXを生成する場合:

```sh
npm ci
npm run package:vsix
```

生成された `vscode-path-paste.vsix` を、VS CodeまたはCursorの「Install from VSIX...」からインストールします。Marketplace公開はこのリポジトリの現時点の対象外です。

## 検証

```sh
npm test
npm run package:vsix
```

CIでは上記テストとVSIX生成を実行します。Finderからの実際の貼り付け、明示的な貼り付け選択UI、通常貼り付けへの非干渉、Undo、他の貼り付け候補との共存はVS Code / Cursor実アプリで別途確認します。
