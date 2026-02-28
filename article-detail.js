// article-detail.js — Page détail d'un article avec SUPPORT OFFLINE COMPLET

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

// 🆕 ACTIVER LA PERSISTENCE FIREBASE
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('⚠️ Persistance Firebase: plusieurs onglets ouverts');
    } else if (err.code == 'unimplemented') {
        console.log('⚠️ Navigateur ne supporte pas IndexedDB');
    }
});

// ============================================
// VARIABLES GLOBALES
// ============================================
let currentArticle = null;
let currentUser = null;
const CACHE_KEY_PREFIX = 'electroinfo_article_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

// ============================================
// 🆕 SYSTÈME DE CACHE OFFLINE
// ============================================

function getArticleCacheKey(articleId) {
    return `${CACHE_KEY_PREFIX}${articleId}`;
}

function saveArticleToCache(article) {
    try {
        const data = {
            article: article,
            timestamp: Date.now()
        };
        localStorage.setItem(getArticleCacheKey(article.id), JSON.stringify(data));
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
        const age = Date.now() - parsed.timestamp;
        
        if (age > CACHE_DURATION) {
            localStorage.removeItem(getArticleCacheKey(articleId));
            return null;
        }
        
        console.log(`📦 Article chargé depuis le cache`);
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
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>Mode hors ligne • Données en cache</span>
    `;
    document.body.prepend(indicator);
    document.body.style.paddingTop = '44px';
    
    requestAnimationFrame(() => {
        indicator.classList.add('show');
    });
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
// 🌙 GESTION DU THÈME SOMBRE/CLAIR - CORRIGÉ
// ============================================

// Initialiser le thème au chargement
function initTheme() {
    const savedTheme = localStorage.getItem('electroinfo-theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    console.log('🎨 Thème initial:', savedTheme);
    
    // Appliquer le thème sauvegardé
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
        if (themeText) themeText.textContent = 'Clair';
        if (themeToggle) themeToggle.classList.add('dark-mode');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
        if (themeText) themeText.textContent = 'Sombre';
        if (themeToggle) themeToggle.classList.remove('dark-mode');
    }
}

// Basculer le thème - CORRIGÉ : plus de notification
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    console.log('🎨 Changement thème:', currentTheme, '→', newTheme);
    
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('electroinfo-theme', 'dark');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
        if (themeText) themeText.textContent = 'Clair';
        if (themeToggle) themeToggle.classList.add('dark-mode');
        
        // Animation de transition
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('electroinfo-theme', 'light');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
        if (themeText) themeText.textContent = 'Sombre';
        if (themeToggle) themeToggle.classList.remove('dark-mode');
    }
    
    // ❌ SUPPRIMÉ : Plus de notification de changement de thème
    // showNotification(newTheme === 'dark' ? '🌙 Mode sombre activé' : '☀️ Mode clair activé', 'info');
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
    const slug = urlParams.get('slug');
    
    console.log('🔍 Chargement article:', { id: articleId, slug: slug });
    
    try {
        // 🆕 ÉTAPE 1: Essayer le cache d'abord pour affichage rapide
        let cachedArticle = null;
        if (articleId) {
            cachedArticle = getArticleFromCache(articleId);
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
        
        // 🆕 ÉTAPE 2: Charger depuis Firebase
        if (!isOnline()) {
            if (!cachedArticle) {
                showError('Aucune connexion Internet', 'Cet article n\'est pas disponible hors ligne.');
            }
            return;
        }
        
        let article = null;
        
        if (slug) {
            article = await loadArticleBySlug(slug);
        } else if (articleId) {
            article = await loadArticleById(articleId);
        } else {
            showError('Article non trouvé', 'Aucun identifiant d\'article fourni.');
            return;
        }
        
        if (!article) {
            showError('Article introuvable', 'Cet article n\'existe pas ou a été supprimé.');
            return;
        }
        
        // Sauvegarder dans le cache
        saveArticleToCache(article);
        
        // Mettre à jour l'affichage seulement si différent du cache
        if (!cachedArticle || JSON.stringify(cachedArticle) !== JSON.stringify(article)) {
            currentArticle = article;
            renderArticle(article);
            loadComments(article.id);
            loadRelatedArticles(article);
        }
        
        // Incrémenter les vues (silencieusement)
        incrementViews(article.id).catch(console.error);
        
    } catch (error) {
        console.error('Erreur chargement article:', error);
        
        // 🆕 GESTION ERREUR: Utiliser le cache si disponible
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
        
        showError('Erreur de chargement', 'Impossible de charger cet article. Vérifiez votre connexion.');
    }
}

async function loadArticleById(id) {
    try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
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
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        
        return null;
    } catch (error) {
        console.error('Erreur loadArticleBySlug:', error);
        throw error;
    }
}

// ============================================
// RENDU DE L'ARTICLE
// ============================================
function renderArticle(article) {
    console.log('🎨 Rendu article:', article.title);
    console.log('🖼️ Image URL from article:', article.imageUrl);
    
    // CACHER LE LOADING SPINNER
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
    
    // CACHER LE MESSAGE D'ERREUR
    const errorState = document.getElementById('errorState');
    if (errorState) {
        errorState.classList.add('hidden');
    }
    
    // AFFICHER LE CONTENEUR PRINCIPAL
    const articleContainer = document.getElementById('articleContainer');
    if (articleContainer) {
        articleContainer.classList.remove('hidden');
    }
    
    // Mise à jour des métadonnées SEO
    updatePageMeta(article);
    
    // HERO IMAGE
    const heroImage = document.getElementById('articleImage');
    console.log('🖼️ Element heroImage trouvé:', heroImage);
    
    if (heroImage) {
        const imageUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';
        console.log('🖼️ URL image à charger:', imageUrl);
        
        heroImage.removeAttribute('src');
        heroImage.alt = article.title || 'Image de couverture';
        
        heroImage.onerror = function() {
            console.warn('⚠️ Erreur chargement image hero, utilisation fallback');
            this.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';
            this.onerror = null;
        };
        
        heroImage.onload = function() {
            console.log('✅ Image hero chargée avec succès');
            this.classList.add('loaded');
        };
        
        heroImage.src = imageUrl;
        
        if (heroImage.complete) {
            if (heroImage.naturalHeight === 0) {
                console.warn('⚠️ Image en cache mais invalide, rechargement...');
                heroImage.src = imageUrl + '?t=' + Date.now();
            } else {
                console.log('✅ Image déjà en cache et valide');
                heroImage.classList.add('loaded');
            }
        }
    } else {
        console.error('❌ Element #articleImage non trouvé!');
    }
    
    // CATÉGORIE
    const categoryBadge = document.getElementById('categoryBadge');
    if (categoryBadge) {
        categoryBadge.textContent = article.category || 'Article';
        categoryBadge.className = `article-category-badge category-${getCategoryClass(article.category)}`;
    }
    
    // TITRE
    const title = document.getElementById('articleTitle');
    if (title) {
        title.textContent = article.title;
    }
    
    // AUTEUR
    const authorName = document.getElementById('authorName');
    if (authorName) {
        authorName.textContent = article.authorName || article.author?.name || 'Équipe ElectroInfo';
    }
    
    const authorAvatar = document.getElementById('authorAvatar');
    if (authorAvatar) {
        const authorNameStr = article.authorName || article.author?.name || 'ElectroInfo';
        authorAvatar.src = article.authorAvatar || article.author?.avatar || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(authorNameStr)}&background=1e40af&color=fff`;
    }
    
    // DATE
    const articleDate = document.getElementById('articleDate');
    if (articleDate) {
        articleDate.textContent = getArticleDate(article);
    }
    
    // STATS
    const viewsCount = document.getElementById('viewsCount');
    if (viewsCount) {
        viewsCount.textContent = `${article.views || 0} vues`;
    }
    
    const readingTime = document.getElementById('readingTime');
    if (readingTime) {
        readingTime.textContent = `${article.readTime || calculateReadTime(article.content)} min de lecture`;
    }
    
    // CONTENU
    const content = document.getElementById('articleContent');
    if (content) {
        content.innerHTML = article.content || article.body || '<p>Contenu non disponible</p>';
    }
    
    // TAGS
    const tagsContainer = document.getElementById('tagsContainer');
    if (tagsContainer) {
        renderTags(article.tags);
    }
    
    // RÉACTIONS ET PARTAGE
    setupReactions(article);
    setupShareButtons(article);
    
    // FORCER L'AFFICHAGE
    document.body.classList.add('article-loaded');
    
    console.log('✅ Rendu article terminé');
}

