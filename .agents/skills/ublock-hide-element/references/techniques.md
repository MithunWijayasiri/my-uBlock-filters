# Choose technique: hide vs remove vs scriptlet vs network

Default: cosmetic `##`. Reach for the next only when cosmetic can't fix the cause.

| Case | Filter form | When |
| --- | --- | --- |
| CSS hide | `host##selector` → `display:none` | Default. |
| Remove | `host##selector:remove()` → deletes from DOM | `display:none` leaves a gap, scrim, or reserved space. |
| Class strip | `host##selector:remove-class(overlay-class)` | Overlay toggled by a class. Removes only that class, keeps layout/theme classes. Pair with `:watch-attr(class)` so uBO re-evaluates on change. |
| Attr strip | `host##selector:remove-attr(onclick)` | Attribute removable in full. `:remove-attr(class)` deletes ALL classes → breaks shared elements; use `:remove-class()` for class toggles. Watch the attribute the site changes (`:watch-attr(class)` / `:watch-attr(style)`). |
| Scriptlet | `host##+js(set-cookie, modalDismissed, 1)` or `host##+js(set-session-storage-item, key, 1)` | Popup reappears after reload/dismiss (storage-backed). See Resources Library for the catalog. Do not pile on more CSS for a storage-backed banner. |
| Network | `\|\|host/path$script,3p` + `domain=` narrowing | Only when a request/script rebuilds the element and cosmetic can't safely stop it. Keep tokenizable and narrowed (`1p`/`3p`/`script` etc.); avoid multi-wildcard regex noise. |

No network rules by default — add narrowly scoped XHR/script rules only when a request or injected script rebuilds the DOM and cosmetic filters can't safely stop the overlay. Verify a network rule against the target request (reset site state, apply rule, confirm the request is blocked), not merely the popup's absence.