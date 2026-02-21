// courses.js - PAGE PUBLIQUE DES COURS (élèves)
// Affiche les cours par diplôme, séquences et séances — SANS logique admin

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const db = getFirestore(app);

// Variables globales
let allCourses = [];
let currentDiploma = null;
let currentCourse = null;
let currentSequenceIndex = 0;
let currentSessionIndex = 0;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadAllCourses();
});

// ============================================
// CHARGER TOUS LES COURS
// ============================================
async function loadAllCourses() {
    showView('diplomaView');
    showLoading(true);

    try {
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        allCourses = [];
        snapshot.forEach(docSnap => {
            allCourses.push({ id: docSnap.id, ...docSnap.data() });
        });

        showLoading(false);
        renderDiplomaList();

    } catch (error) {
        console.error('Erreur chargement cours:', error);
        showLoading(false);
        showError('Impossible de charger les cours. Veuillez réessayer.');
    }
}

// ============================================
// AFFICHER LA LISTE DES DIPLÔMES
// ============================================
function renderDiplomaList() {
    const container = document.getElementById('diplomaList');
    if (!container) return;

    // Grouper les cours par diplôme
    const diplomaMap = {};
    allCourses.forEach(course => {
        const diploma = course.diploma || 'Autre';
        if (!diplomaMap[diploma]) diplomaMap[diploma] = [];
        diplomaMap[diploma].push(course);
    });

    if (Object.keys(diplomaMap).length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:#6b7280;">
                <i class="fas fa-inbox" style="font-size:3rem; margin-bottom:1rem; display:block;"></i>
                <p style="font-size:1.1rem;">Aucun cours disponible pour le moment.</p>
            </div>
        `;
        return;
    }

    const diplomaIcons = {
        'BAC PRO': { icon: 'fa-graduation-cap', color: '#3b82f6' },
        'BEP':     { icon: 'fa-certificate',    color: '#8b5cf6' },
        'CAP':     { icon: 'fa-award',           color: '#10b981' },
        'BTS':     { icon: 'fa-user-graduate',   color: '#f59e0b' },
        'LICENCE': { icon: 'fa-book-open',       color: '#ef4444' },
        'Autre':   { icon: 'fa-folder',          color: '#6b7280' }
    };

    const diplomaLabels = {
        'BAC PRO': 'Baccalauréat Professionnel',
        'BEP':     'Brevet d\'Études Professionnelles',
        'CAP':     'Certificat d\'Aptitude Professionnelle',
        'BTS':     'Brevet de Technicien Supérieur',
        'LICENCE': 'Licence Professionnelle',
        'Autre':   'Autres cours'
    };

    container.innerHTML = Object.entries(diplomaMap).map(([diploma, courses]) => {
        const info = diplomaIcons[diploma] || { icon: 'fa-folder', color: '#6b7280' };
        const label = diplomaLabels[diploma] || diploma;
        return `
            <div class="diploma-card" onclick="showCoursesByDiploma('${escapeHtml(diploma)}')"
                style="display:flex; align-items:center; justify-content:space-between;
                       background:white; border:1px solid #e5e7eb; border-radius:12px;
                       padding:1.25rem 1.5rem; margin-bottom:1rem; cursor:pointer;
                       transition:all 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.06);"
                onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'; this.style.transform='translateY(-2px)'"
                onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; this.style.transform='none'">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="width:50px; height:50px; border-radius:12px; background:${info.color};
                                display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas ${info.icon}" style="color:white; font-size:1.3rem;"></i>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:1.05rem; color:#1f2937;">${escapeHtml(diploma)}</div>
                        <div style="font-size:0.85rem; color:#6b7280;">${label} — ${courses.length} cours</div>
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color:#9ca3af;"></i>
            </div>
        `;
    }).join('');
}

// ============================================
// AFFICHER LES COURS D'UN DIPLÔME
// ============================================
window.showCoursesByDiploma = function(diploma) {
    currentDiploma = diploma;
    showView('courseListView');

    const title = document.getElementById('diplomaTitle');
    const container = document.getElementById('courseList');
    const backBtn = document.getElementById('backToDiplomas');

    if (title) title.textContent = `Cours — ${diploma}`;
    if (backBtn) {
        backBtn.onclick = () => {
            showView('diplomaView');
        };
    }

    const filtered = allCourses.filter(c => (c.diploma || 'Autre') === diploma);

    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#6b7280; padding:2rem;">Aucun cours dans cette catégorie.</p>`;
        return;
    }

    const levelColors = {
        'Débutant':      '#10b981',
        'Intermédiaire': '#f59e0b',
        'Avancé':        '#ef4444'
    };

    container.innerHTML = filtered.map(course => {
        const seqCount = course.sequences?.length || 0;
        let sessionCount = 0;
        course.sequences?.forEach(s => { sessionCount += s.sessions?.length || 0; });
        const levelColor = levelColors[course.level] || '#6b7280';

        return `
            <div onclick="openCourse('${course.id}')"
                style="background:white; border:1px solid #e5e7eb; border-radius:12px;
                       padding:1.25rem 1.5rem; margin-bottom:1rem; cursor:pointer;
                       transition:all 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.06);"
                onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'; this.style.transform='translateY(-2px)'"
                onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; this.style.transform='none'">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:1;">
                        <h3 style="margin:0 0 0.4rem 0; font-size:1.05rem; color:#1f2937;">${escapeHtml(course.title)}</h3>
                        ${course.description ? `<p style="margin:0 0 0.75rem 0; color:#6b7280; font-size:0.9rem;">${escapeHtml(course.description)}</p>` : ''}
                        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                            <span style="background:#dbeafe; color:#1e40af; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">
                                📚 ${seqCount} séquence${seqCount > 1 ? 's' : ''}
                            </span>
                            <span style="background:#f3f4f6; color:#374151; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem;">
                                🎯 ${sessionCount} séance${sessionCount > 1 ? 's' : ''}
                            </span>
                            ${course.level ? `<span style="background:${levelColor}22; color:${levelColor}; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.8rem; font-weight:600;">${escapeHtml(course.level)}</span>` : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#9ca3af; margin-left:1rem; margin-top:0.25rem;"></i>
                </div>
            </div>
        `;
    }).join('');
};

