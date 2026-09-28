export const modes = [
  { id: 'all', title: '全12球団', en: 'ALL STARS', detail: 'セもパも。すべての応援歌に挑戦！', icon: '⚾' },
  { id: 'central', title: 'セ・リーグ', en: 'CENTRAL LEAGUE', detail: 'おなじみの6球団から出題', icon: 'C' },
  { id: 'pacific', title: 'パ・リーグ', en: 'PACIFIC LEAGUE', detail: '熱い応援が響く6球団から出題', icon: 'P' },
];
export const playerKey = song => song.playerName.normalize('NFKC').replace(/\s/g, '');
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function candidatesFor(mode, teams, songs) {
  const allowed = new Set(teams.filter(t => mode === 'all' || t.league === mode).map(t => t.id));
  return songs.filter(s => s.active === true && allowed.has(s.teamId));
}
export function createQuiz(mode, teams, songs, random = Math.random) {
  const unique = [...new Map(shuffle(candidatesFor(mode, teams, songs), random).map(s => [playerKey(s), s])).values()];
  return shuffle(unique, random).slice(0, 10).map(song => ({
    song,
    choices: shuffle([song, ...shuffle(unique.filter(s => playerKey(s) !== playerKey(song)), random).slice(0, 3)], random),
  }));
}
export function summarize(answers) {
  const correct = answers.filter(a => a === 'correct').length;
  const incorrect = answers.filter(a => a === 'incorrect').length;
  const unknown = answers.filter(a => a === 'unknown').length;
  return { correct, incorrect, unknown, total: answers.length, rate: answers.length ? Math.round(correct / answers.length * 100) : 0 };
}
