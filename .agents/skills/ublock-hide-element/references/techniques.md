# Choose technique: hide vs remove vs scriptlet vs network

Default: cosmetic `##`. Reach for the next only when cosmetic can't fix the cause.

| Case | Filter form | When |
| --- | --- | --- |
| CSS hide | `host##selector` → `display:none` | Default. |
| Remove | `host##selector:remove()` → deletes from DOM | `display:none` leaves a gap, scrim, or reserved space. |
| Attr/class strip | `host##selector:remove-attr(class)` / `:remove-class()` | Overlay is toggled by class/attr change; pair with `:watch-attr(class)` so uBO re-evaluates on change. |
| Scriptlet | `host##+js(set-cookie, modalDismissed, 1)` or `host##+js(set-session-storage-item, key, 1)` | Popup reappears after reload/dismiss (storage-backed). See Resources Library for the catalog. Do not pile on more CSS for a storage-backed banner. |
| Network | `||host/path$script,3p` + `domain=` narrowing | Only when the element is rebuilt by a request/script. Keep tokenizable and narrowed (`1p`/`3p`/`script` etc.); avoid multi-wildcard regex noise. |

No network rules by default — add XHR/script rules only if the DOM is rebuilt by an injected script.
