# Filter syntax: declarative-first, efficiency, pitfalls

Read before building any `##` rule. Sources: uBO wiki *Static filter syntax*, *Procedural cosmetic filters*, *Filter Performance*.

## Declarative before procedural

Only use procedural operators (`:has-text()`, `:upward()`, `:xpath()`, ...) when plain CSS can't isolate the element.

Order: plain CSS → native `:has()` → procedural `:has-text()` → `:upward()` / `:matches-attr()` / `:matches-path()` → `:xpath()` last.

## Efficiency (Filter Performance)

- Smallest resultset wins: break the selector in the Element Picker prefix-by-prefix; ship the shortest prefix that doesn't over-hide.
- Prefer native (declarative) `:has()` — browser handles it. Falling back to procedural `:has()` / `:has-text()` costs JS.
- `:upward()` walks one ancestor chain; `:has()` descends many children. For "hide the ancestor of the text", prefer `subject:has-text(X):upward(ancestor)` over `ancestor:has(.x:has-text(X))`.
- Route-gated element → `:matches-path()` first. Plain-text arg matches any substring of path + query, so `:matches-path(/watch)` also fires on `/watch-archive`. For one route only, anchor a regex allowing the query string: `youtube.com##:matches-path(/^\/watch(\?|$)/) ...`. Width-gated → `:matches-media()` last: `...:matches-media((min-width: 800px))`.
- Attribute/class toggles → `:watch-attr(<attr>)` on the attribute the site actually changes (`class`, `style`, ...), then strip it: `example.com##.overlay:watch-attr(class):remove-class(open)`.

## Syntax that silently discards filters

- Procedural filters must be host-specific. Generic procedural (`##div:has-text(...)`) is discarded by uBO.
- No comma-joined procedural selectors — `p:has(img),div:has-text(ad)` breaks; split into separate lines. Chaining operators on one selector is fine (`:has-text(X):remove()`); the ban is on commas, not chains.
- CSSTree parser: prefer regex literal for text args — `:has-text(/slowed/i)` — over bare text when quotes/specials appear. Quote args that trip the parser; escape an inner same-quote with a single backslash (`\'`) and escape `\`.
- Extended operators (`:has-text()`, `:upward()`, `:matches-attr()`, `:matches-path()`, `:watch-attr()`, ...) must appear in uBO wiki *Procedural cosmetic filters* / *Static filter syntax* before shipping. uBO drops invalid filters without error → target stays visible; the Dashboard > My filters check flags them. Do not invent operators.
- `#?#` forces procedural (prevents conversion to declarative); `##` lets uBO pick native `:has()` when available. Use `##` unless you need to pin procedural behavior.
- Only stable, promo-specific attributes in the selector, copied verbatim from capture. Exclude transient/session values (tokens, timestamps) — they survive a reload but change on a later visit, so an exact-match selector then misses the promo.
- Host: page hostname; entity domains valid for cosmetics — `google.*` covers all Google TLDs. Keep one entity style per site (e.g. `google.*` vs `www.google.*`) — don't mix.
- Shared container → guard by distinguishing copy, never bare-hide: `.container:has(> .header:has-text(Target heading))` (one container may serve both target and wanted content — Google reuses one suggestion container for trending + typed autocomplete).