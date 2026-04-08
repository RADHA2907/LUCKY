/**
 * =====================================================
 * ANIME_RIFT — Homepage Script (script.js)
 * Data Source: Jikan API v4 (https://api.jikan.moe/v4)
 * =====================================================
 */

'use strict';

// ============================================================
// CONSTANTS & STATE
// ============================================================
const API_BASE = 'https://api.jikan.moe/v4';

const GENRES_MAP = {
  1: 'Action', 2: 'Adventure', 4: 'Comedy', 7: 'Mystery',
  8: 'Drama', 9: 'Ecchi', 10: 'Fantasy', 14: 'Horror',
  22: 'Romance', 23: 'School', 24: 'Sci-Fi', 27: 'Shounen',
  36: 'Slice of Life', 37: 'Supernatural', 38: 'Military',
  39: 'Police', 40: 'Psychological', 41: 'Seinen', 42: 'Shoujo'
};

const GENRE_IMAGES = {
  1: 'https://img.jikan.moe/common-images/no_image.jpg',
  10: 'https://img.jikan.moe/common-images/no_image.jpg',
  22: 'https://img.jikan.moe/common-images/no_image.jpg',
};

let state = {
  currentGenre: '',
  currentSort: 'bypopularity',
  topRatedPage: 1,
  searchPage: 1,
  searchQuery: '',
  heroAnimes: [],
  heroIndex: 0,
  heroInterval: null,
  favorites: JSON.parse(localStorage.getItem('animerift_favorites') || '[]'),
  theme: localStorage.getItem('animerift_theme') || 'dark',
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Debounce — delays a function call until after delay ms
 */
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Fetch wrapper with error handling and rate-limit retry
 */
async function apiFetch(endpoint, retries = 3) {
  const url = `${API_BASE}${endpoint}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limited — wait 1s and retry
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info', icon = 'fas fa-info-circle') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icon}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

/**
 * Truncate text to N words
 */
function truncate(text, maxLen = 140) {
  if (!text) return 'No synopsis available.';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/**
 * Format score display
 */
function formatScore(score) {
  return score ? parseFloat(score).toFixed(2) : 'N/A';
}

/**
 * Format a date from YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Generate skeleton cards HTML
 */
function skeletonCards(count = 6, isGrid = true) {
  const cardHTML = `
    <div class="anime-card" style="cursor:default;">
      <div class="card-poster">
        <div class="skeleton-box" style="aspect-ratio:2/3;"></div>
      </div>
      <div class="card-info">
        <div class="skeleton-box sh14 sw80" style="margin-bottom:8px;"></div>
        <div class="skeleton-box sh12 sw50"></div>
      </div>
    </div>`;
  return Array(count).fill(cardHTML).join('');
}

// ============================================================
// FAVORITES
// ============================================================
function isFavorite(id) {
  return state.favorites.some(f => f.mal_id === id);
}

function toggleFavorite(anime) {
  const idx = state.favorites.findIndex(f => f.mal_id === anime.mal_id);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
    showToast(`Removed "${anime.title}" from favorites`, 'info', 'fas fa-heart-crack');
  } else {
    state.favorites.push({
      mal_id: anime.mal_id,
      title: anime.title,
      score: anime.score,
      images: anime.images,
    });
    showToast(`Added "${anime.title}" to favorites! ❤️`, 'success', 'fas fa-heart');
  }
  localStorage.setItem('animerift_favorites', JSON.stringify(state.favorites));
  updateFavCount();
  renderFavoritesSidebar();
}

function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = state.favorites.length;
}

function renderFavoritesSidebar() {
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');
  if (!list) return;

  if (state.favorites.length === 0) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.innerHTML = state.favorites.map(a => `
    <div class="fav-item" onclick="navigateToDetail(${a.mal_id})" id="fav-item-${a.mal_id}">
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
  const anime = state.favorites.find(f => f.mal_id === id);
  if (anime) toggleFavorite(anime);
}

// ============================================================
// THEME TOGGLE
// ============================================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  localStorage.setItem('animerift_theme', theme);
  state.theme = theme;
}

function initTheme() {
  applyTheme(state.theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });
}

