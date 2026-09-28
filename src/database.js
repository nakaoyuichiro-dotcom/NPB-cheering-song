import { leagueLogo } from './leagueLogo.js';
import { el, button, sectionHeading, emptyState, lyricsBlock } from './utils.js';
import { assetUrl } from './dataLoader.js';
import { createAudioPlayer } from './audioPlayer.js';

function logo(team) {
  const box = el('span', `team-logo team-${team.id}`);
  const fallback = el('span', 'logo-fallback', team.monogram || team.shortName?.slice(0, 1) || team.name.slice(0, 1));
  box.append(fallback);
  if (team.logo) {
    const img = el('img'); img.alt = ''; img.hidden = true;
    img.addEventListener('load', () => { img.hidden = false; fallback.hidden = true; });
    img.addEventListener('error', () => { img.remove(); console.debug('[database] ロゴ未登録:', team.logo); });
    img.src = assetUrl(team.logo); box.append(img);
  }
  return box;
}
export function renderTeams(container, { teams, songs }, navigate) {
  container.append(sectionHeading('CHEERING SONG DATABASE', '応援歌データベース', '好きな球団から、応援歌を見つけよう。'));
  for (const league of ['central', 'pacific']) {
    const section = el('section', `league-section ${league}`);
    const heading = el('div', 'league-heading');
    const group = teams.filter(t => t.league === league);
    heading.append(el('h2', '', league === 'central' ? 'セ・リーグ' : 'パ・リーグ'), el('span', '', `${group.length}球団`));
    heading.querySelector('h2').prepend(leagueLogo(league, 'league-heading-logo', league === 'central' ? 'C' : 'P'));
    section.append(heading);
    const grid = el('div', 'team-grid');
    for (const team of group) {
      const card = button('', 'team-card', () => navigate(`database/${team.id}`));
      card.setAttribute('aria-label', `${team.name}の応援歌`);
      card.append(logo(team), el('span', 'team-name', team.shortName || team.name), el('span', 'song-count', `${songs.filter(s => s.teamId === team.id).length}曲`));
      grid.append(card);
    }
    section.append(grid); container.append(section);
  }
  if (!songs.length) container.append(emptyState('応援歌はまだ登録されていません。データ追加後に利用できます。'));
  container.append(el('p', 'db-footnote', '選手をタップすると、音源と歌詞が開きます。'));
}
export function sortByNumber(songs) {
  return [...songs].sort((a, b) => {
    const an = String(a.number ?? ''); const bn = String(b.number ?? '');
    const av = an.trim() && Number.isFinite(Number(an)) ? Number(an) : Infinity;
    const bv = bn.trim() && Number.isFinite(Number(bn)) ? Number(bn) : Infinity;
    return av - bv || bn.length - an.length || a.playerName.localeCompare(b.playerName, 'ja');
  });
}
export function renderPlayers(container, team, songs) {
  const group = sortByNumber(songs.filter(s => s.teamId === team.id && s.active === true));
  const header = sectionHeading('TEAM SONGS', team.name, `${group.length}曲の応援歌 · 背番号順`);
  header.prepend(logo(team)); container.append(header);
  let open = null;
  let player = null;
  const list = el('div', 'player-list');
  group.forEach((song, index) => {
    const item = el('section', 'player-item');
    const trigger = button('', 'player-trigger', () => {
      const wasOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (open) { open.trigger.setAttribute('aria-expanded', 'false'); open.panel.hidden = true; open.item.classList.remove('expanded'); open.panel.replaceChildren(); }
      player?.destroy(); player = null; open = null;
      if (wasOpen) return;
      trigger.setAttribute('aria-expanded', 'true'); panel.hidden = false; item.classList.add('expanded');
      panel.append(el('h2', '', `${song.playerName} 応援歌`));
      player = createAudioPlayer(song); panel.append(player.element, lyricsBlock(song));
      open = { trigger, panel, item };
    });
    trigger.id = `player-trigger-${index}`;
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', `song-panel-${index}`);
    trigger.append(el('span', 'number', `#${song.number ?? '—'}`), el('span', 'player-name', song.playerName));
    const chevron = el('span', 'chevron', '+'); chevron.setAttribute('aria-hidden', 'true'); trigger.append(chevron);
    const panel = el('div', 'player-panel'); panel.id = `song-panel-${index}`; panel.hidden = true;
    panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', trigger.id);
    item.append(trigger, panel); list.append(item);
  });
  container.append(group.length ? list : emptyState('この球団の応援歌は準備中です。ほかの球団も見てみよう。'));
  return () => player?.destroy();
}
