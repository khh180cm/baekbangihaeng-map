import { test, expect } from '@playwright/test';

test('전국 → 시/도 → 점 → 카드', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /백반기행/ })).toBeVisible();

  // 식당이 있는 첫 시/도(뱃지가 있는 지역)를 클릭
  const badge = page.locator('[data-testid^="badge-"]').first();
  await expect(badge).toBeVisible();
  const sido = (await badge.getAttribute('data-testid'))!.replace('badge-', '');
  await page.locator(`[data-testid="sido-${sido}"]`).click();

  // 시/도 화면 진입
  await expect(page.getByTestId('back')).toBeVisible();

  // 첫 빨간 점 클릭 → 카드 표시
  const dot = page.locator('[data-testid^="dot-"]').first();
  await expect(dot).toBeVisible();
  await dot.click();
  await expect(page.locator('.card').first()).toBeVisible();
});