// ============================================================
// NAVBAR BEHAVIOR
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Favorites sidebar toggle
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

  // Mobile hamburger
  const hamburger = document.getElementById('hamburger');
  const mobileSearch = document.getElementById('mobile-search');
  hamburger?.addEventListener('click', () => {
    mobileSearch?.classList.toggle('hidden');
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const dropdown = document.getElementById('suggestions-dropdown');

  if (!input) return;

  const debouncedSuggest = debounce(async (q) => {
    if (q.length < 2) {
      dropdown?.classList.remove('open');
      return;
    }
    try {
      const data = await apiFetch(`/anime?q=${encodeURIComponent(q)}&limit=8`);
      renderSuggestions(data?.data || []);
    } catch {
      dropdown?.classList.remove('open');
    }
  }, 400);

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
    debouncedSuggest(val);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) {
        dropdown?.classList.remove('open');
        performSearch(q, 1);
      }
    }
    if (e.key === 'Escape') {
      dropdown?.classList.remove('open');
      input.value = '';
      clearBtn?.classList.remove('visible');
    }
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    dropdown?.classList.remove('open');
    hideSearchResults();
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrapper')) {
      dropdown?.classList.remove('open');
    }
  });
}

function renderSuggestions(animes) {
  const dropdown = document.getElementById('suggestions-dropdown');
  if (!dropdown) return;

  if (animes.length === 0) {
    dropdown.classList.remove('open');
    return;
  }

  dropdown.innerHTML = animes.map(a => `
    <div class="suggestion-item" onclick="navigateToDetail(${a.mal_id})">
      <img src="${a.images?.jpg?.small_image_url || 'assets/logo.png'}" alt="${a.title}" onerror="this.src='assets/logo.png'" />
      <div class="suggestion-info">
        <div class="suggestion-title">${a.title}</div>
        <div class="suggestion-meta">${a.type || 'Anime'} · ${a.aired?.prop?.from?.year || '?'}</div>
      </div>
      <span class="suggestion-score"><i class="fas fa-star"></i> ${formatScore(a.score)}</span>
    </div>
  `).join('');

  dropdown.classList.add('open');
}

