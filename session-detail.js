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
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');

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
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
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
        window.location.href = 'index.html';
    } catch (err) {
        console.error('Erreur déconnexion:', err);
        alert('Erreur lors de la déconnexion');
    }
});

// ============================================
// MENU MOBILE
// ============================================
const mobileToggle = $('mobileToggle');
const mobileMenu   = $('mobileMenu');

function closeMobileMenu() {
    mobileMenu?.classList.remove('active');
    const icon = mobileToggle?.querySelector('i');
    if (icon) icon.className = 'fas fa-bars';
}

if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileMenu.classList.toggle('active');
        mobileToggle.querySelector('i').className = isOpen ? 'fas fa-times' : 'fas fa-bars';
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
}

// ============================================
// PARAMÈTRES URL
// ============================================
function getUrlParams() {
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
    const { courseId, seqIndex, sessionIndex } = getUrlParams();

    if (!courseId) {
        alert('Cours introuvable');
        return (window.location.href = 'courses.html');
    }

    try {
        const docSnap = await getDoc(doc(db, 'courses', courseId));

        if (!docSnap.exists()) {
            alert('Cours introuvable');
            return (window.location.href = 'courses.html');
        }

        state.course       = { id: docSnap.id, ...docSnap.data() };
        state.seqIndex     = seqIndex;
        state.sessionIndex = sessionIndex;

        displaySession();
    } catch (err) {
        console.error('Erreur chargement séance:', err);
        alert('Erreur lors du chargement de la séance');
        window.location.href = 'courses.html';
    }
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
    $('sessionContent').innerHTML   = session.content || '<p>Aucun contenu disponible.</p>';
    $('backButton').href             = `course-detail.html?id=${state.course.id}`;

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
    const baseUrl = `session-detail.html?courseId=${course.id}`;

    // --- Séance précédente ---
    let prevHref = null;

    if (sessionIndex > 0) {
        prevHref = `${baseUrl}&seqIndex=${seqIndex}&sessionIndex=${sessionIndex - 1}`;
    } else if (seqIndex > 0) {
        const prevSeqSessions = sequences[seqIndex - 1]?.sessions || [];
        if (prevSeqSessions.length > 0) {
            prevHref = `${baseUrl}&seqIndex=${seqIndex - 1}&sessionIndex=${prevSeqSessions.length - 1}`;
        }
    }

    setNavBtn(prevBtn, prevHref);

    // --- Séance suivante ---
    let nextHref = null;

    if (sessionIndex < sessions.length - 1) {
        nextHref = `${baseUrl}&seqIndex=${seqIndex}&sessionIndex=${sessionIndex + 1}`;
    } else if (seqIndex < sequences.length - 1) {
        const nextSeqSessions = sequences[seqIndex + 1]?.sessions || [];
        if (nextSeqSessions.length > 0) {
            nextHref = `${baseUrl}&seqIndex=${seqIndex + 1}&sessionIndex=0`;
        }
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
    window.location.href = `course-detail.html?id=${state.course.id}`;
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================
document.addEventListener('DOMContentLoaded', loadSession);