# Filter syntax: declarative-first, efficiency, pitfalls

Read before building any `##` rule. Sources: uBO wiki *Static filter syntax*, *Procedural cosmetic filters*, *Filter Performance*.

## Declarative before procedural

Only use procedural operators (`:has-text()`, `:upward()`, `:xpath()`, ...) when plain CSS can't isolate the element.

Order: plain CSS → native `:has()` → procedural `:has-text()` → `:upward()` / `:matches-attr()` / `:matches-path()` → `:xpath()` last.

## Efficiency (Filter Performance)

- Smallest resultset wins: break the selector in the Element Picker prefix-by-prefix; ship the shortest prefix that doesn't over-hide.
- Prefer native (declarative) `:has()` — browser handles it. Falling back to procedural `:has()` / `:has-text()` costs JS.
- `:upward()` walks one ancestor chain; `:has()` descends many children. For "hide the ancestor of the text", prefer `subject:has-text(X):upward(ancestor)` over `ancestor:has(.x:has-text(X))`.
- Route-gated element → `:matches-path()` first: `youtube.com##:matches-path(/watch) ...`. Width-gated → `:matches-media()` last: `...:matches-media((min-width: 800px))`.
- Attribute toggles → `:watch-attr()`: `example.com##.overlay[class]:watch-attr(class):remove-attr(class)`.

## Syntax that silently discards filters

- Procedural filters must be host-specific. Generic procedural (`##div:has-text(...)`) is discarded by uBO.
- One procedural selector per line — comma-joined procedural (`p:has(img),div:has-text(ad)`) breaks. Split into separate lines.
- CSSTree parser: prefer regex literal for text args — `:has-text(/slowed/i)` — over bare text when quotes/specials appear. Quote args that trip the parser; escape inner same-quotes (`\''`) and `\`.
- Extended operators (`:has-text()`, `:upward()`, `:matches-attr()`, `:matches-path()`, `:watch-attr()`, ...) must appear in uBO wiki *Procedural cosmetic filters* before shipping — a silently discarded filter is indistinguishable from a working one. Do not invent operators.
- `#?#` forces procedural (prevents conversion to declarative); `##` lets uBO pick native `:has()` when available. Use `##` unless you need to pin procedural behavior.
- Only promo-pinned attributes in the selector; complete attribute list copied verbatim from capture.
- Host: page hostname; entity domains valid for cosmetics — `google.*` covers all Google TLDs. Keep one entity style per site (e.g. `google.*` vs `www.google.*`) — don't mix.
- Shared container → guard by distinguishing copy, never bare-hide: `.container:has(> .header:has-text(Target heading))` (one container may serve both target and wanted content — Google reuses one suggestion container for trending + typed autocomplete).
