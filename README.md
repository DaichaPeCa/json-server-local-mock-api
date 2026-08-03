# JSON Server モックAPI

`要件.md` を満たす、ローカルテスト向けのモックWeb APIです。

## セットアップと起動

Node.js 18以上を用意し、プロジェクトのルートで次を実行します。

```powershell
npm install
npm start
```

既定のURLは `http://127.0.0.1:3000` です。ポートを変える場合は、たとえばPowerShellで次のように起動します。

```powershell
$env:PORT = '4000'
npm start
```

## 初期DBを残す仕組み

- [`db.json`](./db.json) は初期データ専用です。
- 起動時に `runtime/db.json` へ必ずコピーされます。
- POST、PUT、PATCH、DELETEが更新するのは `runtime/db.json` だけです。
- サーバーを再起動すると、作業用DBは初期状態に戻ります。
- `runtime/` はGit管理対象外です。

初期データを変えたい場合だけ `db.json` を編集してください。

## API

JSON Server標準のAPIが利用できます。

```text
GET    /products
GET    /products/1
POST   /products
PUT    /products/1
PATCH  /products/1
DELETE /products/1
```

### カスタムGET API

[`custom-get-routes.cjs`](./custom-get-routes.cjs) に、対象API固有のパラメータ検証・検索処理・レスポンス形式を実装できます。カスタムルートはJSON Server標準ルートより先に評価されます。

同ファイルには次の例を実装済みです。

```text
GET /api/products/search?q=note&minPrice=100&maxPrice=1000&page=1&pageSize=20
GET /api/products/1/availability?quantity=3
```

確認例:

```powershell
Invoke-RestMethod 'http://127.0.0.1:3000/api/products/search?q=note&pageSize=10'
Invoke-RestMethod 'http://127.0.0.1:3000/api/products/1/availability?quantity=3'
```

## リクエストログ

全リクエストを `runtime/requests.jsonl` にJSON Lines形式で追記し、コンソールにも概要を表示します。各行には次の値が入ります。

- `receivedAt`: 受信日時（ISO 8601、UTC）
- `intervalFromPreviousMs`: 直前のリクエストからの間隔（ミリ秒。最初は `null`）
- `requestsInLastSecond`: このリクエストを含む直近1秒間のリクエスト数
- `exceeds10RequestsPerSecond`: 直近1秒間で11件以上なら `true`
- `method`、`path`、`clientIp`: リクエスト情報

この判定はログ記録用であり、11件目をHTTP 429で拒否するものではありません。制限超過時はコンソールにも `LIMIT_EXCEEDED` と表示されます。

## テスト

```powershell
npm test
```

初期DBの保護・起動時リセットと、1秒当たりのリクエスト数判定をテストします。
