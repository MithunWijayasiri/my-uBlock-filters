import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function parseCosmeticFilters(filePath: string): string {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('!') && !line.startsWith('[') && line.includes('##'))
    .map(line => {
      const parts = line.split('##');
      return parts[1] ? `${parts[1]} { display: none !important; }` : '';
    })
    .join('\n');
}

const FILTERS_PATH = path.join(__dirname, '../filters-PC.txt');

test.describe('filters-PC.txt Sanity Tests', () => {
  let customCss: string;

  test.beforeAll(() => {
    customCss = parseCosmeticFilters(FILTERS_PATH);
    console.log('Loaded custom CSS filters from filters-PC.txt');
  });

  test.beforeEach(async ({ page }) => {
    // Keep this suite lightweight while allowing slower first loads.
    page.setDefaultTimeout(15000);
  });

  async function openWithFilters(page: any, url: string) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: customCss });
  }

  test('YT_TEST01: Home page loads and search input is usable', async ({ page }) => {
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

  test('YT_TEST02: Search page core sections remain visible', async ({ page }) => {
    await openWithFilters(page, 'https://www.youtube.com/results?search_query=funny+cats');

    await expect(page.locator('ytd-search')).toBeVisible();
    await expect(page.locator('ytd-video-renderer').first()).toBeVisible();
    await expect(page.locator('a#video-title').first()).toBeVisible();
  });

  test('YT_TEST03: Watch page player and controls are present', async ({ page }) => {
    await openWithFilters(page, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    await expect(page.locator('.html5-video-player')).toBeVisible();
    await expect(page.locator('h1.ytd-watch-metadata')).toBeVisible();

    // Verify a core playback control exists.
    await expect(page.locator('.ytp-play-button')).toBeVisible();
  });
});