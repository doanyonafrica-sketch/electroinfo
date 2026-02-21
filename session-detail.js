// session-detail.js
// Affiche le contenu d'une séance en pleine page
// Paramètres URL : courseId, seqIndex, sessionIndex

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ── Variables globales ──
let currentCourse   = null;
let currentSeqIdx   = 0;
let currentSessIdx  = 0;

// ============================================
// AUTH — navbar
// ============================================
onAuthStateChanged(auth, (user) => {
    const loginBtn   = document.getElementById('loginBtn');
    const userMenu   = document.getElementById('userMenu');
    const userName   = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (user) {
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');
        const name = user.displayName || user.email.split('@')[0];
        if (userName)   userName.textContent = name;
        if (userAvatar) userAvatar.src = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff`;
    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});

document.getElementById('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    if (dd && !dd.contains(e.target) && e.target !== document.getElementById('userMenuToggle')) {
        dd.classList.add('hidden');
    }
});

document.getElementById('mobileToggle')?.addEventListener('click', () => {
    document.getElementById('navMenu')?.classList.toggle('active');
});

// ============================================
// RÉCUPÉRER LES PARAMÈTRES URL
// ============================================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        courseId:     params.get('courseId'),
        seqIndex:     parseInt(params.get('seqIndex')     || '0', 10),
        sessionIndex: parseInt(params.get('sessionIndex') || '0', 10)
    };
}

// ============================================
// CHARGER LE COURS
// ============================================
async function loadCourse() {
    const { courseId, seqIndex, sessionIndex } = getUrlParams();

    if (!courseId) {
        showError('Paramètre courseId manquant dans l\'URL.');
        return;
    }

    try {
        const docRef  = doc(db, 'courses', courseId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            showError('Ce cours est introuvable ou a été supprimé.');
            return;
        }

        currentCourse  = { id: docSnap.id, ...docSnap.data() };
        currentSeqIdx  = seqIndex;
        currentSessIdx = sessionIndex;

        renderPage();

    } catch (err) {
        console.error('Erreur chargement cours:', err);
        showError('Impossible de charger le cours. Vérifiez votre connexion.');
    }
}

// ============================================
// RENDRE LA PAGE
// ============================================
function renderPage() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('sessionPage').style.display  = 'block';

    // Titre onglet navigateur
    const sess = getCurrentSession();
    if (sess) document.title = `${sess.title || 'Séance'} | ElectroInfo`;

    // Lien retour vers course-detail
    const backLink = document.getElementById('backToCourse');
    if (backLink) backLink.href = `course-detail.html?id=${currentCourse.id}`;

    renderSidebar();
    renderSessionContent();
}

// ============================================
// SIDEBAR
// ============================================
function renderSidebar() {
    const sidebar = document.getElementById('sidebarNav');
    if (!sidebar) return;

    const sequences = currentCourse.sequences || [];

    if (sequences.length === 0) {
        sidebar.innerHTML = '<p style="color:#9ca3af; font-size:0.85rem; padding:0.5rem;">Aucune séquence.</p>';
        return;
    }

    sidebar.innerHTML = sequences.map((seq, si) => `
        <div class="sidebar-seq-title">${escapeHtml(seq.title || `Séquence ${si + 1}`)}</div>
        ${(seq.sessions || []).map((sess, ssi) => `
            <a onclick="goToSession(${si}, ${ssi}); return false;" href="#"
               class="sidebar-session-link ${si === currentSeqIdx && ssi === currentSessIdx ? 'active' : ''}"
               id="nav-link-${si}-${ssi}">
                <i class="fas fa-file-alt" style="font-size:0.75rem; flex-shrink:0;"></i>
                ${escapeHtml(sess.title || `Séance ${ssi + 1}`)}
            </a>
        `).join('')}
    `).join('');
}

// ============================================
// CONTENU DE LA SÉANCE
// ============================================
function renderSessionContent() {
    const sequences = currentCourse.sequences || [];
    const seq  = sequences[currentSeqIdx];
    const sess = seq?.sessions?.[currentSessIdx];

    // Fil d'Ariane
    setText('breadCourseTitle', currentCourse.title || 'Cours');
    setText('breadSeqTitle',    seq?.title  || `Séquence ${currentSeqIdx + 1}`);
    setText('breadSessTitle',   sess?.title || `Séance ${currentSessIdx + 1}`);

    // Titre principal
    setText('sessionMainTitle',    sess?.title || `Séance ${currentSessIdx + 1}`);
    setText('sessionContentTitle', sess?.title || `Séance ${currentSessIdx + 1}`);

    // Badge séquence
    const badge = document.getElementById('sessionBadge');
    if (badge) badge.textContent = seq?.title || `Séquence ${currentSeqIdx + 1}`;

    // Contenu HTML
    const contentEl = document.getElementById('sessionHtmlContent');
    if (contentEl) {
        if (sess?.content) {
            contentEl.innerHTML = sess.content;
        } else {
            contentEl.innerHTML = `
                <div style="text-align:center; padding:3rem; color:#9ca3af;">
                    <i class="fas fa-inbox" style="font-size:3rem; margin-bottom:1rem; display:block;"></i>
                    <p>Aucun contenu disponible pour cette séance.</p>
                </div>
            `;
        }
    }

    // PDF
    const pdfSection = document.getElementById('pdfSection');
    const pdfLink    = document.getElementById('pdfLink');
    if (sess?.pdfUrl) {
        pdfSection.style.display = 'flex';
        pdfLink.href = sess.pdfUrl;
    } else {
        pdfSection.style.display = 'none';
    }

    // Navigation prev/next
    updateNavButtons();

    // Mettre à jour sidebar highlight
    updateSidebarHighlight();

    // Scroll haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// NAVIGATION PRÉCÉDENT / SUIVANT
// ============================================
window.navigate = function(direction) {
    const sequences = currentCourse?.sequences || [];

    if (direction === -1) {
        // Précédent
        if (currentSessIdx > 0) {
            currentSessIdx--;
        } else if (currentSeqIdx > 0) {
            currentSeqIdx--;
            currentSessIdx = (sequences[currentSeqIdx]?.sessions?.length || 1) - 1;
        }
    } else {
        // Suivant
        const sessLen = sequences[currentSeqIdx]?.sessions?.length || 0;
        if (currentSessIdx < sessLen - 1) {
            currentSessIdx++;
        } else if (currentSeqIdx < sequences.length - 1) {
            currentSeqIdx++;
            currentSessIdx = 0;
        }
    }

    // Mettre à jour l'URL sans recharger
    const url = new URL(window.location.href);
    url.searchParams.set('seqIndex',     currentSeqIdx);
    url.searchParams.set('sessionIndex', currentSessIdx);
    window.history.pushState({}, '', url);

    renderSessionContent();
};

window.goToSession = function(si, ssi) {
    currentSeqIdx  = si;
    currentSessIdx = ssi;

    const url = new URL(window.location.href);
    url.searchParams.set('seqIndex',     si);
    url.searchParams.set('sessionIndex', ssi);
    window.history.pushState({}, '', url);

    renderSessionContent();
};

// ============================================
// METTRE À JOUR LES BOUTONS NAV
// ============================================
function updateNavButtons() {
    const sequences = currentCourse?.sequences || [];
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const navInfo = document.getElementById('navInfo');

    const isFirst = currentSeqIdx === 0 && currentSessIdx === 0;
    const lastSi  = sequences.length - 1;
    const lastSsi = (sequences[lastSi]?.sessions?.length || 1) - 1;
    const isLast  = currentSeqIdx === lastSi && currentSessIdx === lastSsi;

    if (prevBtn) prevBtn.disabled = isFirst;
    if (nextBtn) nextBtn.disabled = isLast;

    // Info "Séance X / Y"
    if (navInfo) {
        let totalSessions = 0;
        let currentTotal  = 0;
        sequences.forEach((seq, si) => {
            const sessCount = seq.sessions?.length || 0;
            if (si < currentSeqIdx) currentTotal += sessCount;
            else if (si === currentSeqIdx) currentTotal += currentSessIdx + 1;
            totalSessions += sessCount;
        });
        navInfo.textContent = `Séance ${currentTotal} / ${totalSessions}`;
    }
}

// ============================================
// METTRE À JOUR LE HIGHLIGHT SIDEBAR
// ============================================
function updateSidebarHighlight() {
    document.querySelectorAll('.sidebar-session-link').forEach(el => {
        el.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-link-${currentSeqIdx}-${currentSessIdx}`);
    if (activeLink) activeLink.classList.add('active');
}

// ============================================
// UTILITAIRES
// ============================================
function getCurrentSession() {
    return currentCourse?.sequences?.[currentSeqIdx]?.sessions?.[currentSessIdx] || null;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(msg) {
    document.getElementById('loadingState').innerHTML = `
        <div style="text-align:center; padding:5rem 1rem; color:#6b7280;">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:#ef4444; margin-bottom:1rem; display:block;"></i>
            <h2 style="color:#1f2937; margin-bottom:0.75rem;">Erreur</h2>
            <p>${msg}</p>
            <a href="courses.html" style="display:inline-flex; align-items:center; gap:0.5rem; margin-top:1.5rem;
               background:#1e40af; color:white; padding:0.75rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:600;">
                <i class="fas fa-arrow-left"></i> Retour aux cours
            </a>
        </div>
    `;
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCourse();
});
