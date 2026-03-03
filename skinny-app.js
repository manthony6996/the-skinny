/**
 * The Skinny On Living A Better Life
 * Supabase-powered dynamic content loader
 * Pulse Logic: Breaking badges auto-expire after 24 hours
 * Dynamic Counts: Calculated from real Supabase data
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
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}

function badge(publishedAt) {
  if (!publishedAt) return { label: '🟢 EVERGREEN', cls: 'evergreen' };
  const h = (Date.now() - new Date(publishedAt)) / 3_600_000;
  if (h < 24) return { label: '🔴 NEW TODAY', cls: 'breaking' };
  if (h < 72) return { label: '🟡 THIS WEEK', cls: 'recent' };
  return { label: '🟢 EVERGREEN', cls: 'evergreen' };
}

function ago(d) {
  if (!d) return '';
  const h = Math.floor((Date.now() - new Date(d)) / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function skelCards(n = 6) {
  return Array(n).fill(`
    <div style="background:#f0f0f0;border-radius:8px;padding:1.25rem;animation:pulse 1.5s infinite;">
      <div style="height:12px;background:#ddd;border-radius:4px;margin-bottom:.75rem;width:30%;"></div>
      <div style="height:18px;background:#ddd;border-radius:4px;margin-bottom:.5rem;"></div>
      <div style="height:18px;background:#ddd;border-radius:4px;width:75%;"></div>
    </div>`).join('');
}

function articleCard(a, color) {
  const b = badge(a.published_at);
  const hook = a.ai_hook || a.title;
  const src = a.sources || {};
  const tags = (a.tags || []).slice(0, 3);
  color = color || '#FF4500';
  return `
    <div style="border-left:4px solid ${color};padding:1rem;margin-bottom:1rem;background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
      <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;font-size:.75rem;color:#888;">
        <span style="font-weight:700;color:#333;">${src.name || ''}</span>
        <span>${ago(a.published_at)}</span>
      </div>
      <h3 style="margin:.25rem 0 .5rem;font-size:1rem;line-height:1.4;">
        <a href="${a.original_url}" target="_blank" rel="noopener" style="color:#1a1a1a;text-decoration:none;">${hook}</a>
      </h3>
      ${a.excerpt ? `<p style="font-size:.85rem;color:#555;margin:.25rem 0;">${a.excerpt.slice(0,160)}…</p>` : ''}
      <div style="margin-top:.5rem;">
        <span style="font-size:.7rem;padding:.2rem .5rem;border-radius:3px;background:${color}22;color:${color};font-weight:600;">${b.label}</span>
        ${tags.map(t=>`<span style="font-size:.7rem;padding:.2rem .5rem;border-radius:3px;background:#f0f0f0;color:#666;margin-left:.25rem;">#${t}</span>`).join('')}
      </div>
    </div>`;
}

function sourcesPanel(sources, color) {
  return `
    <div style="background:#f9f9f9;border-radius:8px;padding:1.25rem;margin-top:1.5rem;">
      <h3 style="color:${color};margin-bottom:1rem;font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;">
        🔴 ${sources.length} Curated Sources
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;">
        ${sources.map(s=>`<span style="background:#fff;border:1px solid #e0e0e0;border-radius:4px;padding:.3rem .7rem;font-size:.8rem;color:#333;font-weight:600;">${s.name}</span>`).join('')}
      </div>
    </div>`;
}

async function renderCategory(htmlId) {
  const cat = CATEGORIES.find(c => c.html === htmlId);
  if (!cat) return;
  const container = document.getElementById('app-content');
  container.innerHTML = `
    <div>
      <div style="padding:1.5rem 0 1rem;border-bottom:3px solid ${cat.color};">
        <h1 style="color:${cat.color};font-size:2rem;margin:0;">${cat.label.toUpperCase()}</h1>
        <div id="src-count-${htmlId}" style="font-size:.85rem;color:#888;margin-top:.25rem;">Loading sources...</div>
      </div>
      <div id="grid-${htmlId}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;margin:1.5rem 0;">
        ${skelCards(6)}
      </div>
      <div id="panel-${htmlId}"></div>
    </div>`;

  try {
    const [arts, srcs] = await Promise.all([
      sb(`articles?category=eq.${cat.db}&status=eq.approved&order=published_at.desc&limit=12&select=*,sources(name,domain,description)`),
      sb(`sources?category=eq.${cat.db}&is_active=eq.true&select=name,domain,description`)
    ]);
    const grid = document.getElementById(`grid-${htmlId}`);
    const countEl = document.getElementById(`src-count-${htmlId}`);
    const panelEl = document.getElementById(`panel-${htmlId}`);
    if (countEl) countEl.textContent = `🔴 ${srcs.length} Curated Sources`;
    if (grid) grid.innerHTML = arts.length
      ? arts.map(a => articleCard(a, cat.color)).join('')
      : '<p style="grid-column:1/-1;text-align:center;color:#999;padding:3rem;">Fresh content loads daily at 3AM ET. Run the scraper to load content now.</p>';
    if (panelEl && srcs.length) panelEl.innerHTML = sourcesPanel(srcs, cat.color);
  } catch(e) {
    console.error(e);
    const grid = document.getElementById(`grid-${htmlId}`);
    if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:2rem;">Content loading — please try again shortly.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const ts = document.getElementById('lastUpdated');
  if (ts) ts.textContent = `Updated ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})} at 3:00 AM ET`;

  const style = document.createElement('style');
  style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}';
  document.head.appendChild(style);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      renderCategory(item.dataset.category);
    });
  });

  const first = document.querySelector('.nav-item');
  if (first) renderCategory(first.dataset.category);
});
