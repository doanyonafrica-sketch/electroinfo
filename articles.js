// articles.js — Page liste des articles (Firebase v9 modulaire) + OFFLINE SUPPORT COMPLET

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, query,
    orderBy, limit, where, addDoc, enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged, signOut
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

// 🆕 ACTIVER LA PERSISTENCE FIREBASE (IndexedDB) pour offline natif
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
let allArticles      = [];
let filteredArticles = [];
let currentPage      = 1;
const ARTICLES_PER_PAGE = 9;
const CACHE_KEY = 'electroinfo_articles_cache';
const CACHE_TIMESTAMP_KEY = 'electroinfo_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

// ============================================
// ÉLÉMENTS DOM
// ============================================
const articlesGrid   = document.getElementById('articlesGrid');
const searchInput    = document.getElementById('searchInput');
const sortSelect     = document.getElementById('sortSelect');
const filterBtns     = document.querySelectorAll('.filter-btn');
const pagination     = document.getElementById('pagination');
const popularArticles = document.getElementById('popularArticles');

// ============================================
// 🆕 SYSTÈME DE CACHE OFFLINE
// ============================================

// Sauvegarder les articles dans localStorage
function saveArticlesToCache(articles) {
    try {
        const data = {
            articles: articles,
            timestamp: Date.now(),
            version: '1.0'
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log(`💾 ${articles.length} articles sauvegardés en cache`);
    } catch (e) {
        console.error('Erreur sauvegarde cache:', e);
        // Si localStorage plein, on essaie de nettoyer
        if (e.name === 'QuotaExceededError') {
            localStorage.clear();
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e2) {
                console.error('Impossible de sauvegarder même après nettoyage');
            }
        }
    }
}

