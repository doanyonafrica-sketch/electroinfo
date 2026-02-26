// ============================================================
// courses.js — FICHIER UNIQUE pour 3 pages
//   • courses.html        → liste diplômes + cours
//   • course-detail.html  → détail cours (séquences + séances)
//   • session-detail.html → lecture plein écran d'une séance
// ============================================================

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }
                                  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc }
                                  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Firebase ──────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
    authDomain:        "electroino-app.firebaseapp.com",
    projectId:         "electroino-app",
    storageBucket:     "electroino-app.firebasestorage.app",
    messagingSenderId: "864058526638",
    appId:             "1:864058526638:web:17b821633c7cc99be1563f"
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Détection de page ─────────────────────────────────────
const PAGE = (() => {
    const p = location.pathname;
    if (p.includes('session-detail'))  return 'session';
    if (p.includes('course-detail'))   return 'course';
    return 'courses';
})();

// ── Utilitaires ───────────────────────────────────────────
function esc(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t; return d.innerHTML;
}
function $id(id)          { return document.getElementById(id); }
function setText(id, val) { const el = $id(id); if (el) el.textContent = val; }
function setAttr(id, a, v){ const el = $id(id); if (el) el[a] = v; }
function show(id)         { $id(id)?.classList.remove('hidden'); }
function hide(id)         { $id(id)?.classList.add('hidden'); }

