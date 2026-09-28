import { el } from './utils.js';
import { assetUrl } from './dataLoader.js';

export function leagueLogo(id, className, fallbackText, label = '') {
  const box = el('span', `league-logo ${className}`);
  const fallback = el('span', '', fallbackText);
  const img = el('img');
  img.alt = label;
  img.hidden = true;
  img.addEventListener('load', () => {
    img.hidden = false;
    fallback.hidden = true;
    box.classList.add('has-logo');
  });
  img.addEventListener('error', () => {
    img.remove();
    console.debug('[leagueLogo] ロゴ未登録:', id);
  });
  img.src = assetUrl(`/assets/logos/${id === 'all' ? 'npb' : `${id}-league`}.png`);
  box.append(fallback, img);
  return box;
}
