// courses.js — Fichier unique gérant toute la logique des cours
// Remplace : course-detail.js + session-detail.js
// Pages : courses.html uniquement (course-detail.html et session-detail.html supprimés)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// ============================================
// VARIABLES GLOBALES
// ============================================
let allCourses     = [];
let currentDiploma = null;

// ============================================
// AUTHENTIFICATION — NAVBAR
// ============================================
onAuthStateChanged(auth, async (user) => {
    const loginBtn   = document.getElementById('loginBtn');
    const userMenu   = document.getElementById('userMenu');
    const adminLink  = document.getElementById('adminLink');
    const adminDiv   = document.getElementById('adminDivider');

    if (user) {
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');

        const displayName = user.displayName || user.email.split('@')[0];
        const avatarUrl   = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e40af&color=fff`;

        setEl('userName',           displayName);
        setEl('userNameDropdown',   displayName);
        setEl('userEmailDropdown',  user.email);
        setAttr('userAvatar',          'src', avatarUrl);
        setAttr('userAvatarDropdown',  'src', avatarUrl);

        // Vérification admin
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                adminLink?.classList.remove('hidden');
                adminDiv?.classList.remove('hidden');
            }
        } catch (e) { /* silencieux */ }

    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        adminLink?.classList.add('hidden');
        adminDiv?.classList.add('hidden');
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
});

document.getElementById('mobileToggle')?.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.toggle('open');
});

document.getElementById('userMenuToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dd     = document.getElementById('userDropdown');
    const toggle = document.getElementById('userMenuToggle');
    if (dd && !dd.contains(e.target) && e.target !== toggle) dd.classList.add('hidden');
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
// CHARGER TOUS LES COURS
// ============================================
async function loadAllCourses() {
    try {
        const q        = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        allCourses = [];
        snapshot.forEach(d => allCourses.push({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('Erreur chargement cours:', e);
        allCourses = [];
    }
}

// ============================================
// BOUTONS DIPLÔME
// ============================================
function setupDiplomaCards() {
    document.querySelectorAll('.diploma-card').forEach(card => {
        card.addEventListener('click', () => showCoursesByDiploma(card.dataset.diploma));
    });
    document.querySelector('.back-btn-empty')?.addEventListener('click', () => showView('view-home'));
}

function setupBackButton() {
    document.getElementById('backToHome')?.addEventListener('click', () => showView('view-home'));
}

// ============================================
// AFFICHER LES COURS D'UN DIPLÔME
// ============================================
function showCoursesByDiploma(diploma) {
    currentDiploma = diploma;
    showView('view-courses');

    const labels = {
        'all':     '📚 Tous les cours',
        'BAC PRO': '🎓 BAC PRO',
        'BEP':     '📘 BEP',
        'CAP':     '🏅 CAP',
        'BTS':     '🎓 BTS',
        'LICENCE': '🏛️ Licence'
    };
    setEl('coursesViewTitle', labels[diploma] || diploma);

    const filtered = diploma === 'all'
        ? allCourses
        : allCourses.filter(c => (c.diploma || '') === diploma);

    renderCoursesList(filtered);
}

// ============================================
// LISTE DES COURS
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
        let   sessCount = 0;
        course.sequences?.forEach(s => { sessCount += s.sessions?.length || 0; });
        const lvl = levelColors[course.level] || { bg: '#f3f4f6', text: '#374151' };

        return `
            <div class="course-card" onclick="openCourseModal('${course.id}')" style="cursor:pointer;">
                <div class="course-card-header">
                    <h3 class="course-card-title">${esc(course.title)}</h3>
                    ${course.level ? `
                        <span class="course-level-badge"
                              style="background:${lvl.bg};color:${lvl.text};padding:0.2rem 0.7rem;
                                     border-radius:20px;font-size:0.8rem;font-weight:600;">
                            ${esc(course.level)}
                        </span>` : ''}
                </div>
                ${course.description ? `<p class="course-card-desc">${esc(course.description)}</p>` : ''}
                <div class="course-card-meta">
                    <span><i class="fas fa-layer-group"></i> ${seqCount} séquence${seqCount > 1 ? 's' : ''}</span>
                    <span><i class="fas fa-file-alt"></i> ${sessCount} séance${sessCount > 1 ? 's' : ''}</span>
                </div>
                <button class="btn btn-primary" style="width:100%;margin-top:1rem;">
                    <i class="fas fa-book-open"></i> Ouvrir le cours
                </button>
            </div>
        `;
    }).join('');
}

// ============================================
// MODAL COURS — LECTEUR COMPLET
// ============================================
window.openCourseModal = function(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    // Supprimer modal existant
    document.getElementById('courseModal')?.remove();

    const sequences    = course.sequences || [];
    let   currentSeqIdx  = 0;
    let   currentSessIdx = 0;

    // ── Navigation séance ──
    window.goModalSession = function(si, ssi) {
        currentSeqIdx  = si;
        currentSessIdx = ssi;
        renderModalSession();
    };

    window.modalPrev = function() {
        if (currentSessIdx > 0) {
            currentSessIdx--;
        } else if (currentSeqIdx > 0) {
            currentSeqIdx--;
            currentSessIdx = (sequences[currentSeqIdx]?.sessions?.length || 1) - 1;
        }
        renderModalSession();
    };

    window.modalNext = function() {
        const len = sequences[currentSeqIdx]?.sessions?.length || 0;
        if (currentSessIdx < len - 1) {
            currentSessIdx++;
        } else if (currentSeqIdx < sequences.length - 1) {
            currentSeqIdx++;
            currentSessIdx = 0;
        }
        renderModalSession();
    };

    // ── Render contenu de la séance ──
    function renderModalSession() {
        const seq  = sequences[currentSeqIdx];
        const sess = seq?.sessions?.[currentSessIdx];

        // Sidebar
        const sidebar = document.getElementById('modalSidebar');
        if (sidebar) {
            sidebar.innerHTML = sequences.map((s, si) => `
                <div style="margin-bottom:0.75rem;">
                    <div style="font-size:0.75rem;font-weight:700;color:#1e40af;padding:0.4rem 0.6rem;
                                background:#eff6ff;border-radius:6px;margin-bottom:0.25rem;
                                text-transform:uppercase;letter-spacing:0.5px;">
                        <i class="fas fa-folder" style="margin-right:0.4rem;"></i>${esc(s.title || `Séquence ${si + 1}`)}
                    </div>
                    ${(s.sessions || []).map((ss, ssi) => {
                        const isActive = si === currentSeqIdx && ssi === currentSessIdx;
                        return `
                        <div onclick="goModalSession(${si},${ssi})"
                             id="sidebar-item-${si}-${ssi}"
                             style="padding:0.45rem 0.6rem 0.45rem 1rem;border-radius:6px;cursor:pointer;
                                    font-size:0.875rem;transition:background 0.15s;display:flex;align-items:center;gap:0.5rem;
                                    background:${isActive ? '#dbeafe' : 'transparent'};
                                    color:${isActive ? '#1e40af' : '#374151'};
                                    font-weight:${isActive ? '600' : 'normal'};"
                             onmouseover="if(!this.classList.contains('active-sess'))this.style.background='#f3f4f6'"
                             onmouseout="if(!this.classList.contains('active-sess'))this.style.background='transparent'"
                             class="${isActive ? 'active-sess' : ''}">
                            <i class="fas fa-${isActive ? 'play' : 'file-alt'}" style="font-size:0.75rem;flex-shrink:0;"></i>
                            <div>
                                <div style="font-size:0.7rem;opacity:0.6;">Séance ${ssi + 1}</div>
                                ${esc(ss.title || `Séance ${ssi + 1}`)}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            `).join('');
        }

        // Fil d'Ariane
        setEl('modalSeqTitle',  seq?.title  || `Séquence ${currentSeqIdx + 1}`);
        setEl('modalSessTitle', sess?.title || `Séance ${currentSessIdx + 1}`);

        // Progression
        let total = 0, current = 0;
        sequences.forEach((s, si) => {
            (s.sessions || []).forEach((_, ssi) => {
                total++;
                if (si < currentSeqIdx || (si === currentSeqIdx && ssi <= currentSessIdx)) current = total;
            });
        });
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        const fill = document.getElementById('modalProgressFill');
        const pctText = document.getElementById('modalProgressPct');
        if (fill) fill.style.width = `${pct}%`;
        if (pctText) pctText.textContent = `${current} / ${total}`;

        // Contenu séance
        const contentEl = document.getElementById('modalSessionContent');
        if (contentEl) {
            let html = sess?.content
                ? `<div style="font-family:Georgia,serif;line-height:1.8;color:#1f2937;font-size:1rem;">${sess.content}</div>`
                : `<div style="text-align:center;padding:4rem 2rem;color:#9ca3af;">
                       <i class="fas fa-inbox" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
                       <p style="font-size:1rem;">Aucun contenu pour cette séance.</p>
                   </div>`;

            if (sess?.pdfUrl) {
                html += `
                    <div style="margin-top:2rem;padding:1.25rem;background:#f0f9ff;border:1px solid #bae6fd;
                                border-radius:10px;display:flex;align-items:center;gap:1rem;">
                        <i class="fas fa-file-pdf" style="font-size:2.2rem;color:#ef4444;flex-shrink:0;"></i>
                        <div>
                            <div style="font-weight:700;margin-bottom:0.4rem;color:#1f2937;">Document PDF disponible</div>
                            <a href="${esc(sess.pdfUrl)}" target="_blank"
                               style="display:inline-flex;align-items:center;gap:0.5rem;background:#1e40af;color:white;
                                      padding:0.5rem 1.25rem;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.9rem;">
                                <i class="fas fa-download"></i> Télécharger le PDF
                            </a>
                        </div>
                    </div>`;
            }
            contentEl.innerHTML = html;
            contentEl.scrollTop = 0;
        }

        // Boutons navigation
        const isFirst = currentSeqIdx === 0 && currentSessIdx === 0;
        const lastSi  = sequences.length - 1;
        const lastSsi = (sequences[lastSi]?.sessions?.length || 1) - 1;
        const isLast  = currentSeqIdx === lastSi && currentSessIdx === lastSsi;

        const prevBtn = document.getElementById('modalPrevBtn');
        const nextBtn = document.getElementById('modalNextBtn');
        if (prevBtn) prevBtn.disabled = isFirst;
        if (nextBtn) nextBtn.disabled = isLast;
    }

    // ── Structure HTML du modal ──
    const seqCount  = sequences.length;
    let   sessTotal = 0;
    sequences.forEach(s => { sessTotal += s.sessions?.length || 0; });

    const modal = document.createElement('div');
    modal.id = 'courseModal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);
        display:flex;align-items:flex-start;justify-content:center;
        padding:1rem;overflow-y:auto;`;

    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:100%;max-width:1150px;
                    margin:auto;display:flex;flex-direction:column;overflow:hidden;
                    box-shadow:0 25px 70px rgba(0,0,0,0.35);min-height:88vh;">

            <!-- ── HEADER ── -->
            <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:white;
                        padding:1.2rem 1.5rem;display:flex;justify-content:space-between;
                        align-items:flex-start;flex-shrink:0;gap:1rem;">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.72rem;opacity:0.75;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.3rem;">
                        ${esc(course.diploma || '')}
                        ${course.level ? `· ${esc(course.level)}` : ''}
                        · ${seqCount} séquence${seqCount > 1 ? 's' : ''}
                        · ${sessTotal} séance${sessTotal > 1 ? 's' : ''}
                    </div>
                    <h2 style="margin:0;font-size:1.25rem;font-weight:700;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${esc(course.title)}
                    </h2>
                    <!-- Barre de progression -->
                    <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
                        <div style="flex:1;height:5px;background:rgba(255,255,255,0.25);border-radius:99px;overflow:hidden;">
                            <div id="modalProgressFill" style="height:100%;background:#60a5fa;border-radius:99px;width:0%;transition:width 0.4s;"></div>
                        </div>
                        <span id="modalProgressPct" style="font-size:0.75rem;opacity:0.8;white-space:nowrap;"></span>
                    </div>
                </div>
                <button onclick="document.getElementById('courseModal').remove()"
                    style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);
                           color:white;width:38px;height:38px;border-radius:50%;cursor:pointer;
                           font-size:1rem;display:flex;align-items:center;justify-content:center;
                           flex-shrink:0;transition:background 0.2s;"
                    onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- ── CORPS ── -->
            <div style="display:flex;flex:1;overflow:hidden;min-height:0;">

                <!-- Sidebar -->
                <div id="modalSidebar"
                     style="width:260px;flex-shrink:0;background:#f9fafb;
                            border-right:1px solid #e5e7eb;padding:1rem;overflow-y:auto;">
                </div>

                <!-- Zone principale -->
                <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">

                    <!-- Fil d'Ariane -->
                    <div style="padding:0.65rem 1.5rem;background:#f8fafc;border-bottom:1px solid #e5e7eb;
                                font-size:0.85rem;color:#6b7280;flex-shrink:0;display:flex;align-items:center;gap:0.4rem;">
                        <span id="modalSeqTitle" style="font-weight:600;color:#374151;"></span>
                        <i class="fas fa-chevron-right" style="font-size:0.65rem;color:#9ca3af;"></i>
                        <span id="modalSessTitle" style="color:#1e40af;font-weight:600;"></span>
                    </div>

                    <!-- Contenu scrollable -->
                    <div id="modalSessionContent"
                         style="flex:1;overflow-y:auto;padding:2rem 2.5rem;"></div>

                    <!-- Barre de navigation -->
                    <div style="padding:0.875rem 1.5rem;border-top:1px solid #e5e7eb;
                                display:flex;justify-content:space-between;align-items:center;
                                flex-shrink:0;background:white;">
                        <button id="modalPrevBtn" onclick="modalPrev()"
                            style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.25rem;
                                   background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;
                                   cursor:pointer;font-weight:600;color:#374151;font-size:0.9rem;
                                   transition:all 0.2s;"
                            onmouseover="if(!this.disabled){this.style.background='#e5e7eb'}"
                            onmouseout="this.style.background='#f3f4f6'">
                            <i class="fas fa-chevron-left"></i> Précédent
                        </button>
                        <button id="modalNextBtn" onclick="modalNext()"
                            style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.25rem;
                                   background:#1e40af;border:none;border-radius:8px;
                                   cursor:pointer;font-weight:600;color:white;font-size:0.9rem;
                                   transition:all 0.2s;"
                            onmouseover="if(!this.disabled){this.style.background='#1d4ed8'}"
                            onmouseout="this.style.background='#1e40af'">
                            Suivant <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Fermer avec Échap
    const onEsc = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onEsc); } };
    document.addEventListener('keydown', onEsc);

    // Afficher la première séance
    renderModalSession();
};

// ============================================
// GESTION DES VUES (home ↔ courses)
// ============================================
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(viewId)?.classList.add('active-view');
}

// ============================================
// UTILITAIRES
// ============================================
function esc(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setAttr(id, attr, val) {
    const el = document.getElementById(id);
    if (el) el[attr] = val;
}

console.log('✅ courses.js chargé — fichier unique (courses + course-detail + session-detail)');
