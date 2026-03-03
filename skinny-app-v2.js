/**
 * The Skinny On Living A Better Life — v2
 * NEW TODAY articles always appear FIRST
 * Shows up to 30 articles per category (not 6)
 * Pulse Logic: Breaking badges auto-expire after 24 hours
 * Targets existing HTML: {category}-content grid IDs
 */

const SUPABASE_URL  = 'https://dsjccknnpbhfzbnxvcoq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ic3hE4FJPKyjbCE17t_4Ng_fg-A9acu';

const CATEGORIES = [
  { htmlId: 'family',           dbSlug: 'family'          },
  { htmlId: 'fitness-mental',   dbSlug: 'mental-fitness'  },
  { htmlId: 'fitness-physical', dbSlug: 'physical-fitness'},
  { htmlId: 'finance',          dbSlug: 'finance'         },
  { htmlId: 'future-self',      dbSlug: 'future-self'     },
  { htmlId: 'food',             dbSlug: 'food'            },
  { htmlId: 'fun',              dbSlug: 'fun'             },
  { htmlId: 'fashion',          dbSlug: 'fashion'         },
  { htmlId: 'friends',          dbSlug: 'friends'         }
];

async function sb(path ) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${path}`);
  return r.json();
}

function freshness(publishedAt) {
  if (!publishedAt) return { label: 'EVERGREEN', cls: 'evergreen', priority: 3 };
  const h = (Date.now() - new Date(publishedAt)) / 3_600_000;
  if (h < 24)  return { label: 'NEW TODAY',  cls: 'breaking',  priority: 1 };
  if (h < 72)  return { label: 'THIS WEEK',  cls: 'recent',    priority: 2 };
  return             { label: 'EVERGREEN',   cls: 'evergreen', priority: 3 };
}

function sortByFreshness(articles) {
  return [...articles].sort((a, b) => {
    const fa = freshness(a.published_at);
    const fb = freshness(b.published_at);
    if (fa.priority !== fb.priority) return fa.priority - fb.priority;
    return new Date(b.published_at || 0) - new Date(a.published_at || 0);
  });
}

function timeAgo(d) {
  if (!d) return '';
  const h = Math.floor((Date.now() - new Date(d)) / 3_600_000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function articleCard(article) {
  const f = freshness(article.published_at);
  const sourceName = (article.sources && article.sources.name) ? article.sources.name : '';
  const title = article.ai_hook || article.title || 'Untitled';
  const url   = article.original_url || article.url || '#';
  const desc  = article.excerpt || article.description || '';
  const tags  = (article.tags || []).slice(0, 3);
  const ago   = timeAgo(article.published_at);
  const badgeColor = f.cls === 'breaking' ? '#DC2626' : f.cls === 'recent' ? '#F59E0B' : '#FF4D00';
  return `
    <div class="article-card ${f.cls}">
      <div class="article-meta">
        <span class="source-name">${sourceName}</span>
        ${ago ? `<span style="font-size:0.7rem;color:#9CA3AF;">${ago}</span>` : ''}
      </div>
      <div class="article-content">
        <h3 class="article-title">
          <a href="${url}" target="_blank" rel="noopener">${title}</a>
        </h3>
        ${desc ? `<p class="article-description">${desc.slice(0, 160)}${desc.length > 160 ? '…' : ''}</p>` : ''}
        <div class="article-tags">
          <span class="article-tag" style="background:${badgeColor};color:#fff;font-weight:700;">${f.label}</span>
          ${tags.map(t => `<span class="article-tag">#${t}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

async function loadCategory(htmlId) {
  const cat = CATEGORIES.find(c => c.htmlId === htmlId);
  if (!cat) return;
  const gridEl = document.getElementById(`${htmlId}-content`);
  if (!gridEl) return;
  gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#9CA3AF;">Loading fresh content...</div>`;
  try {
    const articles = await sb(
      `articles?category=eq.${cat.dbSlug}&status=eq.approved&order=published_at.desc&limit=30&select=*,sources(name,domain)`
    );
    const sorted = sortByFreshness(articles);
    if (sorted.length === 0) {
      gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#9CA3AF;">Fresh content loads daily at 3AM ET. Check back soon!</div>`;
      return;
    }
    gridEl.innerHTML = sorted.map(a => articleCard(a)).join('');
  } catch (err) {
    console.error(`Failed to load ${htmlId}:`, err);
    gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#9CA3AF;">Content loading — please try again shortly.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tsEl = document.getElementById('lastUpdated');
  if (tsEl) {
    const now = new Date();
    tsEl.textContent = `Updated ${now.toLocaleDateString('en-US',{month:'short',day:'numeric'})} at 3:00 AM ET`;
  }
  setTimeout(() => {
    document.querySelectorAll('.nav-item').forEach(item => {
      const fresh = item.cloneNode(true);
      item.parentNode.replaceChild(fresh, item);
      fresh.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        fresh.classList.add('active');
        const catId = fresh.dataset.category;
        document.querySelectorAll('.category-view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(`${catId}-view`);
        if (view) view.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadCategory(catId);
      });
    });
    const activeNav = document.querySelector('.nav-item.active');
    const activeCatId = activeNav ? activeNav.dataset.category : 'family';
    loadCategory(activeCatId);
    console.log('The Skinny v2 — Supabase live data, sorted by freshness, 30 articles per category');
  }, 0);
});
