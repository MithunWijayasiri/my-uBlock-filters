import * as fs from 'node:fs';
import * as path from 'node:path';
import { devices, expect, type Page, test } from '@playwright/test';

function domainMatches(ruleDomain: string, targetHostname: string): boolean {
  if (ruleDomain.includes('*')) {
    const regex = new RegExp(
      `^${ruleDomain.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`,
    );
    return regex.test(targetHostname);
  }
  return (
    targetHostname === ruleDomain || targetHostname.endsWith(`.${ruleDomain}`)
  );
}

function parseCosmeticFilters(
  filePath: string,
  targetHostname?: string,
): string {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith('!') &&
        !line.startsWith('[') &&
        line.includes('##'),
    )
    .filter((line) => {
      if (!targetHostname) return true;
      const ruleDomain = line.split('##')[0];
      return domainMatches(ruleDomain, targetHostname);
    })
    .map((line) => {
      const parts = line.split('##');
      const selector = parts.slice(1).join('##');
      if (/:(has-text|upward|remove)/.test(selector)) {
        return '';
      }
      return selector ? `${selector} { display: none !important; }` : '';
    })
    .filter(Boolean)
    .join('\n');
}

const PC_FILTERS_PATH = path.join(__dirname, '../filters-PC.txt');
const MOBILE_FILTERS_PATH = path.join(__dirname, '../filters-Mobile.txt');

function validateFilterSyntax(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map((l) => l.trim());

  expect(lines.length).toBeGreaterThan(0);
  expect(lines[0]).toBe('[Adblock Plus 2.0]');

  const validProceduralOps =
    /^:(has-text|upward|remove(-attr|-class)?|matches-css(-before|-after)?|xpath|watch-attr|min-text-length)$/;

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    if (!line || line.startsWith('!') || line.startsWith('[')) return;

    if (line.includes('##') || line.includes('#@#')) {
      const isException = line.includes('#@#');
      const parts = line.split(isException ? '#@#' : '##');
      const domain = parts[0];
      const selector = parts.slice(1).join(isException ? '#@#' : '##');

      expect(domain.length, `Line ${lineNum} missing domain`).toBeGreaterThan(
        0,
      );
      expect(
        selector.length,
        `Line ${lineNum} missing selector`,
      ).toBeGreaterThan(0);

      let brackets = 0;
      let parens = 0;
      for (const char of selector) {
        if (char === '[') brackets++;
        if (char === ']') brackets--;
        if (char === '(') parens++;
        if (char === ')') parens--;
        expect(
          brackets,
          `Line ${lineNum} unbalanced brackets`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          parens,
          `Line ${lineNum} unbalanced parentheses`,
        ).toBeGreaterThanOrEqual(0);
      }
      expect(brackets, `Line ${lineNum} unclosed brackets`).toBe(0);
      expect(parens, `Line ${lineNum} unclosed parentheses`).toBe(0);

      // Verify procedural operators if present
      const pseudoMatches = selector.match(/:[a-z-]+(?=\()/g);
      if (pseudoMatches) {
        for (const pseudo of pseudoMatches) {
          const isStandardCss = [
            ':has',
            ':is',
            ':not',
            ':where',
            ':nth-child',
            ':nth-of-type',
          ].includes(pseudo);
          if (!isStandardCss) {
            expect(
              validProceduralOps.test(pseudo),
              `Line ${lineNum} unknown procedural operator ${pseudo}`,
            ).toBe(true);
          }
        }
      }
    } else if (line.startsWith('||')) {
      expect(line.length).toBeGreaterThan(2);
    } else {
      throw new Error(`Unrecognized rule format at line ${lineNum}: ${line}`);
    }
  });
}

test.describe('Filter Syntax & Structural Integrity', () => {
  test('SYNTAX_TEST01: filters-PC.txt has valid header and rule syntax', () => {
    validateFilterSyntax(PC_FILTERS_PATH);
  });

  test('SYNTAX_TEST02: filters-Mobile.txt has valid header and rule syntax', () => {
    validateFilterSyntax(MOBILE_FILTERS_PATH);
  });
});

