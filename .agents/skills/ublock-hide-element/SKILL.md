---
name: ublock-hide-element
description: Block a webpage element with a live-verified uBlock Origin filter. Use when the user wants to hide or remove an unwanted webpage element (promo, popup, or similar) by URL or description.
argument-hint: "<URL and/or what to hide> (optional)"
---

# Hide webpage element → verified uBlock filter

Produce a uBlock Origin cosmetic filter built from the live DOM, never from guessed or source-viewed HTML (SPA/JS DOM differs from static source). Every filter is verified in the browser before shipping.

## Setup — browser for chrome-devtools MCP

- Chrome often missing → MCP launch fails on `channel: stable`.
- Fix in `%USERPROFILE%\.config\opencode\opencode.json` (Windows example; or `~/.config/opencode/opencode.json`), MCP server `chrome-devtools`:
  `npx -y chrome-devtools-mcp@1.12.0 --executablePath "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"` (or any installed Chromium-channel browser).
- Config edit picked up without app restart (MCP re-spawned with new args).
- Browser may restart mid-task, invalidating pageId/uid — re-run `list_pages` and re-navigate; found facts stay valid.

## Reproduce the element

1. `navigate_page` to the URL.
2. Element absent → browser mis-spoofed: MCP-launched Edge reports UA without the `Edg` token, so sites serve a different DOM. `emulate` the expected real UA (append the missing channel token, e.g. `...Safari/537.36 Edg/156.0.0.0`), reload.
3. Confirm the element is present: scan the snapshot/page text for its copy (e.g. "Download Chrome"), not just the page load.

## Capture the element

1. Eval a TreeWalker in the page to locate the text node containing the distinct copy.
2. Walk the ancestor chain, dumping tag name + every attribute per ancestor; stop at the promo's own wrapper (dialog root / overlay container).
3. Pick the anchor, most-stable first:
   - IDs referenced by the element's own `aria-labelledby` / `aria-describedby` (popup names its label ids).
   - `role="dialog"` + promo-specific `aria-*` attributes.
   - Custom-element tag name — copy case exactly (`G-BOTTOM-SHEET`).
   - `data-*` / `jscontroller` last. Never CSS classes alone — they rotate every deploy.

Rule: specific > broad. The selector must be unable to hide unrelated site UI.

## Build the filter

- Format `host##selector` for cosmetic hide; default no network rules (add XHR/script rules only if the DOM is rebuilt by an injected script).
- Host: page hostname; entity domains valid for cosmetics — `google.*` covers all Google TLDs (uBO Static filter syntax).
- Only promo-pinned attributes in the selector; complete attribute list copied verbatim from capture.
- Shared container → guard by distinguishing copy, never bare-hide: `.container:has(> .header:has-text(Target heading))` (one container may serve both target and wanted content — Google reuses one suggestion container for trending + typed autocomplete).
- Extended operators (`:has-text()`, `:upward()`, ...) must appear in uBO wiki "Procedural cosmetic filters" before shipping — a silently discarded filter is indistinguishable from a working one.

## Verify live (do not skip — completion criterion)

Syntax first (uBO silently discards invalid cosmetic filters): host present, no `##` inside the selector half, every extended operator documented in uBO wiki "Procedural cosmetic filters". Then:

1. Count: For plain-CSS selectors, `document.querySelectorAll(sel).length` — must equal visible target instances. Procedural selectors (`:has-text()`, `:upward()`, etc.) require uBO's filter engine or element picker (native DOM queries do not support procedural pseudo-classes). Extras → investigate.
2. Adjacent states: reproduce a state where the element must not hide (e.g. typed input replaces trending list) and assert selector matches 0 there.
3. Style injection: For plain-CSS portions, inject `sel { display:none !important }` as a style tag → element hidden.
4. Page intact: still interactive, no leftover scrim/overlay, screenshots before/after.
5. Fail → back to Capture, iterate. An unverified filter is not a deliverable.

Report what was verified and what was not (e.g. mobile layout, feeds behind anti-bot walls). Where a surface cannot be verified, require the text guard so its failure mode is a no-op, not over-hiding.

## Add to filter list (when asked)

- Desktop → `filters-PC.txt`, mobile → `filters-Mobile.txt`, under the `! === Site ===` section, matching surrounding comment style.
- One filter line per confirmed element anchor; fallback variant only as a commented-out line.
