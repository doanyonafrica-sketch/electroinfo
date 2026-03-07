// session-detail.js - Page de détails d'une séance (version optimisée)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============================================
// CONFIG & INIT FIREBASE (une seule fois)
// ============================================
const app = initializeApp({
    apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
    authDomain: "electroino-app.firebaseapp.com",
    projectId: "electroino-app",
    storageBucket: "electroino-app.firebasestorage.app",
    messagingSenderId: "864058526638",
    appId: "1:864058526638:web:17b821633c7cc99be1563f"
});

const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// HELPERS DOM — évite les document.getElementById répétitifs
// ============================================
const $ = (id) => document.getElementById(id);

// ============================================
// ÉTAT GLOBAL (regroupé proprement)
// ============================================
const state = {
    user: null,
    course: null,
    seqIndex: 0,
    sessionIndex: 0
};

// ============================================
// AUTHENTIFICATION
// ============================================
onAuthStateChanged(auth, async (user) => {
    state.user = user;

    const loginBtn    = $('loginBtn');
    const userMenu    = $('userMenu');
    const adminLink   = $('adminLink');
    const adminDivider= $('adminDivider');

    if (user) {
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');

        // Nom & avatar
        const displayName = user.displayName || user.email.split('@')[0];
        const avatarUrl   = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e40af&color=fff`;

        // Mise à jour du DOM en une passe
        Object.assign($('userName'),            { textContent: displayName });
        Object.assign($('userNameDropdown'),    { textContent: displayName });
        Object.assign($('userEmailDropdown'),   { textContent: user.email });
        Object.assign($('userAvatar'),          { src: avatarUrl });
        Object.assign($('userAvatarDropdown'),  { src: avatarUrl });

        // Vérification admin (avec cache session pour éviter un appel Firestore à chaque auth)
        const cachedRole = sessionStorage.getItem(`role_${user.uid}`);

        if (cachedRole === 'admin') {
            showAdminLinks(adminLink, adminDivider);
        } else if (cachedRole === null) {
            // Pas encore en cache → on va chercher
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role || 'user';
                    sessionStorage.setItem(`role_${user.uid}`, role);
                    if (role === 'admin') showAdminLinks(adminLink, adminDivider);
                }
            } catch (err) {
                console.error('Erreur vérification admin:', err);
            }
        }
    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        adminLink.classList.add('hidden');
        adminDivider.classList.add('hidden');
    }
});

function showAdminLinks(adminLink, adminDivider) {
    adminLink.classList.remove('hidden');
    adminDivider.classList.remove('hidden');
}

// ============================================
// MENU UTILISATEUR (dropdown)
// ============================================
$('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('userDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dropdown = $('userDropdown');
    const toggle   = $('userMenuToggle');
    if (dropdown && !dropdown.contains(e.target) && e.target !== toggle) {
        dropdown.classList.add('hidden');
    }
});

$('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/';
    } catch (err) {
        console.error('Erreur déconnexion:', err);
        alert('Erreur lors de la déconnexion');
    }
});

// ============================================
// MENU MOBILE
// ============================================
const mobileToggle = $('mobileToggle');
const mobileMenu   = $('mobileMenu'); // ID correct dans session-detail.html

function closeMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('active');
    const icon = mobileToggle?.querySelector('i');
    if (icon) icon.className = 'fas fa-bars';
}

function openMobileMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add('active');
    const icon = mobileToggle?.querySelector('i');
    if (icon) icon.className = 'fas fa-times';
}

if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileMenu.classList.contains('active');
        isOpen ? closeMobileMenu() : openMobileMenu();
    });

    // Fermer le menu quand on clique sur un lien de navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // Fermer le menu quand on clique en dehors
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') &&
            !mobileMenu.contains(e.target) &&
            !mobileToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
}

// ============================================
// PARAMÈTRES URL
// ============================================
function getUrlParams() {
    // Nouveau format SEO : /seance/cours-slug/seq-N/seance-N
    const parts = location.pathname.split('/');
    if (parts[1] === 'seance' && parts[2]) {
        const redirectPath = sessionStorage.getItem('redirect_path');
        const src = redirectPath ? redirectPath.split('/') : parts;
        if (redirectPath) sessionStorage.removeItem('redirect_path');
        return {
            courseSlug:   decodeURIComponent(src[2]),
            seqIndex:     parseInt((src[3] || 'seq-1').replace('seq-', '')) - 1,
            sessionIndex: parseInt((src[4] || 'seance-1').replace('seance-', '')) - 1
        };
    }
    // Fallback legacy : ?courseId=XXX&seqIndex=N&sessionIndex=N
    const p = new URLSearchParams(window.location.search);
    return {
        courseId:     p.get('courseId'),
        seqIndex:     parseInt(p.get('seqIndex'))     || 0,
        sessionIndex: parseInt(p.get('sessionIndex')) || 0
    };
}

// ============================================
// CHARGEMENT DE LA SÉANCE
// ============================================
async function loadSession() {
    const params = getUrlParams();

    try {
        let courseSnap = null;

        if (params.courseSlug) {
            // Nouveau format : recherche par slug
            const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const snap = await getDocs(query(collection(db, 'courses'), where('slug', '==', params.courseSlug)));
            if (snap.empty) { alert('Cours introuvable'); return (window.location.href = '/courses'); }
            courseSnap = snap.docs[0];
        } else if (params.courseId) {
            // Fallback legacy : par ID
            const docSnap = await getDoc(doc(db, 'courses', params.courseId));
            if (!docSnap.exists()) { alert('Cours introuvable'); return (window.location.href = '/courses'); }
            courseSnap = docSnap;
        } else {
            alert('Cours introuvable');
            return (window.location.href = '/courses');
        }

        state.course       = { id: courseSnap.id, ...courseSnap.data() };
        state.seqIndex     = params.seqIndex;
        state.sessionIndex = params.sessionIndex;
        displaySession();
    } catch (err) {
        console.error('Erreur chargement séance:', err);
        alert('Erreur lors du chargement de la séance');
        window.location.href = '/courses';
    }
}

// ============================================
// INJECTION HTML + RÉEXÉCUTION DES SCRIPTS
// ============================================
// Les <script> injectés via innerHTML ne s'exécutent jamais (règle HTML5).
// On clone chaque script dans un nouvel élément pour forcer l'exécution.
// Le setTimeout(0) garantit que le DOM est peint avant que le script tourne,
// ce qui règle le problème où getElementById('simBtn') retournait null.
function setInnerHTMLWithScripts(container, html) {
    container.innerHTML = html;
    const scripts = container.querySelectorAll('script');
    if (!scripts.length) return;
    scripts.forEach(function(oldScript) {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(function(attr) {
            newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

// ============================================
// AFFICHAGE DE LA SÉANCE
// ============================================
function displaySession() {
    $('loadingState').classList.add('hidden');
    $('sessionPage').classList.remove('hidden');

    const sequences = state.course.sequences || [];
    const sequence  = sequences[state.seqIndex];

    if (!sequence) return redirectToCourse();

    const sessions = sequence.sessions || [];
    const session  = sessions[state.sessionIndex];

    if (!session) return redirectToCourse();

    // Titre de page
    document.title = `${session.title || 'Séance'} | ElectroInfo`;

    // Contenu DOM
    $('sessionBadge').textContent   = `Séance ${state.sessionIndex + 1}`;
    $('sessionTitle').textContent   = session.title || 'Séance';
    setInnerHTMLWithScripts($('sessionContent'), session.content || '<p>Aucun contenu disponible.</p>');
    $('backButton').href = state.course.slug
        ? `/course/${state.course.slug}`
        : `/course-detail?id=${state.course.id}`;

    // PDF
    const pdfSection = $('pdfSection');
    const pdfBtn     = $('pdfDownloadBtn');
    if (session.pdfUrl) {
        pdfSection.classList.remove('hidden');
        pdfBtn.href = session.pdfUrl;
    } else {
        pdfSection.classList.add('hidden');
    }

    // Navigation
    setupNavigation(sequences, sessions);
}

// ============================================
// NAVIGATION ENTRE SÉANCES
// ============================================
function setupNavigation(sequences, sessions) {
    const prevBtn = $('prevSessionBtn');
    const nextBtn = $('nextSessionBtn');
    const { course, seqIndex, sessionIndex } = state;

    // Génère URL selon slug ou fallback ID
    const makeUrl = (si, ssi) => course.slug
        ? `/seance/${course.slug}/seq-${si+1}/seance-${ssi+1}`
        : `/session-detail?courseId=${course.id}&seqIndex=${si}&sessionIndex=${ssi}`;

    // Séance précédente
    let prevHref = null;
    if (sessionIndex > 0) {
        prevHref = makeUrl(seqIndex, sessionIndex - 1);
    } else if (seqIndex > 0) {
        const prevLen = sequences[seqIndex - 1]?.sessions?.length || 0;
        if (prevLen > 0) prevHref = makeUrl(seqIndex - 1, prevLen - 1);
    }
    setNavBtn(prevBtn, prevHref);

    // Séance suivante
    let nextHref = null;
    if (sessionIndex < sessions.length - 1) {
        nextHref = makeUrl(seqIndex, sessionIndex + 1);
    } else if (seqIndex < sequences.length - 1) {
        const nextLen = sequences[seqIndex + 1]?.sessions?.length || 0;
        if (nextLen > 0) nextHref = makeUrl(seqIndex + 1, 0);
    }
    setNavBtn(nextBtn, nextHref);
}

// Active ou désactive un bouton de nav proprement
function setNavBtn(btn, href) {
    if (href) {
        btn.href = href;
        btn.classList.remove('disabled');
    } else {
        btn.removeAttribute('href');
        btn.classList.add('disabled');
    }
}

// Redirige vers la page du cours en cas d'erreur de séquence/séance
function redirectToCourse() {
    alert('Séance introuvable');
    window.location.href = state.course.slug
        ? `/course/${state.course.slug}`
        : `/course-detail?id=${state.course.id}`;
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================
document.addEventListener('DOMContentLoaded', loadSession);
