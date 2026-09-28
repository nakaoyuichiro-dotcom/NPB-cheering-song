import { leagueLogo } from './leagueLogo.js';
import { el, button, sectionHeading, emptyState, lyricsBlock } from './utils.js';
import { createAudioPlayer, stopAudio } from './audioPlayer.js';
import { createQuizSounds } from './quizSound.js';
import { modes, createQuiz, playerKey, summarize } from './quizLogic.js';

export function renderModes(container, navigate) {
  container.append(sectionHeading('PLAY BALL!', 'どのモードで遊ぶ？', '応援歌を聴いて、選手を当てよう。'));
  const cards = el('div', 'mode-cards');
  for (const mode of modes) {
    const card = button('', `mode-card mode-${mode.id}`, () => navigate(`quiz/${mode.id}`));
    const copy = el('span', 'mode-copy');
    copy.append(el('span', 'eyebrow', mode.en), el('strong', '', mode.title), el('span', 'mode-detail', mode.detail));
    card.append(leagueLogo(mode.id, 'mode-icon', mode.icon), copy, el('span', 'arrow', '↗')); cards.append(card);
  }
  container.append(cards, el('p', 'mode-help', '全10問 ／ 4択クイズ ／ 時間制限なし'), el('p', 'mode-note', '曲数が少ない場合は、登録された人数分で遊べます。'));
}
export function renderQuiz(container, mode, data, navigate) {
  const questions = createQuiz(mode, data.teams, data.songs);
  const sounds = createQuizSounds();
  const answers = [];
  let index = 0;
  let player = null;
  const modeName = modes.find(m => m.id === mode)?.title;
  if (!questions.length) {
    sounds.destroy();
    container.append(sectionHeading('COMING SOON', '応援歌は準備中です'), emptyState('このモードには、まだ応援歌がありません。ほかのモードを選んでみよう。'), button('モードを選び直す', 'primary-button', () => navigate('modes')));
    return () => {};
  }
  function renderQuestion() {
    player?.destroy(); container.replaceChildren();
    const question = questions[index];
    const score = el('div', 'scoreboard');
    score.append(el('span', 'score-mode', modeName), el('strong', '', `第 ${index + 1} / ${questions.length} 問`), el('span', 'score-hit', `正解 ${answers.filter(a => a === 'correct').length}`));
    const progress = el('div', 'question-progress'); progress.setAttribute('aria-hidden', 'true');
    questions.forEach((_, i) => progress.append(el('span', i < index ? `done ${answers[i]}` : i === index ? 'current' : '')));
    const heading = el('h1', 'question-title', 'この応援歌は誰だ！？');
    container.append(score, progress, heading, el('p', 'question-hint', '耳をすませて、プレイボール。'));
    player = createAudioPlayer(question.song); container.append(player.element);
    const choices = el('div', 'choice-grid');
    const buttons = [];
    let answered = false;
    const unknown = button('わからない', 'unknown-button', () => answer(null));
    function answer(choice) {
      if (answered) return; answered = true;
      const outcome = choice === null ? 'unknown' : playerKey(choice) === playerKey(question.song) ? 'correct' : 'incorrect';
      stopAudio();
      sounds.play(outcome);
      answers.push(outcome);
      buttons.forEach(({ btn, song }) => { btn.disabled = true; if (playerKey(song) === playerKey(question.song)) { btn.classList.add('is-correct'); btn.append(el('span', 'answer-mark', '✓')); } else if (choice && playerKey(song) === playerKey(choice)) { btn.classList.add('is-incorrect'); btn.append(el('span', 'answer-mark', '×')); } });
      unknown.disabled = true;
      const feedback = el('section', `feedback ${outcome}`);
      feedback.setAttribute('role', 'region'); feedback.setAttribute('aria-label', '回答結果'); feedback.tabIndex = -1;
      feedback.append(el('div', 'feedback-symbol', outcome === 'correct' ? '★' : outcome === 'unknown' ? '…' : '↗'), el('h2', '', outcome === 'correct' ? '正解！' : outcome === 'unknown' ? 'わからなかった！' : '残念！'));
      if (outcome === 'incorrect') feedback.append(el('p', 'your-answer', `あなたの回答：${choice.playerName}`));
      if (outcome !== 'correct') feedback.append(el('p', 'answer-caption', outcome === 'unknown' ? '正解は……' : '正解'));
      const team = data.teams.find(t => t.id === question.song.teamId);
      feedback.append(el('strong', 'correct-name', question.song.playerName), el('p', 'answer-team', `${team.name}　#${question.song.number ?? '—'}`), lyricsBlock(question.song), button('↻ もう一度聴く', 'replay-button', () => player.replay()), button(index + 1 === questions.length ? '結果を見る →' : '次の問題 →', 'primary-button', () => { index++; index === questions.length ? renderResult() : renderQuestion(); }));
      container.append(feedback); feedback.focus({ preventScroll: true }); feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    question.choices.forEach((song, i) => {
      const btn = button('', 'choice-button', () => answer(song));
      btn.append(el('span', 'choice-letter', 'ABCD'[i]), el('span', '', song.playerName));
      choices.append(btn); buttons.push({ btn, song });
    });
    container.append(choices, unknown);
    if (question.choices.length < 4) container.append(el('p', 'mode-note', '登録人数が少ないため、選択肢を減らしています。'));
    if (index > 0) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function renderResult() {
    player?.destroy(); player = null; container.replaceChildren();
    const result = summarize(answers);
    const card = el('section', 'result-card');
    const title = el('h1', 'result-title', 'RESULT'); title.tabIndex = -1;
    card.append(el('p', 'eyebrow', `${modeName} · GAME SET`), title, el('p', 'result-message', result.rate >= 80 ? 'ナイスバッティング！' : result.rate >= 40 ? 'いいぞ、その調子！' : '次はきっと、かっとばせ！'));
    const score = el('div', 'result-score'); score.append(el('strong', '', result.correct), el('span', '', `/ ${result.total}`));
    const stars = el('div', 'result-stars', '★'.repeat(Math.round(result.rate / 20)) + '☆'.repeat(5 - Math.round(result.rate / 20))); stars.setAttribute('aria-label', `5段階評価 ${Math.round(result.rate / 20)}`);
    card.append(score, stars);
    const stats = el('dl', 'result-stats');
    [['正解', result.correct], ['不正解', result.incorrect], ['わからない', result.unknown]].forEach(([label, value]) => { const row = el('div'); row.append(el('dt', '', label), el('dd', '', value)); stats.append(row); });
    card.append(stats, el('p', 'accuracy', `正解率 ${result.rate}%`));
    container.append(card, button('もう一度遊ぶ！ ↻', 'primary-button', () => navigate(`quiz/${mode}`, true)), button('トップへ戻る', 'secondary-button', () => navigate('')));
    title.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  renderQuestion();
  return () => {
    player?.destroy();
    sounds.destroy();
  };
}
