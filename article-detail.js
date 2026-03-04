// article-detail.js — Page détail d'un article avec SUPPORT OFFLINE + TRADUCTIONS FR/EN

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, query, where, doc, getDoc,
    orderBy, limit, addDoc, updateDoc, increment, enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============================================
// CONFIGURATION FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
  authDomain: "electroino-app.firebaseapp.com",
  projectId: "electroino-app",
  storageBucket: "electroino-app.firebasestorage.app",
  messagingSenderId: "864058526638",
  appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('⚠️ Persistance Firebase: plusieurs onglets ouverts');
    } else if (err.code == 'unimplemented') {
        console.log('⚠️ Navigateur ne supporte pas IndexedDB');
    }
});

// ============================================
// 🌍 SYSTÈME DE TRADUCTIONS
// ============================================
const LANG_KEY = 'electroinfo-lang';

// Toutes les chaînes UI en FR et EN
const UI_TRANSLATIONS = {
    fr: {
        // Indicateurs réseau
        offlineMode: 'Mode hors ligne • Données en cache',
        connectionRestored: 'Connexion rétablie',
        offlineModeNotif: 'Mode hors ligne',

        // Thème
        lightMode: 'Clair',
        darkMode: 'Sombre',

        // Article
        views: 'vues',
        readingTime: 'min de lecture',
        noContent: 'Contenu non disponible',
        noTags: 'Aucun tag',
        unknownDate: 'Date inconnue',
        defaultAuthor: 'Équipe ElectroInfo',

        // Commentaires
        commentsTitle: 'Commentaires',
        noComments: 'Aucun commentaire pour le moment. Soyez le premier !',
        loadingError: 'Erreur de chargement des commentaires',
        offlineComments: 'Commentaires non disponibles hors ligne',
        commentName: 'Votre nom',
        commentEmail: 'Votre email',
        commentText: 'Votre commentaire...',
        commentSubmit: 'Publier',
        commentSuccess: 'Commentaire publié !',
        commentError: 'Erreur lors de la publication',
        commentFillAll: 'Veuillez remplir tous les champs',
        commentNeedOnline: 'Connexion requise pour commenter',
        commentArticleError: 'Erreur: article non chargé',

        // Articles connexes
        noRelated: 'Aucun article connexe',
        offlineRelated: 'Articles connexes non disponibles hors ligne',

        // Erreurs
        noInternet: 'Aucune connexion Internet',
        articleOffline: "Cet article n'est pas disponible hors ligne.",
        articleNotFound: 'Article introuvable',
        articleDeleted: "Cet article n'existe pas ou a été supprimé.",
        loadError: 'Erreur de chargement',
        loadErrorMsg: 'Impossible de charger cet article. Vérifiez votre connexion.',
        noId: "Aucun identifiant d'article fourni.",

        // Réactions & partage
        reactionSuccess: 'Réaction enregistrée !',
        reactionNeedOnline: 'Connexion requise pour réagir',
        linkCopied: 'Lien copié !',

        // Newsletter
        newsletterNeedOnline: "Connexion requise pour s'inscrire",

        // Langue
        langSwitch: 'EN',
        langLabel: 'Langue',
    },
    en: {
        // Network indicators
        offlineMode: 'Offline mode • Cached data',
        connectionRestored: 'Connection restored',
        offlineModeNotif: 'Offline mode',

        // Theme
        lightMode: 'Light',
        darkMode: 'Dark',

        // Article
        views: 'views',
        readingTime: 'min read',
        noContent: 'Content not available',
        noTags: 'No tags',
        unknownDate: 'Unknown date',
        defaultAuthor: 'ElectroInfo Team',

        // Comments
        commentsTitle: 'Comments',
        noComments: 'No comments yet. Be the first!',
        loadingError: 'Error loading comments',
        offlineComments: 'Comments unavailable offline',
        commentName: 'Your name',
        commentEmail: 'Your email',
        commentText: 'Your comment...',
        commentSubmit: 'Submit',
        commentSuccess: 'Comment published!',
        commentError: 'Error publishing comment',
        commentFillAll: 'Please fill in all fields',
        commentNeedOnline: 'Connection required to comment',
        commentArticleError: 'Error: article not loaded',

        // Related articles
        noRelated: 'No related articles',
        offlineRelated: 'Related articles unavailable offline',

        // Errors
        noInternet: 'No Internet connection',
        articleOffline: 'This article is not available offline.',
        articleNotFound: 'Article not found',
        articleDeleted: 'This article does not exist or has been deleted.',
        loadError: 'Loading error',
        loadErrorMsg: 'Unable to load this article. Check your connection.',
        noId: 'No article identifier provided.',

        // Reactions & sharing
        reactionSuccess: 'Reaction saved!',
        reactionNeedOnline: 'Connection required to react',
        linkCopied: 'Link copied!',

        // Newsletter
        newsletterNeedOnline: 'Connection required to subscribe',

        // Language
        langSwitch: 'FR',
        langLabel: 'Language',
    }
};