async function performSearch(query, page = 1) {
  state.searchQuery = query;
  state.searchPage = page;

  const section = document.getElementById('search-results-section');
  const grid = document.getElementById('search-results-grid');
  const countEl = document.getElementById('result-count');
  const homeSections = ['trending-section', 'top-rated-section', 'recent-section', 'genre-section'];

  // Show search section, hide home sections
  section?.classList.remove('hidden');
  homeSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (grid) grid.innerHTML = skeletonCards(12);
  if (countEl) countEl.textContent = 'Searching...';

  try {
    let url = `/anime?q=${encodeURIComponent(query)}&limit=20&page=${page}`;
    if (state.currentGenre) url += `&genres=${state.currentGenre}`;

    const data = await apiFetch(url);
    const animes = data?.data || [];
    const total = data?.pagination?.items?.total || 0;

    if (countEl) countEl.textContent = `${total} results found`;

    if (animes.length === 0) {
      grid.innerHTML = `
        <div class="no-results" style="grid-column:1/-1;">
          <i class="fas fa-search"></i>
          <h3>No results for "${query}"</h3>
          <p>Try different keywords or browse by genre.</p>
        </div>`;
    } else {
      grid.innerHTML = animes.map((a, i) => animeCardHTML(a, i)).join('');
    }

    // Pagination
    const pagination = document.getElementById('search-pagination');
    if (pagination) {
      const hasNext = data?.pagination?.has_next_page;
      pagination.innerHTML = paginationHTML(page, hasNext, 'search');
    }

  } catch (err) {
    if (grid) grid.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i>Failed to load results. Please try again.</div>`;
    showToast('Search failed. Check your connection.', 'error', 'fas fa-exclamation-circle');
  }
}

function hideSearchResults() {
  const section = document.getElementById('search-results-section');
  section?.classList.add('hidden');
  ['trending-section', 'top-rated-section', 'recent-section', 'genre-section'].forEach(id => {
    document.getElementById(id)?.classList.remove('hidden');
  });
}

// ============================================================
// HERO BANNER
// ============================================================
async function loadHero() {
  try {
    const data = await apiFetch('/top/anime?filter=airing&limit=8');
    state.heroAnimes = (data?.data || []).filter(a => a.images?.jpg?.large_image_url);
    if (state.heroAnimes.length > 0) {
      renderHero(0);
      renderHeroDots();
    }
  } catch {
    // Hero fails silently
  }
}

function renderHero(idx) {
  const anime = state.heroAnimes[idx];
  if (!anime) return;

  const bg = document.getElementById('hero-bg');
  const title = document.getElementById('hero-title');
  const meta = document.getElementById('hero-meta');
  const synopsis = document.getElementById('hero-synopsis');
  const detailsBtn = document.getElementById('hero-details-btn');
  const favBtn = document.getElementById('hero-fav-btn');

  if (bg) bg.style.backgroundImage = `url('${anime.images?.jpg?.large_image_url}')`;
  if (title) title.textContent = anime.title || '';
  if (meta) {
    meta.innerHTML = `
      <span class="score"><i class="fas fa-star"></i> ${formatScore(anime.score)}</span>
      <span><i class="fas fa-play-circle"></i> ${anime.type || 'Anime'}</span>
      ${anime.episodes ? `<span><i class="fas fa-list"></i> ${anime.episodes} Episodes</span>` : ''}
      <span><i class="fas fa-calendar"></i> ${anime.aired?.prop?.from?.year || 'Ongoing'}</span>
    `;
  }
  if (synopsis) synopsis.textContent = truncate(anime.synopsis, 180);
  if (detailsBtn) detailsBtn.onclick = () => navigateToDetail(anime.mal_id);
  if (favBtn) {
    const fav = isFavorite(anime.mal_id);
    favBtn.innerHTML = `<i class="fas fa-heart${fav ? '' : '-crack'}"></i> ${fav ? 'Remove Favorite' : 'Add to Favorites'}`;
    favBtn.onclick = () => toggleFavorite(anime);
  }

  // Update dots
  document.querySelectorAll('.hero-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

function renderHeroDots() {
  const container = document.getElementById('hero-dots');
  if (!container) return;

  container.innerHTML = state.heroAnimes.map((_, i) => `
    <span class="hero-dot ${i === 0 ? 'active' : ''}" onclick="setHero(${i})"></span>
  `).join('');

  // Auto-rotate every 6s
  clearInterval(state.heroInterval);
  state.heroInterval = setInterval(() => {
    state.heroIndex = (state.heroIndex + 1) % state.heroAnimes.length;
    renderHero(state.heroIndex);
  }, 6000);
}

window.setHero = function(idx) {
  state.heroIndex = idx;
  renderHero(idx);
  clearInterval(state.heroInterval);
  state.heroInterval = setInterval(() => {
    state.heroIndex = (state.heroIndex + 1) % state.heroAnimes.length;
    renderHero(state.heroIndex);
  }, 6000);
};

// ============================================================
// ANIME CARD HTML
// ============================================================
function animeCardHTML(anime, index = 0) {
  const img = anime.images?.jpg?.image_url || 'assets/logo.png';
  const score = formatScore(anime.score);
  const genres = (anime.genres || []).slice(0, 2).map(g => g.name);
  const fav = isFavorite(anime.mal_id);
  const delay = Math.min(index * 0.06, 0.5);

  return `
    <div class="anime-card" style="animation-delay:${delay}s;" onclick="navigateToDetail(${anime.mal_id})" id="card-${anime.mal_id}">
      <div class="card-poster">
        <img src="${img}" alt="${anime.title}" loading="lazy" onerror="this.src='assets/logo.png'" />
        <div class="card-gradient"></div>
        ${anime.type ? `<span class="card-type-badge">${anime.type}</span>` : ''}
        ${anime.score ? `<span class="card-score"><i class="fas fa-star"></i> ${score}</span>` : ''}
        <button class="card-fav-btn ${fav ? 'active' : ''}"
          onclick="event.stopPropagation(); toggleFavFromCard(${anime.mal_id}, this)"
          title="${fav ? 'Remove from Favorites' : 'Add to Favorites'}">
          <i class="fas fa-heart"></i>
        </button>
        <div class="card-hover-overlay">
          <div class="card-hover-title">${anime.title}</div>
          <div class="card-hover-synopsis">${truncate(anime.synopsis, 120)}</div>
          <button class="card-hover-btn">View Details</button>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${anime.title}</div>
        <div class="card-meta">
          ${anime.episodes ? `<span class="card-episodes"><i class="fas fa-list"></i> ${anime.episodes} eps</span>` : ''}
          <span>${anime.aired?.prop?.from?.year || ''}</span>
        </div>
        ${genres.length > 0 ? `<div class="card-genres">${genres.map(g => `<span class="card-genre-tag">${g}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `;
}

// Toggle fav from card without opening detail
window.toggleFavFromCard = function(id, btn) {
  // Find anime data from hero, or create minimal object
  const heroAnime = state.heroAnimes.find(a => a.mal_id === id);
  const anime = heroAnime || state._allAnimes?.[id] || { mal_id: id, title: '', score: null, images: {} };
  toggleFavorite(anime);
  btn.classList.toggle('active', isFavorite(id));
};

// ============================================================
// TRENDING SECTION (scroll row)
// ============================================================
async function loadTrending() {
  const row = document.getElementById('trending-row');
  if (!row) return;
  row.innerHTML = Array(10).fill('<div class="anime-card" style="flex:0 0 180px;min-width:180px;cursor:default;"><div class="card-poster"><div class="skeleton-box" style="aspect-ratio:2/3;"></div></div><div class="card-info"><div class="skeleton-box sh14 sw80" style="margin-bottom:8px;"></div></div></div>').join('');

  try {
    const data = await apiFetch('/top/anime?filter=airing&limit=20');
    const animes = data?.data || [];
    // Cache for fav toggle
    if (!state._allAnimes) state._allAnimes = {};
    animes.forEach(a => state._allAnimes[a.mal_id] = a);

    row.innerHTML = animes.map((a, i) => animeCardHTML(a, i)).join('');
  } catch {
    row.innerHTML = `<div class="error-state" style="width:100%;"><i class="fas fa-exclamation-triangle"></i> Failed to load trending anime.</div>`;
  }
}

// ============================================================
// TOP RATED SECTION (grid + pagination)
// ============================================================
async function loadTopRated(page = 1) {
  const grid = document.getElementById('top-rated-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(12);

  let url = `/top/anime?filter=${state.currentSort}&limit=12&page=${page}`;
  if (state.currentGenre) url = `/anime?genres=${state.currentGenre}&order_by=score&sort=desc&limit=12&page=${page}`;

  try {
    const data = await apiFetch(url);
    const animes = data?.data || [];
    if (!state._allAnimes) state._allAnimes = {};
    animes.forEach(a => state._allAnimes[a.mal_id] = a);

    grid.innerHTML = animes.length
      ? animes.map((a, i) => animeCardHTML(a, i)).join('')
      : `<div class="no-results" style="grid-column:1/-1;"><i class="fas fa-ghost"></i><h3>No anime found</h3></div>`;

    // Pagination
    const pagination = document.getElementById('top-rated-pagination');
    if (pagination) {
      const hasNext = data?.pagination?.has_next_page;
      pagination.innerHTML = paginationHTML(page, hasNext, 'toprated');
    }
    state.topRatedPage = page;
  } catch {
    grid.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Failed to load anime.</div>`;
  }
}

// ============================================================
// RECENTLY RELEASED SECTION
// ============================================================
async function loadRecent() {
  const grid = document.getElementById('recent-grid');
  if (!grid) return;
  grid.innerHTML = skeletonCards(8);

  try {
    const data = await apiFetch('/seasons/now?limit=16');
    const animes = (data?.data || []).filter(a => a.images?.jpg?.image_url);
    if (!state._allAnimes) state._allAnimes = {};
    animes.forEach(a => state._allAnimes[a.mal_id] = a);

    grid.innerHTML = animes.slice(0, 16).map((a, i) => animeCardHTML(a, i)).join('');
  } catch {
    // Fallback: try popular filter
    try {
      const data2 = await apiFetch('/top/anime?filter=upcoming&limit=12');
      const animes = data2?.data || [];
      grid.innerHTML = animes.map((a, i) => animeCardHTML(a, i)).join('');
    } catch {
      grid.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i> Failed to load recent anime.</div>`;
    }
  }
}

// ============================================================
// GENRE SHOWCASE
// ============================================================
function loadGenreShowcase() {
  const container = document.getElementById('genre-showcase');
  if (!container) return;

  // Genre showcase with gradient backgrounds (using placeholder colors)
  const genres = [
    { id: 1, name: 'Action', color: '#e040fb,#536dfe' },
    { id: 10, name: 'Fantasy', color: '#00bcd4,#536dfe' },
    { id: 22, name: 'Romance', color: '#ff80ab,#e040fb' },
    { id: 24, name: 'Sci-Fi', color: '#00bcd4,#004d77' },
    { id: 14, name: 'Horror', color: '#b71c1c,#311b92' },
    { id: 4, name: 'Comedy', color: '#ffd740,#ff9800' },
    { id: 40, name: 'Psychological', color: '#880e4f,#311b92' },
    { id: 37, name: 'Supernatural', color: '#4a148c,#1a237e' },
    { id: 2, name: 'Adventure', color: '#1b5e20,#33691e' },
    { id: 8, name: 'Drama', color: '#37474f,#546e7a' },
    { id: 23, name: 'School', color: '#0d47a1,#1565c0' },
    { id: 36, name: 'Slice of Life', color: '#00695c,#00897b' },
  ];

  container.innerHTML = genres.map(g => `
    <div class="genre-showcase-card" onclick="filterByGenre(${g.id}, '${g.name}')">
      <div class="genre-showcase-bg" style="background: linear-gradient(135deg, #${g.color.split(',')[0].replace('#','')}, #${g.color.split(',')[1].replace('#','')});"></div>
      <div class="genre-showcase-name">${g.name}</div>
    </div>
  `).join('');
}

// ============================================================
// GENRE FILTER PILLS
// ============================================================
function initGenrePills() {
  const pills = document.getElementById('genre-pills');
  if (!pills) return;

  const genres = [
    { id: '', name: 'All' },
    { id: 1, name: 'Action' },
    { id: 10, name: 'Fantasy' },
    { id: 22, name: 'Romance' },
    { id: 24, name: 'Sci-Fi' },
    { id: 14, name: 'Horror' },
    { id: 4, name: 'Comedy' },
    { id: 40, name: 'Psychological' },
    { id: 37, name: 'Supernatural' },
    { id: 2, name: 'Adventure' },
    { id: 8, name: 'Drama' },
    { id: 27, name: 'Shounen' },
    { id: 36, name: 'Slice of Life' },
  ];

  pills.innerHTML = genres.map(g => `
    <button class="genre-pill ${g.id === '' ? 'active' : ''}"
      data-genre="${g.id}"
      onclick="setGenreFilter('${g.id}', this)">
      ${g.name}
    </button>
  `).join('');
}

window.setGenreFilter = function(genreId, btn) {
  state.currentGenre = genreId;
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  loadTopRated(1);
};

window.filterByGenre = function(genreId, name) {
  state.currentGenre = String(genreId);
  // Activate pill
  document.querySelectorAll('.genre-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.genre === String(genreId));
  });
  loadTopRated(1);
  // Scroll to top rated section
  document.getElementById('top-rated-section')?.scrollIntoView({ behavior: 'smooth' });
};

// ============================================================
// SORT FILTER
// ============================================================
function initSortFilter() {
  const select = document.getElementById('sort-select');
  if (!select) return;
  select.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    loadTopRated(1);
  });
}

// ============================================================
// PAGINATION
// ============================================================
function paginationHTML(currentPage, hasNext, section) {
  const prev = currentPage > 1;
  let html = '';

  if (prev) {
    html += `<button class="page-btn" onclick="changePage('${section}', ${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
  }

  // Show a few pages around current
  const start = Math.max(1, currentPage - 2);
  const end = currentPage + 2;

  for (let p = start; p <= end; p++) {
    if (p > 0 && (p <= currentPage + 2)) {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage('${section}', ${p})">${p}</button>`;
    }
  }

  if (hasNext) {
    html += `<button class="page-btn" onclick="changePage('${section}', ${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
  }

  return html;
}

window.changePage = function(section, page) {
  if (section === 'toprated') {
    loadTopRated(page);
    document.getElementById('top-rated-section')?.scrollIntoView({ behavior: 'smooth' });
  } else if (section === 'search') {
    performSearch(state.searchQuery, page);
    document.getElementById('search-results-section')?.scrollIntoView({ behavior: 'smooth' });
  }
};

// ============================================================
// SCROLL ROW BUTTONS
// ============================================================
function initScrollButtons() {
  document.querySelectorAll('.scroll-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const direction = btn.classList.contains('scroll-left') ? -1 : 1;
      target.scrollBy({ left: direction * 400, behavior: 'smooth' });
    });
  });
}

// ============================================================
// NAVIGATION
// ============================================================
window.navigateToDetail = function(id) {
  window.location.href = `detail.html?id=${id}`;
};

// ============================================================
// LOADING OVERLAY
// ============================================================
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 600);
  }
}

// ============================================================
// INIT — ON PAGE LOAD
// ============================================================
async function init() {
  // Apply theme
  initTheme();

  // Setup UI
  initNavbar();
  initSearch();
  initGenrePills();
  initSortFilter();
  initScrollButtons();
  renderFavoritesSidebar();
  updateFavCount();

  // Load genre showcase (instant, no API)
  loadGenreShowcase();

  // Fetch data in parallel
  await Promise.allSettled([
    loadHero(),
    loadTrending(),
  ]);

  // Then load grid sections (with delay to avoid rate limits)
  await loadTopRated(1);
  await new Promise(r => setTimeout(r, 400));
  await loadRecent();

  // Hide loading overlay
  hideLoadingOverlay();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
