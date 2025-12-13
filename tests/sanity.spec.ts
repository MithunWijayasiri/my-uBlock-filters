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

  test('YT_TEST01: YouTube search works and loads results', async ({ page }) => {
    await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: customCss });

    // Verify page loads without breaking
    await expect(page).toHaveTitle(/YouTube/);
    
    // Perform search to test filters on actual content
    await page.getByPlaceholder('Search').fill('funny cats');
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await page.waitForSelector('ytd-search', { timeout: 10000 });
    await page.waitForSelector('ytd-video-renderer', { timeout: 5000 });
    
    // Verify page didn't break
    await expect(page).toHaveTitle(/funny cats/i);
  });

  test('YT_TEST02: Shorts are hidden in search results', async ({ page }) => {
    await page.goto('https://www.youtube.com/results?search_query=funny+cats', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: customCss });

    await page.waitForSelector('ytd-search', { timeout: 10000 });
    
    // If any Shorts exist, verify they're all hidden
    const allShorts = page.locator('ytd-video-renderer:has([aria-label="Shorts"])');
    const shortsCount = await allShorts.count();
    
    for (let i = 0; i < shortsCount; i++) {
      await expect(allShorts.nth(i)).toBeHidden();
    }
  });

  test('YT_TEST03: Video page loads and player works', async ({ page }) => {
    await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: customCss });

    // Verify essential elements are still visible
    await expect(page.locator('.html5-video-player')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1.ytd-watch-metadata')).toBeVisible();
    
    // Verify subscribe button is visible (proves page isn't broken)
    await expect(page.locator('ytd-subscribe-button-renderer')).toBeVisible();
  });
});