// Langue courante
let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

// Obtenir une traduction UI
function t(key) {
    return UI_TRANSLATIONS[currentLang]?.[key] ?? UI_TRANSLATIONS['fr'][key] ?? key;
}

/**
 * Obtenir le contenu traduit d'un article.
 * Structure Firestore attendue :
 *   article.title         → titre par défaut (FR)
 *   article.content       → contenu par défaut (FR)
 *   article.summary       → résumé par défaut (FR)
 *   article.translations  → { en: { title, content, summary }, fr: { ... } }
 *
 * Fallback : si la langue demandée n'existe pas → retourne le champ de base.
 */
function getTranslated(article, field) {
    if (!article) return '';
    const translation = article.translations?.[currentLang];
    if (translation && translation[field]) {
        return translation[field];
    }
    return article[field] || '';
}

// Basculer la langue
function toggleLanguage() {
    currentLang = currentLang === 'fr' ? 'en' : 'fr';
    localStorage.setItem(LANG_KEY, currentLang);
    applyLanguageToUI();

    // Re-rendre l'article si chargé
    if (currentArticle) {
        renderArticle(currentArticle);
        renderComments(currentCommentsCache);
        renderRelatedArticles(currentRelatedCache);
    }
}

// Appliquer la langue à tous les éléments statiques de la page
function applyLanguageToUI() {
    // Bouton langue
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.textContent = t('langSwitch');
        langBtn.setAttribute('aria-label', t('langLabel'));
    }

    // Titre de section commentaires
    const commentsTitle = document.querySelector('.comments-section h2, #commentsTitle');
    if (commentsTitle) commentsTitle.textContent = t('commentsTitle');

    // Placeholder formulaire commentaire
    const nameInput  = document.getElementById('commentName');
    const emailInput = document.getElementById('commentEmail');
    const textInput  = document.getElementById('commentText');
    const submitBtn  = document.getElementById('commentSubmit');
    if (nameInput)  nameInput.placeholder  = t('commentName');
    if (emailInput) emailInput.placeholder = t('commentEmail');
    if (textInput)  textInput.placeholder  = t('commentText');
    if (submitBtn)  submitBtn.textContent  = t('commentSubmit');

    // Thème
    const themeText = document.getElementById('themeText');
    if (themeText) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeText.textContent = isDark ? t('lightMode') : t('darkMode');
    }

    // Indicateur offline s'il est affiché
    const offlineSpan = document.querySelector('#offline-indicator span');
    if (offlineSpan) offlineSpan.textContent = t('offlineMode');
}

// ============================================
// VARIABLES GLOBALES
// ============================================
let currentArticle      = null;
let currentUser         = null;
let currentCommentsCache = [];
let currentRelatedCache  = [];
const CACHE_KEY_PREFIX  = 'electroinfo_article_';
const CACHE_DURATION    = 24 * 60 * 60 * 1000; // 24 heures

// ============================================
// SYSTÈME DE CACHE OFFLINE
// ============================================
function getArticleCacheKey(articleId) {
    return `${CACHE_KEY_PREFIX}${articleId}`;
}

function saveArticleToCache(article) {
    try {
        localStorage.setItem(getArticleCacheKey(article.id), JSON.stringify({
            article: article,
            timestamp: Date.now()
        }));
        console.log(`💾 Article "${article.title}" sauvegardé en cache`);
    } catch (e) {
        console.error('Erreur sauvegarde cache article:', e);
    }
}

function getArticleFromCache(articleId) {
    try {
        const data = localStorage.getItem(getArticleCacheKey(articleId));
        if (!data) return null;

        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp > CACHE_DURATION) {
            localStorage.removeItem(getArticleCacheKey(articleId));
            return null;
        }
        console.log('📦 Article chargé depuis le cache');
        return parsed.article;
    } catch (e) {
        console.error('Erreur lecture cache article:', e);
        return null;
    }
}