// ============================================================
// NAVBAR AUTH — commune aux 3 pages
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        hide('loginBtn'); show('userMenu');
        const name   = user.displayName || user.email.split('@')[0];
        const avatar = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff`;
        ['userName','userNameDropdown'].forEach(id => setText(id, name));
        setText('userEmailDropdown', user.email);
        ['userAvatar','userAvatarDropdown'].forEach(id => setAttr(id,'src',avatar));
        try {
            const ud = await getDoc(doc(db,'users',user.uid));
            if (ud.exists() && ud.data().role === 'admin') {
                show('adminLink'); show('adminDivider');
            }
        } catch(_) {}
    } else {
        show('loginBtn'); hide('userMenu');
        hide('adminLink'); hide('adminDivider');
    }
});

$id('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth); window.location.href = 'index.html';
});
$id('mobileToggle')?.addEventListener('click', () => {
    $id('mobileMenu')?.classList.toggle('open');
    $id('navMenu')?.classList.toggle('active');
});
$id('userMenuToggle')?.addEventListener('click', e => {
    e.stopPropagation();
    $id('userDropdown')?.classList.toggle('hidden');
});
document.addEventListener('click', e => {
    const dd = $id('userDropdown');
    if (dd && !dd.contains(e.target) && e.target !== $id('userMenuToggle'))
        dd.classList.add('hidden');
});

// ============================================================
// INIT selon la page
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (PAGE === 'courses') initCoursesPage();
    if (PAGE === 'course')  initCourseDetailPage();
    if (PAGE === 'session') initSessionPage();
});

// ╔══════════════════════════════════════════════════════════╗
// ║  PAGE 1 — courses.html                                  ║
// ╚══════════════════════════════════════════════════════════╝
let allCourses = [];

async function initCoursesPage() {
    try {
        const snap = await getDocs(query(collection(db,'courses'), orderBy('createdAt','desc')));
        allCourses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.error(e); allCourses = []; }

    document.querySelectorAll('.diploma-card').forEach(card => {
        card.addEventListener('click', () => showCoursesByDiploma(card.dataset.diploma));
    });
    $id('backToHome')?.addEventListener('click', () => showView('view-home'));
    document.querySelector('.back-btn-empty')?.addEventListener('click', () => showView('view-home'));
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    $id(id)?.classList.add('active-view');
}

function showCoursesByDiploma(diploma) {
    showView('view-courses');
    const labels = { all:'📚 Tous les cours', 'BAC PRO':'🎓 BAC PRO',
        BEP:'📘 BEP', CAP:'🏅 CAP', BTS:'🎓 BTS', LICENCE:'🏛️ Licence' };
    setText('coursesViewTitle', labels[diploma] || diploma);
    const list = diploma === 'all' ? allCourses
        : allCourses.filter(c => (c.diploma||'') === diploma);
    renderCoursesList(list);
}

function renderCoursesList(courses) {
    const grid = $id('coursesGrid');
    if (!grid) return;
    hide('coursesLoading');

    if (!courses.length) { hide('coursesGrid'); show('noCourses'); return; }
    hide('noCourses'); show('coursesGrid');

    const lvlColors = {
        'Débutant':      { bg:'#d1fae5', tx:'#065f46' },
        'Intermédiaire': { bg:'#fef3c7', tx:'#92400e' },
        'Avancé':        { bg:'#fee2e2', tx:'#991b1b' }
    };

    grid.innerHTML = courses.map((c, idx) => {
        const seqs = c.sequences?.length || 0;
        let   sess = 0; c.sequences?.forEach(s => sess += s.sessions?.length||0);

        // Palettes de couleurs selon le niveau
        const levelColors = {
            'D\xc3\xa9butant':     { badge:'#dcfce7', badgeTx:'#15803d', accent:'#22c55e' },
            'Interm\xc3\xa9diaire': { badge:'#fef3c7', badgeTx:'#b45309', accent:'#f59e0b' },
            'Avanc\xc3\xa9':       { badge:'#fee2e2', badgeTx:'#dc2626', accent:'#ef4444' },
        };
        const lv = levelColors[c.level] || { badge:'#f3f4f6', badgeTx:'#374151', accent:'#6b7280' };

        // Gradients de couverture selon l'index (rotation cyclique)
        const covers = [
            'linear-gradient(135deg,#1e3a5f 0%,#1e40af 50%,#3b82f6 100%)',
            'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)',
            'linear-gradient(135deg,#4c1d95 0%,#5b21b6 50%,#7c3aed 100%)',
            'linear-gradient(135deg,#7c2d12 0%,#9a3412 50%,#ea580c 100%)',
            'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%)',
            'linear-gradient(135deg,#831843 0%,#9d174d 50%,#db2777 100%)',
        ];
        const cover = covers[idx % covers.length];

        // Icone selon le diplome
        const diplomaIcon = {
            'BAC PRO': 'fa-graduation-cap',
            'BTS':     'fa-university',
            'CAP':     'fa-certificate',
            'Licence': 'fa-award',
        }[c.diploma] || 'fa-bolt';

        // Initiales pour le placeholder visuel
        const initials = (c.title||'?').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');

        return `
        <div class="course-card-v2" onclick="location.href='course-detail.html?id=${c.id}'">

            <!-- COVER -->
            <div class="ccv2-cover" style="background:${cover};">
                <div class="ccv2-cover-pattern"></div>
                <div class="ccv2-cover-icon">
                    <i class="fas ${diplomaIcon}"></i>
                </div>
                <div class="ccv2-cover-initials">${initials}</div>
                ${c.diploma ? `<span class="ccv2-diploma">${esc(c.diploma)}</span>` : ''}
            </div>

            <!-- BODY -->
            <div class="ccv2-body">
                ${c.level ? `<span class="ccv2-level" style="background:${lv.badge};color:${lv.badgeTx};">${esc(c.level)}</span>` : ''}
                <h3 class="ccv2-title">${esc(c.title)}</h3>
                ${c.description ? `<p class="ccv2-desc">${esc(c.description)}</p>` : ''}
            </div>

            <!-- FOOTER -->
            <div class="ccv2-footer">
                <div class="ccv2-stats">
                    <span class="ccv2-stat">
                        <i class="fas fa-layer-group"></i>
                        ${seqs} s\xc3\xa9q.
                    </span>
                    <span class="ccv2-stat">
                        <i class="fas fa-file-alt"></i>
                        ${sess} s\xc3\xa9ance${sess>1?'s':''}
                    </span>
                </div>
                <span class="ccv2-cta">
                    Ouvrir <i class="fas fa-arrow-right"></i>
                </span>
            </div>
        </div>`;
    }).join('');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAGE 2 — course-detail.html                            ║
// ╚══════════════════════════════════════════════════════════╝
let currentCourse = null;

async function initCourseDetailPage() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { showErrorDetail(); return; }
    try {
        const snap = await getDoc(doc(db,'courses',id));
        if (!snap.exists()) { showErrorDetail(); return; }
        currentCourse = { id: snap.id, ...snap.data() };
        renderCourseDetail();
    } catch(e) { console.error(e); showErrorDetail(); }
}

function renderCourseDetail() {
    hide('loadingState'); show('courseContainer');
    document.title = `${currentCourse.title} | ElectroInfo`;
    setText('courseDiploma',    currentCourse.diploma || 'BAC PRO');
    setText('courseLevel',      currentCourse.level   || 'Débutant');
    setText('courseTitle',      currentCourse.title);
    setText('courseDescription',currentCourse.description || '');

    const seqs = currentCourse.sequences || [];
    let   total = 0; seqs.forEach(s => total += s.sessions?.length||0);
    setText('sequencesCount', seqs.length);
    setText('sessionsCount',  total);
    const d = currentCourse.createdAt?.toDate?.() || new Date();
    setText('courseDate', d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}));

    renderSequences(seqs);
    renderSequencesNav(seqs);
}

function renderSequencesNav(seqs) {
    const nav = $id('sequencesNav');
    if (!nav) return;
    if (!seqs.length) { nav.innerHTML = '<p style="color:#6b7280;font-size:.9rem;">Aucune séquence</p>'; return; }
    nav.innerHTML = seqs.map((s,i) => `
        <div class="sequence-nav-item" onclick="scrollToSeq(${i})">
            <i class="fas fa-chevron-right" style="font-size:.7rem;margin-right:.5rem;"></i>
            ${esc(s.title || `Séquence ${i+1}`)}
        </div>`).join('');
}

function renderSequences(seqs) {
    const box   = $id('sequencesContainer');
    const empty = $id('emptySequences');
    if (!seqs.length) { box?.classList.add('hidden'); empty?.classList.remove('hidden'); return; }
    box?.classList.remove('hidden'); empty?.classList.add('hidden');

    box.innerHTML = seqs.map((seq,si) => `
        <div class="sequence-block" id="sequence-${si}">
            <div class="sequence-header">
                <div class="sequence-title-wrapper">
                    <div class="sequence-number">Séquence ${si+1}</div>
                    <h2 class="sequence-title">${esc(seq.title||`Séquence ${si+1}`)}</h2>
                </div>
                <button class="sequence-toggle" onclick="toggleSeq(${si})">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="sessions-list" id="sessions-${si}">
                ${renderSessionItems(seq.sessions||[], si)}
            </div>
        </div>`).join('');
}

function renderSessionItems(sessions, si) {
    if (!sessions.length) return `
        <div class="empty-state" style="padding:2rem;">
            <i class="fas fa-inbox" style="font-size:2rem;color:#9ca3af;margin-bottom:1rem;"></i>
            <p style="color:#6b7280;">Aucune séance dans cette séquence</p>
        </div>`;
    return sessions.map((sess,ssi) => `
        <div class="session-item"
             onclick="location.href='session-detail.html?courseId=${currentCourse.id}&seqIndex=${si}&sessionIndex=${ssi}'">
            <div class="session-icon"><i class="fas fa-play"></i></div>
            <div class="session-info">
                <div class="session-number">Séance ${ssi+1}</div>
                <h4 class="session-title">${esc(sess.title||`Séance ${ssi+1}`)}</h4>
                ${sess.pdfUrl ? `<div class="session-has-pdf">
                    <i class="fas fa-file-pdf"></i> PDF disponible</div>` : ''}
            </div>
            <i class="fas fa-chevron-right session-arrow"></i>
        </div>`).join('');
}

window.toggleSeq = function(i) {
    const block = $id(`sequence-${i}`);
    const list  = $id(`sessions-${i}`);
    block?.classList.toggle('collapsed');
    if (list) list.style.display = list.style.display === 'none' ? 'grid' : 'none';
};

window.scrollToSeq = function(i) {
    $id(`sequence-${i}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
    document.querySelectorAll('.sequence-nav-item').forEach((el,idx) =>
        el.classList.toggle('active', idx === i));
};

