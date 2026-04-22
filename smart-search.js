// ============================================================
//  ELECTROINFO — SMART SEARCH v1.0
//  Recherche intelligente : floue, suggestions, historique,
//  filtrage par catégorie/tag — module réutilisable
// ============================================================

const HISTORY_KEY    = 'electroinfo_search_history';
const HISTORY_MAX    = 8;
const FUZZY_THRESHOLD = 0.35; // tolérance aux fautes (0 = strict, 1 = tout accepter)

// ============================================================
//  RECHERCHE FLOUE — distance de Levenshtein normalisée
// ============================================================
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return dp[m][n];
}

function fuzzyScore(query, text) {
    if (!query || !text) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Correspondance exacte
    if (t.includes(q)) return 1;

    // Score mot par mot
    const qWords = q.split(/\s+/).filter(Boolean);
    const tWords = t.split(/\s+/).filter(Boolean);
    let totalScore = 0;

    for (const qw of qWords) {
        let best = 0;
        for (const tw of tWords) {
            const maxLen = Math.max(qw.length, tw.length);
            if (maxLen === 0) continue;
            const dist = levenshtein(qw, tw);
            const score = 1 - dist / maxLen;
            if (score > best) best = score;
        }
        totalScore += best;
    }

    return qWords.length > 0 ? totalScore / qWords.length : 0;
}

// ============================================================
//  SCORE D'UN ARTICLE par rapport à la requête
// ============================================================
function scoreArticle(article, query) {
    if (!query) return 1;

    const titleScore    = fuzzyScore(query, article.title || '')    * 3.0; // poids fort
    const summaryScore  = fuzzyScore(query, article.summary || '')  * 1.5;
    const categoryScore = fuzzyScore(query, article.category || '') * 2.0;
    const tagScore      = (article.tags || []).reduce((max, tag) =>
        Math.max(max, fuzzyScore(query, tag) * 2.0), 0);
    const contentScore  = fuzzyScore(query, article.content || '')  * 0.5;

    return titleScore + summaryScore + categoryScore + tagScore + contentScore;
}

