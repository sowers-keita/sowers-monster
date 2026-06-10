# Sowers Monster

Sowers Monster は、体操教室・Sowers Sports Club の子ども向け育成アプリです。

## 技術構成

- Next.js App Router
- TypeScript
- Supabase Auth
- Supabase Database
- Vercel無料枠想定

## 1. Supabaseプロジェクト作成

1. Supabaseで新規プロジェクトを作成
2. Project Settings → API を開く
3. 以下を控える
   - Project URL
   - anon public key

## 2. SQL実行

SupabaseのSQL Editorで以下を順番に実行します。

1. `supabase/schema.sql`
2. `supabase/rls.sql`

## 3. 環境変数設定

`.env.local.example` をコピーして `.env.local` を作成します。

```bash
cp .env.local.example .env.local
```

中身をSupabaseの値に変更します。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

service_roleキーは使いません。

## 4. ローカル起動

```bash
npm install
npm run dev
```

ブラウザで開きます。

```
http://localhost:3000
```

## 5. Vercelデプロイ

1. GitHubにこのプロジェクトをアップロード
2. VercelでImport Project
3. Environment Variablesに以下を設定

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Deploy

## 6. 現在完成している動線

```
login
↓
register-child
↓
egg-select
↓
egg-hatch
↓
home
```

## 7. 次に追加する画面

- training
- inventory
- battle
- ranking
- zukan
- journey
- mission
- qr
- coach
- parent-settings
- admin-sowers


本格運用版（Next.js + Supabase）をVercel + GitHubで公開。
