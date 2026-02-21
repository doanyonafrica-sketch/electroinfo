// courses.js - PAGE PUBLIQUE DES COURS (élèves)
// Adapté exactement à la structure de courses.html

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy
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
const auth = getAuth(app);

// Variables globales
let allCourses = [];
let currentDiploma = null;

// ============================================
// GESTION AUTHENTIFICATION (navbar)
// ============================================
onAuthStateChanged(auth, (user) => {
    const loginBtn   = document.getElementById('loginBtn');
    const userMenu   = document.getElementById('userMenu');
    const userName   = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (user) {
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');
        if (userName)   userName.textContent = user.displayName || user.email.split('@')[0];
        if (userAvatar) userAvatar.src = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=1e40af&color=fff`;
    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
});

document.getElementById('mobileToggle')?.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.toggle('open');
});

document.getElementById('userMenuToggle')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.toggle('hidden');
});

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllCourses();
    setupDiplomaCards();
    setupBackButton();
});

// ============================================
// CHARGER TOUS LES COURS DEPUIS FIREBASE
// ============================================
async function loadAllCourses() {
    try {
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        allCourses = [];
        snapshot.forEach(docSnap => {
            allCourses.push({ id: docSnap.id, ...docSnap.data() });
        });
    } catch (error) {
        console.error('Erreur chargement cours:', error);
        allCourses = [];
    }
}

// ============================================
// CONFIGURER LES BOUTONS DIPLÔME
// ============================================
function setupDiplomaCards() {
    document.querySelectorAll('.diploma-card').forEach(card => {
        card.addEventListener('click', () => {
            const diploma = card.dataset.diploma;
            showCoursesByDiploma(diploma);
        });
    });

    document.querySelector('.back-btn-empty')?.addEventListener('click', () => {
        showView('view-home');
    });
}

function setupBackButton() {
    document.getElementById('backToHome')?.addEventListener('click', () => {
        showView('view-home');
    });
}

// ============================================
// AFFICHER LES COURS D'UN DIPLÔME
// ============================================
function showCoursesByDiploma(diploma) {
    currentDiploma = diploma;
    showView('view-courses');

    const titleEl = document.getElementById('coursesViewTitle');
    if (titleEl) {
        const labels = {
            'all':     '📚 Tous les cours',
            'BAC PRO': '🎓 BAC PRO',
            'BEP':     '📘 BEP',
            'CAP':     '🏅 CAP',
            'BTS':     '🎓 BTS',
            'LICENCE': '🏛️ Licence'
        };
        titleEl.textContent = labels[diploma] || diploma;
    }

    const filtered = diploma === 'all'
        ? allCourses
        : allCourses.filter(c => (c.diploma || '') === diploma);

    renderCoursesList(filtered);
}

// ============================================
// AFFICHER LA LISTE DES COURS
// ============================================
function renderCoursesList(courses) {
    const grid    = document.getElementById('coursesGrid');
    const loading = document.getElementById('coursesLoading');
    const empty   = document.getElementById('noCourses');

    if (!grid) return;

    loading?.classList.add('hidden');

    if (courses.length === 0) {
        grid.classList.add('hidden');
        empty?.classList.remove('hidden');
        return;
    }

    empty?.classList.add('hidden');
    grid.classList.remove('hidden');

    const levelColors = {
        'Débutant':      { bg: '#d1fae5', text: '#065f46' },
        'Intermédiaire': { bg: '#fef3c7', text: '#92400e' },
        'Avancé':        { bg: '#fee2e2', text: '#991b1b' }
    };

    grid.innerHTML = courses.map(course => {
        const seqCount = course.sequences?.length || 0;
        let sessionCount = 0;
        course.sequences?.forEach(s => { sessionCount += s.sessions?.length || 0; });
        const lvl = levelColors[course.level] || { bg: '#f3f4f6', text: '#374151' };

        return `
            <div class="course-card" onclick="openCourseModal('${course.id}')" style="cursor:pointer;">
                <div class="course-card-header">
                    <h3 class="course-card-title">${escapeHtml(course.title)}</h3>
                    ${course.level ? `<span class="course-level-badge" style="background:${lvl.bg}; color:${lvl.text}; padding:0.2rem 0.7rem; border-radius:20px; font-size:0.8rem; font-weight:600;">${escapeHtml(course.level)}</span>` : ''}
                </div>
                ${course.description ? `<p class="course-card-desc">${escapeHtml(course.description)}</p>` : ''}
                <div class="course-card-meta">
                    <span><i class="fas fa-layer-group"></i> ${seqCount} séquence${seqCount > 1 ? 's' : ''}</span>
                    <span><i class="fas fa-file-alt"></i> ${sessionCount} séance${sessionCount > 1 ? 's' : ''}</span>
                </div>
                <button class="btn btn-primary" style="width:100%; margin-top:1rem;">
                    <i class="fas fa-book-open"></i> Ouvrir le cours
                </button>
            </div>
        `;
    }).join('');
}

// ============================================
// OUVRIR UN COURS EN MODAL
// ============================================
window.openCourseModal = function(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('courseModal')?.remove();

    const sequences = course.sequences || [];
    let currentSeqIdx = 0;
    let currentSessIdx = 0;

    window.goModalSession = function(si, ssi) {
        currentSeqIdx = si;
        currentSessIdx = ssi;
        renderModalContent();
    };

    window.modalPrev = function() {
        if (currentSessIdx > 0) {
            currentSessIdx--;
        } else if (currentSeqIdx > 0) {
            currentSeqIdx--;
            currentSessIdx = (sequences[currentSeqIdx]?.sessions?.length || 1) - 1;
        }
        renderModalContent();
    };

    window.modalNext = function() {
        const sessLen = sequences[currentSeqIdx]?.sessions?.length || 0;
        if (currentSessIdx < sessLen - 1) {
            currentSessIdx++;
        } else if (currentSeqIdx < sequences.length - 1) {
            currentSeqIdx++;
            currentSessIdx = 0;
        }
        renderModalContent();
    };

    function renderModalContent() {
        const seq  = sequences[currentSeqIdx];
        const sess = seq?.sessions?.[currentSessIdx];

        // Sidebar
        const sidebar = document.getElementById('modalSidebar');
        if (sidebar) {
            sidebar.innerHTML = sequences.map((s, si) => `
                <div style="margin-bottom:0.75rem;">
                    <div style="font-size:0.78rem; font-weight:700; color:#1e40af; padding:0.4rem 0.6rem;
                                background:#eff6ff; border-radius:6px; margin-bottom:0.25rem; text-transform:uppercase; letter-spacing:0.5px;">
                        ${escapeHtml(s.title || `Séquence ${si + 1}`)}
                    </div>
                    ${(s.sessions || []).map((ss, ssi) => `
                        <div onclick="goModalSession(${si},${ssi})"
                            style="padding:0.4rem 0.6rem 0.4rem 1rem; border-radius:6px; cursor:pointer; font-size:0.875rem;
                                   transition:background 0.15s;
                                   background:${si===currentSeqIdx&&ssi===currentSessIdx?'#dbeafe':'transparent'};
                                   color:${si===currentSeqIdx&&ssi===currentSessIdx?'#1e40af':'#374151'};
                                   font-weight:${si===currentSeqIdx&&ssi===currentSessIdx?'600':'normal'};"
                            onmouseover="if(!(${si}===${currentSeqIdx}&&${ssi}===${currentSessIdx}))this.style.background='#f3f4f6'"
                            onmouseout="if(!(${si}===${currentSeqIdx}&&${ssi}===${currentSessIdx}))this.style.background='transparent'">
                            📄 ${escapeHtml(ss.title || `Séance ${ssi + 1}`)}
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        // Titres
        const seqTitle  = document.getElementById('modalSeqTitle');
        const sessTitle = document.getElementById('modalSessTitle');
        if (seqTitle)  seqTitle.textContent  = seq?.title  || `Séquence ${currentSeqIdx + 1}`;
        if (sessTitle) sessTitle.textContent = sess?.title || `Séance ${currentSessIdx + 1}`;

        // Contenu
        const contentEl = document.getElementById('modalSessionContent');
        if (contentEl) {
            let html = sess?.content
                ? `<div style="font-family:Arial,sans-serif; line-height:1.7; color:#333;">${sess.content}</div>`
                : `<p style="color:#9ca3af; font-style:italic; text-align:center; padding:3rem;">Aucun contenu pour cette séance.</p>`;

            if (sess?.pdfUrl) {
                html += `
                    <div style="margin-top:2rem; padding:1.25rem; background:#f0f9ff; border:1px solid #bae6fd;
                                border-radius:10px; display:flex; align-items:center; gap:1rem;">
                        <i class="fas fa-file-pdf" style="font-size:2.2rem; color:#ef4444; flex-shrink:0;"></i>
                        <div>
                            <div style="font-weight:700; margin-bottom:0.4rem; color:#1f2937;">Document PDF disponible</div>
                            <a href="${escapeHtml(sess.pdfUrl)}" target="_blank"
                               style="display:inline-flex; align-items:center; gap:0.5rem; background:#1e40af; color:white;
                                      padding:0.5rem 1.25rem; border-radius:6px; text-decoration:none; font-weight:600; font-size:0.9rem;">
                                <i class="fas fa-download"></i> Télécharger le PDF
                            </a>
                        </div>
                    </div>`;
            }
            contentEl.innerHTML = html;
        }

        // Boutons nav
        const prevBtn = document.getElementById('modalPrevBtn');
        const nextBtn = document.getElementById('modalNextBtn');
        const isFirst = currentSeqIdx === 0 && currentSessIdx === 0;
        const lastSi  = sequences.length - 1;
        const lastSsi = (sequences[lastSi]?.sessions?.length || 1) - 1;
        const isLast  = currentSeqIdx === lastSi && currentSessIdx === lastSsi;
        if (prevBtn) prevBtn.disabled = isFirst;
        if (nextBtn) nextBtn.disabled = isLast;
    }

    // Créer le modal
    const modal = document.createElement('div');
    modal.id = 'courseModal';
    modal.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);
        display:flex;align-items:flex-start;justify-content:center;padding:1rem;overflow-y:auto;`;

    modal.innerHTML = `
        <div style="background:white;border-radius:14px;width:100%;max-width:1100px;
                    margin:auto;display:flex;flex-direction:column;overflow:hidden;
                    box-shadow:0 20px 60px rgba(0,0,0,0.3);min-height:85vh;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;
                        padding:1.25rem 1.5rem;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div>
                    <div style="font-size:0.78rem;opacity:0.8;text-transform:uppercase;letter-spacing:1px;">
                        ${escapeHtml(course.diploma || '')} — ${escapeHtml(course.level || '')}
                    </div>
                    <h2 style="margin:0;font-size:1.2rem;">${escapeHtml(course.title)}</h2>
                </div>
                <button onclick="document.getElementById('courseModal').remove()"
                    style="background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;
                           border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Corps -->
            <div style="display:flex;flex:1;overflow:hidden;min-height:0;">

                <!-- Sidebar -->
                <div id="modalSidebar" style="width:250px;flex-shrink:0;background:#f9fafb;
                     border-right:1px solid #e5e7eb;padding:1rem;overflow-y:auto;"></div>

                <!-- Contenu -->
                <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">

                    <!-- Fil d'Ariane -->
                    <div style="padding:0.6rem 1.5rem;background:#f3f4f6;border-bottom:1px solid #e5e7eb;
                                font-size:0.85rem;color:#6b7280;flex-shrink:0;">
                        <span id="modalSeqTitle" style="font-weight:600;color:#374151;"></span>
                        <i class="fas fa-chevron-right" style="margin:0 0.4rem;font-size:0.7rem;"></i>
                        <span id="modalSessTitle" style="color:#1e40af;font-weight:600;"></span>
                    </div>

                    <!-- Contenu scrollable -->
                    <div id="modalSessionContent" style="flex:1;overflow-y:auto;padding:1.5rem;"></div>

                    <!-- Navigation -->
                    <div style="padding:0.875rem 1.5rem;border-top:1px solid #e5e7eb;
                                display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:white;">
                        <button id="modalPrevBtn" onclick="modalPrev()"
                            style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.25rem;
                                   background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;
                                   cursor:pointer;font-weight:600;color:#374151;">
                            <i class="fas fa-chevron-left"></i> Précédent
                        </button>
                        <button id="modalNextBtn" onclick="modalNext()"
                            style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.25rem;
                                   background:#1e40af;border:none;border-radius:8px;
                                   cursor:pointer;font-weight:600;color:white;">
                            Suivant <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); }
    });

    renderModalContent();
};

// ============================================
// GESTION DES VUES
// ============================================
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(viewId)?.classList.add('active-view');
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

console.log('✅ courses.js chargé — page publique élèves');