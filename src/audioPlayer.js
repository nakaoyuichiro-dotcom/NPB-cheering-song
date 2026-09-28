import { el, button } from './utils.js';
import { assetUrl } from './dataLoader.js';

let activePlayer = null;
export function stopAudio() { activePlayer?.pause(); }
export const formatTime = value => `${Math.floor((Number.isFinite(value) ? value : 0) / 60)}:${String(Math.floor((Number.isFinite(value) ? value : 0) % 60)).padStart(2, '0')}`;

export function createAudioPlayer(song) {
  const root = el('div', 'audio-player');
  const audio = new Audio();
  audio.preload = 'metadata';
  let disposed = false;
  const play = button('▶', 'play-button', toggle);
  play.setAttribute('aria-label', '応援歌を再生');
  const info = el('div', 'audio-info');
  const label = el('span', 'audio-label', '応援歌を聴く');
  const status = el('span', 'audio-status', 'タップして再生');
  status.setAttribute('role', 'status');
  info.append(label, status);
  const top = el('div', 'audio-top');
  const wave = el('div', 'sound-wave');
  wave.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 13; i++) { const bar = el('i'); bar.style.setProperty('--bar', `${[12, 21, 30, 16, 25][i % 5]}px`); wave.append(bar); }
  top.append(play, info, wave);
  const seekRow = el('div', 'seek-row');
  const current = el('span', 'audio-time', '0:00');
  const duration = el('span', 'audio-time', '0:00');
  const track = el('div', 'seek-track');
  const range = el('input', 'seek-input');
  range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '0.1'; range.value = '0'; range.disabled = true;
  range.setAttribute('aria-label', '再生位置');
  const ball = el('span', 'baseball seek-ball');
  ball.setAttribute('aria-hidden', 'true');
  track.append(range, ball);
  seekRow.append(current, track, duration);
  root.append(top, seekRow);
  function update() {
    current.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
    const percent = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
    range.value = String(percent);
    track.style.setProperty('--progress', `${percent}%`);
    range.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`);
  }
  function sync() {
    play.textContent = audio.paused ? '▶' : 'Ⅱ';
    play.setAttribute('aria-label', audio.paused ? '応援歌を再生' : '応援歌を一時停止');
    root.classList.toggle('is-playing', !audio.paused);
  }
  function unavailable(error) {
    if (disposed) return;
    audio.pause();
    status.textContent = '音源準備中';
    play.disabled = true; range.disabled = true;
    root.classList.add('unavailable');
    console.warn('[audioPlayer] 音源を再生できません', song.audio, error);
  }
  async function toggle() {
    if (!audio.paused) { audio.pause(); status.textContent = '一時停止中'; return; }
    if (activePlayer && activePlayer !== audio) { activePlayer.pause(); activePlayer.currentTime = 0; }
    activePlayer = audio;
    try {
      await audio.play();
      if (disposed) { audio.pause(); return; }
      status.textContent = '再生中';
    } catch (error) {
      if (error.name === 'AbortError' || disposed) return;
      if (error.name === 'NotAllowedError') { status.textContent = 'もう一度再生ボタンを押してください'; return; }
      unavailable(error);
    }
  }
  audio.addEventListener('error', unavailable);
  audio.addEventListener('loadedmetadata', () => { range.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0; update(); });
  audio.addEventListener('timeupdate', update);
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', () => { status.textContent = '再生終了・もう一度聴く'; sync(); update(); });
  range.addEventListener('input', () => { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(range.value) / 100 * audio.duration; update(); } });
  if (song.audio) audio.src = assetUrl(song.audio);
  else unavailable('音源パス未設定');
  return {
    element: root,
    replay() { if (!play.disabled) { audio.currentTime = 0; if (audio.paused) void toggle(); } else status.textContent = '音源準備中'; },
    destroy() { disposed = true; audio.pause(); audio.removeAttribute('src'); audio.load(); if (activePlayer === audio) activePlayer = null; },
  };
}
