import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test.use({ hasTouch: true });
const teams = JSON.parse(readFileSync(new URL('../../public/data/teams.json', import.meta.url)));
const songs = teams.flatMap(team => JSON.parse(readFileSync(new URL(`../../public/data/songs/${team.id}.json`, import.meta.url))));
async function fixture(page, data = songs) {
  await page.route('**/data/songs/*.json', route => {
    const teamId = new URL(route.request().url()).pathname.split('/').pop().replace('.json', '');
    return route.fulfill({ json: data.filter(song => song.teamId === teamId) });
  });
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.app').evaluate(n => n.scrollWidth <= n.clientWidth)).toBe(true);
}
function tone() {
  const rate = 8000; const seconds = 4; const samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVE', 8); buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * 440 * Math.PI * 2) * 1000), 44 + i * 2);
  return buffer;
}
test('375 / 390 / 430px とPCのトップ・DB表示', async ({ page }) => {
  for (const width of [375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /クイズで遊ぶ/ })).toBeVisible();
    await noOverflow(page);
    if (width === 1280) expect(await page.locator('.app').evaluate(n => n.clientWidth)).toBe(560);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /応援歌データベース/ }).click();
    await expect(page.locator('.team-card')).toHaveCount(12);
    await noOverflow(page);
    if (width === 375) await page.screenshot({ path: 'test-results/database-375.png', fullPage: true });
  }
});
test('10問完走・全結果種別・再挑戦・ブラウザ戻る', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const requests = []; page.on('request', r => { if (r.url().includes('/audio/')) requests.push(r.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: /クイズで遊ぶ/ }).click();
  await expect(page.locator('.mode-card')).toHaveCount(3);
  await page.getByRole('button', { name: /全12球団/ }).click();
  const correctNames = [];
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.scoreboard strong')).toHaveText(`第 ${i + 1} / 10 問`);
    await expect(page.locator('.audio-status')).toHaveText('音源準備中');
    const url = requests.at(-1);
    const correct = songs.find(s => url.endsWith(s.audio));
    expect(correct).toBeTruthy(); correctNames.push(correct.playerName);
    await expect(page.locator('.choice-button')).toHaveCount(4);
    const texts = await page.locator('.choice-button').allTextContents(); expect(new Set(texts).size).toBe(4);
    if (i === 8) {
      const wrong = page.locator('.choice-button').filter({ hasNotText: correct.playerName }).first();
      await wrong.click(); await expect(page.getByRole('heading', { name: '残念！' })).toBeVisible();
    } else if (i === 9) {
      await page.getByRole('button', { name: 'わからない', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'わからなかった！' })).toBeVisible();
    } else {
      await page.locator('.choice-button').filter({ hasText: correct.playerName }).click();
      await expect(page.getByRole('heading', { name: '正解！', exact: true })).toBeVisible();
    }
    await expect(page.locator('.correct-name')).toHaveText(correct.playerName);
    await expect(page.locator('.choice-button:enabled')).toHaveCount(0);
    await noOverflow(page);
    if (i === 0) await page.screenshot({ path: 'test-results/answer-375.png', fullPage: true });
    await page.getByRole('button', { name: i === 9 ? '結果を見る →' : '次の問題 →', exact: true }).click();
  }
  expect(new Set(correctNames).size).toBe(10);
  await expect(page.getByRole('heading', { name: 'RESULT' })).toBeVisible();
  await expect(page.locator('.accuracy')).toHaveText('正解率 80%');
  await expect(page.locator('.result-stats dd')).toHaveText(['8', '1', '1']);
  await page.screenshot({ path: 'test-results/result-375.png', fullPage: true });
  await page.getByRole('button', { name: /もう一度遊ぶ/ }).click();
  await expect(page.locator('.scoreboard strong')).toHaveText('第 1 / 10 問');
  await page.goBack(); await expect(page.getByRole('heading', { name: 'どのモードで遊ぶ？' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('選手一覧は00・0順、単一アコーディオン、ロゴと音源欠損fallback', async ({ page }) => {
  await page.goto('/#/database');
  await expect(page.locator('.logo-fallback:visible')).toHaveCount(12);
  await page.getByRole('button', { name: '東京ヤクルトスワローズの応援歌' }).click();
  await expect(page.locator('.player-trigger')).toHaveCount(12);
  await expect(page.locator('.number').nth(0)).toHaveText('#00');
  await expect(page.locator('.number').nth(1)).toHaveText('#0');
  await page.locator('.player-trigger').nth(0).click();
  await expect(page.locator('.audio-status')).toHaveText('音源準備中');
  await page.locator('.player-trigger').nth(1).click();
  await expect(page.locator('.player-panel:visible')).toHaveCount(1);
  await expect(page.locator('.player-trigger').nth(0)).toHaveAttribute('aria-expanded', 'false');
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/players-375.png', fullPage: true });
  await page.locator('.player-trigger').nth(1).click(); await expect(page.locator('.player-panel:visible')).toHaveCount(0);
});
test('実メディアで再生・一時停止・スクラブ・終了・切り替え停止', async ({ page }) => {
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio; window.testAudioInstances = [];
    window.Audio = function (...args) { const audio = new OriginalAudio(...args); window.testAudioInstances.push(audio); return audio; };
  });
  await page.route('**/audio/**/*.mp3', route => {
    const body = tone();
    const range = route.request().headers().range;
    const match = range?.match(/bytes=(\d+)-(\d*)/);
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
    return route.fulfill({ status: match ? 206 : 200, contentType: 'audio/wav',
      headers: { 'accept-ranges': 'bytes', 'content-length': String(end - start + 1), ...(match ? { 'content-range': `bytes ${start}-${end}/${body.length}` } : {}) },
      body: body.subarray(start, end + 1) });
  });
  await page.goto('/#/database/yakult');
  await page.locator('.player-trigger').first().click();
  await expect(page.locator('.audio-time').last()).toHaveText('0:04');
  await page.getByRole('button', { name: '応援歌を再生', exact: true }).click();
  await expect(page.getByRole('button', { name: '応援歌を一時停止' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.testAudioInstances[0].currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '応援歌を一時停止' }).click();
  await expect(page.locator('.audio-status')).toHaveText('一時停止中');
  const scrub = page.getByRole('slider', { name: '再生位置' });
  const box = await scrub.boundingBox();
  await page.touchscreen.tap(box.x + box.width * .75, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => window.testAudioInstances[0].currentTime)).toBeGreaterThan(2);
  await scrub.focus(); await page.keyboard.press('Home');
  await page.mouse.move(box.x + 12, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .6, box.y + box.height / 2, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.testAudioInstances[0].currentTime)).toBeGreaterThan(2);
  await scrub.focus(); await page.keyboard.press('End');
  await page.getByRole('button', { name: '応援歌を再生', exact: true }).click();
  await expect(page.locator('.audio-status')).toContainText('再生終了', { timeout: 6000 });
  await page.getByRole('button', { name: '応援歌を再生', exact: true }).click();
  await page.locator('.player-trigger').nth(1).click();
  expect(await page.evaluate(() => window.testAudioInstances[0].paused)).toBe(true);
  await page.getByRole('button', { name: '応援歌を再生', exact: true }).click();
  await page.getByRole('button', { name: 'トップへ戻る', exact: true }).click();
  await expect(page.getByRole('button', { name: /クイズで遊ぶ/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.testAudioInstances.every(a => a.paused))).toBe(true);
});
test('JSON取得失敗と再読み込み、不正JSON', async ({ page }) => {
  await page.route('**/data/songs/*.json', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'データを読み込めませんでした' })).toBeVisible();
  await page.unroute('**/data/songs/*.json');
  await page.getByRole('button', { name: 'もう一度読み込む' }).click();
  await expect(page.getByRole('button', { name: /クイズで遊ぶ/ })).toBeVisible();
  await page.route('**/data/teams.json', route => route.fulfill({ contentType: 'application/json', body: '{bad json' }));
  await page.reload(); await expect(page.getByRole('heading', { name: 'データを読み込めませんでした' })).toBeVisible();
});
test('空データ・リーグ0人・少人数・inactive', async ({ page }) => {
  await fixture(page, []); await page.goto('/#/quiz/all');
  await expect(page.getByRole('heading', { name: '応援歌は準備中です' })).toBeVisible();
  await page.goto('/#/database/yakult'); await expect(page.getByRole('status')).toContainText('この球団の応援歌は準備中');
  await page.unroute('**/data/songs/*.json'); await fixture(page, [songs.find(s => s.teamId === 'yakult' && s.active), songs.find(s => !s.active)]);
  await page.goto('/#/quiz/all'); await page.reload();
  await expect(page.locator('.scoreboard strong')).toHaveText('第 1 / 1 問');
  await expect(page.locator('.choice-button')).toHaveCount(1);
  await page.getByRole('button', { name: 'わからない', exact: true }).click();
  await page.getByRole('button', { name: '結果を見る →' }).click();
  await expect(page.locator('.result-stats dd')).toHaveText(['0', '0', '1']);
  await page.goto('/#/quiz/pacific'); await expect(page.getByRole('heading', { name: '応援歌は準備中です' })).toBeVisible();
});
test('各リーグの選択肢とキーボード操作', async ({ page }) => {
  for (const league of ['central', 'pacific']) {
    await page.goto(`/#/quiz/${league}`);
    await expect(page.locator('.choice-button')).toHaveCount(4);
    const texts = await page.locator('.choice-button').allTextContents();
    const ids = new Set(teams.filter(t => t.league === league).map(t => t.id));
    for (const text of texts) expect(songs.some(s => ids.has(s.teamId) && text.includes(s.playerName))).toBe(true);
    await page.locator('.choice-button').first().focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: '回答結果' })).toBeVisible();
  }
});
