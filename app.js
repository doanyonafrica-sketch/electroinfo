// articles.js - Page liste des articles OPTIMISE
// Version: 2.1 - Corrections erreurs

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, query, doc, getDoc,
    orderBy, limit, where, addDoc, enableIndexedDbPersistence,
    startAfter, CACHE_SIZE_UNLIMITED
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
  authDomain: "electroino-app.firebaseapp.com",
  projectId: "electroino-app",
  storageBucket: "electroino-app.firebasestorage.app",
  messagingSenderId: "864058526638",
  appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
}).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Persistance: plusieurs onglets ouverts');
    } else if (err.code == 'unimplemented') {
        console.log('Navigateur ne supporte pas IndexedDB');
    }
});

let allArticles = [];
let filteredArticles = [];
let lastVisible = null;
let hasMoreArticles = true;
let isLoading = false;
const ARTICLES_PER_PAGE = 9;

const CACHE_KEY = 'electroinfo_articles_cache_v3';
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const POPULAR_CACHE_KEY = 'electroinfo_popular_cache_v3';

// ============================================
// GESTION DES LANGUES
// ============================================
// La langue est gérée par le sélecteur dans le HTML (clé: electroinfo_lang)
// Valeurs possibles : 'ewe', 'fr', 'en'

function getCurrentLang() {
    return localStorage.getItem('electroinfo_lang') || 'ewe';
}

// Retourne le champ traduit d'un article selon la langue courante
// Mapping: 'ewe' dans le HTML → clé 'ee' dans Firestore translations
function getTranslated(article, field) {
    const lang = getCurrentLang();
    if (lang === 'fr') return article[field] || '';
    // 'ewe' dans le sélecteur HTML = clé 'ee' dans Firestore
    const firestoreKey = lang === 'ewe' ? 'ee' : lang;
    return article?.translations?.[firestoreKey]?.[field] || article[field] || '';
}

// Réécoute les changements de langue et re-affiche les articles
window.addEventListener('storage', (e) => {
    if (e.key === 'electroinfo_lang') {
        displayArticles(true);
        displayPopularArticles(_lastPopularArticles);
    }
});

// Patch setLang pour re-rendre après changement de langue (même onglet)
const _origSetLang = window.setLang;
window.setLang = function(lang) {
    if (_origSetLang) _origSetLang(lang);
    displayArticles(true);
    displayPopularArticles(_lastPopularArticles);
};

let _lastPopularArticles = [];