// ============================================================
//  FILTRAGE INTELLIGENT
// ============================================================
export function smartFilter(articles, query) {
    if (!query || query.trim() === '') return [...articles];

    const q = query.trim();

    return articles
        .map(article => ({ article, score: scoreArticle(article, q) }))
        .filter(({ score }) => score >= FUZZY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(({ article }) => article);
}

// ============================================================
//  SUGGESTIONS EN TEMPS RÉEL
// ============================================================
export function getSuggestions(articles, query, max = 6) {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();
    const suggestions = [];
    const seen = new Set();

    // 1. Titres qui correspondent
    for (const a of articles) {
        if (suggestions.length >= max) break;
        const title = a.title || '';
        if (title.toLowerCase().includes(q) && !seen.has(title)) {
            seen.add(title);
            suggestions.push({ type: 'article', label: title, value: title, article: a });
        }
    }

    // 2. Catégories correspondantes
    const categories = [...new Set(articles.map(a => a.category).filter(Boolean))];
    for (const cat of categories) {
        if (suggestions.length >= max) break;
        if (cat.toLowerCase().includes(q) && !seen.has('cat:' + cat)) {
            seen.add('cat:' + cat);
            const count = articles.filter(a => a.category === cat).length;
            suggestions.push({ type: 'category', label: cat, value: cat, count });
        }
    }

    // 3. Tags correspondants
    const allTags = [...new Set(articles.flatMap(a => a.tags || []))];
    for (const tag of allTags) {
        if (suggestions.length >= max) break;
        if (tag.toLowerCase().includes(q) && !seen.has('tag:' + tag)) {
            seen.add('tag:' + tag);
            const count = articles.filter(a => (a.tags || []).includes(tag)).length;
            suggestions.push({ type: 'tag', label: tag, value: tag, count });
        }
    }

    // 4. Résultats flous si pas assez de suggestions exactes
    if (suggestions.length < 3) {
        const fuzzy = articles
            .map(a => ({ a, score: fuzzyScore(q, a.title || '') }))
            .filter(({ score, a }) => score >= 0.5 && !seen.has(a.title))
            .sort((x, y) => y.score - x.score)
            .slice(0, max - suggestions.length);

        for (const { a } of fuzzy) {
            seen.add(a.title);
            suggestions.push({ type: 'article', label: a.title, value: a.title, article: a, fuzzy: true });
        }
    }

    return suggestions.slice(0, max);
}

// ============================================================
//  HISTORIQUE DES RECHERCHES
// ============================================================
export function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

export function addToHistory(query) {
    if (!query || query.trim().length < 2) return;
    const q = query.trim();
    let history = getHistory().filter(h => h !== q);
    history.unshift(q);
    history = history.slice(0, HISTORY_MAX);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

export function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

// ============================================================
//  RENDU DU DROPDOWN
// ============================================================
function renderDropdown(dropdown, items, onSelect) {
    dropdown.innerHTML = '';

    if (items.length === 0) {
        dropdown.classList.remove('active');
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'ss-item ss-item--' + item.type;

        const icon = {
            history:  'fa-history',
            article:  'fa-file-alt',
            category: 'fa-folder',
            tag:      'fa-tag',
        }[item.type] || 'fa-search';

        const badge = item.count != null
            ? `<span class="ss-badge">${item.count}</span>`
            : item.fuzzy
                ? `<span class="ss-badge ss-badge--fuzzy">~</span>`
                : '';

        el.innerHTML = `
            <i class="fas ${icon} ss-icon"></i>
            <span class="ss-label">${highlightMatch(item.label, item._query || '')}</span>
            ${badge}
        `;

        el.addEventListener('mousedown', e => {
            e.preventDefault();
            onSelect(item);
        });

        dropdown.appendChild(el);
    });

    dropdown.classList.add('active');
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const q = escapeHtml(query);
    if (!q) return escaped;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
//  CSS INJECTÉ DYNAMIQUEMENT
// ============================================================
function injectStyles() {
    if (document.getElementById('ss-styles')) return;
    const style = document.createElement('style');
    style.id = 'ss-styles';
    style.textContent = `
        .ss-wrapper {
            position: relative;
        }

        .ss-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            background: var(--surface, #fff);
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
            z-index: 1000;
            overflow: hidden;
            max-height: 380px;
            overflow-y: auto;
        }

        .ss-dropdown.active {
            display: block;
            animation: ssSlideIn 0.15s ease;
        }

        @keyframes ssSlideIn {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .ss-section-label {
            padding: 8px 14px 4px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-faint, #94a3b8);
            background: var(--surface-2, #f8fafc);
            border-bottom: 1px solid var(--border-light, #f1f5f9);
        }

        .ss-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            cursor: pointer;
            transition: background 0.15s;
            font-size: 0.9rem;
            color: var(--ink, #0f172a);
        }

        .ss-item:hover {
            background: var(--surface-2, #f8fafc);
        }

        .ss-item:not(:last-child) {
            border-bottom: 1px solid var(--border-light, #f1f5f9);
        }

        .ss-icon {
            font-size: 0.75rem;
            width: 16px;
            text-align: center;
            flex-shrink: 0;
        }

        .ss-item--history  .ss-icon { color: var(--text-faint, #94a3b8); }
        .ss-item--article  .ss-icon { color: var(--primary, #1d4ed8); }
        .ss-item--category .ss-icon { color: #d97706; }
        .ss-item--tag      .ss-icon { color: #059669; }

        .ss-label {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .ss-label mark {
            background: transparent;
            color: var(--primary, #1d4ed8);
            font-weight: 700;
        }

        .ss-badge {
            font-size: 0.68rem;
            font-weight: 700;
            background: var(--surface-3, #f1f5f9);
            color: var(--text-muted, #64748b);
            padding: 2px 7px;
            border-radius: 9999px;
            flex-shrink: 0;
        }

        .ss-badge--fuzzy {
            background: rgba(245,158,11,0.1);
            color: #d97706;
        }

        .ss-footer {
            padding: 8px 14px;
            background: var(--surface-2, #f8fafc);
            border-top: 1px solid var(--border-light, #f1f5f9);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.75rem;
            color: var(--text-faint, #94a3b8);
        }

        .ss-clear-history {
            background: none;
            border: none;
            color: var(--text-faint, #94a3b8);
            cursor: pointer;
            font-size: 0.75rem;
            padding: 0;
            transition: color 0.15s;
        }

        .ss-clear-history:hover {
            color: var(--danger, #ef4444);
        }

        [data-theme="dark"] .ss-dropdown {
            box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
//  INITIALISATION — POINT D'ENTRÉE PRINCIPAL
// ============================================================
export function initSmartSearch({
    inputEl,           // <input> de recherche
    getArticles,       // () => articles[]
    onSearch,          // (query, results) => void
    onSelectArticle,   // (article) => void — optionnel, navigation directe
    onSelectCategory,  // (category) => void — optionnel
    onSelectTag,       // (tag) => void — optionnel
    debounceMs = 220,
}) {
    if (!inputEl) return;
    injectStyles();

    // Créer le wrapper et le dropdown
    const wrapper = document.createElement('div');
    wrapper.className = 'ss-wrapper';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const dropdown = document.createElement('div');
    dropdown.className = 'ss-dropdown';
    wrapper.appendChild(dropdown);

    let debounceTimer = null;
    let currentQuery  = '';
    let isOpen        = false;

    function closeDropdown() {
        dropdown.classList.remove('active');
        isOpen = false;
    }

    function openWithHistory() {
        const history = getHistory();
        if (history.length === 0) { closeDropdown(); return; }

        const items = [
            { type: 'history', label: '— Recherches récentes', _isLabel: true },
            ...history.map(h => ({ type: 'history', label: h, value: h })),
        ];

        // Ajouter footer
        dropdown.innerHTML = '';
        const label = document.createElement('div');
        label.className = 'ss-section-label';
        label.innerHTML = '<i class="fas fa-history"></i> Recherches récentes';
        dropdown.appendChild(label);

        history.forEach(h => {
            const el = document.createElement('div');
            el.className = 'ss-item ss-item--history';
            el.innerHTML = `
                <i class="fas fa-history ss-icon"></i>
                <span class="ss-label">${escapeHtml(h)}</span>
            `;
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                inputEl.value = h;
                selectQuery(h);
            });
            dropdown.appendChild(el);
        });

        const footer = document.createElement('div');
        footer.className = 'ss-footer';
        footer.innerHTML = `
            <span>${history.length} recherche${history.length > 1 ? 's' : ''} récente${history.length > 1 ? 's' : ''}</span>
            <button class="ss-clear-history"><i class="fas fa-trash-alt"></i> Effacer</button>
        `;
        footer.querySelector('.ss-clear-history').addEventListener('mousedown', e => {
            e.preventDefault();
            clearHistory();
            closeDropdown();
        });
        dropdown.appendChild(footer);
        dropdown.classList.add('active');
        isOpen = true;
    }

    function openWithSuggestions(query) {
        const articles = getArticles();
        const suggestions = getSuggestions(articles, query).map(s => ({ ...s, _query: query }));

        if (suggestions.length === 0) { closeDropdown(); return; }

        // Grouper par type
        const groups = {
            article:  suggestions.filter(s => s.type === 'article'),
            category: suggestions.filter(s => s.type === 'category'),
            tag:      suggestions.filter(s => s.type === 'tag'),
        };

        dropdown.innerHTML = '';

        const addGroup = (label, icon, items) => {
            if (items.length === 0) return;
            const lbl = document.createElement('div');
            lbl.className = 'ss-section-label';
            lbl.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
            dropdown.appendChild(lbl);

            renderGroupItems(items);
        };

        const renderGroupItems = (items) => {
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'ss-item ss-item--' + item.type;

                const icon = { article: 'fa-file-alt', category: 'fa-folder', tag: 'fa-tag' }[item.type];
                const badge = item.count != null
                    ? `<span class="ss-badge">${item.count} article${item.count > 1 ? 's' : ''}</span>`
                    : item.fuzzy
                        ? `<span class="ss-badge ss-badge--fuzzy">~similaire</span>`
                        : '';

                el.innerHTML = `
                    <i class="fas ${icon} ss-icon"></i>
                    <span class="ss-label">${highlightMatch(item.label, query)}</span>
                    ${badge}
                `;

                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    handleSelection(item);
                });

                dropdown.appendChild(el);
            });
        };

        addGroup('Articles', 'fa-file-alt', groups.article);
        addGroup('Catégories', 'fa-folder', groups.category);
        addGroup('Tags', 'fa-tag', groups.tag);

        dropdown.classList.add('active');
        isOpen = true;
    }

    function handleSelection(item) {
        closeDropdown();
        addToHistory(item.value);

        if (item.type === 'history' || item.type === 'article') {
            inputEl.value = item.value;
            if (item.article && onSelectArticle) {
                onSelectArticle(item.article);
                return;
            }
            selectQuery(item.value);
        } else if (item.type === 'category' && onSelectCategory) {
            inputEl.value = '';
            onSelectCategory(item.value);
        } else if (item.type === 'tag' && onSelectTag) {
            inputEl.value = '';
            onSelectTag(item.value);
        } else {
            inputEl.value = item.value;
            selectQuery(item.value);
        }
    }

    function selectQuery(query) {
        currentQuery = query;
        const articles = getArticles();
        const results = smartFilter(articles, query);
        onSearch(query, results);
        closeDropdown();
    }

    // ── Événements ──
    inputEl.addEventListener('focus', () => {
        if (!inputEl.value.trim()) {
            openWithHistory();
        } else {
            openWithSuggestions(inputEl.value.trim());
        }
    });

    inputEl.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        currentQuery = q;

        clearTimeout(debounceTimer);

        if (!q) {
            openWithHistory();
            const articles = getArticles();
            onSearch('', [...articles]);
            return;
        }

        debounceTimer = setTimeout(() => {
            openWithSuggestions(q);
            const articles = getArticles();
            const results = smartFilter(articles, q);
            onSearch(q, results);
        }, debounceMs);
    });

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
            inputEl.blur();
        }
        if (e.key === 'Enter') {
            const q = inputEl.value.trim();
            if (q) {
                addToHistory(q);
                selectQuery(q);
            }
            closeDropdown();
        }
        // Navigation clavier dans le dropdown
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = dropdown.querySelectorAll('.ss-item');
            if (!items.length) return;
            const active = dropdown.querySelector('.ss-item.selected');
            let idx = active ? [...items].indexOf(active) : -1;
            if (active) active.classList.remove('selected');
            idx = e.key === 'ArrowDown'
                ? (idx + 1) % items.length
                : (idx - 1 + items.length) % items.length;
            items[idx].classList.add('selected');
            items[idx].scrollIntoView({ block: 'nearest' });
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) closeDropdown();
    });

    // API publique
    return {
        setValue: (v) => { inputEl.value = v; },
        clear: () => { inputEl.value = ''; closeDropdown(); },
        getQuery: () => currentQuery,
    };
}