function isOnline() {
    return navigator.onLine;
}

function showOfflineIndicator() {
    hideOfflineIndicator();
    const indicator = document.createElement('div');
    indicator.id        = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>${t('offlineMode')}</span>
    `;
    document.body.prepend(indicator);
    document.body.style.paddingTop = '44px';
    requestAnimationFrame(() => indicator.classList.add('show'));
}

function hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
        indicator.classList.remove('show');
        setTimeout(() => {
            indicator.remove();
            document.body.style.paddingTop = '';
        }, 300);
    }
}

// ============================================
// GESTION DU THÈME SOMBRE/CLAIR
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('electroinfo-theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon   = document.getElementById('themeIcon');
    const themeText   = document.getElementById('themeText');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.className  = 'fas fa-sun';
        if (themeText) themeText.textContent = t('lightMode');
        if (themeToggle) themeToggle.classList.add('dark-mode');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.className  = 'fas fa-moon';
        if (themeText) themeText.textContent = t('darkMode');
        if (themeToggle) themeToggle.classList.remove('dark-mode');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme     = currentTheme === 'dark' ? 'light' : 'dark';
    const themeToggle  = document.getElementById('themeToggle');
    const themeIcon    = document.getElementById('themeIcon');
    const themeText    = document.getElementById('themeText');

    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('electroinfo-theme', 'dark');
        if (themeIcon) themeIcon.className  = 'fas fa-sun';
        if (themeText) themeText.textContent = t('lightMode');
        if (themeToggle) themeToggle.classList.add('dark-mode');
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('electroinfo-theme', 'light');
        if (themeIcon) themeIcon.className  = 'fas fa-moon';
        if (themeText) themeText.textContent = t('darkMode');
        if (themeToggle) themeToggle.classList.remove('dark-mode');
    }
}

// ============================================
// AUTHENTIFICATION
// ============================================
onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// ============================================
// CHARGEMENT DE L'ARTICLE
// ============================================
async function loadArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');

    // Slug peut venir de /article/mon-slug (path) OU ?slug=mon-slug (legacy)
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[1] === 'article' && pathParts[2]
        ? decodeURIComponent(pathParts[2])
        : urlParams.get('slug');

    console.log('🔍 Chargement article:', { id: articleId, slug });

    try {
        // ÉTAPE 1: Affichage rapide depuis le cache
        let cachedArticle = null;
        if (articleId) {
            cachedArticle = getArticleFromCache(articleId);
            if (cachedArticle && (cachedArticle.status || 'published') !== 'published') {
                cachedArticle = null;
            }
        }

        if (cachedArticle) {
            console.log('⚡ Affichage immédiat depuis le cache');
            currentArticle = cachedArticle;
            renderArticle(cachedArticle);
            loadComments(cachedArticle.id);
            loadRelatedArticles(cachedArticle);

            if (!isOnline()) {
                showOfflineIndicator();
                return;
            }
        }

        // ÉTAPE 2: Chargement depuis Firebase
        if (!isOnline()) {
            if (!cachedArticle) {
                showError(t('noInternet'), t('articleOffline'));
            }
            return;
        }

        let article = null;

        if (slug) {
            article = await loadArticleBySlug(slug);
        } else if (articleId) {
            article = await loadArticleById(articleId);
        } else {
            showError(t('loadError'), t('noId'));
            return;
        }

        if (!article) {
            showError(t('articleNotFound'), t('articleDeleted'));
            return;
        }

        saveArticleToCache(article);

        if (!cachedArticle || JSON.stringify(cachedArticle) !== JSON.stringify(article)) {
            currentArticle = article;
            renderArticle(article);
            loadComments(article.id);
            loadRelatedArticles(article);
        }

        incrementViews(article.id).catch(console.error);

    } catch (error) {
        console.error('Erreur chargement article:', error);

        if (articleId) {
            const cached = getArticleFromCache(articleId);
            if (cached) {
                console.log('📴 Utilisation du cache suite à une erreur');
                currentArticle = cached;
                renderArticle(cached);
                loadComments(cached.id);
                loadRelatedArticles(cached);
                showOfflineIndicator();
                return;
            }
        }

        showError(t('loadError'), t('loadErrorMsg'));
    }
}

async function loadArticleById(id) {
    try {
        const docRef  = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const article = { id: docSnap.id, ...docSnap.data() };
            if ((article.status || 'published') !== 'published') return null;
            return article;
        }
        return null;
    } catch (error) {
        console.error('Erreur loadArticleById:', error);
        throw error;
    }
}

async function loadArticleBySlug(slug) {
    try {
        console.log('🔍 Recherche slug:', slug);

        const q = query(
            collection(db, 'articles'),
            where('slug', '==', slug),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const d       = snapshot.docs[0];
            const article = { id: d.id, ...d.data() };
            if ((article.status || 'published') !== 'published') return null;
            return article;
        }

        return null;
    } catch (error) {
        console.error('Erreur loadArticleBySlug:', error);
        throw error;
    }
}

// ============================================
// RENDU DE L'ARTICLE — AVEC TRADUCTIONS
// ============================================
function renderArticle(article) {
    console.log('🎨 Rendu article:', article.title, '| Langue:', currentLang);

    // Cacher loading / erreur, afficher conteneur
    document.getElementById('loadingState')?.classList.add('hidden');
    document.getElementById('errorState')?.classList.add('hidden');
    document.getElementById('articleContainer')?.classList.remove('hidden');

    // SEO (toujours en langue de base pour l'indexation)
    updatePageMeta(article);

    // ----- HERO IMAGE -----
    const heroImage = document.getElementById('articleImage');
    if (heroImage) {
        const imageUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';

        heroImage.removeAttribute('src');
        heroImage.alt = getTranslated(article, 'title') || article.title;

        heroImage.onerror = function() {
            this.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';
            this.onerror = null;
        };
        heroImage.onload = function() { this.classList.add('loaded'); };
        heroImage.src = imageUrl;

        if (heroImage.complete && heroImage.naturalHeight !== 0) {
            heroImage.classList.add('loaded');
        }
    }

    // ----- CATÉGORIE -----
    const categoryBadge = document.getElementById('categoryBadge');
    if (categoryBadge) {
        // La catégorie peut aussi être traduite si elle existe dans translations
        const catLabel = getTranslated(article, 'category') || article.category || 'Article';
        categoryBadge.textContent = catLabel;
        categoryBadge.className   = `article-category-badge category-${getCategoryClass(article.category)}`;
    }

    // ----- TITRE (traduit) -----
    const titleEl = document.getElementById('articleTitle');
    if (titleEl) {
        titleEl.textContent = getTranslated(article, 'title') || article.title;
    }

    // ----- AUTEUR -----
    const authorName = document.getElementById('authorName');
    if (authorName) {
        authorName.textContent = article.authorName || article.author?.name || t('defaultAuthor');
    }

    const authorAvatar = document.getElementById('authorAvatar');
    if (authorAvatar) {
        const name = article.authorName || article.author?.name || 'ElectroInfo';
        authorAvatar.src = article.authorAvatar || article.author?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff`;
    }

    // ----- DATE -----
    const articleDate = document.getElementById('articleDate');
    if (articleDate) {
        articleDate.textContent = getArticleDate(article);
    }

    // ----- STATS -----
    const viewsCount = document.getElementById('viewsCount');
    if (viewsCount) {
        viewsCount.textContent = `${article.views || 0} ${t('views')}`;
    }

    const readingTime = document.getElementById('readingTime');
    if (readingTime) {
        const mins = article.readTime || calculateReadTime(article.content);
        readingTime.textContent = `${mins} ${t('readingTime')}`;
    }

    // ----- RÉSUMÉ (traduit) -----
    const summaryEl = document.getElementById('articleSummary');
    if (summaryEl) {
        const summary = getTranslated(article, 'summary') || getTranslated(article, 'excerpt') || '';
        summaryEl.textContent = summary;
    }

    // ----- CONTENU (traduit) -----
    const contentEl = document.getElementById('articleContent');
    if (contentEl) {
        const content = getTranslated(article, 'content') || getTranslated(article, 'body') || t('noContent');
        contentEl.innerHTML = content;
    }

    // ----- BADGE TRADUCTION DISPONIBLE -----
    renderTranslationBadge(article);

    // ----- TAGS -----
    renderTags(article.tags);

    // ----- RÉACTIONS & PARTAGE -----
    setupReactions(article);
    setupShareButtons(article);

    // ----- UI STATIQUE -----
    applyLanguageToUI();

    document.body.classList.add('article-loaded');
    console.log('✅ Rendu article terminé');
}

