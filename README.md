# lovable-clone

Describe an app in chat, and an AI builds it as a React project with a live in-browser preview. Iterate by chatting; every change rewrites the affected files.

## How it works
- `app/api/generate` streams an LLM response (any OpenAI-compatible provider). The model emits `<file path="...">` blocks.
- `lib/parse.ts` parses the stream incrementally; finished files are pushed into the preview as they arrive.
- `components/Preview.tsx` runs the project in a sandboxed iframe (`lib/previewDoc.ts`: Babel + esm.sh import map, Tailwind via CDN), plus a Code tab.
- Projects (chat + files) persist in `localStorage`, or in Supabase when you sign in (see below).

## Run
```bash
npm install
cp .env.example .env.local   # set LLM_API_KEY (Gemini free key: aistudio.google.com)
npm run dev
```
Open http://localhost:3000.

## Login + cloud projects (optional)
1. Create a free project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor (creates a `projects` table with row-level security).
3. Put the project URL and anon key in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then restart.
4. A Sign in button appears on the home page. Existing browser-only projects are imported on first sign-in.

(For quick testing, turn off "Confirm email" in Supabase -> Authentication -> Providers -> Email.)

## Push to GitHub
On a project page click **GitHub**, enter `owner/name` and a personal access token (scope `repo`, create one at github.com/settings/tokens/new). The project is wrapped in a Vite + React + Tailwind scaffold (`lib/exportProject.ts`) and committed in one commit, so the repo runs with `npm install && npm run dev`. The token is stored only in your browser and calls go straight from the browser to api.github.com.

## Deploy to Vercel
Click **Deploy** on a project page, paste a Vercel token (vercel.com/account/tokens), and the exported Vite app is built and published to a live `*.vercel.app` URL. Redeploying updates the same Vercel project. `app/api/deploy` proxies the Vercel API (it has no browser CORS) and does not store the token.

## Roadmap
~~Auth + cloud persistence (Supabase)~~ done. ~~GitHub sync~~ done. ~~One-click deploy~~ done. Next: image attachments, version history/rollback.