// ============================================
// SEO ET META
// ============================================
function updatePageMeta(article) {
    document.title = `${article.title} | ElectroInfo`;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    metaDescription.content = article.summary || article.excerpt || article.title;
    
    updateMetaTag('og:title', article.title);
    updateMetaTag('og:description', article.summary || article.excerpt || '');
    updateMetaTag('og:image', article.imageUrl || 'https://electroinfo.online/images/logo.png');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('twitter:title', article.title);
    updateMetaTag('twitter:description', article.summary || article.excerpt || '');
    updateMetaTag('twitter:image', article.imageUrl || 'https://electroinfo.online/images/logo.png');
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
        container.innerHTML = '<p class="empty-text">Aucun tag</p>';
        return;
    }
    
    container.innerHTML = tags.map(tag => `
        <span class="tag" onclick="filterByTag('${escapeHtml(tag)}')">
            ${escapeHtml(tag)}
        </span>
    `).join('');
}

function setupReactions(article) {
    const reactions = ['like', 'love', 'insight', 'support'];
    reactions.forEach(type => {
        const btn = document.querySelector(`button[data-reaction="${type}"]`);
        if (btn) {
            const count = article.reactions?.[type] || 0;
            const span = btn.querySelector('span');
            if (span) span.textContent = count;
            
            btn.onclick = () => handleReaction(article.id, type);
        }
    });
}

