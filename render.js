const client = window.__CLIENT__;
const concepts = window.__CONCEPTS__;
const grid = document.getElementById('grid');
const ratioButtons = Array.from(document.querySelectorAll('.ratio-button'));
const activeRatioLabel = document.getElementById('activeRatioLabel');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const currentYear = document.getElementById('currentYear');
let activeRatio = '1:1';
const logoPath = 'assets/logo.svg';
currentYear.textContent = new Date().getFullYear();
document.documentElement.style.setProperty('--tile-ratio', activeRatio === '4:5' ? '4 / 5' : '1 / 1');
function slugify(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function getInitials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'MT'; }
function renderTileBody(post) {
  const content = post.content || {};
  if (post.layout === 'STAT_BIG_NUMBER') return `<div class="tile-body stat-layout"><h3 class="stat-big">${escapeHtml(content.stat)}</h3><p class="stat-label">${escapeHtml(content.label)}</p><p class="stat-subtext">${escapeHtml(content.subtext)}</p></div>`;
  if (post.layout === 'QUOTE_TESTIMONIAL') return `<div class="quote-mark">“</div><div class="tile-body quote-layout"><p class="quote-text">${escapeHtml(content.quote)}</p><div class="quote-credit"><strong>${escapeHtml(content.author)}</strong><span>${escapeHtml(content.title)}</span></div></div>`;
  if (post.layout === 'SERVICE_3_BULLETS') {
    const bullets = Array.isArray(content.bullets) ? content.bullets : [];
    return `<div class="tile-body service-layout"><h3 class="service-title">${escapeHtml(content.title)}</h3><ul class="service-list">${bullets.map(bullet => `<li><span class="check">✓</span><span>${escapeHtml(bullet)}</span></li>`).join('')}</ul></div>`;
  }
  return `<div class="tile-body"><p>Unsupported layout: ${escapeHtml(post.layout)}</p></div>`;
}
function postCard(post, variety) {
  const initials = getInitials(client.clientName);
  return `<article class="card"><div class="card-meta"><span class="variety-tag">${escapeHtml(variety.name)}</span><span class="layout-tag">${escapeHtml(post.layout.replaceAll('_', ' '))}</span></div><div class="tile" data-post-id="${post.id}" data-ratio="${activeRatio}" data-variety="${escapeHtml(variety.name)}"><div class="tile-inner"><div class="tile-top"><div class="tile-id">Post ${String(post.id).padStart(2, '0')}</div><div class="tile-variety">${escapeHtml(variety.name)}</div></div>${renderTileBody(post)}<div class="tile-footer"><div class="tile-brand"><img src="${logoPath}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'), {className:'text-logo', textContent:'${escapeHtml(initials)}'}))"><span>${escapeHtml(client.clientName)}</span></div></div></div></div><div class="tile-actions"><button class="download-button" data-download-id="${post.id}">Download PNG</button></div></article>`;
}
function renderGrid() {
  const markup = concepts.varieties.flatMap(variety => variety.posts.map(post => postCard(post, variety))).join('');
  grid.innerHTML = markup;
  bindDownloadButtons();
  updateRatioAttributes();
}
function updateRatioAttributes() {
  document.documentElement.style.setProperty('--tile-ratio', activeRatio === '4:5' ? '4 / 5' : '1 / 1');
  document.querySelectorAll('.tile').forEach(tile => { tile.dataset.ratio = activeRatio; });
  activeRatioLabel.textContent = activeRatio;
}
async function waitForAssets() {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const images = Array.from(document.images).filter(img => !img.complete);
  if (images.length) await Promise.all(images.map(img => new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); })));
}
function filenameFor(tile, index) {
  const variety = slugify(tile.dataset.variety || 'variety');
  return `${client.clientSlug}_${variety}_post-${String(index).padStart(2, '0')}_${activeRatio.replace(':', 'x')}.png`;
}
async function exportTile(tile, index) {
  await waitForAssets();
  const ratio = activeRatio === '4:5' ? { width: 1080, height: 1350 } : { width: 1080, height: 1080 };
  const canvas = await html2canvas(tile, { backgroundColor: null, scale: Math.max(2, window.devicePixelRatio || 2), useCORS: true, width: tile.offsetWidth, height: tile.offsetHeight, onclone: clonedDoc => { const clonedTile = clonedDoc.querySelector(`.tile[data-post-id="${tile.dataset.postId}"]`); if (clonedTile) { clonedTile.style.width = `${ratio.width}px`; clonedTile.style.height = `${ratio.height}px`; clonedTile.style.aspectRatio = activeRatio === '4:5' ? '4 / 5' : '1 / 1'; } } });
  return new Promise(resolve => canvas.toBlob(blob => resolve({ blob, filename: filenameFor(tile, index) }), 'image/png'));
}
async function downloadBlob(blob, filename) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1200);
}
function bindDownloadButtons() {
  document.querySelectorAll('.download-button').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.downloadId;
      const tile = document.querySelector(`.tile[data-post-id="${id}"]`);
      const tiles = Array.from(document.querySelectorAll('.tile'));
      const index = tiles.indexOf(tile) + 1;
      const originalText = button.textContent;
      button.disabled = true; button.textContent = 'Rendering…';
      try { const { blob, filename } = await exportTile(tile, index); await downloadBlob(blob, filename); }
      catch (error) { console.error(error); alert('Export failed for this tile. Check the console for details.'); }
      finally { button.disabled = false; button.textContent = originalText; }
    });
  });
}
ratioButtons.forEach(button => button.addEventListener('click', () => { activeRatio = button.dataset.ratio; ratioButtons.forEach(item => item.classList.toggle('is-active', item === button)); updateRatioAttributes(); }));
downloadAllBtn.addEventListener('click', async () => {
  const tiles = Array.from(document.querySelectorAll('.tile')); if (!tiles.length) return;
  const originalText = downloadAllBtn.innerHTML; downloadAllBtn.disabled = true; downloadAllBtn.innerHTML = '<span>Packaging…</span>';
  try { const zip = new JSZip(); for (let i = 0; i < tiles.length; i += 1) { const { blob, filename } = await exportTile(tiles[i], i + 1); zip.file(filename, blob); } const archive = await zip.generateAsync({ type: 'blob' }); await downloadBlob(archive, `${client.clientSlug}-social-posts.zip`); }
  catch (error) { console.error(error); alert('Download all failed. Check the console for details.'); }
  finally { downloadAllBtn.disabled = false; downloadAllBtn.innerHTML = originalText; }
});
renderGrid();
