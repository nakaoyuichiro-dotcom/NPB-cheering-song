import { transitionPage } from './pageTransition.js';
import { leagueLogo } from './leagueLogo.js';
import './style.css';
import { el, button, sectionHeading, emptyState } from './utils.js';
import { loadData, assetUrl } from './dataLoader.js';
import { renderModes, renderQuiz } from './quiz.js';
import { renderTeams, renderPlayers } from './database.js';
import { modes } from './quizLogic.js';
import { isSoundEnabled, setSoundEnabled } from './soundSettings.js';

const app = document.querySelector('#app');
let data;
let cleanup = () => {};
function navigate(route, restart = false) {
  if (restart || location.hash === `#/${route}`) { history.replaceState(null, '', `#/${route}`); changePage(); }
  else location.hash = `/${route}`;
}
function renderHome(container) {
  const hero = el('section', 'home-hero');
  const decoration = el('div', 'stadium-art'); decoration.setAttribute('aria-hidden', 'true');
  decoration.style.setProperty('--crowd-image', `url("${assetUrl('/assets/images/stadium-crowd-bg.png')}")`);
  decoration.innerHTML = '<div class="floodlight left"></div><div class="floodlight right"></div><div class="stadium-rings"></div><div class="crowd"></div><div class="diamond"></div><span class="hero-ball baseball"></span><span class="spark spark-one">✦</span><span class="spark spark-two">✦</span>';
  hero.append(decoration, el('p', 'hero-kicker', 'TURN UP THE CHEERS!'));
  const title = el('h1', 'hero-title'); title.append(leagueLogo('all', 'title-npb', 'NPB', 'NPB'), el('span', 'title-cheer', 'プロ野球'), el('span', 'title-quiz', '応援歌'));
  hero.append(title, el('div', 'hero-ribbon', 'その一曲で、誰かわかる？'), el('p', 'hero-subtitle', '聴いて、ひらめいて、かっとばせ。'));
  container.append(hero);
  const actions = el('div', 'home-actions');
  const start = button('', 'home-play', () => navigate('modes'));
  const copy = el('span'); copy.append(el('small', '', 'LET’S PLAY BALL'), el('strong', '', 'クイズで遊ぶ'));
  const quizMark = el('span', 'action-icon', 'Q');
  quizMark.setAttribute('aria-hidden', 'true');
  start.append(quizMark, copy, el('span', 'arrow', '→'));
  const db = button('', 'home-database', () => navigate('database'));
  const dbcopy = el('span'); dbcopy.append(el('strong', '', '応援歌データベース'), el('small', '', '球団から探す・聴く・歌詞を見る'));
  db.append(el('span', 'db-icon', '♫'), dbcopy, el('span', 'arrow', '→'));
  actions.append(db, start); container.append(actions);
  const soundSetting = el('div', 'sound-setting');
  const soundCopy = el('span', 'sound-setting-copy');
  soundCopy.append(el('strong', '', 'SE（効果音）'), el('small', '', '正解音・不正解音など'));
  const soundToggle = button('', 'sound-toggle', () => {
    const enabled = soundToggle.getAttribute('aria-checked') !== 'true';
    setSoundEnabled(enabled);
    updateSoundToggle(enabled);
  });
  soundToggle.setAttribute('role', 'switch');
  soundToggle.setAttribute('aria-label', 'SE（効果音）');
  const soundState = el('span', 'sound-state');
  const soundTrack = el('span', 'sound-toggle-track');
  soundTrack.append(el('span', 'sound-toggle-thumb'));
  soundToggle.append(soundState, soundTrack);
  function updateSoundToggle(enabled) {
    soundToggle.setAttribute('aria-checked', String(enabled));
    soundState.textContent = enabled ? 'ON' : 'OFF';
  }
  updateSoundToggle(isSoundEnabled());
  soundSetting.append(soundCopy, soundToggle);
  container.append(soundSetting);
  const features = el('div', 'home-features'); features.append(el('span', '', '12球団'), el('span', '', '1ゲーム10問'), el('span', '', '4択でチャレンジ'));
  container.append(features, el('p', 'home-note', '好きな応援歌が、もっと好きになる。'));
}
function render() {
  if (!data) return;
  cleanup(); cleanup = () => {};
  const route = location.hash.replace(/^#\/?/, '').split('/');
  const isDb = route[0] === 'database';
  const isHome = !route[0];
  app.className = `app ${isDb ? 'theme-database' : 'theme-game'} ${isHome ? 'is-home' : ''}`;
  app.replaceChildren();
  const nav = el('header', 'topbar');
  const brand = button('⚾  CHEER PLAY', 'brand', () => navigate('')); brand.setAttribute('aria-label', 'トップへ戻る');
  nav.append(brand);
  if (!isHome) nav.append(button('← 戻る', 'back-button', () => navigate(isDb && route[1] ? 'database' : route[0] === 'quiz' ? 'modes' : '')));
  else nav.append(el('span', 'topbar-badge', 'BASEBALL × MUSIC'));
  const main = el('main', isHome ? 'home-content' : 'page-content'); main.id = 'main-content';
  app.append(nav, main);
  if (isHome) renderHome(main);
  else if (route[0] === 'modes') renderModes(main, navigate);
  else if (route[0] === 'quiz' && modes.some(m => m.id === route[1])) cleanup = renderQuiz(main, route[1], data, navigate);
  else if (isDb && !route[1]) renderTeams(main, data, navigate);
  else if (isDb && data.teams.some(t => t.id === route[1])) cleanup = renderPlayers(main, data.teams.find(t => t.id === route[1]), data.songs);
  else main.append(sectionHeading('NOT FOUND', 'ページが見つかりません'), button('トップへ戻る', 'primary-button', () => navigate('')));
  const footer = el('footer', 'app-footer');
  if (data.songs.some(song => song.demo === true)) footer.append(el('p', 'demo-badge', 'DEMO · 仮の選手データ／音源準備中'));
  footer.append(el('p', '', '個人利用の非公式アプリ'));
  app.append(footer);
  window.scrollTo(0, 0);
  if (!isHome) { const title = main.querySelector('h1'); if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); } }
}
async function boot() {
  app.replaceChildren(el('p', 'loading', '球場を準備しています…'));
  try { data = await loadData(); render(); }
  catch {
    app.className = 'app theme-database';
    app.replaceChildren();
    const error = el('main', 'page-content');
    error.append(sectionHeading('TIME OUT', 'データを読み込めませんでした'), emptyState('通信状況を確認して、もう一度お試しください。データファイルが見つからない可能性もあります。'), button('もう一度読み込む', 'primary-button', boot));
    app.append(error);
  }
}
function changePage() {
  if (!data) return;
  cleanup(); cleanup = () => {};
  void transitionPage(app, render);
}
window.addEventListener('hashchange', changePage);
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', event => { if (event.persisted) changePage(); });
void boot();