function setupShareButtons(article) {
    const pageUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(article.title);
    const imageUrl = article.imageUrl || 'https://electroinfo.online/images/logo.png';
    const summary = encodeURIComponent(article.summary || article.excerpt || article.title);
    
    const twitterBtn = document.getElementById('twitterShare');
    const linkedinBtn = document.getElementById('linkedinShare');
    const whatsappBtn = document.getElementById('whatsappShare');
    
    // Twitter: image affichée via og:image (déjà mis à jour dans updatePageMeta)
    if (twitterBtn) twitterBtn.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${title}`;
    
    // LinkedIn: image affichée via og:image (déjà mis à jour dans updatePageMeta)
    if (linkedinBtn) linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
    
    // WhatsApp: on inclut le titre + l'URL dans le message
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
                container.innerHTML = '<p class="empty-text"><i class="fas fa-wifi-slash"></i> Commentaires non disponibles hors ligne</p>';
            }
            return;
        }
        
        const q = query(
            collection(db, 'comments'),
            where('articleId', '==', articleId),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderComments(comments);
        
    } catch (error) {
        console.error('Erreur chargement commentaires:', error);
        const container = document.getElementById('commentsList');
        if (container) {
            container.innerHTML = '<p class="empty-text">Erreur de chargement des commentaires</p>';
        }
    }
}

function renderComments(comments) {
    const container = document.getElementById('commentsList');
    const countElement = document.getElementById('commentsCount');
    
    if (countElement) {
        countElement.textContent = comments.length;
    }
    
    if (!container) return;
    
    if (comments.length === 0) {
        container.innerHTML = '<p class="empty-text">Aucun commentaire pour le moment. Soyez le premier !</p>';
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
async function loadRelatedArticles(currentArticle) {
    try {
        if (!isOnline()) {
            loadRelatedArticlesFromCache(currentArticle);
            return;
        }
        
        const q = query(
            collection(db, 'articles'),
            where('category', '==', currentArticle.category),
            where('__name__', '!=', currentArticle.id),
            limit(3)
        );
        
        const snapshot = await getDocs(q);
        const articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderRelatedArticles(articles);
        
    } catch (error) {
        console.error('Erreur articles connexes:', error);
        loadRelatedArticlesFromCache(currentArticle);
    }
}

function loadRelatedArticlesFromCache(currentArticle) {
    try {
        const allCached = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.article && data.article.id !== currentArticle.id) {
                        allCached.push(data.article);
                    }
                } catch (e) {}
            }
        }
        
        const related = allCached
            .filter(a => a.category === currentArticle.category)
            .slice(0, 3);
        
        renderRelatedArticles(related);
        
    } catch (e) {
        console.error('Erreur cache connexes:', e);
        const container = document.getElementById('relatedArticles');
        if (container) {
            container.innerHTML = '<p class="empty-text">Articles connexes non disponibles hors ligne</p>';
        }
    }
}

function renderRelatedArticles(articles) {
    const container = document.getElementById('relatedArticles');
    if (!container) return;
    
    if (articles.length === 0) {
        container.innerHTML = '<p class="empty-text">Aucun article connexe</p>';
        return;
    }
    
    container.innerHTML = articles.map(article => {
        const articleUrl = article.slug 
            ? `/article/${article.slug}` 
            : `/article-detail.html?id=${article.id}`;
            
        return `
            <a href="${articleUrl}" class="related-article-item">
                <img src="${article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'}" 
                     alt="${escapeHtml(article.title)}" class="related-article-image"
                     onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'">
                <div class="related-article-content">
                    <span class="related-article-category">${escapeHtml(article.category)}</span>
                    <h4 class="related-article-title">${escapeHtml(article.title)}</h4>
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
        'INNOVATION': 'blue',
        'SÉCURITÉ': 'red',
        'NOUVEAUTÉ': 'green',
        'TUTO': 'orange',
        'DOMOTIQUE': 'purple'
    };
    return map[category] || 'blue';
}