// Récupérer les articles du cache
function getArticlesFromCache() {
    try {
        const data = localStorage.getItem(CACHE_KEY);
        if (!data) return null;
        
        const parsed = JSON.parse(data);
        const age = Date.now() - parsed.timestamp;
        
        // Vérifier si le cache est encore valide (24h)
        if (age > CACHE_DURATION) {
            console.log('⏰ Cache expiré');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        console.log(`📦 ${parsed.articles.length} articles chargés depuis le cache`);
        return parsed.articles;
    } catch (e) {
        console.error('Erreur lecture cache:', e);
        return null;
    }
}

// Vérifier si on est en ligne
function isOnline() {
    return navigator.onLine;
}

// Afficher indicateur offline
function showOfflineIndicator() {
    // Supprimer l'ancien s'il existe
    hideOfflineIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>Mode hors ligne • Données en cache</span>
    `;
    document.body.prepend(indicator);
    
    // Ajuster le padding du body pour ne pas cacher le contenu
    document.body.style.paddingTop = '44px';
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        indicator.classList.add('show');
    });
}

// Cacher indicateur offline
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

// Afficher toast réseau
function showNetworkToast(message, type) {
    // Supprimer les anciens toasts
    document.querySelectorAll('.network-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `network-toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'online' ? 'wifi' : 'wifi-slash'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// AUTHENTIFICATION
// ============================================
onAuthStateChanged(auth, async (user) => {
    const loginBtn    = document.getElementById('loginBtn');
    const userMenu    = document.getElementById('userMenu');
    const adminLink   = document.getElementById('adminLink');
    const adminDivider = document.getElementById('adminDivider');

    if (user) {
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');

        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('userName').textContent         = displayName;
        document.getElementById('userNameDropdown').textContent = displayName;
        document.getElementById('userEmailDropdown').textContent = user.email;

        const avatarUrl = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e40af&color=fff`;
        document.getElementById('userAvatar').src         = avatarUrl;
        document.getElementById('userAvatarDropdown').src = avatarUrl;

        // Vérification du rôle admin
        try {
            const userDoc = await getDocs(
                query(collection(db, 'users'), where('__name__', '==', user.uid))
            );
            if (!userDoc.empty && userDoc.docs[0].data().role === 'admin') {
                adminLink?.classList.remove('hidden');
                adminDivider?.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Erreur vérification admin:', e);
        }
    } else {
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        adminLink?.classList.add('hidden');
        adminDivider?.classList.add('hidden');
    }
});

// Toggle menu utilisateur
document.getElementById('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const toggle   = document.getElementById('userMenuToggle');
    if (dropdown && !dropdown.contains(e.target) && e.target !== toggle) {
        dropdown.classList.add('hidden');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Déconnexion réussie', 'success');
        window.location.reload();
    } catch {
        showNotification('Erreur lors de la déconnexion', 'error');
    }
});

// ============================================
// CHARGEMENT DES ARTICLES (AVEC OFFLINE)
// ============================================
async function loadArticles() {
    const cachedData = getArticlesFromCache();
    let usedCache = false;
    
    // 🆕 ÉTAPE 1: Si on a du cache, l'afficher IMMÉDIATEMENT
    if (cachedData && cachedData.length > 0) {
        allArticles = cachedData;
        filteredArticles = [...allArticles];
        applyUrlFilter();
        displayArticles();
        loadPopularArticlesFromCache();
        usedCache = true;
        
        console.log('⚡ Affichage immédiat depuis le cache');
        
        // Si on est offline, on s'arrête là
        if (!isOnline()) {
            console.log('📴 Mode offline détecté');
            showOfflineIndicator();
            return;
        }
    }

    // 🆕 ÉTAPE 2: Charger depuis Firebase (si online)
    try {
        if (!isOnline()) {
            throw new Error('OFFLINE');
        }

        // Si on n'a pas de cache, montrer le loading
        if (!usedCache) {
            articlesGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Chargement des articles...</p>
                </div>
            `;
        }

        const q = query(
            collection(db, 'articles'),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);

        // Filtrer pour ne garder que les articles publiés
        const freshArticles = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(article => {
                const status = article.status || 'published';
                return status === 'published';
            });

        // 🆕 Sauvegarder dans le cache
        saveArticlesToCache(freshArticles);
        
        // Si on avait déjà affiché le cache, vérifier si les données ont changé
        if (usedCache) {
            const hasChanges = JSON.stringify(allArticles) !== JSON.stringify(freshArticles);
            if (hasChanges) {
                console.log('🔄 Mise à jour des données depuis Firebase');
                allArticles = freshArticles;
                filteredArticles = [...allArticles];
                applyUrlFilter();
                displayArticles();
                loadPopularArticles();
            } else {
                console.log('✅ Cache déjà à jour');
            }
        } else {
            // Pas de cache, afficher les données fraîches
            allArticles = freshArticles;
            filteredArticles = [...allArticles];
            applyUrlFilter();
            displayArticles();
            loadPopularArticles();
        }
        
        console.log(`📰 ${freshArticles.length} articles chargés depuis Firebase`);
        
        // Cacher l'indicateur offline si présent
        hideOfflineIndicator();

    } catch (error) {
        console.error('Erreur chargement articles:', error);
        
        // 🆕 GESTION ERREUR: Si pas de cache disponible
        if (!usedCache) {
            articlesGrid.innerHTML = `
                <div class="empty-state offline-state">
                    <i class="fas fa-wifi-slash"></i>
                    <p>Aucune connexion Internet</p>
                    <p class="offline-hint">
                        Les articles ne peuvent pas être chargés.<br>
                        Vérifiez votre connexion et réessayez.
                    </p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Réessayer
                    </button>
                </div>
            `;
            pagination.classList.add('hidden');
            showOfflineIndicator();
        } else {
            // On a le cache, juste notifier discrètement
            console.log('📴 Utilisation du cache (données peuvent être anciennes)');
        }
    }
}

// Appliquer le filtre URL si présent
function applyUrlFilter() {
    const categoryParam = new URLSearchParams(window.location.search).get('category');
    if (categoryParam) {
        filteredArticles = allArticles.filter(a => a.category === categoryParam);
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === categoryParam);
        });
    }
}

