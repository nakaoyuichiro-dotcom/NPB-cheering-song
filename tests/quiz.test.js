import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createQuiz, playerKey, summarize, shuffle } from '../src/quizLogic.js';
import { validateData, loadData } from '../src/dataLoader.js';
import { sortByNumber } from '../src/database.js';
const teams = JSON.parse(readFileSync(new URL('../public/data/teams.json', import.meta.url)));
const songs = teams.flatMap(team => JSON.parse(readFileSync(new URL(`../public/data/songs/${team.id}.json`, import.meta.url))));
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }
test('12球団とactiveデータを読み込み、旧データを除外', () => {
  const data = validateData(teams, songs);
  assert.equal(data.teams.length, 12);
  assert.equal(data.teams.filter(t => t.league === 'central').length, 6);
  assert.equal(data.teams.filter(t => t.league === 'pacific').length, 6);
  assert.ok(data.songs.every(s => s.active));
  assert.equal(data.songs.length, 34);
});
test('各モード100セット: 10問、重複なし、正解が1人、誤答も同じリーグ', () => {
  for (const mode of ['all', 'central', 'pacific']) {
    const positions = new Set();
    const selections = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      const quiz = createQuiz(mode, teams, songs, seeded(seed));
      assert.equal(quiz.length, 10);
      assert.equal(new Set(quiz.map(q => playerKey(q.song))).size, 10);
      selections.add(quiz.map(q => q.song.id).join(','));
      for (const q of quiz) {
        assert.equal(q.choices.length, 4);
        assert.equal(new Set(q.choices.map(playerKey)).size, 4);
        assert.equal(q.choices.filter(s => playerKey(s) === playerKey(q.song)).length, 1);
        positions.add(q.choices.findIndex(s => s.id === q.song.id));
        for (const s of [q.song, ...q.choices]) {
          assert.equal(s.active, true);
          if (mode !== 'all') assert.equal(teams.find(t => t.id === s.teamId).league, mode);
        }
      }
    }
    assert.equal(positions.size, 4);
    assert.equal(selections.size, 100);
  }
});
test('0〜3人・10人未満・同一選手の別曲や空白違いを処理', () => {
  for (let count = 0; count < 10; count++) {
    const quiz = createQuiz('all', teams, songs.slice(0, count));
    assert.equal(quiz.length, count);
    for (const q of quiz) assert.equal(q.choices.length, Math.min(count, 4));
  }
  const duplicate = { ...songs[0], id: 'another-song', playerName: songs[0].playerName.replace(' ', '　') };
  const quiz = createQuiz('all', teams, [songs[0], duplicate]);
  assert.equal(quiz.length, 1);
  assert.equal(quiz[0].choices.length, 1);
});
test('正解・不正解・わからないを分けて集計', () => {
  assert.deepEqual(summarize([...Array(8).fill('correct'), 'incorrect', 'unknown']), { correct: 8, incorrect: 1, unknown: 1, total: 10, rate: 80 });
  assert.equal(summarize([]).rate, 0);
});
test('背番号00、0、1、2、10の順にソート', () => {
  const numbers = ['10', '0', '2', '00', '1'];
  assert.deepEqual(sortByNumber(numbers.map(number => ({ number, playerName: '仮' }))).map(s => s.number), ['00', '0', '1', '2', '10']);
});
test('不正なJSON構造や存在しない球団を拒否', () => {
  assert.throws(() => validateData({}, songs));
  assert.throws(() => validateData(teams, [{ ...songs[0], teamId: 'missing' }]));
  assert.throws(() => validateData(teams, [songs[0], songs[0]]));
  assert.deepEqual(validateData(teams, []).songs, []);
});
test('シャッフルは元の配列を変更しない', () => {
  const input = [1, 2, 3, 4];
  assert.deepEqual(shuffle(input, seeded(1)).toSorted(), input);
  assert.deepEqual(input, [1, 2, 3, 4]);
});

test('球団別ファイルを統合し、空の球団を許容する', async () => {
  const selected = songs.find(s => s.teamId === 'yakult' && s.active);
  const requested = [];
  const data = await loadData(async path => {
    requested.push(path);
    return { ok: true, json: async () => path === '/data/teams.json' ? teams : path === '/data/songs/yakult.json' ? [selected] : [] };
  });
  assert.equal(requested.length, 13);
  assert.deepEqual(data.songs, [selected]);
});

test('球団ファイルの欠損・不正JSON・球団違いはファイル名付きで通知', async t => {
  t.mock.method(console, 'error', () => {});
  for (const kind of ['missing', 'json', 'team']) {
    await assert.rejects(loadData(async path => {
      if (path === '/data/teams.json') return { ok: true, json: async () => teams };
      if (path === '/data/songs/yakult.json') {
        if (kind === 'missing') return { ok: false, status: 404 };
        if (kind === 'json') return { ok: true, json: async () => { throw new SyntaxError('不正JSON'); } };
        return { ok: true, json: async () => [songs.find(s => s.teamId !== 'yakult')] };
      }
      return { ok: true, json: async () => [] };
    }), /\/data\/songs\/yakult.json/);
  }
});