/**
 * Affiche un badge si l'article a une traduction dans l'autre langue.
 */
function renderTranslationBadge(article) {
    // Supprimer un éventuel badge précédent
    document.getElementById('translationBadge')?.remove();

    const otherLang        = currentLang === 'fr' ? 'en' : 'fr';
    const hasTranslation   = !!(article.translations?.[otherLang]?.title);
    const titleEl          = document.getElementById('articleTitle');

    if (!hasTranslation || !titleEl) return;

    const badge = document.createElement('span');
    badge.id        = 'translationBadge';
    badge.className = 'translation-badge';
    badge.innerHTML = currentLang === 'fr'
        ? `<i class="fas fa-globe"></i> Available in English`
        : `<i class="fas fa-globe"></i> Disponible en Français`;
    badge.style.cssText = `
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--primary-color, #1e40af); color: #fff;
        padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;
        cursor: pointer; margin-top: 8px;
    `;
    badge.onclick = toggleLanguage;

    titleEl.insertAdjacentElement('afterend', badge);
}

// ============================================
// SEO ET META
// ============================================
function updatePageMeta(article) {
    document.title = `${article.title} | ElectroInfo`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc      = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = article.summary || article.excerpt || article.title;

    updateMetaTag('og:title',             article.title);
    updateMetaTag('og:description',       article.summary || article.excerpt || '');
    updateMetaTag('og:image',             article.imageUrl || 'https://electroinfo.online/images/logo.png');
    updateMetaTag('og:url',               window.location.href);
    updateMetaTag('twitter:title',        article.title);
    updateMetaTag('twitter:description',  article.summary || article.excerpt || '');
    updateMetaTag('twitter:image',        article.imageUrl || 'https://electroinfo.online/images/logo.png');
}

