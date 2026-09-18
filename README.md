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

独自の貼り付け種別 `text.path.macHome` を登録し、`editor.pasteAs.preferences` の既定値へ追加します。ユーザー設定で貼り付けの優先順位を上書きできます。

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

CIでは上記テストとVSIX生成を実行します。Finderからの実際の貼り付け、貼り付け選択UI、Undo、ユーザー設定の上書きはVS Code / Cursor実アプリで別途確認します。
