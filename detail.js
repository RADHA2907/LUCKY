/**
 * =====================================================
 * ANIME_RIFT — Detail Page Script (detail.js)
 * =====================================================
 */

'use strict';

const API_BASE = 'https://api.jikan.moe/v4';

// ============================================================
// UTILITIES (shared with script.js but standalone here)
// ============================================================
async function apiFetch(endpoint, retries = 3) {
  const url = `${API_BASE}${endpoint}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

function formatScore(score) {
  return score ? parseFloat(score).toFixed(2) : 'N/A';
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function truncate(text, maxLen = 400) {
  if (!text) return 'No synopsis available.';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function showToast(message, type = 'info', icon = 'fas fa-info-circle') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ============================================================
// FAVORITES
// ============================================================
let favorites = JSON.parse(localStorage.getItem('animerift_favorites') || '[]');

function isFavorite(id) {
  return favorites.some(f => f.mal_id === id);
}

function toggleFavorite(anime) {
  const idx = favorites.findIndex(f => f.mal_id === anime.mal_id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    showToast(`Removed "${anime.title}" from favorites`, 'info', 'fas fa-heart-crack');
  } else {
    favorites.push({
      mal_id: anime.mal_id,
      title: anime.title,
      score: anime.score,
      images: anime.images,
    });
    showToast(`Added to favorites! ❤️`, 'success', 'fas fa-heart');
  }
  localStorage.setItem('animerift_favorites', JSON.stringify(favorites));
  updateFavUI(anime.mal_id);
  renderFavoritesSidebar();
}

function updateFavUI(id) {
  const fav = isFavorite(id);
  const btn = document.getElementById('detail-fav-btn');
  const countEl = document.getElementById('fav-count');
  if (btn) {
    btn.innerHTML = fav
      ? '<i class="fas fa-heart"></i> Remove from Favorites'
      : '<i class="fas fa-heart"></i> Add to Favorites';
    btn.style.background = fav ? 'linear-gradient(135deg, #ff4081, #e040fb)' : '';
  }
  if (countEl) countEl.textContent = favorites.length;
}

function renderFavoritesSidebar() {
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  if (!list) return;
  if (favorites.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = favorites.map(a => `
    <div class="fav-item" onclick="window.location.href='detail.html?id=${a.mal_id}'">
      <img src="${a.images?.jpg?.image_url || 'assets/logo.png'}" alt="${a.title}" onerror="this.src='assets/logo.png'" />
      <div class="fav-item-info">
        <div class="fav-item-title">${a.title}</div>
        <div class="fav-item-score"><i class="fas fa-star"></i> ${formatScore(a.score)}</div>
      </div>
      <button class="fav-remove" onclick="event.stopPropagation(); removeFavById(${a.mal_id})" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function removeFavById(id) {
  const anime = favorites.find(f => f.mal_id === id);
  if (anime) toggleFavorite(anime);
}

// ============================================================
// THEME
// ============================================================
function initTheme() {
  const theme = localStorage.getItem('animerift_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('animerift_theme', next);
    const ic = document.getElementById('theme-icon');
    if (ic) ic.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  });
}

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 20));

  // Search redirect
  const input = document.getElementById('search-input');
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `index.html#search:${encodeURIComponent(input.value.trim())}`;
    }
  });

  const clearBtn = document.getElementById('search-clear');
  input?.addEventListener('input', () => {
    clearBtn?.classList.toggle('visible', input.value.length > 0);
  });
  clearBtn?.addEventListener('click', () => {
    if (input) input.value = '';
    clearBtn.classList.remove('visible');
  });

  // Favorites sidebar
  const favBtn = document.getElementById('fav-btn');
  const sidebar = document.getElementById('favorites-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const closeBtn = document.getElementById('sidebar-close');

  favBtn?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
  });
  closeBtn?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    closeAuthModal();
  });
}

// ============================================================
// MAIN DETAIL LOADER
// ============================================================
async function loadAnimeDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // Fetch full anime data AND characters AND recommendations in parallel
    const [animeRes, charsRes, recsRes, videosRes] = await Promise.allSettled([
      apiFetch(`/anime/${id}/full`),
      apiFetch(`/anime/${id}/characters`),
      apiFetch(`/anime/${id}/recommendations`),
      apiFetch(`/anime/${id}/videos`),
    ]);

    const anime = animeRes.status === 'fulfilled' ? animeRes.value?.data : null;
    const chars = charsRes.status === 'fulfilled' ? charsRes.value?.data || [] : [];
    const recs = recsRes.status === 'fulfilled' ? recsRes.value?.data || [] : [];
    const videos = videosRes.status === 'fulfilled' ? videosRes.value?.data : null;

    if (!anime) {
      showError('Anime not found. It may have been removed or the ID is invalid.');
      return;
    }

    // Update page title
    document.title = `${anime.title} — Anime_Rift`;

    // Render all sections
    renderHero(anime);
    renderPoster(anime);
    renderTitleBlock(anime);
    renderRatingBar(anime);
    renderGenres(anime);
    renderSynopsis(anime);
    renderQuickInfo(anime);
    renderTrailer(anime, videos);
    renderCharacters(chars);
    renderRecommendations(recs);
    renderFavButton(anime);
    renderFavoritesSidebar();

    // Update fav count
    const countEl = document.getElementById('fav-count');
    if (countEl) countEl.textContent = favorites.length;

  } catch (err) {
    console.error(err);
    showError('Failed to load anime data. Please check your connection and try again.');
  }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderHero(anime) {
  const bg = document.getElementById('detail-hero-bg');
  const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  if (bg && img) bg.style.backgroundImage = `url('${img}')`;
}