function updateMetaTag(property, content) {
    let tag = document.querySelector(`meta[property="${property}"]`) ||
              document.querySelector(`meta[name="${property}"]`);

    if (!tag) {
        tag = document.createElement('meta');
        if (property.startsWith('og:')) {
            tag.setAttribute('property', property);
        } else {
            tag.setAttribute('name', property);
        }
        document.head.appendChild(tag);
    }
    tag.content = content;
}

// ============================================
// COMPOSANTS
// ============================================
function renderTags(tags) {
    const container = document.getElementById('tagsContainer');
    if (!container) return;

    if (!tags || tags.length === 0) {
        container.innerHTML = `<p class="empty-text">${t('noTags')}</p>`;
        return;
    }

    container.innerHTML = tags.map(tag => `
        <span class="tag" onclick="filterByTag('${escapeHtml(tag)}')">
            ${escapeHtml(tag)}
        </span>
    `).join('');
}

function setupReactions(article) {
    ['like', 'love', 'insight', 'support'].forEach(type => {
        const btn = document.querySelector(`button[data-reaction="${type}"]`);
        if (btn) {
            const count = article.reactions?.[type] || 0;
            const span  = btn.querySelector('span');
            if (span) span.textContent = count;
            btn.onclick = () => handleReaction(article.id, type);
        }
    });
}

function setupShareButtons(article) {
    const pageUrl  = encodeURIComponent(window.location.href);
    const title    = encodeURIComponent(getTranslated(article, 'title') || article.title);

    const twitterBtn  = document.getElementById('twitterShare');
    const linkedinBtn = document.getElementById('linkedinShare');
    const whatsappBtn = document.getElementById('whatsappShare');

    if (twitterBtn)  twitterBtn.href  = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${title}`;
    if (linkedinBtn) linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
    if (whatsappBtn) whatsappBtn.href = `https://wa.me/?text=${title}%0A${pageUrl}`;
}