function showErrorDetail() {
    hide('loadingState'); show('errorState');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAGE 3 — session-detail.html                           ║
// ╚══════════════════════════════════════════════════════════╝
let sdCourse  = null;
let sdSeqIdx  = 0;
let sdSessIdx = 0;

async function initSessionPage() {
    const p = new URLSearchParams(location.search);
    const courseId = p.get('courseId');
    sdSeqIdx  = parseInt(p.get('seqIndex')     || '0', 10);
    sdSessIdx = parseInt(p.get('sessionIndex') || '0', 10);

    if (!courseId) { sdShowError('Aucun cours spécifié.'); return; }
    try {
        const snap = await getDoc(doc(db,'courses',courseId));
        if (!snap.exists()) { sdShowError('Cours introuvable.'); return; }
        sdCourse = { id: snap.id, ...snap.data() };
        sdRender();
    } catch(e) { sdShowError('Erreur réseau.'); }
}

function sdRender() {
    const ls = $id('loading-screen');
    if (ls) ls.style.display = 'none';

    const tb = $id('tbCourseName');
    if (tb) tb.innerHTML = `<strong>${esc(sdCourse.title)}</strong>`;

    const bl = $id('backLink');
    if (bl) bl.href = `course-detail.html?id=${sdCourse.id}`;

    sdBuildSidebar();
    sdRenderSession();
}

function sdBuildSidebar() {
    const nav = $id('sidebarNav');
    if (!nav) return;
    nav.innerHTML = (sdCourse.sequences||[]).map((seq,si) => `
        <div class="seq-block">
            <div class="seq-title-row">
                <i class="fas fa-folder"></i>
                ${esc(seq.title||`Séquence ${si+1}`)}
            </div>
            ${(seq.sessions||[]).map((sess,ssi) => `
                <div class="sess-item ${si===sdSeqIdx&&ssi===sdSessIdx?'active':''}"
                     id="nav-${si}-${ssi}"
                     onclick="sdGoTo(${si},${ssi})">
                    <div class="sess-icon">
                        <i class="fas fa-${si===sdSeqIdx&&ssi===sdSessIdx?'play':'file-alt'}"></i>
                    </div>
                    <div class="sess-text">
                        <div class="sess-num">Séance ${ssi+1}</div>
                        <div class="sess-name">${esc(sess.title||`Séance ${ssi+1}`)}</div>
                    </div>
                </div>`).join('')}
        </div>`).join('');
}

function sdRenderSession() {
    const seqs = sdCourse.sequences || [];
    const seq  = seqs[sdSeqIdx];
    const sess = seq?.sessions?.[sdSessIdx];

    document.title = `${sess?.title||'Séance'} | ElectroInfo`;
    setText('bandSeq',   seq?.title  || `Séquence ${sdSeqIdx+1}`);
    setText('bandTitle', sess?.title || `Séance ${sdSessIdx+1}`);

    const contentEl = $id('session-content');
    if (contentEl) {
        contentEl.innerHTML = sess?.content
            ? sess.content
            : `<div style="text-align:center;padding:4rem;color:#94a3b8;">
                   <i class="fas fa-inbox" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
                   <p>Aucun contenu disponible pour cette séance.</p>
               </div>`;
    }

    const pdfBlock = $id('pdf-block');
    const pdfLink  = $id('pdfLink');
    if (sess?.pdfUrl) {
        if (pdfBlock) pdfBlock.style.display = 'flex';
        if (pdfLink)  pdfLink.href = sess.pdfUrl;
    } else {
        if (pdfBlock) pdfBlock.style.display = 'none';
    }

    sdUpdateNav();
    sdUpdateSidebarHighlight();
    const reader = $id('reader');
    if (reader) reader.scrollTop = 0;
}

function sdUpdateNav() {
    const seqs = sdCourse.sequences || [];
    let total = 0, current = 0;
    seqs.forEach((s,si) => {
        (s.sessions||[]).forEach((_,ssi) => {
            total++;
            if (si < sdSeqIdx || (si===sdSeqIdx && ssi<=sdSessIdx)) current = total;
        });
    });

    const isFirst = sdSeqIdx===0 && sdSessIdx===0;
    const lastSi  = seqs.length-1;
    const lastSsi = (seqs[lastSi]?.sessions?.length||1)-1;
    const isLast  = sdSeqIdx===lastSi && sdSessIdx===lastSsi;

    const prev = $id('prevBtn'); const next = $id('nextBtn');
    if (prev) prev.disabled = isFirst;
    if (next) next.disabled = isLast;

    const sess = seqs[sdSeqIdx]?.sessions?.[sdSessIdx];
    setText('navTitle',   sess?.title || `Séance ${sdSessIdx+1}`);
    setText('navCounter', `${current} / ${total}`);

    const pct = total > 0 ? Math.round((current/total)*100) : 0;
    const fill = $id('progressFill');
    const pctEl = $id('progressText');
    if (fill)  fill.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
}

window.navigate = function(dir) {
    const seqs = sdCourse.sequences || [];
    if (dir === -1) {
        if (sdSessIdx > 0) sdSessIdx--;
        else if (sdSeqIdx > 0) { sdSeqIdx--; sdSessIdx = (seqs[sdSeqIdx]?.sessions?.length||1)-1; }
    } else {
        const len = seqs[sdSeqIdx]?.sessions?.length || 0;
        if (sdSessIdx < len-1) sdSessIdx++;
        else if (sdSeqIdx < seqs.length-1) { sdSeqIdx++; sdSessIdx = 0; }
    }
    sdPushUrl(); sdRenderSession();
};

window.sdGoTo = function(si, ssi) {
    sdSeqIdx = si; sdSessIdx = ssi;
    sdPushUrl(); sdRenderSession();
};

function sdPushUrl() {
    const url = new URL(location.href);
    url.searchParams.set('seqIndex',     sdSeqIdx);
    url.searchParams.set('sessionIndex', sdSessIdx);
    history.pushState({}, '', url);
}

function sdUpdateSidebarHighlight() {
    document.querySelectorAll('.sess-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sess-icon i').forEach(el => el.className = 'fas fa-file-alt');
    const active = $id(`nav-${sdSeqIdx}-${sdSessIdx}`);
    if (active) {
        active.classList.add('active');
        const ic = active.querySelector('.sess-icon i');
        if (ic) ic.className = 'fas fa-play';
        active.scrollIntoView({ block:'nearest', behavior:'smooth' });
    }
}

function sdShowError(msg) {
    const ls = $id('loading-screen');
    if (ls) ls.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:2.5rem;"></i>
        <p style="font-size:1rem;font-weight:600;margin-top:1rem;">${msg}</p>
        <a href="courses.html"
           style="margin-top:1rem;padding:.6rem 1.5rem;background:#1d4ed8;color:white;
                  border-radius:7px;text-decoration:none;font-weight:700;
                  display:inline-flex;align-items:center;gap:.5rem;">
            <i class="fas fa-arrow-left"></i> Retour aux cours
        </a>`;
}

console.log(`✅ courses.js chargé — page: ${PAGE}`);