# Selector stability + verification

Read before capturing anchors or verifying a candidate.

## Capture stability

Pick the anchor, most-stable first:

1. `#id` referenced by the element's own `aria-labelledby` / `aria-describedby`. Confirm the ID persists across navigation, render sequences, and a new session — generated IDs can survive a reload yet change later. If it shifts, use another specific anchor.
2. Stable attributes: `[href*="..."]`, `[data-*]`, `role="dialog"` + promo-specific `aria-*`.
3. Web-component tag — copy case exactly (`G-BOTTOM-SHEET`, `ytd-rich-item-renderer`).
4. `data-*` / `jscontroller` / `jsname` / `itemtype` / `[is-post]`-style flags.
5. Randomized attributes → `:matches-attr()`.
6. CSS class last. Never class alone.

Hashed-class detector: short mixed-case class `[A-Za-z]{6,8}` (`ynRric`, `YzCcne`) = unstable, rotates every deploy. Never ship alone; require an attribute guard, a verified scope, or a comment documenting the live verification.

Avoid generic `div:has-text(...)` and long `body > div > div...` chains — target the web-component tag, container id, or data attribute.

Shadow DOM / iframe / lazy: note the host — plain `querySelectorAll` won't cross boundaries. Scroll lazy content into view before asserting count.

## Verify live (do not skip — completion criterion)

Syntax first (uBO silently discards invalid cosmetic filters):

1. Host present, no unquoted `##` in the selector half (quoted values like `a[href*="##"]` are valid), every extended operator documented in uBO wiki *Procedural cosmetic filters* / *Static filter syntax*.
2. Paste the candidate into uBO Dashboard > My filters — invalid filters are flagged there. Enable My filters and click **Apply changes** so the candidate is active before the reload check.
3. Count in Element Picker: for plain-CSS selectors, `document.querySelectorAll(sel).length` must equal all target nodes, including hidden responsive-layout instances kept in the DOM. Inspect the matches to separate targets from unrelated elements. Native `:has()` works in modern browsers; procedural selectors (`:has-text()`, `:upward()`, etc.) need the Picker / uBO engine (native DOM queries don't support them) — use the Picker match count. Extras → investigate.
4. Adjacent states: reproduce a state where the element must not hide (e.g. typed input replaces trending list) and assert 0 matches there.
5. Verify the complete candidate in uBO, not just its CSS portion. For plain-CSS filters, inject `sel { display:none !important }` → element hidden. For procedural/action filters (text-guarded `:remove()`, etc.), CSS injection hides nodes the full filter would preserve and never tests the action — apply the full filter in uBO and confirm its actual effect plus adjacent states after reload.
6. Reload + scroll: reload (filter still applies; storage banners may need a scriptlet — see `techniques.md`), scroll lazy feeds, check shadow DOM / iframes.
7. Page intact: still interactive, no leftover scrim/overlay, screenshots before/after.
8. Fail → back to Capture, iterate. An unverified filter is not a deliverable.

Report what was verified and what was not (e.g. mobile layout, feeds behind anti-bot walls). A text guard alone does not make an unverified surface safe — `:has-text()` matches ancestors containing the copy, so `article:has-text(Sponsored)` can hide a whole feed. For unverified surfaces, require a verified scope (host, `:matches-path()`, container) or leave the filter inactive.

## Repo check

After adding: run `pnpm run lint` and `pnpm run test` (syntax allowlist in `tests/sanity.spec.ts` must know any new operator).