const articlesGrid = document.getElementById('articlesGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const filterBtns = document.querySelectorAll('.filter-btn');
const pagination = document.getElementById('pagination');
const popularArticles = document.getElementById('popularArticles');

function saveArticlesToCache(articles, isComplete = false) {
    try {
        const data = {
            articles: articles,
            timestamp: Date.now(),
            version: '2.0',
            isComplete: isComplete
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        console.log(`${articles.length} articles sauvegardes en cache`);
    } catch (e) {
        console.error('Erreur sauvegarde cache:', e);
    }
}

function getArticlesFromCache() {
    try {
        const data = localStorage.getItem(CACHE_KEY);
        if (!data) return null;
        const parsed = JSON.parse(data);
        const age = Date.now() - parsed.timestamp;
        if (age > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed;
    } catch (e) {
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
    indicator.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Mode hors ligne</span>';
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

const ADMIN_CACHE_KEY = 'electroinfo_admin_cache_articles';
const ADMIN_CACHE_DURATION = 30 * 60 * 1000;

async function checkIsAdmin(user) {
    if (!user) return false;
    try {
        const cached = localStorage.getItem(ADMIN_CACHE_KEY);
        if (cached) {
            const { uid, isAdmin, timestamp } = JSON.parse(cached);
            if (uid === user.uid && Date.now() - timestamp < ADMIN_CACHE_DURATION) {
                return isAdmin;
            }
        }
    } catch (e) {}

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
        localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({
            uid: user.uid, isAdmin, timestamp: Date.now()
        }));
        return isAdmin;
    } catch (error) {
        return false;
    }
}

onAuthStateChanged(auth, async (user) => {
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

        const isUserAdmin = await checkIsAdmin(user);
        if (isUserAdmin) {
            adminLink?.classList.remove('hidden');
            adminDivider?.classList.remove('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        adminLink?.classList.add('hidden');
        adminDivider?.classList.add('hidden');
        localStorage.removeItem(ADMIN_CACHE_KEY);
    }
});

document.getElementById('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const toggle = document.getElementById('userMenuToggle');
    if (dropdown && !dropdown.contains(e.target) && e.target !== toggle) {
        dropdown.classList.add('hidden');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.removeItem(ADMIN_CACHE_KEY);
        showNotification('Deconnexion reussie', 'success');
        window.location.reload();
    } catch {
        showNotification('Erreur lors de la deconnexion', 'error');
    }
});

async function loadArticles(firstLoad = true) {
    if (isLoading) return;
    isLoading = true;

    try {
        const cachedData = getArticlesFromCache();
        let usedCache = false;

        if (firstLoad && cachedData && cachedData.articles.length > 0) {
            allArticles = cachedData.articles.filter(a => (a.status || 'published') === 'published');
            filteredArticles = [...allArticles];
            displayArticles(true);
            usedCache = true;

            if (!isOnline()) {
                showOfflineIndicator();
                isLoading = false;
                return;
            }
        }

        if (!isOnline()) throw new Error('OFFLINE');

        if (!usedCache) {
            articlesGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';
        }

        let q = query(
            collection(db, 'articles'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(ARTICLES_PER_PAGE)
        );

        if (!firstLoad && lastVisible) {
            q = query(
                collection(db, 'articles'),
                where('status', '==', 'published'),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(ARTICLES_PER_PAGE)
            );
        }

        const snapshot = await getDocs(q);
        hasMoreArticles = snapshot.docs.length === ARTICLES_PER_PAGE;
        if (snapshot.docs.length > 0) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }

        const freshArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (firstLoad) {
            allArticles = freshArticles;
            saveArticlesToCache(freshArticles, !hasMoreArticles);
        } else {
            allArticles = [...allArticles, ...freshArticles];
        }

        filteredArticles = [...allArticles];
        displayArticles(true);

        if (firstLoad) loadPopularArticles();
        hideOfflineIndicator();

    } catch (error) {
        console.error('Erreur chargement:', error);
        if (firstLoad && allArticles.length === 0) {
            articlesGrid.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i><p>Erreur de connexion</p></div>';
            showOfflineIndicator();
        }
    } finally {
        isLoading = false;
    }
}

function displayArticles(clearGrid = true) {
    if (clearGrid) articlesGrid.innerHTML = '';
    if (filteredArticles.length === 0) {
        articlesGrid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Aucun article trouve</p></div>';
        return;
    }

    const [featured, ...rest] = filteredArticles;
    articlesGrid.innerHTML = createFeaturedCard(featured) +
        (rest.length ? `<div class="articles-subgrid">${rest.map(createArticleCard).join('')}</div>` : '');

    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const oldBtn = document.getElementById('loadMoreBtn');
    if (oldBtn) oldBtn.remove();
    if (hasMoreArticles) {
        const btn = document.createElement('button');
        btn.id = 'loadMoreBtn';
        btn.className = 'btn btn-primary load-more-btn';
        btn.innerHTML = 'Charger plus <i class="fas fa-chevron-down"></i>';
        btn.style.cssText = 'margin:2rem auto;display:block;padding:0.75rem 2rem';
        btn.onclick = () => loadArticles(false);
        articlesGrid.parentNode.insertBefore(btn, articlesGrid.nextSibling);
    }
}

function getArticleUrl(article) {
    return article.slug ? `/article/${article.slug}` : `/article-detail.html?id=${article.id}`;
}

function getArticleDate(article) {
    const localeMap = { fr: 'fr-FR', en: 'en-GB', ewe: 'fr-FR' };
    const locale = localeMap[getCurrentLang()] || 'fr-FR';
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    if (!article.createdAt) return 'Non daté';
    if (article.createdAt.toDate) return article.createdAt.toDate().toLocaleDateString(locale, opts);
    if (article.createdAt.seconds) return new Date(article.createdAt.seconds * 1000).toLocaleDateString(locale, opts);
    return new Date(article.createdAt).toLocaleDateString(locale, opts);
}

function createFeaturedCard(article) {
    const date = getArticleDate(article);
    const imgUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200';
    const categoryClass = getCategoryClass(article.category);
    const articleUrl = getArticleUrl(article);
    const isOffline = !isOnline();

    // 🌍 Champs traduits
    const title = getTranslated(article, 'title');
    const summary = getTranslated(article, 'summary');
    const category = getTranslated(article, 'category') || article.category;
    const readLabel = { fr: 'Lire', en: 'Read', ewe: 'Xlee' }[getCurrentLang()] || 'Lire';
    const viewsLabel = { fr: 'vues', en: 'views', ewe: 'kpɔkpɔwo' }[getCurrentLang()] || 'vues';
    const featuredLabel = { fr: 'À la une', en: 'Featured', ewe: 'Ŋgɔ la' }[getCurrentLang()] || 'À la une';
    const hasTranslation = article.translations && Object.keys(article.translations).length > 0;

    return `<article class="article-card article-card--featured" onclick="window.location.href='${articleUrl}'">
        <div class="article-card__image-wrap">
            <img src="${imgUrl}" alt="${escapeHtml(title)}" class="article-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200'">
            <span class="article-card__featured-label"><i class="fas fa-star"></i> ${featuredLabel}</span>
            ${isOffline ? '<span class="article-card__offline-badge"><i class="fas fa-database"></i> Cache</span>' : ''}
            ${hasTranslation ? '<span style="position:absolute;top:8px;right:8px;background:rgba(30,64,175,0.85);color:white;border-radius:6px;padding:3px 8px;font-size:11px;">🌍</span>' : ''}
        </div>
        <div class="article-content">
            <div class="article-meta">
                <span class="badge badge-${categoryClass}">${escapeHtml(category)}</span>
                <span class="article-date"><i class="fas fa-calendar-alt"></i> ${date}</span>
            </div>
            <h2 class="article-title">${escapeHtml(title)}</h2>
            <p class="article-summary">${escapeHtml(summary || '')}</p>
            <div class="article-footer">
                <div class="article-stats">
                    <span><i class="fas fa-eye"></i> ${article.views || 0} ${viewsLabel}</span>
                    <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
                </div>
                <button class="btn-read-more">${readLabel} <i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    </article>`;
}

function createArticleCard(article) {
    const date = getArticleDate(article);
    const imgUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600';
    const categoryClass = getCategoryClass(article.category);
    const articleUrl = getArticleUrl(article);
    const isOffline = !isOnline();

    // 🌍 Champs traduits
    const title = getTranslated(article, 'title');
    const summary = getTranslated(article, 'summary');
    const category = getTranslated(article, 'category') || article.category;
    const readLabel = { fr: 'Lire', en: 'Read', ewe: 'Xlee' }[getCurrentLang()] || 'Lire';
    const hasTranslation = article.translations && Object.keys(article.translations).length > 0;

    return `<article class="article-card" onclick="window.location.href='${articleUrl}'">
        <div class="article-card__image-wrap">
            <img src="${imgUrl}" alt="${escapeHtml(title)}" class="article-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'">
            ${isOffline ? '<span class="article-card__offline-badge"><i class="fas fa-database"></i> Cache</span>' : ''}
            ${hasTranslation ? '<span style="position:absolute;top:6px;right:6px;background:rgba(30,64,175,0.85);color:white;border-radius:5px;padding:2px 6px;font-size:10px;">🌍</span>' : ''}
        </div>
        <div class="article-content">
            <div class="article-meta">
                <span class="badge badge-${categoryClass}">${escapeHtml(category)}</span>
                <span class="article-date"><i class="fas fa-calendar-alt"></i> ${date}</span>
            </div>
            <h3 class="article-title">${escapeHtml(title)}</h3>
            <p class="article-summary">${escapeHtml(summary || '')}</p>
            <div class="article-footer">
                <div class="article-stats">
                    <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                    <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
                </div>
                <span class="read-more-link">${readLabel} <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>
    </article>`;
}

async function loadPopularArticles() {
    try {
        if (!isOnline()) { loadPopularArticlesFromCache(); return; }
        const snapshot = await getDocs(query(collection(db,'articles'),where('status','==','published'),orderBy('views','desc'),limit(5)));
        const published = snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
        displayPopularArticles(published);
        localStorage.setItem(POPULAR_CACHE_KEY, JSON.stringify({articles:published,timestamp:Date.now()}));
    } catch (error) {
        loadPopularArticlesFromCache();
    }
}

function loadPopularArticlesFromCache() {
    try {
        const data = localStorage.getItem(POPULAR_CACHE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            // Cache de 7 jours max
            if (Date.now() - parsed.timestamp < 7*24*60*60*1000) {
                displayPopularArticles(parsed.articles);
                return;
            }
        }
        const generalCache = getArticlesFromCache();
        if (generalCache) {
            const sorted = [...generalCache.articles].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5);
            displayPopularArticles(sorted);
        }
    } catch (e) {
        popularArticles.innerHTML = '<p class="empty-text">Aucun article populaire</p>';
    }
}

function displayPopularArticles(articles) {
    _lastPopularArticles = articles || [];
    if (!articles || articles.length === 0) {
        popularArticles.innerHTML = '<p class="empty-text">Aucun article</p>';
        return;
    }
    const viewsLabel = { fr: 'vues', en: 'views', ewe: 'kpɔkpɔwo' }[getCurrentLang()] || 'vues';
    popularArticles.innerHTML = articles.map(article => {
        const imgUrl = article.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400';
        const articleUrl = article.slug ? `/article/${article.slug}` : `/article-detail.html?id=${article.id}`;
        const title = getTranslated(article, 'title');
        return `<div class="popular-article" onclick="window.location.href='${articleUrl}'">
            <img src="${imgUrl}" alt="${escapeHtml(title)}" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'">
            <div class="popular-content">
                <h4 class="popular-title">${escapeHtml(title)}</h4>
                <p class="popular-views"><i class="fas fa-eye"></i> ${article.views || 0} ${viewsLabel}</p>
            </div>
        </div>`;
    }).join('');
}

function debounce(fn,delay=300){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}};

searchInput?.addEventListener('input', debounce((e)=>{
    const q=e.target.value.toLowerCase().trim();
    if(q.length===1)return;
    filteredArticles=q?allArticles.filter(a=>a.title.toLowerCase().includes(q)||a.summary?.toLowerCase().includes(q)||a.category.toLowerCase().includes(q)).slice(0,20):[...allArticles];
    lastVisible=null;hasMoreArticles=false;displayArticles(true);
}));

filterBtns.forEach(btn=>{btn.addEventListener('click',()=>{filterBtns.forEach(b=>b.classList.remove('active'));btn.classList.add('active');const category=btn.dataset.category;filteredArticles=category==='all'?[...allArticles]:allArticles.filter(a=>a.category===category);displayArticles(true);const url=new URL(window.location);category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category);window.history.pushState({},'',url);});});

