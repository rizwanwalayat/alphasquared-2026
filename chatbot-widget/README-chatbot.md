# Ask Alpha² — chatbot widget integration

Three files:
- `chatbot.css` — all widget styling, scoped with an `askA2-` prefix so it can't collide with existing site classes
- `chatbot.js` — all behavior (open/close, quick questions, free text, canned replies), wrapped in an IIFE so it's safe to include anywhere
- `chatbot-snippet.html` — the HTML block to paste into the page

## Where things go

1. Copy `chatbot.css` into your `css/` folder.
2. Copy `chatbot.js` into your `js/` folder.
3. In `index.html`:
   - Add this in `<head>`, after the existing stylesheet link:
     ```html
     <link rel="stylesheet" href="css/chatbot.css">
     ```
   - Paste the entire contents of `chatbot-snippet.html` right before `</body>`, after your existing script tags (gsap, lenis, main.js).
   - Add this last, after the snippet:
     ```html
     <script src="js/chatbot.js"></script>
     ```

## Matching your real design system

`chatbot.css` uses `--chat-*` variables that fall back to hardcoded colors if your site doesn't already define matching variables. For this to actually look native (not just "close enough"), open `css/style.css`, find the real variable names used there (or the actual hex values if it doesn't use CSS variables), and update the `:root` block at the top of `chatbot.css` accordingly — e.g. if your site's accent blue is `var(--accent)`, change `--chat-accent1: var(--accent1, #4D7CFE);` to reference that instead.

## Important — this is still UI only

The Q&A in `chatbot.js` (the `answers` object) is hardcoded to 4 exact questions. Anything else gets a generic fallback pointing to booking a call. This is fine to ship as a first version, but it is not "ask anything" in the real sense yet.

To make it a real AI assistant that can answer arbitrary questions:
- You need a backend endpoint (this can't be done in static HTML alone) that takes the user's message and returns a real AI-generated answer — typically by calling an LLM API with your site/company content as context.
- Rough options: a small serverless function (Netlify Functions, since you're already on Netlify, is a natural fit) that calls the Claude API (or similar) server-side, so your API key never sits in client-side JS.
- Once that endpoint exists, replace the `respond()` function in `chatbot.js` with a `fetch()` call to it instead of looking answers up in the local `answers` object.

Happy to help design that backend piece (the Netlify function, prompt, and what site content to feed it) once you're ready for that step — just say so.

## Site-wide vs. homepage only

Right now this task only adds it to `index.html`. If you want it on every page (which is how chat widgets are normally done — persistent across navigation), the same 3-line include (`<link>`, snippet, `<script>`) needs to go on every other `.html` file too. Worth deciding that before or after this first pass ships.
