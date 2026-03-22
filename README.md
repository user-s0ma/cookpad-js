# cookpad-js

Cookpad の非公式 TypeScript クライアント。

## インストール

```bash
npm install user_s0ma/cookpad
```

## クイックスタート

```ts
import { Cookpad } from "cookpad";

const client = new Cookpad();

// 人気順でレシピを検索
const results = await client.searchRecipes("パスタ", { order: "popular", perPage: 5 });
for (const recipe of results.recipes) {
  console.log(`${recipe.title} by ${recipe.user?.name}`);
}

// レシピの材料と手順を表示
const detail = await client.getRecipe(results.recipes[0].id);
console.log(`\n--- ${detail.title} (${detail.serving}) ---`);
detail.ingredients.forEach((ing) => console.log(`  ${ing.name}: ${ing.quantity}`));
detail.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step.description}`));
```

> 一部のエンドポイントは認証済みトークンが必要です。匿名トークンでは利用できない場合があります。

## API リファレンス

### `new Cookpad(options?)`

クライアントを初期化する。すべてのオプションは省略可能で、デフォルトでは匿名トークンを使って日本語環境で動作する。

```ts
// そのまま使う
const client = new Cookpad();

// 設定をカスタマイズ
const client = new Cookpad({
  // token: "your_token",
  country: "JP",
  language: "ja",
  userAgent: "custom-ua/1.0",
});
```

### `searchRecipes(query, options?)`

キーワードでレシピを検索する。並び順やつくれぽ数、材料でのフィルタリングに対応。

```ts
const results = await client.searchRecipes("豚バラ 大根", {
  order: "popular",            // "recent" | "popular" | "date"
  mustHaveCooksnaps: true,     // つくれぽ付きに限定
  minimumCooksnaps: 5,         // つくれぽ 5 件以上
  excludedIngredients: "こんにゃく", // この材料を除外
  perPage: 10,
});

console.log(`${results.totalCount} 件ヒット`);

// ページ送り
if (results.nextPage) {
  const next = await client.searchRecipes("豚バラ 大根", { page: results.nextPage });
}
```

### `getRecipe(recipeId)`

レシピ ID から詳細情報を取得する。材料・手順・作者情報などを含む。

```ts
const recipe = await client.getRecipe(18510866);
console.log(`${recipe.title} (${recipe.serving})`);
console.log(`コツ: ${recipe.advice}`);

recipe.ingredients.forEach((ing) => console.log(`  ${ing.name} … ${ing.quantity}`));
recipe.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step.description}`));
```

### `getSimilarRecipes(recipeId, options?)`

指定レシピに関連するレシピを取得する。

```ts
const similar = await client.getSimilarRecipes(18510866, { perPage: 5 });
similar.forEach((r) => console.log(`${r.title} (${r.cooksnapsCount} つくれぽ)`));
```

### `getComments(recipeId, options?)`

レシピに投稿されたつくれぽ・コメントを取得する。カーソルベースのページネーションに対応。

```ts
const page1 = await client.getComments(18510866, { limit: 5 });
page1.comments.forEach((c) => console.log(`${c.user?.name}: ${c.body}`));

// 続きを読み込む
if (page1.nextCursor) {
  const page2 = await client.getComments(18510866, { after: page1.nextCursor });
}
```

### `searchUsers(query, options?)`

名前やキーワードでユーザーを検索する。

```ts
const result = await client.searchUsers("料理好き");
result.users.forEach((u) => console.log(`${u.name} — ${u.recipeCount} レシピ`));
```

### `searchKeywords(query?)`

入力中のキーワードに対するサジェスト候補を返す。

```ts
const suggestions = await client.searchKeywords("唐揚");
```

### `getSearchHistory(localHistory?)`

トレンドキーワードや検索履歴を取得する。

```ts
const history = await client.getSearchHistory();
```

## 型定義

すべてのレスポンスは TypeScript の interface で型付けされており、エディタの補完・型チェックが使える。

| 型 | 説明 | 主なフィールド |
|---|---|---|
| `Recipe` | レシピ | id, title, story, serving, ingredients, steps |
| `Ingredient` | 材料 | name, quantity |
| `Step` | 調理手順 | description, imageUrl |
| `User` | ユーザー | id, name, recipeCount |
| `Comment` | つくれぽ・コメント | body, user, imageUrl |
| `Image` | 画像情報 | url, filename, altText |
| `SearchResponse` | レシピ検索結果 | recipes, totalCount, nextPage, raw |
| `CommentsResponse` | コメント一覧 | comments, nextCursor |
| `UsersResponse` | ユーザー検索結果 | users, totalCount, nextPage |

`SearchResponse.raw` から API の生レスポンス (`Record<string, unknown>`) にもアクセス可能。

## エラーハンドリング

API エラーは用途別のクラスで throw される。すべて `CookpadError` を継承。

```ts
import { NotFoundError, RateLimitError, CookpadError } from "cookpad-js";

try {
  await client.getRecipe(99999999);
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log("そのレシピは存在しません");
  } else if (e instanceof RateLimitError) {
    console.log("リクエスト制限に達しました。時間を置いて再試行してください");
  } else if (e instanceof CookpadError) {
    console.log(`API エラー: ${e.message}`);
  }
}
```

| クラス | ステータス | 説明 |
|---|---|---|
| `AuthenticationError` | 401 | トークンが無効または期限切れ |
| `NotFoundError` | 404 | 指定リソースが見つからない |
| `RateLimitError` | 429 | レート制限超過 |
| `APIError` | その他 4xx/5xx | その他の API エラー (`statusCode` プロパティ付き) |
