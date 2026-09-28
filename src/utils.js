export function el(tag, className = '', text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(text, className, onClick) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
export function sectionHeading(kicker, title, description) {
  const header = el('header', 'section-heading');
  header.append(el('p', 'eyebrow', kicker), el('h1', '', title));
  if (description) header.append(el('p', 'subtitle', description));
  return header;
}
export function emptyState(message) {
  const node = el('div', 'empty-state', message);
  node.setAttribute('role', 'status');
  return node;
}
export function lyricsBlock(song) {
  const section = el('section', 'lyrics');
  section.append(el('h3', '', '♪ 歌詞'), el('p', '', song.lyrics || '歌詞準備中'));
  return section;
}
