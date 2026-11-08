# Repository Guidelines

## Project Overview
Custom uBlock Origin filter lists (`filters-PC.txt` and `filters-Mobile.txt`) providing clutter removal and cosmetic cleanups for Google, YouTube (Desktop & Mobile), YouTube Music, Gemini, and Reddit. Filter lists are consumed via raw GitHub URLs from `main`, tested automatically with Playwright and Biome in CI, and released via on-demand GitHub Actions.

## Architecture & Data Flow
- **Single-Branch Model**:
  - `main`: Development target and production release branch consumed by ad blocker subscriptions (`raw.githubusercontent.com/.../main/...`).
  - Feature branches: short-lived; changes land via PRs to `main`.
- **Data Flow & Lifecycle**:
  1. **Development**: Edit filter rules (`filters-PC.txt`, `filters-Mobile.txt`) or tests on a feature branch → open PR to `main`.
  2. **CI Validation**: `.github/workflows/ci.yml` runs Biome linting and Playwright test suites on PRs to `main` and pushes to `main`.
  3. **Release Pipeline**: `.github/workflows/deploy.yml` runs on-demand via `workflow_dispatch` only. Pick any branch in the dispatch UI (defaults to `main`); optional `force: true` input.
     - `check-changes`: `force` → release. Selected branch `main` → release (re-stamps headers). Else diff selected branch vs `origin/main` on filter files → release only if they differ.
     - `test-rules`: Playwright filter syntax and DOM sanity tests on Chromium against the selected branch.
     - `release-filters`: checkout `main`; merge selected branch (`--no-ff`) when not `main`; auto-stamp `! Version:` and `! Last modified:` headers in both filter files; commit + push to `origin/main` as `FilterBot`. Skips commit when headers unchanged.

## Key Directories
- `.github/workflows/`: CI (`ci.yml`) and automated release (`deploy.yml`) GitHub Actions workflows.
- `tests/`: Automated test suite (`sanity.spec.ts`) validating filter syntax, structural integrity, and live/mocked DOM cosmetic behavior.
- `.agents/skills/`: Custom agent capabilities, notably `ublock-hide-element` for capturing and authoring DOM-verified uBlock cosmetic filters.

## Development Commands
- **Install Dependencies**: `pnpm install --frozen-lockfile`
- **Lint & Format Check**: `pnpm run lint` (runs `biome check .`)
- **Apply Lint & Format Fixes**: `pnpm run lint:fix` (runs `biome check --write .`)
- **Run Tests**: `pnpm run test` or `pnpm exec playwright test`
- **Run Tests (Specific File)**: `pnpm exec playwright test tests/sanity.spec.ts --project=chromium`
- **Trigger Release**: `gh workflow run deploy.yml --ref <branch>` (dispatch UI defaults to `main`). Force: `gh workflow run deploy.yml --ref main -f force=true`.
- **Line Endings**: LF enforced via `.gitattributes` (`* text=auto eol=lf`). Keeps Biome green on Windows where `core.autocrlf=true` would otherwise write CRLF.

## Code Conventions & Common Patterns
- **Filter List Header Conventions**:
  - Line 1 must strictly be `[Adblock Plus 2.0]`.
  - Standard 7-line header format:
    ```adblock
    [Adblock Plus 2.0]
    ! Title: Custom Filters by Mithun
    ! Description: Personal rules for uBlock Origin, and Brave Shields (Desktop).
    ! Version: YYYYMMDDHHMM
    ! Last modified: YYYY-MM-DDTHH:MM:SSZ
    ! Expires: 1 day
    ! Homepage: https://github.com/MithunWijayasiri/my-uBlock-filters
    ```
  - Mobile list uses `(Mobile)` in Description instead of `(Desktop)`.
