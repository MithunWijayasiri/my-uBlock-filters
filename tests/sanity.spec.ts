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

test('Sanity Check: YouTube loads and hides Shorts (PC Rules)', async ({ page }) => {
  // Pointing to filters-PC.txt
  const customCss = parseCosmeticFilters(path.join(__dirname, '../filters-PC.txt'));
  
  await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: customCss });

  await expect(page).toHaveTitle(/YouTube/);
  
  await page.getByPlaceholder('Search').fill('funny cats');
  await page.keyboard.press('Enter');
  
  await page.waitForTimeout(2000); 
  
  const shortsLocator = page.locator('ytd-video-renderer:has([aria-label="Shorts"])').first();
  await expect(shortsLocator).not.toBeVisible();
});