function renderPoster(anime) {
  const wrapper = document.getElementById('poster-wrapper');
  if (!wrapper) return;
  const img = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || 'assets/logo.png';
  wrapper.innerHTML = `
    <img src="${img}" alt="${anime.title}" onerror="this.src='assets/logo.png'" style="width:100%;height:100%;object-fit:cover;" />
  `;
}

function renderTitleBlock(anime) {
  const block = document.getElementById('detail-title-block');
  if (!block) return;
  block.innerHTML = `
    <h1 class="detail-title">${anime.title}</h1>
    ${anime.title_japanese ? `<div class="detail-title-jp">${anime.title_japanese}</div>` : ''}
    ${anime.title_english && anime.title_english !== anime.title ? `<div class="detail-title-jp" style="font-style:normal;color:var(--text-secondary);font-size:1rem;">${anime.title_english}</div>` : ''}
  `;
}

function renderRatingBar(anime) {
  const bar = document.getElementById('rating-bar');
  if (!bar) return;
  bar.innerHTML = `
    ${anime.score ? `
      <div class="rating-badge mal">
        <i class="fas fa-star"></i> ${formatScore(anime.score)}
        <span style="font-size:0.75rem;opacity:0.7;">/ 10</span>
      </div>
    ` : ''}
    ${anime.rank ? `
      <div class="rating-badge members">
        <i class="fas fa-trophy"></i> Rank #${anime.rank}
      </div>
    ` : ''}
    ${anime.members ? `
      <div class="rating-badge members">
        <i class="fas fa-users"></i> ${(anime.members / 1000).toFixed(0)}K Members
      </div>
    ` : ''}
    ${anime.popularity ? `
      <div class="rating-badge members">
        <i class="fas fa-fire"></i> Popularity #${anime.popularity}
      </div>
    ` : ''}
  `;
}

function renderGenres(anime) {
  const row = document.getElementById('genres-row');
  if (!row) return;
  const genres = [...(anime.genres || []), ...(anime.themes || []), ...(anime.demographics || [])];
  row.innerHTML = genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('');
}

function renderSynopsis(anime) {
  const block = document.getElementById('synopsis-block');
  if (!block) return;
  const synopsis = anime.synopsis || 'No synopsis available.';
  const short = synopsis.slice(0, 500);
  const long = synopsis;
  const needsMore = synopsis.length > 500;

  block.innerHTML = `
    <h3 class="detail-section-label"><i class="fas fa-scroll"></i> Synopsis</h3>
    <p class="synopsis-text" id="synopsis-text">${needsMore ? short + '…' : long}</p>
    ${needsMore ? `<button class="synopsis-more" id="synopsis-more-btn" onclick="expandSynopsis(\`${long.replace(/`/g, "'")}\`)">
      Read More <i class="fas fa-chevron-down"></i>
    </button>` : ''}
  `;
}

window.expandSynopsis = function(full) {
  const text = document.getElementById('synopsis-text');
  const btn = document.getElementById('synopsis-more-btn');
  if (text) text.textContent = full;
  if (btn) btn.remove();
};

function renderQuickInfo(anime) {
  const el = document.getElementById('quick-info');
  if (!el) return;

  const status = anime.status || 'Unknown';
  const statusClass = status.includes('Airing') ? 'status-airing' : 'status-ended';

  const rows = [
    { label: '<i class="fas fa-play-circle"></i> Type', value: anime.type || 'N/A' },
    { label: '<i class="fas fa-list"></i> Episodes', value: anime.episodes ? `${anime.episodes} eps` : 'Ongoing' },
    { label: '<i class="fas fa-layer-group"></i> Seasons', value: anime.seasons || '1' },
    { label: '<i class="fas fa-signal"></i> Status', value: status, cls: statusClass },
    { label: '<i class="fas fa-calendar-plus"></i> Aired', value: formatDate(anime.aired?.from) },
    { label: '<i class="fas fa-calendar-minus"></i> Ended', value: formatDate(anime.aired?.to) },
    { label: '<i class="fas fa-clock"></i> Duration', value: anime.duration || 'N/A' },
    { label: '<i class="fas fa-tv"></i> Source', value: anime.source || 'N/A' },
    { label: '<i class="fas fa-building"></i> Studio', value: (anime.studios || []).map(s => s.name).join(', ') || 'N/A' },
    { label: '<i class="fas fa-globe"></i> Rating', value: anime.rating || 'N/A' },
  ];

  el.innerHTML = rows.map(r => `
    <div class="quick-info-row">
      <span class="quick-info-label">${r.label}</span>
      <span class="quick-info-value ${r.cls || ''}">${r.value}</span>
    </div>
  `).join('');
}

