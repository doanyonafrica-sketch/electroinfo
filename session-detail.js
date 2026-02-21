// session-detail.js
// Page de lecture plein écran d'une séance
// URL params : courseId, seqIndex, sessionIndex

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

let course       = null;
let seqIdx       = 0;
let sessIdx      = 0;

// ── Params URL ──
function getParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        courseId: p.get('courseId'),
        seqIndex: parseInt(p.get('seqIndex')     || '0', 10),
        sessIndex: parseInt(p.get('sessionIndex') || '0', 10)
    };
}

// ── Auth navbar (minimal) ──
onAuthStateChanged(auth, () => {});

// ── Chargement principal ──
async function init() {
    const { courseId, seqIndex, sessIndex } = getParams();
    seqIdx  = seqIndex;
    sessIdx = sessIndex;

    if (!courseId) { showError('Aucun cours spécifié dans l\'URL.'); return; }

    try {
        const snap = await getDoc(doc(db, 'courses', courseId));
        if (!snap.exists()) { showError('Cours introuvable.'); return; }
        course = { id: snap.id, ...snap.data() };
        render();
    } catch (e) {
        console.error(e);
        showError('Erreur de connexion. Vérifiez votre réseau.');
    }
}

// ── Render complet ──
function render() {
    // Cacher loading
    document.getElementById('loading-screen').style.display = 'none';

    // Topbar nom du cours
    const tbName = document.getElementById('tbCourseName');
    if (tbName) tbName.innerHTML = `<strong>${esc(course.title)}</strong>`;

    // Lien retour
    const backLink = document.getElementById('backLink');
    if (backLink) backLink.href = `course-detail.html?id=${course.id}`;

    buildSidebar();
    renderSession();
}

// ── Construire la sidebar ──
function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    const sequences = course.sequences || [];

    nav.innerHTML = sequences.map((seq, si) => `
        <div class="seq-block">
            <div class="seq-title-row">
                <i class="fas fa-folder"></i>
                ${esc(seq.title || `Séquence ${si + 1}`)}
            </div>
            ${(seq.sessions || []).map((sess, ssi) => `
                <div class="sess-item ${si === seqIdx && ssi === sessIdx ? 'active' : ''}"
                     id="nav-${si}-${ssi}"
                     onclick="goTo(${si}, ${ssi})">
                    <div class="sess-icon">
                        <i class="fas fa-${si === seqIdx && ssi === sessIdx ? 'play' : 'file-alt'}"></i>
                    </div>
                    <div class="sess-text">
                        <div class="sess-num">Séance ${ssi + 1}</div>
                        <div class="sess-name">${esc(sess.title || `Séance ${ssi + 1}`)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ── Afficher la séance courante ──
function renderSession() {
    const sequences = course.sequences || [];
    const seq  = sequences[seqIdx];
    const sess = seq?.sessions?.[sessIdx];

    // Titre onglet
    document.title = `${sess?.title || 'Séance'} | ElectroInfo`;

    // Bandeau
    setText('bandSeq',   seq?.title  || `Séquence ${seqIdx + 1}`);
    setText('bandTitle', sess?.title || `Séance ${sessIdx + 1}`);

    // Contenu HTML
    const contentEl = document.getElementById('session-content');
    if (contentEl) {
        contentEl.innerHTML = sess?.content
            ? sess.content
            : `<div style="text-align:center;padding:4rem;color:#94a3b8;">
                   <i class="fas fa-inbox" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
                   <p style="font-size:1rem;">Aucun contenu disponible pour cette séance.</p>
               </div>`;
    }

    // PDF
    const pdfBlock = document.getElementById('pdf-block');
    const pdfLink  = document.getElementById('pdfLink');
    if (sess?.pdfUrl) {
        pdfBlock.style.display = 'flex';
        pdfLink.href = sess.pdfUrl;
    } else {
        pdfBlock.style.display = 'none';
    }

    // Barre de navigation
    updateNav();

    // Sidebar highlight
    updateSidebarHighlight();

    // Scroll haut du reader
    const reader = document.getElementById('reader');
    if (reader) reader.scrollTop = 0;
}

// ── Navigation Précédent / Suivant ──
function updateNav() {
    const sequences = course.sequences || [];

    // Compter position globale
    let total = 0, current = 0;
    sequences.forEach((seq, si) => {
        const len = seq.sessions?.length || 0;
        for (let ssi = 0; ssi < len; ssi++) {
            total++;
            if (si < seqIdx || (si === seqIdx && ssi <= sessIdx)) current = total;
        }
    });

    const isFirst = seqIdx === 0 && sessIdx === 0;
    const lastSi  = sequences.length - 1;
    const lastSsi = (sequences[lastSi]?.sessions?.length || 1) - 1;
    const isLast  = seqIdx === lastSi && sessIdx === lastSsi;

    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if (prev) prev.disabled = isFirst;
    if (next) next.disabled = isLast;

    // Compteur
    const sess = course.sequences?.[seqIdx]?.sessions?.[sessIdx];
    setText('navTitle',   sess?.title || `Séance ${sessIdx + 1}`);
    setText('navCounter', `${current} / ${total}`);

    // Barre de progression topbar
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}%`;
}

window.navigate = function(dir) {
    const sequences = course.sequences || [];

    if (dir === -1) {
        if (sessIdx > 0) { sessIdx--; }
        else if (seqIdx > 0) { seqIdx--; sessIdx = (sequences[seqIdx]?.sessions?.length || 1) - 1; }
    } else {
        const len = sequences[seqIdx]?.sessions?.length || 0;
        if (sessIdx < len - 1) { sessIdx++; }
        else if (seqIdx < sequences.length - 1) { seqIdx++; sessIdx = 0; }
    }

    // Mettre à jour URL sans rechargement
    const url = new URL(window.location.href);
    url.searchParams.set('seqIndex',     seqIdx);
    url.searchParams.set('sessionIndex', sessIdx);
    window.history.pushState({}, '', url);

    renderSession();
};

window.goTo = function(si, ssi) {
    seqIdx  = si;
    sessIdx = ssi;

    const url = new URL(window.location.href);
    url.searchParams.set('seqIndex',     si);
    url.searchParams.set('sessionIndex', ssi);
    window.history.pushState({}, '', url);

    renderSession();
};

function updateSidebarHighlight() {
    document.querySelectorAll('.sess-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sess-icon i').forEach(el => {
        el.className = 'fas fa-file-alt';
    });

    const active = document.getElementById(`nav-${seqIdx}-${sessIdx}`);
    if (active) {
        active.classList.add('active');
        const icon = active.querySelector('.sess-icon i');
        if (icon) icon.className = 'fas fa-play';

        // Auto-scroll sidebar vers l'élément actif
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// ── Erreur ──
function showError(msg) {
    document.getElementById('loading-screen').innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i>
        <p style="font-size:1rem;font-weight:600;">${msg}</p>
        <a href="courses.html" style="margin-top:1rem;padding:0.6rem 1.5rem;background:#1d4ed8;color:white;
           border-radius:7px;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:0.5rem;">
            <i class="fas fa-arrow-left"></i> Retour aux cours
        </a>
    `;
}

// ── Utilitaires ──
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ── Démarrage ──
document.addEventListener('DOMContentLoaded', init);
