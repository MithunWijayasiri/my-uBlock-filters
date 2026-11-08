---
name: ublock-hide-element
description: Block a webpage element with a live-verified uBlock Origin filter. Use when the user wants to hide or remove an unwanted webpage element (promo, popup, or similar) by URL or description.
argument-hint: "<URL and/or what to hide> (optional)"
---

# Hide webpage element → verified uBlock filter

Produce a uBlock Origin (uBO) filter built from the live DOM, never from guessed or source-viewed HTML (SPA/JS DOM differs from static source). Every filter is verified in the browser before shipping.

Detail lives in `references/` — read the matching file before that step:
- Operator choice, efficiency, syntax pitfalls → `references/filter-syntax.md`
- Hide vs remove vs scriptlet vs network → `references/techniques.md`
- Selector stability, verify steps, repo check → `references/verification.md`

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
4. If element is lazy/clip-gated, scroll into view. If inside shadow DOM or iframe, note the host — plain `querySelectorAll` won't cross those boundaries.

## Capture the element

1. Eval a TreeWalker in the page to locate the text node containing the distinct copy.
2. Walk the ancestor chain, dumping tag name + every attribute per ancestor; stop at the promo's own wrapper (dialog root / overlay container).
3. Pick the anchor per `references/verification.md` stability order (`#id` → attributes → web-component tag → data flags → class last).

Rule: specific > broad. The selector must be unable to hide unrelated site UI.

## Choose technique

Default: cosmetic `##`. Per `references/techniques.md`: `display:none` hide → `:remove()` for gaps/scrims → `:remove-attr()` + `:watch-attr()` for class-toggled overlays → `##+js(...)` scriptlet for storage banners that return after reload → narrowed network rule only when a request rebuilds the DOM.

## Build the filter

Per `references/filter-syntax.md`: declarative CSS first, procedural only when plain CSS can't isolate it; smallest resultset in the Element Picker; one procedural per line; host-specific procedural; CSSTree quoting (`:has-text(/slowed/i)`); shared containers guarded by `:has(> .header:has-text(...))`, never bare-hidden.

## Verify live (do not skip — completion criterion)

Per `references/verification.md`: Dashboard > My filters paste check → Picker / `querySelectorAll` count → adjacent-state 0 matches → style injection → reload + scroll (shadow/iframe aware) → page intact. Fail → back to Capture, iterate. An unverified filter is not a deliverable.

Report what was verified and what was not (e.g. mobile layout, feeds behind anti-bot walls). Where a surface cannot be verified, require the text guard so its failure mode is a no-op, not over-hiding.

## Add to filter list (when asked)

- Desktop → `filters-PC.txt`, mobile → `filters-Mobile.txt`, under the `! === Site ===` section, matching surrounding comment style.
- One filter line per confirmed element anchor; fallback variant only as a commented-out line.
