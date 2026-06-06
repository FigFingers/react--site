あなたは今から fix タスクを開始します。以下の手順を必ず守ってください。

## 必須手順

### 1. develop から新しいブランチを切る
```
git checkout develop
git checkout -b fix/<slug>
```
- `<slug>` は $ARGUMENTS の内容から英小文字ハイフン区切りで生成する
- 現在のブランチが何であっても **必ず develop を起点にする**

### 2. GitHub issue を立てる
REST API を使って issue を作成する（gh CLI が org 制限で使えない場合も REST で対応）:
```bash
TOKEN=$(echo "protocol=https\nhost=github.com" | git credential fill | grep password | cut -d= -f2)
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/FigFingers/react--site/issues" \
  --data-binary @- <<EOF
{
  "title": "<issue タイトル>",
  "body": "<問題・修正方針・対応ブランチを含む本文>"
}
EOF
```
作成された issue 番号を記録しておく。

### 3. 修正を実装する
$ARGUMENTS の内容にしたがって修正を行う。

### 4. コミット
```
git add <files>
git commit -m "fix: <概要>\n\nFixes #<issue番号>\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 5. push して PR を作成
```bash
git push origin fix/<slug>
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/FigFingers/react--site/pulls" \
  --data-binary @- <<EOF
{
  "title": "fix: <概要>",
  "head": "fix/<slug>",
  "base": "develop",
  "body": "Fixes #<issue番号>\n\n## 変更内容\n..."
}
EOF
```

## 引数

`$ARGUMENTS` に修正対象・問題の概要を渡す。例:
- `/fix sidebar の window.location をNext.js の Link に置き換え`
- `/fix ダッシュボードページが prisma を直接呼んでいる`
