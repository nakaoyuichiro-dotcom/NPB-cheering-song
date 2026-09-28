const STORAGE_KEY = 'npb-cheering-song:se-enabled';

export function isSoundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Boolean(enabled)));
  } catch (error) {
    console.warn('[soundSettings] SE設定を保存できません', error);
  }
}