// ============================================
// COMMENTAIRES
// ============================================
async function loadComments(articleId) {
    try {
        if (!isOnline()) {
            const container = document.getElementById('commentsList');
            if (container) {
                container.innerHTML = `<p class="empty-text"><i class="fas fa-wifi-slash"></i> ${t('offlineComments')}</p>`;
            }
            return;
        }

        const q = query(
            collection(db, 'comments'),
            where('articleId', '==', articleId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        currentCommentsCache = comments;
        renderComments(comments);

    } catch (error) {
        console.error('Erreur chargement commentaires:', error);
        const container = document.getElementById('commentsList');
        if (container) {
            container.innerHTML = `<p class="empty-text">${t('loadingError')}</p>`;
        }
    }
}

function renderComments(comments) {
    const container    = document.getElementById('commentsList');
    const countElement = document.getElementById('commentsCount');

    if (countElement) countElement.textContent = comments.length;
    if (!container)   return;

    if (comments.length === 0) {
        container.innerHTML = `<p class="empty-text">${t('noComments')}</p>`;
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <img src="${comment.authorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.authorName) + '&background=1e40af&color=fff'}"
                     alt="${escapeHtml(comment.authorName)}" class="comment-avatar">
                <div class="comment-author-info">
                    <span class="comment-author">${escapeHtml(comment.authorName)}</span>
                    <span class="comment-date">${formatDate(comment.createdAt)}</span>
                </div>
            </div>
            <p class="comment-text">${escapeHtml(comment.text)}</p>
        </div>
    `).join('');
}

// ============================================
// ARTICLES CONNEXES
// ============================================
async function loadRelatedArticles(article) {
    try {
        if (!isOnline()) {
            loadRelatedArticlesFromCache(article);
            return;
        }

        const q = query(
            collection(db, 'articles'),
            where('category', '==', article.category),
            where('__name__', '!=', article.id),
            limit(3)
        );

        const snapshot  = await getDocs(q);
        const articles  = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => (a.status || 'published') === 'published');

        currentRelatedCache = articles;
        renderRelatedArticles(articles);

    } catch (error) {
        console.error('Erreur articles connexes:', error);
        loadRelatedArticlesFromCache(article);
    }
}

function loadRelatedArticlesFromCache(currentArt) {
    try {
        const allCached = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_KEY_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.article && data.article.id !== currentArt.id) {
                        allCached.push(data.article);
                    }
                } catch (e) {}
            }
        }

        const related = allCached.filter(a => a.category === currentArt.category).slice(0, 3);
        currentRelatedCache = related;
        renderRelatedArticles(related);

    } catch (e) {
        console.error('Erreur cache connexes:', e);
        const container = document.getElementById('relatedArticles');
        if (container) container.innerHTML = `<p class="empty-text">${t('offlineRelated')}</p>`;
    }
}

function renderRelatedArticles(articles) {
    const container = document.getElementById('relatedArticles');
    if (!container) return;

    if (!articles || articles.length === 0) {
        container.innerHTML = `<p class="empty-text">${t('noRelated')}</p>`;
        return;
    }

    container.innerHTML = articles.map(article => {
        const articleUrl = article.slug
            ? `/article/${article.slug}`
            : `/article-detail?id=${article.id}`;

        // Titre traduit de l'article connexe
        const title    = getTranslated(article, 'title') || article.title;
        const category = getTranslated(article, 'category') || article.category;

        return `
            <a href="${articleUrl}" class="related-article-item">
                <img src="${article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'}"
                     alt="${escapeHtml(title)}" class="related-article-image"
                     onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'">
                <div class="related-article-content">
                    <span class="related-article-category">${escapeHtml(category)}</span>
                    <h4 class="related-article-title">${escapeHtml(title)}</h4>
                    <span class="related-article-date">${getArticleDate(article)}</span>
                </div>
            </a>
        `;
    }).join('');
}

// ============================================
// UTILITAIRES
// ============================================
function getCategoryClass(category) {
    const map = {
        'INNOVATION': 'blue', 'SÉCURITÉ': 'red',
        'NOUVEAUTÉ': 'green', 'TUTO': 'orange', 'DOMOTIQUE': 'purple'
    };
    return map[category] || 'blue';
}

function getArticleDate(article) {
    const locale = currentLang === 'en' ? 'en-GB' : 'fr-FR';
    const opts   = { day: 'numeric', month: 'long', year: 'numeric' };

    if (!article.createdAt) return t('unknownDate');

    if (article.createdAt.toDate) {
        return article.createdAt.toDate().toLocaleDateString(locale, opts);
    }
    if (article.createdAt.seconds) {
        return new Date(article.createdAt.seconds * 1000).toLocaleDateString(locale, opts);
    }
    return new Date(article.createdAt).toLocaleDateString(locale, opts);
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const locale = currentLang === 'en' ? 'en-GB' : 'fr-FR';
    const opts   = { day: 'numeric', month: 'short', year: 'numeric' };

    let date;
    if (timestamp.toDate)      date = timestamp.toDate();
    else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
    else                        date = new Date(timestamp);

    return date.toLocaleDateString(locale, opts);
}

function calculateReadTime(content) {
    if (!content) return 3;
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(words / 200);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(title, message) {
    document.getElementById('loadingState')?.classList.add('hidden');
    document.getElementById('articleContainer')?.classList.add('hidden');

    const errorState = document.getElementById('errorState');
    if (errorState) {
        errorState.classList.remove('hidden');
        const h2 = errorState.querySelector('h2');
        const p  = errorState.querySelector('p');
        if (h2) h2.textContent = title;
        if (p)  p.textContent  = message;
    }
}

async function incrementViews(articleId) {
    try {
        await updateDoc(doc(db, 'articles', articleId), { views: increment(1) });
    } catch (e) {
        console.error('Erreur incrémentation vues:', e);
    }
}

async function handleReaction(articleId, type) {
    if (!isOnline()) {
        showNotification(t('reactionNeedOnline'), 'error');
        return;
    }
    showNotification(t('reactionSuccess'), 'success');
}

function showNotification(message, type = 'info') {
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const el    = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ============================================
// FONCTIONS GLOBALES (appelées depuis le HTML)
// ============================================
window.copyLink = function() {
    navigator.clipboard.writeText(window.location.href)
        .then(() => showNotification(t('linkCopied'), 'success'))
        .catch(() => {
            const el = document.createElement('input');
            el.value = window.location.href;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showNotification(t('linkCopied'), 'success');
        });
};

window.filterByTag = function(tag) {
    window.location.href = `/articles?tag=${encodeURIComponent(tag)}`;
};

window.openNewsletterModal = function() {
    document.getElementById('newsletterModal')?.classList.remove('hidden');
};

window.closeNewsletterModal = function() {
    document.getElementById('newsletterModal')?.classList.add('hidden');
};

// Exposer toggleLanguage globalement pour le bouton HTML
window.toggleLanguage = toggleLanguage;

// ============================================
// ÉCOUTEURS RÉSEAU
// ============================================
window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    hideOfflineIndicator();
    showNotification(t('connectionRestored'), 'success');
    if (currentArticle) loadArticle();
});

window.addEventListener('offline', () => {
    console.log('📴 Connexion perdue');
    showOfflineIndicator();
    showNotification(t('offlineModeNotif'), 'info');
});

// ============================================
// FORMULAIRE COMMENTAIRE
// ============================================
document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isOnline()) {
        showNotification(t('commentNeedOnline'), 'error');
        return;
    }
    if (!currentArticle) {
        showNotification(t('commentArticleError'), 'error');
        return;
    }

    const nameInput  = document.getElementById('commentName');
    const emailInput = document.getElementById('commentEmail');
    const textInput  = document.getElementById('commentText');

    const name  = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const text  = textInput?.value.trim();

    if (!name || !email || !text) {
        showNotification(t('commentFillAll'), 'error');
        return;
    }

    try {
        await addDoc(collection(db, 'comments'), {
            articleId:   currentArticle.id,
            authorName:  name,
            authorEmail: email,
            text:        text,
            createdAt:   new Date()
        });

        await updateDoc(doc(db, 'articles', currentArticle.id), {
            commentsCount: increment(1)
        });

        showNotification(t('commentSuccess'), 'success');

        if (nameInput)  nameInput.value  = '';
        if (emailInput) emailInput.value = '';
        if (textInput)  textInput.value  = '';

        loadComments(currentArticle.id);

    } catch (error) {
        console.error('Erreur publication commentaire:', error);
        showNotification(t('commentError'), 'error');
    }
});

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation article-detail.js | Langue:', currentLang);

    // Thème
    initTheme();
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Bouton de langue (doit exister dans article-detail.html)
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.textContent = t('langSwitch');
        langBtn.addEventListener('click', toggleLanguage);
        console.log('✅ Bouton langue attaché');
    } else {
        console.warn('⚠️ Bouton #langToggle non trouvé dans le HTML — ajoutez-le dans la navbar');
    }

    // Menu mobile
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu          = document.getElementById('navMenu');

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open');

            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars',  !navMenu.classList.contains('active'));
                icon.classList.toggle('fa-times',  navMenu.classList.contains('active'));
            }
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                document.body.classList.remove('menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') &&
                !navMenu.contains(e.target) &&
                !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                document.body.classList.remove('menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
            }
        });

        console.log('✅ Menu mobile attaché');
    }

    // Charger l'article
    loadArticle();

    if (!isOnline()) showOfflineIndicator();
});