/**
 * The Skinny On Living A Better Life — v2
 * NEW TODAY articles always appear FIRST
 * Shows 30 articles per category (not 6 )
 * Pulse Logic: Breaking badges auto-expire after 24 hours
 */

const SUPABASE_URL  = 'https://dsjccknnpbhfzbnxvcoq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ic3hE4FJPKyjbCE17t_4Ng_fg-A9acu';

const CATEGORIES = [
  { html: 'family',           db: 'family',           label: 'Family',           color: '#E74C3C' },
  { html: 'fitness-mental',   db: 'mental-fitness',   label: 'Mental Fitness',   color: '#9B59B6' },
  { html: 'fitness-physical', db: 'physical-fitness', label: 'Physical Fitness', color: '#27AE60' },
  { html: 'finance',          db: 'finance',          label: 'Finance',          color: '#F39C12' },
  { html: 'future-self',      db: 'future-self',      label: 'Future Self',      color: '#2980B9' },
  { html: 'food',             db: 'food',             label: 'Food',             color: '#E67E22' },
  { html: 'fun',              db: 'fun',              label: 'Fun',              color: '#1ABC9C' },
  { html: 'fashion',          db: 'fashion',          label: 'Fashion',          color: '#E91E63' },
  { html: 'friends',          db: 'friends',          label: 'Friends',          color: '#3498DB' }
];