function getArticleDate(article) {
    if (!article.createdAt) return 'Date inconnue';
    
    if (article.createdAt.toDate) {
        return article.createdAt.toDate().toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    
    if (article.createdAt.seconds) {
        return new Date(article.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    
    return new Date(article.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
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
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
    
    const errorState = document.getElementById('errorState');
    if (errorState) {
        errorState.classList.remove('hidden');
        const h2 = errorState.querySelector('h2');
        const p = errorState.querySelector('p');
        if (h2) h2.textContent = title;
        if (p) p.textContent = message;
    }
    
    const articleContainer = document.getElementById('articleContainer');
    if (articleContainer) {
        articleContainer.classList.add('hidden');
    }
}

async function incrementViews(articleId) {
    try {
        const docRef = doc(db, 'articles', articleId);
        await updateDoc(docRef, {
            views: increment(1)
        });
    } catch (e) {
        console.error('Erreur incrémentation vues:', e);
    }
}

async function handleReaction(articleId, type) {
    if (!isOnline()) {
        showNotification('Connexion requise pour réagir', 'error');
        return;
    }
    
    showNotification('Réaction enregistrée !', 'success');
}

function showNotification(message, type = 'info') {
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const el = document.createElement('div');
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
        .then(() => showNotification('Lien copié !', 'success'))
        .catch(() => {
            // Fallback pour les navigateurs plus anciens
            const el = document.createElement('input');
            el.value = window.location.href;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showNotification('Lien copié !', 'success');
        });
};

window.filterByTag = function(tag) {
    window.location.href = `/articles.html?tag=${encodeURIComponent(tag)}`;
};

window.openNewsletterModal = function() {
    const modal = document.getElementById('newsletterModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeNewsletterModal = function() {
    const modal = document.getElementById('newsletterModal');
    if (modal) modal.classList.add('hidden');
};

// ============================================
// ÉCOUTEURS RÉSEAU
// ============================================
window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    hideOfflineIndicator();
    showNotification('Connexion rétablie', 'success');
    
    if (currentArticle) {
        loadArticle();
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Connexion perdue');
    showOfflineIndicator();
    showNotification('Mode hors ligne', 'info');
});

// ============================================
// FORMULAIRE COMMENTAIRE
// ============================================
document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isOnline()) {
        showNotification('Connexion requise pour commenter', 'error');
        return;
    }
    
    if (!currentArticle) {
        showNotification('Erreur: article non chargé', 'error');
        return;
    }
    
    const nameInput = document.getElementById('commentName');
    const emailInput = document.getElementById('commentEmail');
    const textInput = document.getElementById('commentText');
    
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const text = textInput?.value.trim();
    
    if (!name || !email || !text) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    try {
        await addDoc(collection(db, 'comments'), {
            articleId: currentArticle.id,
            authorName: name,
            authorEmail: email,
            text: text,
            createdAt: new Date()
        });
        
        const articleRef = doc(db, 'articles', currentArticle.id);
        await updateDoc(articleRef, {
            commentsCount: increment(1)
        });
        
        showNotification('Commentaire publié !', 'success');
        
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (textInput) textInput.value = '';
        
        loadComments(currentArticle.id);
        
    } catch (error) {
        console.error('Erreur publication commentaire:', error);
        showNotification('Erreur lors de la publication', 'error');
    }
});

// ============================================
// INITIALISATION - CORRIGÉE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation article-detail.js');
    
    // Initialiser le thème en premier
    initTheme();
    
    // Attacher l'événement au bouton de thème
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('✅ Bouton thème attaché');
    } else {
        console.error('❌ Bouton themeToggle non trouvé');
    }
    
    // 🆕 MENU MOBILE - Correction complète
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            
            // Changer l'icône
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
            
            console.log('📱 Menu mobile toggled:', navMenu.classList.contains('active'));
        });
        
        // Fermer le menu en cliquant sur un lien
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
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
        
        // Fermer en cliquant en dehors
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') && 
                !navMenu.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                document.body.classList.remove('menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        console.log('✅ Menu mobile attaché');
    } else {
        console.error('❌ Éléments menu mobile non trouvés:', { 
            mobileMenuToggle: !!mobileMenuToggle, 
            navMenu: !!navMenu 
        });
    }
    
    // Charger l'article
    loadArticle();
    
    if (!isOnline()) {
        showOfflineIndicator();
    }
});