- **Filter Rule Syntax**:
  - Domain-scope cosmetic rules by default: `example.com##selector` or `example.com#@#exception-selector`. Use network rules (`||example.com/...`) only when a request rebuilds the DOM.
  - Use standard CSS selectors where possible, including native `:has()`, `:not()`, `:is()`, `:where()`. Reserve uBO procedural operators (`:has-text()`, `:upward()`, `:matches-attr()`, `:matches-path()`, `:remove()`, ...) for when standard CSS cannot uniquely isolate the element.
  - Avoid overly generic or fragile tags (e.g. `div:has-text(...)`). Target stable web-component custom tags, container IDs, or data attributes (e.g., `ytd-rich-item-renderer:has(...)`, `G-BOTTOM-SHEET[role="dialog"]`).
  - Comment sections clearly using `! === Section Name ===` and explain the element targeted.
- **JavaScript / TypeScript Formatting (Biome)**:
  - 2-space indentation.
  - Single quotes (`quoteStyle: "single"`) in JS/TS.
  - Double quotes in JSON (Biome default).
  - Automatic import organization (`assist.actions.source.organizeImports: "on"`, Biome v2).
  - Semicolons required (Biome default `always`).

## Important Files
- `filters-PC.txt`: Core desktop filter rules covering Google, YouTube Desktop (`ytd-*`), YouTube Music, Gemini, and Reddit.
- `filters-Mobile.txt`: Core mobile filter rules covering Google, YouTube Mobile (`ytm-*` components, compact feed carousels), and YouTube Music.
- `playwright.config.ts`: Playwright runner settings, Chromium project configuration, YouTube consent cookies (`SOCS`), and timeout defaults.
- `tests/sanity.spec.ts`: Consolidated test spec covering syntactic verification (`validateFilterSyntax`), YouTube desktop sanity, Google desktop sanity, and YouTube mobile sanity.
- `biome.json`: Linter and formatter rules, VCS integration, file scopes, and style constraints.
- `.github/workflows/deploy.yml`: On-demand release automation — branch-selectable dispatch, diff checks, test validation, optional branch merge, version header stamping.
- `.agents/skills/ublock-hide-element/SKILL.md`: Lean workflow plus `references/` (`filter-syntax.md`, `techniques.md`, `verification.md`) for authoring and verifying cosmetic selectors on live DOM using Chrome DevTools.

## Runtime/Tooling Preferences
- **Node.js**: Node 24 (`node-version: 24` in CI setup-node, `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` in Playwright jobs).
- **Package Manager**: `pnpm` pinned to `10.24.0` via `packageManager` in `package.json`. Always use `--frozen-lockfile` in CI.
- **Linter & Formatter**: Biome v2.6.3 (replaces ESLint and Prettier).
- **Test Framework**: Playwright v1.57.0 (Chromium only; avoid installing unnecessary WebKit/Firefox engines).

## Testing & QA
- **Test Categories in `tests/sanity.spec.ts`**:
  1. *Filter Syntax & Structural Integrity*: Tests `SYNTAX_TEST01` and `SYNTAX_TEST02` check header invariants, balanced brackets/parentheses, domain scoping, and permitted procedural pseudo-classes.
  2. *Live Network Sanity Tests*: Tests `YT_TEST01`, `YT_TEST02`, `YT_TEST03`, `GOOG_TEST01`, `M_YT_TEST01` load live pages, inject filter CSS via `page.addStyleTag()`, and assert that search inputs, search results, video players, and mobile top bars remain functional and visible.
  3. *Synthetic DOM Tests*: Tests `YT_TEST04`, `GOOG_TEST02`, `GOOG_TEST03`, `M_GOOG_TEST01`, `M_YT_TEST02` mock HTML components in isolation (`page.setContent()`), inject the filter CSS, and verify targeted promo/clutter elements receive `display: none` while unaffected siblings remain visible.
- **Flakiness Considerations**:
  - Live tests (e.g. `YT_TEST01`) use up to 30s timeouts for dynamic video renderer hydration.
  - Playwright report artifacts (`playwright-report/` and `test-results/`) are uploaded in CI unless cancelled (`if: !cancelled()`, 7-day retention).