async function sb(path ) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${path}`);
  return r.json();
}

function badge(publishedAt) {
  if (!publishedAt) return { label: '🟢 EVERGREEN', cls: 'evergreen', priority: 3 };
  const h = (Date.now() - new Date(publishedAt)) / 3_600_000;
  if (h < 24)  return { label: '🔴 NEW TODAY',  cls: 'breaking',  priority: 1 };
  if (h < 72)  return { label: '🟡 THIS WEEK',  cls: 'recent',    priority: 2 };
  return             { label: '🟢 EVERGREEN',   cls: 'evergreen', priority: 3 };
}

function sortArticles(articles) {
  return [...articles].sort((a, b) => {
    const ba = badge(a.published_at);
    const bb = badge(b.published_at);
    if (ba.priority !== bb.priority) return ba.priority - bb.priority;
    return new Date(b.published_at || 0) - new Date(a.published_at || 0);
  });
}

function ago(d) {
  if (!d) return '';
  const h = Math.floor((Date.now() - new Date(d)) / 3_600_000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function skelCards(n = 9) {
  return Array(n).fill(`
    <div style="background:#fff;border-radius:6px;padding:1rem;box-shadow:0 1px 4px rgba(0,0,0,.06);border-left:4px solid #eee;">
      <div style="height:10px;background:#f0f0f0;border-radius:4px;width:40%;margin-bottom:.75rem;animation:pulse 1.5s infinite;"></div>
      <div style="height:16px;background:#f0f0f0;border-radius:4px;width:90%;margin-bottom:.5rem;animation:pulse 1.5s infinite;"></div>
      <div style="height:16px;background:#f0f0f0;border-radius:4px;width:75%;margin-bottom:.75rem;animation:pulse 1.5s infinite;"></div>
      <div style="height:10px;background:#f0f0f0;border-radius:4px;width:30%;animation:pulse 1.5s infinite;"></div>
    </div>`).join('');
}

function articleCard(a, catColor) {
  const b = badge(a.published_at);
  const hook = a.ai_hook || a.title;
  const src  = a.sources || {};
  const tags = (a.tags || []).slice(0, 3);
  const color = catColor || '#FF4500';
  const isBreaking = b.priority === 1;
  const cardStyle = isBreaking
    ? `border-left:4px solid ${color};border-top:2px solid ${color};padding:1rem;margin-bottom:1rem;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.12);`
    : `border-left:4px solid ${color};padding:1rem;margin-bottom:1rem;background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);`;
  return `
    <div class="article-card" style="${cardStyle}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
        <span style="font-weight:700;font-size:.78rem;color:#333;text-transform:uppercase;letter-spacing:.03em;">${src.name || ''}</span>
        <span style="font-size:.68rem;color:#aaa;">${ago(a.published_at)}</span>
      </div>
      <h3 style="margin:.25rem 0 .5rem;font-size:.98rem;line-height:1.45;font-weight:700;">
        <a href="${a.original_url}" target="_blank" rel="noopener" style="color:#1a1a1a;text-decoration:none;">${hook}</a>
      </h3>
      ${a.excerpt ? `<p style="font-size:.83rem;color:#555;margin:.25rem 0 .5rem;line-height:1.5;">${a.excerpt.slice(0,140)}…</p>` : ''}
      <div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;">
        <span style="font-size:.68rem;padding:.2rem .55rem;border-radius:3px;background:${isBreaking ? color : '#e8f5e9'};color:${isBreaking ? '#fff' : '#2e7d32'};font-weight:700;">${b.label}</span>
        ${tags.map(t => `<span style="font-size:.68rem;padding:.2rem .5rem;border-radius:3px;background:#f5f5f5;color:#666;">#${t}</span>`).join('')}
      </div>
    </div>`;
}

function sourcesPanel(sources, color) {
  return `
    <div style="background:#f9f9f9;border-radius:8px;padding:1.25rem;margin-top:1.5rem;border-top:3px solid ${color};">
      <h3 style="color:${color};margin:0 0 1rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;font-weight:800;">
        🔴 ${sources.length} Curated Sources
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
        ${sources.map(s => `<span style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:.3rem .7rem;font-size:.78rem;color:#333;font-weight:600;">${s.name}</span>`).join('')}
      </div>
    </div>`;
}

function breakingBanner(articles, color) {
  const newToday = articles.filter(a => badge(a.published_at).priority === 1).length;
  if (newToday === 0) return '';
  return `
    <div style="background:${color};color:#fff;padding:.6rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:.85rem;font-weight:700;">
      🔴 ${newToday} NEW TODAY — Fresh content delivered this morning at 3AM ET
    </div>`;
}

async function renderCategory(htmlId) {
  const cat = CATEGORIES.find(c => c.html === htmlId);
  if (!cat) return;
  const container = document.getElementById('app-content');
  if (!container) return;

  container.innerHTML = `
    <div class="category-view active" id="${htmlId}-view">
      <div style="border-bottom:3px solid ${cat.color};padding:1.5rem 0 1rem;margin-bottom:1.5rem;">
        <h1 style="color:${cat.color};margin:0 0 .25rem;font-size:2rem;font-weight:900;letter-spacing:-.02em;">${cat.label.toUpperCase()}</h1>
        <div id="src-count-${htmlId}" style="font-size:.85rem;color:#888;">Loading sources...</div>
      </div>
      <div id="banner-${htmlId}"></div>
      <div id="grid-${htmlId}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;">
        ${skelCards(9)}
      </div>
      <div id="sources-panel-${htmlId}"></div>
    </div>`;

  try {
    const [arts, srcs] = await Promise.all([
      sb(`articles?category=eq.${cat.db}&status=eq.approved&order=published_at.desc&limit=30&select=*,sources(name,domain,description)`),
      sb(`sources?category=eq.${cat.db}&is_active=eq.true&select=name,domain,description`)
    ]);
    const sorted = sortArticles(arts);
    const grid    = document.getElementById(`grid-${htmlId}`);
    const countEl = document.getElementById(`src-count-${htmlId}`);
    const bannerEl = document.getElementById(`banner-${htmlId}`);
    const panelEl = document.getElementById(`sources-panel-${htmlId}`);
    if (countEl)  countEl.textContent  = `🔴 ${srcs.length} Curated Sources`;
    if (bannerEl) bannerEl.innerHTML   = breakingBanner(arts, cat.color);
    if (grid)     grid.innerHTML       = sorted.length
      ? sorted.map(a => articleCard(a, cat.color)).join('')
      : `<p style="grid-column:1/-1;text-align:center;color:#999;padding:3rem;">Fresh content loads daily at 3AM ET. Check back soon!</p>`;
    if (panelEl && srcs.length) panelEl.innerHTML = sourcesPanel(srcs, cat.color);
  } catch (e) {
    console.error('Category load error:', e);
    const grid = document.getElementById(`grid-${htmlId}`);
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem;">Content loading — please try again shortly.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .article-card a:hover { color:#FF4500 !important; text-decoration:underline !important; }
  `;
  document.head.appendChild(style);

  const ts = document.getElementById('lastUpdated');
  if (ts) ts.textContent = `Updated ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})} at 3:00 AM ET`;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      renderCategory(item.dataset.category);
    });
  });

  const firstNav = document.querySelector('.nav-item');
  if (firstNav) {
    firstNav.classList.add('active');
    renderCategory(firstNav.dataset.category);
  }
});
