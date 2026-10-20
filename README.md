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

## Connect GitHub and Vercel (OAuth)
Instead of pasting tokens, the GitHub and Deploy dialogs show **Connect GitHub / Connect Vercel** buttons once you register OAuth apps. The provider token is stored in an encrypted httpOnly cookie (`lib/session.ts`, AES-256-GCM) and never reaches browser JavaScript. If the env vars are missing, the dialogs fall back to the token fields.

**GitHub:** github.com/settings/developers -> New OAuth App. Homepage `http://localhost:3000`, callback URL `http://localhost:3000/api/auth/github/callback`. Put the Client ID and a generated secret into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. (Scope requested: `repo`.)

**Vercel:** vercel.com/dashboard -> Integrations -> Create (Integration Console). Set the Redirect URL to `http://localhost:3000/api/auth/vercel/callback`, enable the Deployments (read/write) and Projects (read/write) scopes, then put the Client ID/secret into `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET` and the integration's URL slug into `VERCEL_INTEGRATION_SLUG`.

Also set `SESSION_SECRET` to a long random string, and `APP_URL` to your public URL when you deploy (then update both callback URLs).

## Deploy to Vercel
Click **Deploy** on a project page, paste a Vercel token (vercel.com/account/tokens), and the exported Vite app is built and published to a live `*.vercel.app` URL. Redeploying updates the same Vercel project. `app/api/deploy` proxies the Vercel API (it has no browser CORS) and does not store the token.

## Version history
Every AI reply stores a snapshot of the project (`snapshot` on the message, so no database change is needed). Each reply in the chat shows its version number and a **Restore** button when it differs from the current state. Restoring adds a new version, so you can always jump back again.

## Image attachments
Attach, paste or drag screenshots/designs into the prompt box (home page or chat, up to 4). They are downscaled to 1280px JPEG in the browser (`lib/image.ts`) and sent to a vision-capable model with the request; only the latest message sends its images. Use a model that supports images (the default Gemini model does).

## Preview details
- **Fix with AI:** if the preview throws, a red banner appears with a **Fix with AI** button that sends the error back to the model.
- **Saved app data:** generated apps can use `localStorage`; it is persisted per project in your browser (`lovable-clone:appdata:<id>`), so things like a kanban board keep their data across reloads. `sessionStorage` is in-memory only.
- **Multi-page apps:** generated apps use `react-router-dom` (`HashRouter`). In the sandboxed preview both routers are swapped for `MemoryRouter` (`lib/previewDoc.ts`); the exported/deployed app uses real routing.

## Visual editor
Click **Edit** above the preview, then click any element to select it. Double-click text to edit it in place (Enter to save, Esc to cancel). The toolbar changes text color, background, font size, bold and corner radius. Edits are written into the real source files (via Babel AST positions, `EDITOR` in `lib/previewDoc.ts`), appear as a single "Visual edits applied" version in the history, and don't reload the preview. **Drag to move:** press and drag any element; a violet line shows where it will land (before/after the element under the cursor, or a dashed box for "inside" a container; text-only elements can't be dropped into). Releasing rewrites the source (same file only, indentation preserved), reloads the preview once and re-selects the moved element. Esc cancels. **+ Add** inserts a Heading, Text, Button, Image, Link, Box or Divider after the selected element or inside it as the last child (a self-closing element like `<div />` is expanded automatically); the new element is selected afterwards and the preview reloads once. The toolbar also has padding, margin and text alignment, an **Image** field (paste a URL or upload; `<img>` only) and **Delete** for elements nested in JSX (deleting reloads the preview so element ids stay correct). Uploaded images are embedded as data URLs; `lib/assets.ts` swaps them for short placeholders before files are sent to the model and restores them afterwards, so they cost no tokens. Text or classes that come from code (e.g. `{items.map(...)}` or `className={cn(...)}`) can't be edited visually; ask the AI for those.

## Fuller sites ("Build thoroughly")
Models tend to write the minimum on the first try. So the system prompt (`lib/prompt.ts`) demands complete sites with a size target, and after the first version of a **new** project the app runs one automatic **expand pass** (`EXPAND_PROMPT`) when the result is under ~25,000 characters: the AI adds missing sections/pages, deepens content and wires up features. The chat shows "Expanding the site..." and you get the result as a second version (Restore the first one any time). Turn it off with the **Build thoroughly** checkbox on the home page if you prefer speed. For the extra detail, also answer the pre-build questions or describe pages and sections in your prompt.

## When the AI is busy (503 / 429)
Free-tier models are often overloaded. `app/api/generate` retries each model briefly, gives up on a model that stalls for 45s before its first token, and falls back to the next model in `LLM_FALLBACK_MODELS` (default `gemini-3.1-flash-lite`; comma-separated list). If everything fails, the chat shows a readable message with a **Retry** button, and a failed request is not saved as a version. A bad key shows a clear message instead of a bare status code.

## Questions before building
When you submit a prompt on the home page, the AI first asks 3-5 tailored questions (audience, style, sections, features...), each with tappable suggested answers and a free-text box (`app/api/clarify`, `components/ClarifyDialog.tsx`). The answers are saved on the message as `details`, shown under your prompt in the chat, and sent to the model together with it. Questions come in the language of your prompt. You can skip them, or turn them off with the "Ask me questions first" checkbox. Templates skip the questions (their prompts are already detailed), and if the question call fails the app builds straight away.

## Productivity features
- **Undo / Redo:** buttons above the preview, `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`), also from inside the preview. Covers visual edits, AI changes and restores (in-memory, up to 100 steps; the permanent history is the chat's version list).
- **Edit-mode shortcuts:** `Delete` removes the selected element, `Ctrl+D` duplicates it, `Esc` deselects. **Duplicate** is also in the toolbar.
- **Responsive preview:** Desktop / Tablet (768px) / Mobile (390px) toggle and a reload button.
- **Templates:** 9 ready-made starting points on the home page (landing page, multi-page portfolio, dashboard, kanban, store, blog, restaurant, habit tracker, link-in-bio).
- **Projects:** rename (click the name in the project header, or the pencil on the home page), duplicate, delete.
- **Download ZIP:** the download button in the project header exports a runnable Vite project (`lib/zip.ts`, no dependencies).

## Roadmap
All items done: auth + cloud persistence, GitHub sync, one-click deploy, version history, image attachments, Fix-with-AI, persistent app data, multi-page routing.
Ideas: streaming edits as diffs, cloud storage for generated apps' data, a templates gallery.