function displayArticles() {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    const articlesToShow = filteredArticles.slice(start, start + ARTICLES_PER_PAGE);

    if (articlesToShow.length === 0) {
        articlesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Aucun article trouvé</p>
            </div>
        `;
        pagination.classList.add('hidden');
        return;
    }

    // Premier article = card vedette pleine largeur, les autres = grille 2 colonnes
    const [featured, ...rest] = articlesToShow;
    articlesGrid.innerHTML =
        createFeaturedCard(featured) +
        (rest.length ? `<div class="articles-subgrid">${rest.map(createArticleCard).join('')}</div>` : '');

    displayPagination();
}

function getArticleUrl(article) {
    return article.slug
        ? `/article/${article.slug}`
        : `/article-detail.html?id=${article.id}`;
}

function getArticleDate(article) {
    if (!article.createdAt) return 'Non daté';
    
    // Si c'est un timestamp Firestore (avec toDate)
    if (article.createdAt.toDate) {
        return article.createdAt.toDate().toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    
    // Si c'est une date ISO string (depuis le cache)
    if (typeof article.createdAt === 'string') {
        return new Date(article.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    
    // Si c'est un objet seconds/nanoseconds (Firestore sérialisé dans le cache)
    if (article.createdAt.seconds) {
        return new Date(article.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    
    return 'Non daté';
}

// Card vedette — grande, pleine largeur
function createFeaturedCard(article) {
    const date         = getArticleDate(article);
    const imgUrl       = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';
    const categoryClass = getCategoryClass(article.category);
    const articleUrl   = getArticleUrl(article);
    const isOffline    = !isOnline();

    return `
        <article class="article-card article-card--featured" onclick="window.location.href='${articleUrl}'">
            <div class="article-card__image-wrap">
                <img src="${imgUrl}"
                     alt="${escapeHtml(article.title)}"
                     class="article-image"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200'">
                <span class="article-card__featured-label">
                    <i class="fas fa-star"></i> À la une
                </span>
                ${isOffline ? `<span class="article-card__offline-badge"><i class="fas fa-database"></i> Cache</span>` : ''}
            </div>
            <div class="article-content">
                <div class="article-meta">
                    <span class="badge badge-${categoryClass}">${escapeHtml(article.category)}</span>
                    <span class="article-date"><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                <p class="article-summary">${escapeHtml(article.summary || '')}</p>
                <div class="article-footer">
                    <div class="article-stats">
                        <span><i class="fas fa-eye"></i> ${article.views || 0} vues</span>
                        <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
                    </div>
                    <button class="btn-read-more">
                        Lire l'article <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </article>
    `;
}

// Card normale — grille
function createArticleCard(article) {
    const date         = getArticleDate(article);
    const imgUrl       = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600';
    const categoryClass = getCategoryClass(article.category);
    const articleUrl   = getArticleUrl(article);
    const isOffline    = !isOnline();

    return `
        <article class="article-card" onclick="window.location.href='${articleUrl}'">
            <div class="article-card__image-wrap">
                <img src="${imgUrl}"
                     alt="${escapeHtml(article.title)}"
                     class="article-image"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'">
                ${isOffline ? `<span class="article-card__offline-badge"><i class="fas fa-database"></i> Cache</span>` : ''}
            </div>
            <div class="article-content">
                <div class="article-meta">
                    <span class="badge badge-${categoryClass}">${escapeHtml(article.category)}</span>
                    <span class="article-date"><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>
                <h3 class="article-title">${escapeHtml(article.title)}</h3>
                <p class="article-summary">${escapeHtml(article.summary || '')}</p>
                <div class="article-footer">
                    <div class="article-stats">
                        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
                    </div>
                    <span class="read-more-link">
                        Lire <i class="fas fa-arrow-right"></i>
                    </span>
                </div>
            </div>
        </article>
    `;
}

// ============================================
// PAGINATION
// ============================================
function displayPagination() {
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
    pagination.innerHTML = '';

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled  = currentPage === 1;
    prevBtn.onclick   = () => changePage(currentPage - 1);
    pagination.appendChild(prevBtn);

    const startPage = Math.max(1, currentPage - 2);
    const endPage   = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn';
        firstBtn.textContent = '1';
        firstBtn.onclick   = () => changePage(1);
        pagination.appendChild(firstBtn);

        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            pagination.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => changePage(i);
        pagination.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            pagination.appendChild(dots);
        }

        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => changePage(totalPages);
        pagination.appendChild(lastBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled  = currentPage === totalPages;
    nextBtn.onclick   = () => changePage(currentPage + 1);
    pagination.appendChild(nextBtn);
}

function changePage(page) {
    currentPage = page;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// ARTICLES POPULAIRES (AVEC CACHE)
// ============================================
async function loadPopularArticles() {
    try {
        if (!isOnline()) {
            loadPopularArticlesFromCache();
            return;
        }

        const snapshot = await getDocs(
            query(collection(db, 'articles'), orderBy('views', 'desc'), limit(20))
        );

        const published = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(article => {
                const status = article.status || 'published';
                return status === 'published';
            })
            .slice(0, 5);

        displayPopularArticles(published);
        
        // Sauvegarder dans un cache séparé pour les populaires
        localStorage.setItem('electroinfo_popular_cache', JSON.stringify({
            articles: published,
            timestamp: Date.now()
        }));
        
    } catch (error) {
        console.error('Erreur articles populaires:', error);
        loadPopularArticlesFromCache();
    }
}

function loadPopularArticlesFromCache() {
    try {
        const data = localStorage.getItem('electroinfo_popular_cache');
        if (data) {
            const parsed = JSON.parse(data);
            // Vérifier si le cache populaires n'est pas trop vieux (7 jours)
            if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                displayPopularArticles(parsed.articles);
                return;
            }
        }
        // Si pas de cache ou expiré, essayer d'utiliser les articles généraux
        const generalCache = getArticlesFromCache();
        if (generalCache) {
            const sorted = [...generalCache].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
            displayPopularArticles(sorted);
        }
    } catch (e) {
        console.error('Erreur cache populaires:', e);
        popularArticles.innerHTML = '<p class="empty-text">Aucun article populaire</p>';
    }
}

function displayPopularArticles(articles) {
    if (!articles || articles.length === 0) {
        popularArticles.innerHTML = '<p class="empty-text">Aucun article</p>';
        return;
    }

    popularArticles.innerHTML = articles.map(article => {
        const imgUrl     = article.imageUrl ||
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400';
        const articleUrl = article.slug
            ? `/article/${article.slug}`
            : `/article-detail.html?id=${article.id}`;

        return `
            <div class="popular-article" onclick="window.location.href='${articleUrl}'">
                <img src="${imgUrl}"
                     alt="${escapeHtml(article.title)}"
                     onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'">
                <div class="popular-content">
                    <h4 class="popular-title">${escapeHtml(article.title)}</h4>
                    <p class="popular-views">
                        <i class="fas fa-eye"></i> ${article.views || 0} vues
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RECHERCHE & FILTRES
// ============================================
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

searchInput?.addEventListener('input', debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    filteredArticles = q
        ? allArticles.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.summary?.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
          )
        : [...allArticles];
    currentPage = 1;
    displayArticles();
}));

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        filteredArticles = category === 'all'
            ? [...allArticles]
            : allArticles.filter(a => a.category === category);

        currentPage = 1;
        displayArticles();

        // Mettre à jour l'URL sans rechargement
        const url = new URL(window.location);
        category === 'all'
            ? url.searchParams.delete('category')
            : url.searchParams.set('category', category);
        window.history.pushState({}, '', url);
    });
});

