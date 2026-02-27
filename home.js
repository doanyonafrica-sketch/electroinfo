// home.js - Script pour la page d'accueil avec CACHE LOCAL
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, limit, where, addDoc, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
  authDomain: "electroino-app.firebaseapp.com",
  projectId: "electroino-app",
  storageBucket: "electroino-app.firebasestorage.app",
  messagingSenderId: "864058526638",
  appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Activer la persistance offline de Firebase
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistance multi-onglets non supportée');
        } else if (err.code == 'unimplemented') {
            console.log('Navigateur ne supporte pas la persistance');
        }
    });
} catch (e) {
    console.log('Persistance déjà activée ou erreur:', e);
}

let currentUser = null;

// Détection environnement
const isLocalDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.port === '5500';

// ============================================
// CACHE LOCAL DES ARTICLES
// ============================================
const CACHE_KEY = 'electroinfo_articles_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en ms

function getCachedArticles() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Vérifier si le cache est encore valide
        if (now - data.timestamp > CACHE_DURATION) {
            console.log('Cache expiré');
            return null;
        }
        
        console.log('✅ Articles chargés depuis le cache local');
        return data.articles;
    } catch (e) {
        console.error('Erreur lecture cache:', e);
        return null;
    }
}

function saveArticlesToCache(articles) {
    try {
        const data = {
            articles: articles,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        console.log('💾 Articles sauvegardés en cache');
    } catch (e) {
        console.error('Erreur sauvegarde cache:', e);
    }
}

function clearArticlesCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('🗑️ Cache effacé');
    } catch (e) {
        console.error('Erreur suppression cache:', e);
    }
}

// ============================================
// GESTION AUTHENTIFICATION
// ============================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const adminLink = document.getElementById('adminLink');
    const adminDivider = document.getElementById('adminDivider');

    if (user) {
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');

        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('userName').textContent = displayName;
        document.getElementById('userNameDropdown').textContent = displayName;
        document.getElementById('userEmailDropdown').textContent = user.email;

        const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e40af&color=fff`;
        document.getElementById('userAvatar').src = avatarUrl;
        document.getElementById('userAvatarDropdown').src = avatarUrl;

        try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
            if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                if (userData.role === 'admin' || userData.role === 'superadmin') {
                    adminLink.classList.remove('hidden');
                    adminDivider.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Erreur vérification admin:', error);
        }
    } else {
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        if (adminLink) adminLink.classList.add('hidden');
        if (adminDivider) adminDivider.classList.add('hidden');
    }
});

// Toggle menu utilisateur
document.getElementById('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
});

// Fermer dropdown
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userMenuToggle = document.getElementById('userMenuToggle');
    if (dropdown && !dropdown.contains(e.target) && e.target !== userMenuToggle) {
        dropdown.classList.add('hidden');
    }
});

// Déconnexion
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Déconnexion réussie', 'success');
        window.location.reload();
    } catch (error) {
        showNotification('Erreur lors de la déconnexion', 'error');
    }
});

// ============================================
// CHARGEMENT DES DERNIERS ARTICLES AVEC CACHE
// ============================================
async function loadLatestArticles() {
    const container = document.getElementById('latestArticles');
    
    if (!container) {
        console.warn('Conteneur latestArticles non trouvé');
        return;
    }

    // 1. Afficher le cache immédiatement s'il existe
    const cachedArticles = getCachedArticles();
    if (cachedArticles && cachedArticles.length > 0) {
        container.innerHTML = cachedArticles.map(article => createArticleCard(article)).join('');
        console.log(`📦 ${cachedArticles.length} articles affichés depuis le cache`);
        
        // Ajouter un indicateur discret "mis à jour à..."
        showCacheIndicator(container, cachedArticles);
    } else {
        // Pas de cache, afficher le loading
        container.innerHTML = `
            <div class="loading" style="text-align: center; padding: 3rem 0;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: #1e40af; margin-bottom: 1rem; display: block;"></i>
                <p>Chargement des articles...</p>
            </div>
        `;
    }

    // 2. Essayer de charger depuis Firebase (même si on a déjà affiché le cache)
    try {
        const q = query(
            collection(db, 'articles'), 
            orderBy('createdAt', 'desc'), 
            limit(6)
        );
        
        // Timeout de 8 secondes pour Firebase
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout Firebase')), 8000);
        });
        
        const snapshot = await Promise.race([getDocs(q), timeoutPromise]);

        if (!snapshot.empty) {
            const articles = [];
            snapshot.forEach(doc => {
                // Convertir les timestamps en objets date sérialisables pour le cache
                const data = doc.data();
                articles.push({ 
                    id: doc.id, 
                    ...data,
                    // Stocker la date comme string pour le cache
                    _cachedDate: data.createdAt ? new Date(data.createdAt.toDate()).toISOString() : null
                });
            });

            // Mettre à jour l'affichage si différent du cache
            const currentHtml = container.innerHTML;
            const newHtml = articles.map(article => createArticleCard(article)).join('');
            
            if (currentHtml !== newHtml) {
                container.innerHTML = newHtml;
                console.log(`🔄 ${articles.length} articles mis à jour depuis Firebase`);
            } else {
                console.log('✅ Articles déjà à jour');
            }

            // Sauvegarder dans le cache
            saveArticlesToCache(articles);
            
            // Retirer l'indicateur de cache s'il existe
            removeCacheIndicator();
        }
        
    } catch (error) {
        console.error('⚠️ Erreur chargement Firebase:', error);
        
        // Si on n'avait pas de cache, afficher un message d'erreur
        if (!cachedArticles || cachedArticles.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem 1rem; color: #6b7280;">
                    <i class="fas fa-wifi" style="font-size: 3rem; margin-bottom: 1rem; display: block; color: #dc2626;"></i>
                    <p style="font-weight: 600; color: #dc2626;">Impossible de charger les articles</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Vérifiez votre connexion internet</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-sync"></i> Réessayer
                    </button>
                </div>
            `;
        } else {
            // On a déjà affiché le cache, ajouter un indicateur d'erreur discret
            showOfflineIndicator();
        }
    }
}

