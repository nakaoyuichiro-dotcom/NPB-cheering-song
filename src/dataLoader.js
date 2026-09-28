export const assetUrl = (path) => `${(import.meta.env?.BASE_URL || '/')}${String(path || '').replace(/^\/+/, '')}`;

export function validateData(teams, songs) {
  if (!Array.isArray(teams) || !Array.isArray(songs)) throw new Error('JSONのルートは配列にしてください。');
  const ids = new Set();
  for (const team of teams) {
    if (!team || typeof team.id !== 'string' || !team.id || ids.has(team.id) ||
        typeof team.name !== 'string' || !['central', 'pacific'].includes(team.league)) {
      throw new Error('teams.json の球団情報を確認してください。');
    }
    ids.add(team.id);
  }
  const songIds = new Set();
  for (const song of songs) {
    if (!song || typeof song.id !== 'string' || songIds.has(song.id) || !ids.has(song.teamId) ||
        typeof song.playerName !== 'string' || !song.playerName.trim() || typeof song.active !== 'boolean' ||
        (song.audio !== undefined && typeof song.audio !== 'string') ||
        (song.lyrics !== undefined && typeof song.lyrics !== 'string')) {
      throw new Error('球団別JSONの選手情報を確認してください。');
    }
    songIds.add(song.id);
  }
  return { teams: [...teams].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), songs: songs.filter(song => song.active === true) };
}
export async function loadData(fetcher = fetch) {
  async function readJson(path) {
    try {
      const response = await fetcher(assetUrl(path));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      throw new Error(`${path}: ${error.message}`, { cause: error });
    }
  }
  try {
    const teams = await readJson('/data/teams.json');
    validateData(teams, []);
    const groups = await Promise.all(teams.map(async team => {
      const path = `/data/songs/${team.id}.json`;
      const songs = await readJson(path);
      if (!Array.isArray(songs) || songs.some(song => !song || song.teamId !== team.id)) {
        throw new Error(`${path}: 配列形式とteamIdを確認してください。`);
      }
      try { validateData(teams, songs); }
      catch (error) { throw new Error(`${path}: ${error.message}`, { cause: error }); }
      return songs;
    }));
    return validateData(teams, groups.flat());
  } catch (error) {
    console.error('[dataLoader] データの読み込みに失敗しました', error);
    throw error;
  }
}