sortSelect?.addEventListener('change', (e) => {
    switch (e.target.value) {
        case 'date-desc':
            filteredArticles.sort((a, b) => toDate(b) - toDate(a));
            break;
        case 'date-asc':
            filteredArticles.sort((a, b) => toDate(a) - toDate(b));
            break;
        case 'popular':
            filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'title':
            filteredArticles.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    displayArticles();
});

function toDate(article) {
    if (!article.createdAt) return new Date(0);
    if (article.createdAt.toDate) return article.createdAt.toDate();
    if (article.createdAt.seconds) return new Date(article.createdAt.seconds * 1000);
    return new Date(article.createdAt);
}

// ============================================
// NEWSLETTER
// ============================================
window.openNewsletterModal  = () =>
    document.getElementById('newsletterModal').classList.remove('hidden');
window.closeNewsletterModal = () => {
    document.getElementById('newsletterModal').classList.add('hidden');
    document.getElementById('newsletterForm').reset();
};

document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isOnline()) {
        showNotification('Connexion requise pour s\'inscrire', 'error');
        return;
    }
    
    const email = document.getElementById('newsletterEmail').value.trim().toLowerCase();

    try {
        const existing = await getDocs(
            query(collection(db, 'newsletter'), where('email', '==', email))
        );
        if (!existing.empty) {
            showNotification('Vous êtes déjà inscrit !', 'info');
            window.closeNewsletterModal();
            return;
        }
        await addDoc(collection(db, 'newsletter'), { email, subscribedAt: new Date() });
        showNotification('Merci pour votre inscription ! 🎉', 'success');
        window.closeNewsletterModal();
    } catch {
        showNotification("Erreur lors de l'inscription", 'error');
    }
});

// ============================================
// MENU MOBILE
// ============================================
const mobileToggle = document.getElementById('mobileToggle');
const navMenu      = document.getElementById('mobileMenu');

function closeMobileMenu() {
    navMenu?.classList.remove('active');
    const icon = mobileToggle?.querySelector('i');
    if (icon) { icon.className = 'fas fa-bars'; }
}

mobileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navMenu.classList.toggle('active');
    mobileToggle.querySelector('i').className = isOpen ? 'fas fa-times' : 'fas fa-bars';
});

document.querySelectorAll('.nav-link').forEach(link =>
    link.addEventListener('click', closeMobileMenu)
);

document.addEventListener('click', (e) => {
    if (navMenu && mobileToggle &&
        !navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMobileMenu();
    }
});

// ============================================
// 🆕 ÉCOUTEURS D'ÉTAT DE CONNEXION
// ============================================
window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    hideOfflineIndicator();
    showNetworkToast('Connexion rétablie', 'online');
    
    // Recharger silencieusement pour mettre à jour si on avait des données en cache
    if (allArticles.length > 0) {
        loadArticles();
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Connexion perdue');
    showOfflineIndicator();
    showNetworkToast('Mode hors ligne', 'offline');
});

// ============================================
// UTILITAIRES
// ============================================
function getCategoryClass(category) {
    return { INNOVATION: 'blue', 'SÉCURITÉ': 'red', 'NOUVEAUTÉ': 'green',
             TUTO: 'orange', DOMOTIQUE: 'purple' }[category] || 'blue';
}

function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function showNotification(message, type = 'info') {
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    
    // Vérifier l'état initial
    if (!isOnline()) {
        showOfflineIndicator();
    }
});