sortSelect?.addEventListener('change',(e)=>{switch(e.target.value){case'date-desc':filteredArticles.sort((a,b)=>toDate(b)-toDate(a));break;case'date-asc':filteredArticles.sort((a,b)=>toDate(a)-toDate(b));break;case'popular':filteredArticles.sort((a,b)=>(b.views||0)-(a.views||0));break;case'title':filteredArticles.sort((a,b)=>a.title.localeCompare(b.title));break;}displayArticles(true);});

function toDate(article){if(!article.createdAt)return new Date(0);if(article.createdAt.toDate)return article.createdAt.toDate();if(article.createdAt.seconds)return new Date(article.createdAt.seconds*1000);return new Date(article.createdAt);}

window.openNewsletterModal=()=>document.getElementById('newsletterModal').classList.remove('hidden');
window.closeNewsletterModal=()=>{document.getElementById('newsletterModal').classList.add('hidden');document.getElementById('newsletterForm').reset();};

document.getElementById('newsletterForm')?.addEventListener('submit',async(e)=>{
    e.preventDefault();
    if(!isOnline()){showNotification('Connexion requise','error');return;}
    const email=document.getElementById('newsletterEmail').value.trim().toLowerCase();
    try{
        const existing=await getDocs(query(collection(db,'newsletter'),where('email','==',email)));
        if(!existing.empty){showNotification('Vous etes deja inscrit','info');window.closeNewsletterModal();return;}
        await addDoc(collection(db,'newsletter'),{email,subscribedAt:new Date()});
        showNotification('Merci pour votre inscription','success');
        window.closeNewsletterModal();
    }catch{showNotification("Erreur lors de l inscription",'error');}
});

