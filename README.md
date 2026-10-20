# lovable-clone

Describe an app in chat, and an AI builds it as a React project with a live in-browser preview. Iterate by chatting; every change rewrites the affected files.

## How it works
- `app/api/generate` streams a Claude response. The model emits `<file path="...">` blocks.
- `lib/parse.ts` parses the stream incrementally; finished files are pushed into the preview as they arrive.
- `components/Preview.tsx` runs the project in Sandpack (in-browser bundler) with Tailwind via CDN, plus a Code tab.
- Projects (chat + files) persist in `localStorage`.

## Run
```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY
npm run dev
```
Open http://localhost:3000.

## Roadmap
Auth + cloud persistence (Supabase), GitHub sync, one-click deploy, image attachments, version history/rollback.