// Indicateur de cache
function showCacheIndicator(container, articles) {
    // Vérifier si l'indicateur existe déjà
    if (document.getElementById('cache-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'cache-indicator';
    indicator.style.cssText = `
        text-align: center;
        padding: 0.5rem;
        margin-bottom: 1rem;
        color: #6b7280;
        font-size: 0.85rem;
        background: #f3f4f6;
        border-radius: 0.5rem;
    `;
    
    const date = articles[0]?._cachedDate 
        ? new Date(articles[0]._cachedDate).toLocaleString('fr-FR')
        : 'date inconnue';
    
    indicator.innerHTML = `
        <i class="fas fa-database" style="margin-right: 0.5rem;"></i>
        Articles du ${date} <span style="color: #1e40af; font-weight: 600;">(mode hors ligne)</span>
        <button onclick="clearArticlesCache(); location.reload();" 
                style="margin-left: 1rem; background: none; border: none; color: #dc2626; cursor: pointer; text-decoration: underline;">
            Actualiser
        </button>
    `;
    
    container.parentNode.insertBefore(indicator, container);
}

function removeCacheIndicator() {
    const indicator = document.getElementById('cache-indicator');
    if (indicator) {
        indicator.innerHTML = `
            <i class="fas fa-check-circle" style="color: #16a34a; margin-right: 0.5rem;"></i>
            Articles mis à jour en temps réel
        `;
        setTimeout(() => indicator.remove(), 3000);
    }
}

function showOfflineIndicator() {
    const indicator = document.getElementById('cache-indicator');
    if (indicator) {
        indicator.style.background = '#fef3c7';
        indicator.style.color = '#92400e';
        indicator.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
            Mode hors ligne - Dernière mise à jour conservée
            <button onclick="location.reload()" 
                    style="margin-left: 1rem; background: none; border: none; color: #1e40af; cursor: pointer; text-decoration: underline;">
                Réessayer
            </button>
        `;
    }
}

function createArticleCard(article) {
    // Utiliser _cachedDate si disponible, sinon createdAt
    let dateStr = 'Non daté';
    if (article._cachedDate) {
        dateStr = new Date(article._cachedDate).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } else if (article.createdAt) {
        try {
            dateStr = new Date(article.createdAt.toDate()).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            dateStr = 'Non daté';
        }
    }

    const imgUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800';
    const categoryClass = getCategoryClass(article.category);

    // URL avec slug si disponible, sinon fallback avec ID
    const articleUrl = article.slug 
        ? `/article/${article.slug}`
        : `/article-detail.html?id=${article.id}`;

    return `
        <article class="article-card" onclick="window.location.href='${articleUrl}'">
            <img src="${imgUrl}" alt="${escapeHtml(article.title)}" class="article-image" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'">
            <div class="article-content">
                <div class="article-meta">
                    <span class="badge badge-${categoryClass}">${escapeHtml(article.category || 'Actualité')}</span>
                    <span class="article-date">${dateStr}</span>
                </div>
                <h3 class="article-title">${escapeHtml(article.title)}</h3>
                <p class="article-summary">${escapeHtml(article.summary || '').substring(0, 120)}...</p>
                <div class="article-footer">
                    <div class="article-stats">
                        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
                    </div>
                    <button class="btn-read-more">
                        Lire la suite <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </article>
    `;
}

// ============================================
// NEWSLETTER - CORRIGÉ POUR "Bulletin d'information"
// ============================================
window.openNewsletterModal = function() {
    document.getElementById('newsletterModal').classList.remove('hidden');
};

window.closeNewsletterModal = function() {
    document.getElementById('newsletterModal').classList.add('hidden');
    document.getElementById('newsletterForm').reset();
};

// Newsletter modal
document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await subscribeNewsletter(document.getElementById('newsletterEmail').value);
});

// Newsletter inline (page d'accueil)
document.getElementById('newsletterFormHome')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await subscribeNewsletter(document.getElementById('newsletterEmailHome').value);
});

async function subscribeNewsletter(email) {
    email = email.trim();
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Veuillez entrer un email valide', 'error');
        return;
    }
    
    try {
        // Vérifie si l'email existe déjà (dans Bulletin d'information)
        const emailDoc = await getDocs(query(collection(db, "Bulletin d'information"), where('email', '==', email.toLowerCase())));

        if (!emailDoc.empty) {
            showNotification('Vous êtes déjà inscrit !', 'info');
            closeNewsletterModal();
            return;
        }

        // Ajoute dans Bulletin d'information (collection avec accent)
        await addDoc(collection(db, "Bulletin d'information"), {
            Email: email,
            email: email.toLowerCase(),
            nom: '',
            name: '',
            status: 'active',
            source: 'website',
            'abonnéAt': new Date()
        });

        showNotification('Merci pour votre inscription ! 🎉', 'success');
        closeNewsletterModal();
        
        // Reset form inline
        document.getElementById('newsletterEmailHome').value = '';
    } catch (error) {
        console.error('Erreur inscription newsletter:', error);
        showNotification('Erreur lors de l\'inscription: ' + error.message, 'error');
    }
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// MENU MOBILE
// ============================================
const mobileToggle = document.getElementById('mobileToggle');
const navMenu = document.getElementById('mobileMenu');

function closeMobileMenu() {
    if (!navMenu) return;
    navMenu.classList.remove('active');
    const icon = mobileToggle?.querySelector('i');
    if (icon) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

mobileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('active');
    const icon = mobileToggle.querySelector('i');
    if (navMenu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => closeMobileMenu());
});

document.addEventListener('click', (e) => {
    if (navMenu && mobileToggle && !navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMobileMenu();
    }
});

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadLatestArticles();
});