function renderTrailer(anime, videosData) {
  const block = document.getElementById('trailer-block');
  if (!block) return;

  // Try trailer from full anime data first
  const trailerUrl = anime.trailer?.embed_url
    || (videosData?.promo?.[0]?.trailer?.embed_url);

  if (trailerUrl) {
    block.innerHTML = `
      <h3 class="detail-section-label"><i class="fas fa-film"></i> Trailer</h3>
      <div class="trailer-embed">
        <iframe
          src="${trailerUrl}?autoplay=0&rel=0"
          title="${anime.title} Trailer"
          allowfullscreen
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>
    `;
  } else {
    // Try YouTube search link as fallback
    const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(anime.title + ' official trailer')}`;
    block.innerHTML = `
      <h3 class="detail-section-label"><i class="fas fa-film"></i> Trailer</h3>
      <div class="trailer-placeholder">
        <i class="fas fa-play-circle"></i>
        <span>No trailer available</span>
        <a href="${ytSearch}" target="_blank" rel="noopener" class="btn-outline" style="margin-top:8px;">
          <i class="fab fa-youtube"></i> Search on YouTube
        </a>
      </div>
    `;
  }
}

function renderCharacters(chars) {
  const block = document.getElementById('characters-block');
  const scroll = document.getElementById('characters-scroll');
  if (!block || !scroll) return;

  // Sort: main characters first
  const sorted = chars.sort((a, b) => {
    const order = { Main: 0, Supporting: 1 };
    return (order[a.role] ?? 2) - (order[b.role] ?? 2);
  });

  if (sorted.length === 0) {
    scroll.innerHTML = '<p style="color:var(--text-muted);padding:16px;">Character data not available.</p>';
    return;
  }

  scroll.innerHTML = sorted.slice(0, 20).map(c => {
    const char = c.character;
    const img = char?.images?.jpg?.image_url || 'assets/logo.png';
    return `
      <div class="char-card" title="${char?.name}">
        <img class="char-img" src="${img}" alt="${char?.name}" onerror="this.src='assets/logo.png'" loading="lazy" />
        <div class="char-info">
          <div class="char-name">${char?.name}</div>
          <div class="char-role">${c.role}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecommendations(recs) {
  const row = document.getElementById('related-row');
  if (!row) return;

  const list = recs.slice(0, 12);
  if (list.length === 0) {
    row.parentElement?.remove();
    return;
  }

  row.innerHTML = list.map(r => {
    const a = r.entry;
    const img = a.images?.jpg?.image_url || 'assets/logo.png';
    return `
      <div class="anime-card" style="flex:0 0 160px;min-width:160px;" onclick="window.location.href='detail.html?id=${a.mal_id}'">
        <div class="card-poster">
          <img src="${img}" alt="${a.title}" loading="lazy" onerror="this.src='assets/logo.png'" />
          <div class="card-gradient"></div>
          <div class="card-hover-overlay">
            <div class="card-hover-title">${a.title}</div>
            <button class="card-hover-btn">View Details</button>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">${a.title}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFavButton(anime) {
  const btn = document.getElementById('detail-fav-btn');
  if (!btn) return;
  updateFavUI(anime.mal_id);
  btn.addEventListener('click', () => toggleFavorite(anime));
}

function showError(msg) {
  const layout = document.getElementById('detail-layout');
  if (layout) {
    layout.innerHTML = `
      <div class="error-state" style="grid-column:1/-1;padding:60px;text-align:center;">
        <i class="fas fa-exclamation-triangle"></i>
        <h3 style="color:var(--text-primary);margin-bottom:12px;">${msg}</h3>
        <a href="index.html" class="btn-primary">← Back to Home</a>
      </div>
    `;
  }
}

// Auth modal helpers
function closeAuthModal() {
  document.getElementById('auth-modal-overlay')?.classList.remove('open');
}

// ============================================================
// INIT
// ============================================================
function init() {
  initTheme();
  initNavbar();
  renderFavoritesSidebar();

  // Fav count
  const countEl = document.getElementById('fav-count');
  if (countEl) countEl.textContent = favorites.length;

  // Auth modal
  document.getElementById('auth-btn')?.addEventListener('click', () => {
    document.getElementById('auth-modal-overlay')?.classList.add('open');
  });
  document.getElementById('auth-modal-close')?.addEventListener('click', closeAuthModal);

  // Load data
  loadAnimeDetail();
}

document.addEventListener('DOMContentLoaded', init);
