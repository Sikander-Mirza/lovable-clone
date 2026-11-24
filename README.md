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

### Backup provider (OpenRouter)
Set `LLM_BACKUP_API_KEY` (and optionally `LLM_BACKUP_BASE_URL`, default OpenRouter, and `LLM_BACKUP_MODELS`, comma-separated) and the generator falls through to that provider after the primary models fail or stall. A rejected key on one provider only disables that provider. The backup is skipped for requests with images. The server log prints which provider/model answered (`[generate] primary/... first token after ...ms`).

## Questions before building
When you submit a prompt on the home page, a short fixed questionnaire appears first (`lib/questionnaire.ts`, `components/ClarifyDialog.tsx`): site type, business name, audience, look and feel, main color, pages, features and language of the text. It needs no AI call, so it always shows up instantly, even when the model is busy. Every question has tappable options plus a free-text box, and the site type is preselected when your prompt makes it obvious (e.g. "coffee shop"). The answers are saved on the message as `details`, shown under your prompt in the chat, and sent to the model with it. Skip any question or the whole dialog, or turn it off with the "Ask me questions first" checkbox. Templates skip it (their prompts are already detailed). To change the questions, edit `QUESTIONS` in `lib/questionnaire.ts`.

## Productivity features
- **Undo / Redo:** buttons above the preview, `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`), also from inside the preview. Covers visual edits, AI changes and restores (in-memory, up to 100 steps; the permanent history is the chat's version list).
- **Edit-mode shortcuts:** `Delete` removes the selected element, `Ctrl+D` duplicates it, `Esc` deselects. **Duplicate** is also in the toolbar.
- **Responsive preview:** Desktop / Tablet (768px) / Mobile (390px) toggle and a reload button.
- **Templates:** 9 ready-made starting points on the home page (landing page, multi-page portfolio, dashboard, kanban, store, blog, restaurant, habit tracker, link-in-bio).
- **Projects:** rename (click the name in the project header, or the pencil on the home page), duplicate, delete.
- **Download ZIP:** the download button in the project header exports a runnable Vite project (`lib/zip.ts`, no dependencies).

## Quality: auto-fix and suggestions
- **Auto-fix loop:** right after a generation, if the preview throws, the app asks the AI to fix it by itself (up to 2 attempts per generation; the chat shows "fixing it automatically"). The manual **Fix with AI** button is still there.
- **Suggestion chips:** under the latest version you get one-click follow-ups (testimonials, pricing, FAQ, contact form, photos, mobile polish...) chosen from what the project is still missing (`lib/suggestions.ts`).

## Theme (brand color and fonts)
The **Theme** button above the preview restyles the whole site: brand color (a full 50-950 scale is derived from it) and body/heading fonts from a curated Google Fonts list. It is stored as `/theme.json` in the project, so it is versioned, undoable and exported. Generated code uses `brand-*` classes and `font-sans` / `font-display`, which Tailwind gets from this theme (`lib/theme.ts`); the AI creates `/theme.json` for new projects from your chosen color. Elements with a fixed color keep it.

## Photos
`lib/photos.ts` is a curated library of 46 real Unsplash photos (every ID checked, grouped: business, tech, cafe, food, people, nature, fitness, health, education, event, product, shop, real estate). The AI may only use these (so no broken or irrelevant images), and the visual editor's image field has a **Library** picker. (Free Gemini keys have no image-generation quota, so photos come from this library.)

## Forms and the Data tab
Generated forms save with `import { submitForm } from "lovable"`. In the preview, submissions go to the **Data** tab (view, delete, export CSV); signed-in users keep them in Supabase. A deployed site posts straight to Supabase (`src/lovable.js`, with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PROJECT_ID` that the Deploy button sets for you); without them it falls back to the visitor's localStorage. **Re-run `supabase/schema.sql`** in the SQL editor to create the `submissions` table (safe to run again). Anyone can submit, only the project's owner can read.

## Hosting it for other people
`lib/guard.ts` protects `/api/generate`: a per-IP rate limit (`RATE_LIMIT_PER_HOUR`, default 120, in memory per server instance), a request size cap, and `REQUIRE_AUTH=true` to demand a signed-in Supabase user. Also set `SESSION_SECRET` and `APP_URL`. Keep your `.env.local` out of git (it is ignored).

## Static checks, patch edits and evals
- **Static checks** (`lib/validate.ts`, `/api/validate`): after each generation the server compiles every file with esbuild and checks imports (missing files, packages that are not available) and that every `lucide-react` icon really exists. Problems are sent back to the AI automatically, before the preview can crash on them (shares the 2-attempt auto-fix budget).
- **Patch edits** (`lib/edits.ts`): for small changes the AI sends `<edit>` blocks with SEARCH/REPLACE instead of rewriting whole files. SEARCH must match exactly once; if an edit cannot be applied the file is left untouched and the AI is asked to resend it in full (or you get a Retry notice). The chat shows "N changes" per edited file.
- **Evals** (`npm run eval`, `evals/prompts.json`): runs fixed prompts through the real pipeline and scores compile errors, size, structure, theme use and approved photos (plus informational design-direction and generic-pattern counts). Results are saved in `evals/results/` (ignored by git). Use `-- --only coffee,saas` or `-- --limit 3`. It uses AI quota, and the score is a rough heuristic, not a verdict on design quality.
- **Design direction:** the core system prompt makes the AI choose a specific visual direction for each business and avoid generic patterns (see `DESIGN DIRECTION` in `lib/prompt.ts`; a test keeps it in place).

## Plan before build
For a new website the AI first proposes a plan (`/api/plan`, `lib/plan.ts`): a visual direction for this specific business, brand color, fonts, and 6-9 sections in order, each with its own layout idea, plus features. It appears in the chat as an editable card: change the direction text, color and fonts, untick or reorder sections, edit layout ideas, **Re-plan** for another proposal, **Skip the plan**, or **Build this plan**. The approved plan is stored on your first message and sent to the model as a binding brief (`formatPlan`): `/theme.json` is created exactly as planned and the sections are built in that order. Small tools (counter, calculator...) are detected by the planner and built straight away; if planning fails the app builds directly. Turn it off with the "Review a plan first" toggle on the home page. Known limit: the model occasionally adds a section that is not in the plan, despite being told not to.

## Telemetry, context size and CI
- **Telemetry** (`lib/telemetry.ts`): every `/api/generate` call appends one JSON line to `.data/generations.jsonl` (git-ignored): who answered, first-token and total time, output size, context size, and every failed attempt. `npm run stats` summarizes success rate, fallback rate, p50/p90 latency per model and the most common errors. On read-only hosts logging silently does nothing.
- **Smaller requests** (`lib/context.ts`): projects up to ~60k characters are sent whole. Larger ones send `/App.js`, `/theme.json` and the files the request is about (exact path or component name first, then keyword matches; site-wide requests like "improve mobile" show as many small files as fit). The rest are listed with their sizes and the model is told not to edit them from memory.
- **Scope rule:** tiny tools (counter, calculator, to-do...) are generated compact; the large size targets apply only to full websites.
- **CI:** `.github/workflows/ci.yml` runs typecheck, tests and a production build on every push and pull request.

## Tests
`npm test` runs 18 tests (parser, asset placeholders, ZIP structure and CRCs, theme, questionnaire, suggestions, rate limit/auth guard, export, encrypted sessions). The visual-editor engine runs inside the preview iframe and is covered by manual/browser checks rather than these tests. To run a production build while `next dev` is running: `NEXT_DIST_DIR=.next-build npm run build`.

## Roadmap
Done: auth + cloud persistence, GitHub sync, one-click deploy, version history, image attachments, auto-fix, persistent app data, multi-page routing, visual editor, theme, photos, forms backend, hosting guard, tests.
Ideas: plan-then-build generation, sending only relevant files to the model (cost), responsive-specific styling in the editor, custom domains and SEO fields, AI-generated images (needs a paid image quota), diffs of AI changes.

- **Full preview:** the expand button at the right end of the preview toolbar hides the top bar and the chat so the site fills the screen (the edit, theme and device tools stay available). Press Esc or the same button to leave.

- **Plan adherence check** (lib/planCheck.ts): on the first build of a planned single-page site, App.js is compared with the plan. Extra sections and missing ones are sent back to the AI automatically (shares the auto-fix budget), and the AI can remove files with <delete path=.../>. Section components are named after the plan titles so this is deterministic. Multi-route sites are not checked.

## Site settings, sections panel and plan card
- **Site panel** (toolbar, "Site"): page title, description, share image, site address and language for search engines and social sharing, plus a **WhatsApp chat button** (number with country code and a first message). Stored in `/site.json` (versioned, undoable). The preview shows the button; the download and the Vercel deploy get the `<title>`/description/Open Graph tags, `<html lang>`, `public/robots.txt`, a one-URL `sitemap.xml` (when the site address is set) and the button (`lib/site.ts`). New sites get a first `/site.json` from the AI.
- **Sections panel** (toolbar, "Sections"): reorder, hide (commented out in `App.js`), remove (line, import and file) and add ready-made sections from a small library (FAQ accordion, Pricing, Newsletter signup using the form helper, Stats strip). No AI involved (`lib/sections.ts`); it works on single-page sites where `App.js` lists one `<Section />` per line.
- **Plan card:** a dashed **Add a section** button adds your own section to the plan.

## Site health report
The **Health** button in the preview toolbar scores the site on SEO, accessibility, mobile and speed. It reads the code (`/site.json`, `/theme.json`, images, responsive classes) and measures the live preview at phone width (headings, alt text, button names, form labels, sideways scrolling). **Fix N things with AI** sends the failing checks to the chat as one request.

## Redesign one section
In the **Sections** panel every section has a ✨ button. Optionally say what to change, press **Redesign**, and the AI rewrites only that section's file.

## Urdu, Arabic and right-to-left
Pick a language in **Site**. Urdu, Arabic, Persian and Hebrew set `dir="rtl"` and load a matching script font (Noto Nastaliq Urdu, Noto Sans Arabic...), in the preview and in the exported site. **Translate the site to ...** asks the AI to rewrite all text in that language.

## Multi-page sites
Ask for separate pages ("Home, Menu, About and Contact pages") and the AI uses react-router with one file per page in `/pages`. A page dropdown appears in the preview toolbar to jump between pages; the exported site keeps real routing.

## Read-only share links

The **Share** button in the editor header creates a link like `/s/k3j9x0a8bz` that anyone can open to view the site (not edit it). The link shows a snapshot, so press "Update with latest changes" after you edit; "Stop sharing" turns it off. Forms on a shared site save to your Data tab.

Setup: run the new `shares` section of `supabase/schema.sql` in the Supabase SQL editor (safe to re-run), and sign in. The table is private to its owner and the public page reads one share at a time through the `get_share()` function, so other shares cannot be listed.

## Mobile layout
Below 768px the editor shows one pane at a time with a bottom **Chat | Preview** bar (a dot on Preview means the AI is still building). The toolbar's design tools (Edit, Theme, Sections, Site, Health) shrink to icons in narrow panes.

## Code tab
Read-only source viewer with line numbers, a line/size summary and a **Copy** button. On phones the file list becomes a dropdown (`components/CodeView.tsx`).

## Keyboard shortcuts
Press `?` (outside a text field) or click the keyboard icon in the editor header: Enter sends, Shift+Enter adds a line, Ctrl+Z / Ctrl+Shift+Z undo and redo, Esc closes panels and leaves full preview.

## Project thumbnails
A few seconds after a project's home page settles (never while the AI is writing), the preview takes a small screenshot of itself with `html-to-image` (loaded from cdnjs inside the sandboxed iframe) and the home page shows it on the project card. Thumbnails are kept in this browser only (`lovable-clone:thumb:<id>`, about 15 KB each, see `lib/thumb.ts`); if the script cannot load, the card keeps its colored badge.

## Backup-model notice
When the main model is busy and a backup model answers, the chat shows an amber banner ("a backup model is answering, results may be rougher"). The server sends it as a first `[notice] ...` line in the stream, which `lib/notice.ts` splits off before the reply is parsed.

## Plan check on multi-page sites
After the first build from an approved plan, `lib/planCheck.ts` compares the result with it. For multi-page plans it looks at `/pages/<Page>.js`: every ticked section of a page must be rendered there (or exist as a component), no unplanned section may appear, and every planned page must exist. If something is off, one automatic fix pass is sent. Sites that are not built with a `/pages` folder are not judged.

## Visual review with AI
**Health → Visual review with AI** takes a tall screenshot of the running preview at desktop width and again at phone width (`html-to-image` inside the sandboxed iframe, scaled to at most 900px wide), attaches both to a chat message and asks the model to look at them like a designer: overlapping or clipped text, unreadable contrast, broken images, awkward gaps, things that overflow on a phone. It fixes only real defects with small `<edit>` blocks, or says nothing is wrong. This catches layout problems that the code-based health checks cannot see, and helps most when a backup model wrote the site. The chat shows a short label ("Visual design review of my site") with the two screenshots instead of the long prompt (`label` on a message, see `lib/review.ts`). Needs a vision-capable model and internet access for the screenshot script.

## End-to-end tests
`npm run e2e` drives the real app in Chromium (Playwright, `e2e/`): the landing page, building a site from a prompt, the preview, popovers closing with Esc, the Code tab, keyboard shortcuts and the phone layout. The AI is mocked (`e2e/helpers.ts` answers `/api/generate` with a canned two-section site), so the tests are free and deterministic; the preview still loads Tailwind, Babel and React from CDNs, so they need internet. Locally it reuses a running `npm run dev` or starts one; in CI (`.github/workflows/ci.yml`) it runs against the production build after the unit tests, and uploads traces if something fails. First time: `npx playwright install chromium`.

## Choosing the AI provider
Any OpenAI-compatible API works as the main provider (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_FALLBACK_MODELS`) and one more as the backup (`LLM_BACKUP_*`, tried when every main model fails). A good setup is paid OpenAI as the main provider (`gpt-4.1`, falling back to `gpt-4.1-mini`) with free Gemini as the backup; set `LLM_BACKUP_VISION=true` so screenshots and image attachments also work on the backup. When the backup answers, the chat shows the amber notice. Keys live only in `.env.local` (git-ignored).

## Topic-matched photos (Unsplash)
The built-in photo library has only about 50 photos, so a photographer's or a fashion brand's site used to get handshakes and laptops. With a free Unsplash key (`UNSPLASH_ACCESS_KEY`, unsplash.com/developers, 50 requests per hour) the generate route first asks the model for 2 to 4 search queries that fit the request (`lib/unsplash.ts`), searches Unsplash, and adds a "Matched photos" list (paid and nameless photos dropped, portrait/landscape noted) to the user's turn; the model is told to use those first and the general library only for subjects they do not cover. It runs for new projects and for requests that mention photos, images, galleries, heroes or banners, never for the app's own fix and review prompts, caches results for an hour and never delays a build by more than about 9 seconds. Without the key nothing changes. Photos are hot-linked from Unsplash (their API terms ask for this); attribution and the download ping are not implemented.

## Brand-color check
After the first build, `lib/brandCheck.ts` looks for Tailwind's default accent colors (indigo, violet, purple, fuchsia, blue) written directly in the code instead of the theme's `brand-*` scale. Three or more hits, or any single hardcoded background or gradient, send one automatic fix pass ("replace with brand-*, same shade numbers"). This keeps a "monochrome" plan from ending up with a navy hero and a violet call-to-action band.

## Automatic visual review
Turned on by the **Check its looks** switch on the home page (on by default). When the first version of a website is finished (after any fix and expand passes), the preview screenshots itself at desktop and phone width and sends both to the AI with the visual-review prompt (see "Visual review with AI"). It runs once per project, only for sites (`/site.json` exists), and is skipped when the preview is not on screen (for example on a phone's chat pane). The chat shows "Automatic visual review of the finished site" with the screenshots.

## Theme on fresh builds
While the AI writes, the preview loads an empty page first so sections can appear live, and files are swapped into it without reloading. Its Tailwind config (the `brand-*` scale), Google Fonts link and `<html lang>` come from `/theme.json` and `/site.json`, which do not exist yet at that point, so the page starts with the default indigo theme. At the end of the build `lib/previewKey.ts` compares the style key of the loaded page with the finished site's; if they differ, the preview reloads once (a plain hot update would keep the default colors and fonts). `e2e/builder.spec.ts` checks that a fresh build renders the theme's brand color, not `rgb(79, 70, 229)`.