test.describe('filters-PC.txt YouTube Desktop Sanity Tests', () => {
  let customCss: string;

  test.beforeAll(() => {
    customCss = parseCosmeticFilters(PC_FILTERS_PATH, 'www.youtube.com');
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
  });

  async function openWithFilters(page: Page, url: string) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const consentButton = page
      .getByRole('button', { name: /(accept all|reject all|i agree|agree)/i })
      .first();
    if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentButton.click().catch(() => {});
    }
    await page.addStyleTag({ content: customCss });
  }

  test('YT_TEST01: Home page loads and search input is usable', async ({
    page,
  }) => {
    await openWithFilters(page, 'https://www.youtube.com');

    await expect(page).toHaveTitle(/YouTube/);
    const searchBox = page
      .getByRole('combobox', { name: /search/i })
      .or(page.locator('input#search, input[name="search_query"]'))
      .first();
    await expect(searchBox).toBeVisible();
    await searchBox.fill('funny cats');
    await searchBox.press('Enter');

    await page.waitForURL(/results\?search_query=/);
    await expect(page.locator('ytd-video-renderer').first()).toBeVisible();
  });

  test('YT_TEST02: Search page core sections remain visible', async ({
    page,
  }) => {
    await openWithFilters(
      page,
      'https://www.youtube.com/results?search_query=funny+cats',
    );

    await expect(page.locator('ytd-search')).toBeVisible();
    await expect(page.locator('ytd-video-renderer').first()).toBeVisible();
    await expect(page.locator('a#video-title').first()).toBeVisible();
  });

  test('YT_TEST03: Watch page player and controls are present', async ({
    page,
  }) => {
    await openWithFilters(page, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    await expect(
      page.locator('.html5-video-player, #movie_player').first(),
    ).toBeVisible();
    await expect(
      page.locator('h1.ytd-watch-metadata, #title.ytd-watch-metadata').first(),
    ).toBeVisible();
    await expect(page.locator('.ytp-play-button')).toBeVisible();
  });

  test('YT_TEST04: Secondary engagement buttons and promo elements are hidden', async ({
    page,
  }) => {
    await page.setContent(`
      <div id="top-row" class="ytd-watch-metadata">
        <div id="sponsor-button">Join</div>
        <ytd-download-button-renderer>Download</ytd-download-button-renderer>
        <div id="unaffected-btn">Share</div>
      </div>
      <ytd-secondary-search-container-renderer id="secondary-search"></ytd-secondary-search-container-renderer>
    `);
    await page.addStyleTag({ content: customCss });

    const sponsorDisplay = await page
      .locator('#sponsor-button')
      .evaluate((el) => getComputedStyle(el).display);
    const downloadDisplay = await page
      .locator('ytd-download-button-renderer')
      .evaluate((el) => getComputedStyle(el).display);
    const secondaryDisplay = await page
      .locator('#secondary-search')
      .evaluate((el) => getComputedStyle(el).display);
    const unaffectedDisplay = await page
      .locator('#unaffected-btn')
      .evaluate((el) => getComputedStyle(el).display);

    expect(sponsorDisplay).toBe('none');
    expect(downloadDisplay).toBe('none');
    expect(secondaryDisplay).toBe('none');
    expect(unaffectedDisplay).not.toBe('none');
  });
});