const mobileToggle=document.getElementById('mobileToggle');
const navMenu=document.getElementById('mobileMenu');
function closeMobileMenu(){navMenu?.classList.remove('active');const icon=mobileToggle?.querySelector('i');if(icon)icon.className='fas fa-bars';}
mobileToggle?.addEventListener('click',(e)=>{e.stopPropagation();const isOpen=navMenu.classList.toggle('active');mobileToggle.querySelector('i').className=isOpen?'fas fa-times':'fas fa-bars';});
document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',closeMobileMenu));
document.addEventListener('click',(e)=>{if(navMenu&&mobileToggle&&!navMenu.contains(e.target)&&!mobileToggle.contains(e.target))closeMobileMenu();});

window.addEventListener('online',()=>{hideOfflineIndicator();if(allArticles.length>0&&hasMoreArticles)loadArticles(false);});
window.addEventListener('offline',()=>showOfflineIndicator());

function getCategoryClass(category){return{INNOVATION:'blue','SECURITE':'red','NOUVEAUTE':'green',TUTO:'orange',DOMOTIQUE:'purple'}[category]||'blue';}
function escapeHtml(text){if(!text)return'';const d=document.createElement('div');d.textContent=text;return d.innerHTML;}
function showNotification(message,type='info'){const icons={success:'check-circle',error:'exclamation-circle',info:'info-circle'};const el=document.createElement('div');el.className=`notification ${type}`;el.innerHTML=`<i class="fas fa-${icons[type]}"></i><span>${escapeHtml(message)}</span>`;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),300);},3000);}

document.addEventListener('DOMContentLoaded',()=>{loadArticles(true);if(!isOnline())showOfflineIndicator();});