// ============================================
// OUVRIR UN COURS (vue séquences/séances)
// ============================================
window.openCourse = function(courseId) {
    currentCourse = allCourses.find(c => c.id === courseId);
    if (!currentCourse) return;

    currentSequenceIndex = 0;
    currentSessionIndex = 0;

    showView('courseContentView');
    renderCourseContent();
};

function renderCourseContent() {
    if (!currentCourse) return;

    const course = currentCourse;
    const sequences = course.sequences || [];

    // Titre du cours
    const titleEl = document.getElementById('courseContentTitle');
    if (titleEl) titleEl.textContent = course.title;

    // Bouton retour
    const backBtn = document.getElementById('backToCourseList');
    if (backBtn) {
        backBtn.onclick = () => showCoursesByDiploma(currentDiploma);
    }

    // Sidebar des séquences
    const sidebar = document.getElementById('sequenceSidebar');
    if (sidebar) {
        if (sequences.length === 0) {
            sidebar.innerHTML = `<p style="color:#6b7280; font-size:0.9rem; padding:1rem;">Aucune séquence.</p>`;
        } else {
            sidebar.innerHTML = sequences.map((seq, seqIdx) => `
                <div style="margin-bottom:0.5rem;">
                    <div style="font-weight:700; color:#1e40af; font-size:0.85rem; padding:0.5rem 0.75rem;
                                background:#eff6ff; border-radius:6px; margin-bottom:0.25rem;">
                        📁 ${escapeHtml(seq.title || `Séquence ${seqIdx + 1}`)}
                    </div>
                    ${(seq.sessions || []).map((session, sessIdx) => `
                        <div onclick="goToSession(${seqIdx}, ${sessIdx})"
                            id="nav-${seqIdx}-${sessIdx}"
                            style="padding:0.4rem 0.75rem 0.4rem 1.25rem; border-radius:6px; cursor:pointer;
                                   font-size:0.875rem; color:#374151; transition:all 0.15s;
                                   ${seqIdx === currentSequenceIndex && sessIdx === currentSessionIndex ? 'background:#dbeafe; color:#1e40af; font-weight:600;' : ''}"
                            onmouseover="if(!(${seqIdx}===${currentSequenceIndex} && ${sessIdx}===${currentSessionIndex})) this.style.background='#f3f4f6'"
                            onmouseout="if(!(${seqIdx}===${currentSequenceIndex} && ${sessIdx}===${currentSessionIndex})) this.style.background='transparent'">
                            📄 ${escapeHtml(session.title || `Séance ${sessIdx + 1}`)}
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }
    }

    // Afficher la séance courante
    renderSession();
}

// ============================================
// AFFICHER UNE SÉANCE
// ============================================
function renderSession() {
    const sequences = currentCourse?.sequences || [];
    const seq = sequences[currentSequenceIndex];
    const session = seq?.sessions?.[currentSessionIndex];

    const contentEl = document.getElementById('sessionContent');
    const sessionTitleEl = document.getElementById('sessionTitle');
    const seqTitleEl = document.getElementById('sequenceTitle');

    if (seqTitleEl) seqTitleEl.textContent = seq?.title || `Séquence ${currentSequenceIndex + 1}`;
    if (sessionTitleEl) sessionTitleEl.textContent = session?.title || `Séance ${currentSessionIndex + 1}`;

    if (!session) {
        if (contentEl) contentEl.innerHTML = `<p style="color:#6b7280; text-align:center; padding:3rem;">Séance introuvable.</p>`;
        return;
    }

    // Contenu HTML de la séance
    let html = '';
    if (session.content) {
        html += `<div class="session-html-content">${session.content}</div>`;
    } else {
        html += `<p style="color:#6b7280; font-style:italic;">Aucun contenu pour cette séance.</p>`;
    }

    // Bouton PDF si disponible
    if (session.pdfUrl) {
        html += `
            <div style="margin-top:2rem; padding:1.25rem; background:#f0f9ff; border:1px solid #bae6fd;
                        border-radius:10px; display:flex; align-items:center; gap:1rem;">
                <i class="fas fa-file-pdf" style="font-size:2rem; color:#ef4444;"></i>
                <div>
                    <div style="font-weight:700; color:#1f2937; margin-bottom:0.25rem;">Document PDF disponible</div>
                    <a href="${escapeHtml(session.pdfUrl)}" target="_blank"
                       style="display:inline-block; background:#1e40af; color:white; padding:0.5rem 1.25rem;
                              border-radius:6px; text-decoration:none; font-weight:600; font-size:0.9rem;">
                        <i class="fas fa-download"></i> Télécharger le PDF
                    </a>
                </div>
            </div>
        `;
    }

    if (contentEl) contentEl.innerHTML = html;

    // Navigation prev/next
    updateNavButtons();

    // Mettre à jour la sidebar
    updateSidebarHighlight();
}

// ============================================
// NAVIGATION ENTRE SÉANCES
// ============================================
window.goToSession = function(seqIdx, sessIdx) {
    currentSequenceIndex = seqIdx;
    currentSessionIndex = sessIdx;
    renderSession();
};

window.prevSession = function() {
    const sequences = currentCourse?.sequences || [];
    if (currentSessionIndex > 0) {
        currentSessionIndex--;
    } else if (currentSequenceIndex > 0) {
        currentSequenceIndex--;
        currentSessionIndex = (sequences[currentSequenceIndex]?.sessions?.length || 1) - 1;
    }
    renderSession();
};

window.nextSession = function() {
    const sequences = currentCourse?.sequences || [];
    const currentSeqSessions = sequences[currentSequenceIndex]?.sessions?.length || 0;
    if (currentSessionIndex < currentSeqSessions - 1) {
        currentSessionIndex++;
    } else if (currentSequenceIndex < sequences.length - 1) {
        currentSequenceIndex++;
        currentSessionIndex = 0;
    }
    renderSession();
};

function updateNavButtons() {
    const sequences = currentCourse?.sequences || [];
    const prevBtn = document.getElementById('prevSessionBtn');
    const nextBtn = document.getElementById('nextSessionBtn');

    const isFirst = currentSequenceIndex === 0 && currentSessionIndex === 0;
    const lastSeqIdx = sequences.length - 1;
    const lastSessIdx = (sequences[lastSeqIdx]?.sessions?.length || 1) - 1;
    const isLast = currentSequenceIndex === lastSeqIdx && currentSessionIndex === lastSessIdx;

    if (prevBtn) prevBtn.disabled = isFirst;
    if (nextBtn) nextBtn.disabled = isLast;
}

function updateSidebarHighlight() {
    // Retirer tous les highlights
    document.querySelectorAll('[id^="nav-"]').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = '#374151';
        el.style.fontWeight = 'normal';
    });
    // Ajouter le highlight actif
    const active = document.getElementById(`nav-${currentSequenceIndex}-${currentSessionIndex}`);
    if (active) {
        active.style.background = '#dbeafe';
        active.style.color = '#1e40af';
        active.style.fontWeight = '600';
    }
}

// ============================================
// GESTION DES VUES
// ============================================
function showView(viewId) {
    const views = ['diplomaView', 'courseListView', 'courseContentView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? 'block' : 'none';
    });
}

function showLoading(visible) {
    const el = document.getElementById('loadingSpinner');
    if (el) el.style.display = visible ? 'flex' : 'none';
}

function showError(message) {
    const container = document.getElementById('diplomaList');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:#ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size:3rem; margin-bottom:1rem; display:block;"></i>
                <p>${escapeHtml(message)}</p>
                <button onclick="loadAllCourses()" style="margin-top:1rem; background:#1e40af; color:white;
                        border:none; padding:0.75rem 1.5rem; border-radius:8px; cursor:pointer; font-weight:600;">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}

// ============================================
// UTILITAIRE
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}