test.describe('filters-PC.txt Google Desktop Sanity Tests', () => {
  let googleCss: string;

  test.beforeAll(() => {
    googleCss = parseCosmeticFilters(PC_FILTERS_PATH, 'www.google.com');
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
  });

  test('GOOG_TEST01: Google home page loads and search input is functional', async ({
    page,
  }) => {
    await page.goto('https://www.google.com', {
      waitUntil: 'domcontentloaded',
    });
    const consentButton = page
      .getByRole('button', { name: /(accept all|reject all|i agree|agree)/i })
      .first();
    if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentButton.click().catch(() => {});
    }
    await page.addStyleTag({ content: googleCss });

    await expect(page).toHaveTitle(/Google/);
    const searchInput = page
      .locator('textarea[name="q"], input[name="q"]')
      .first();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
  });

  test('GOOG_TEST02: Choose Chrome promo dialog is hidden by filter', async ({
    page,
  }) => {
    await page.setContent(`
      <g-bottom-sheet role="dialog" aria-labelledby="promo_label_id">Choose Chrome</g-bottom-sheet>
      <g-bottom-sheet role="dialog" aria-labelledby="other_dialog_id">Other Dialog</g-bottom-sheet>
    `);
    await page.addStyleTag({ content: googleCss });

    const promoDisplay = await page
      .locator('g-bottom-sheet[aria-labelledby="promo_label_id"]')
      .evaluate((el) => getComputedStyle(el).display);
    const otherDisplay = await page
      .locator('g-bottom-sheet[aria-labelledby="other_dialog_id"]')
      .evaluate((el) => getComputedStyle(el).display);

    expect(promoDisplay).toBe('none');
    expect(otherDisplay).not.toBe('none');
  });

  test('GOOG_TEST03: Trending searches procedural rule targets only trending dropdown items', async ({
    page,
  }) => {
    await page.setContent(`
      <div class="OBMEnb" id="trending-wrap">
        <div class="ynRric">Trending searches</div>
      </div>
      <div class="OBMEnb" id="history-wrap">
        <div class="ynRric">my previous query</div>
      </div>
    `);

    const filtersContent = fs.readFileSync(PC_FILTERS_PATH, 'utf-8');
    const trendingRule = filtersContent
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.includes('.OBMEnb') && !l.startsWith('!'));

    expect(
      trendingRule,
      'Trending searches filter rule must exist in filters-PC.txt',
    ).toBeDefined();
    if (!trendingRule) return;

    const [, rawSelector] = trendingRule.split('##');
    const pwSelector = rawSelector.replace(
      /:has-text\(([^)]+)\)/g,
      ':has-text("$1")',
    );

    await page.locator(pwSelector).evaluateAll((els) => {
      for (const el of els) {
        (el as HTMLElement).style.display = 'none';
      }
    });

    const trendingDisplay = await page
      .locator('#trending-wrap')
      .evaluate((el) => getComputedStyle(el).display);
    const historyDisplay = await page
      .locator('#history-wrap')
      .evaluate((el) => getComputedStyle(el).display);

    expect(trendingDisplay).toBe('none');
    expect(historyDisplay).not.toBe('none');
  });
});

test.describe('filters-Mobile.txt YouTube Mobile Sanity Tests', () => {
  let mobileCss: string;

  test.beforeAll(() => {
    mobileCss = parseCosmeticFilters(MOBILE_FILTERS_PATH, 'm.youtube.com');
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
  });

  test('M_YT_TEST01: Mobile YouTube home loads and top bar is visible', async ({
    browser,
  }) => {
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();

    await page.goto('https://m.youtube.com', { waitUntil: 'domcontentloaded' });
    const consentButton = page
      .getByRole('button', { name: /(accept all|reject all|i agree|agree)/i })
      .first();
    if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentButton.click().catch(() => {});
    }
    await page.addStyleTag({ content: mobileCss });

    await expect(page).toHaveTitle(/YouTube/);
    const header = page
      .locator('header, ytm-mobile-topbar-renderer, #header-bar')
      .first();
    await expect(header).toBeVisible();

    await context.close();
  });

  test('M_YT_TEST02: Mobile compact radio and filter chip bar rules hide target elements', async ({
    page,
  }) => {
    await page.setContent(`
      <ytm-compact-radio-renderer id="compact-radio"></ytm-compact-radio-renderer>
      <ytm-feed-filter-chip-bar-renderer id="chip-bar"></ytm-feed-filter-chip-bar-renderer>
      <div id="unaffected-item">Regular Video</div>
    `);
    await page.addStyleTag({ content: mobileCss });

    const compactRadioDisplay = await page
      .locator('#compact-radio')
      .evaluate((el) => getComputedStyle(el).display);
    const chipBarDisplay = await page
      .locator('#chip-bar')
      .evaluate((el) => getComputedStyle(el).display);
    const unaffectedDisplay = await page
      .locator('#unaffected-item')
      .evaluate((el) => getComputedStyle(el).display);

    expect(compactRadioDisplay).toBe('none');
    expect(chipBarDisplay).toBe('none');
    expect(unaffectedDisplay).not.toBe('none');
  });
});
