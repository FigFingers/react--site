# LLM Research Notes

このフォルダは、LLM が行った調査結果を時点付きで残すための場所です。

## 目的

- 一時的な調査結果をリポジトリ内で共有する
- 「事実」「推測」「提案」を分けて残す
- 後から見返したときに、どの時点の判断か追えるようにする

## このフォルダに置くもの

- 個別テーマの調査メモ
- 調査メモの運用規約
- 新規メモ作成用テンプレート

## 置かないもの

- 恒久的なアーキテクチャ説明
- 現在の仕様書の正本
- 単なる作業ログ

恒久的な全体説明は、引き続き [../READMEFORLLM.md](../READMEFORLLM.md) を優先します。

## ファイル構成

- [CONVENTIONS.md](./CONVENTIONS.md)
  LLM 調査メモの記法と運用ルール
- [TEMPLATE.md](./TEMPLATE.md)
  新規メモ作成テンプレート
- [2026-04-01-product-direction.md](./2026-04-01-product-direction.md)
  現状コードベースの方向性に関する初回調査メモ
- [2026-04-06-chrome-extension-connection-research.md](./2026-04-06-chrome-extension-connection-research.md)
  Chrome 拡張接続機構の事前調査メモ
- [2026-04-06-chrome-extension-connection-implementation.md](./2026-04-06-chrome-extension-connection-implementation.md)
  Chrome 拡張接続機構の実装後解説メモ

## 命名規則

- 個別メモは `YYYY-MM-DD-topic.md`
- topic は英小文字ケバブケース
- 1ファイル1テーマ

例:

- `2026-04-01-product-direction.md`
- `2026-04-03-auth-boundary.md`
- `2026-04-10-playlist-api-audit.md`

## 使い分け

- 長期的に参照される確定情報:
  `docs/READMEFORLLM.md` に昇格する
- ある時点での調査・比較・検討:
  このフォルダに置く

## 最低運用

1. `TEMPLATE.md` を複製して新規メモを作る
2. 調査時点、対象範囲、結論、根拠を埋める
3. 安定情報に育ったら `docs/READMEFORLLM.md` へ昇格する
