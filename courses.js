// ============================================================
// courses.js — FICHIER UNIQUE pour 3 pages
//   • courses.html        → liste diplômes + cours
//   • course-detail.html  → détail cours (séquences + séances)
//   • session-detail.html → lecture plein écran d'une séance
// ============================================================

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }
                                  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, query, orderBy, where, doc, getDoc }
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
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Détection de page ─────────────────────────────────────
const PAGE = (() => {
    const p = location.pathname;
    if (p.includes('session-detail') || p.startsWith('/seance/')) return 'session';
    // Supporte /course-detail?id=XXX ET /course/mon-slug
    if (p.includes('course-detail') || (p.startsWith('/course/') && p.split('/')[2])) return 'course';
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
    await signOut(auth); window.location.href = '/';
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
// Ouvrir un cours (slug SEO ou fallback id)
window.openCourse = function(id, slug) {
    location.href = slug ? '/course/' + slug : '/course-detail?id=' + id;
};

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
            'Débutant':     { badge:'#dcfce7', badgeTx:'#15803d', accent:'#22c55e' },
            'Intermédiaire': { badge:'#fef3c7', badgeTx:'#b45309', accent:'#f59e0b' },
            'Avancé':       { badge:'#fee2e2', badgeTx:'#dc2626', accent:'#ef4444' },
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
        <div class="course-card-v2" data-course-id="${esc(c.id)}" data-course-slug="${esc(c.slug||'')}" style="cursor:pointer;">

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
                    ${seqs} s\u00e9q.
                    </span>
                    <span class="ccv2-stat">
                        <i class="fas fa-file-alt"></i>
                        ${sess} s\u00e9ance${sess>1?'s':''}
                    </span>
                </div>
                <span class="ccv2-cta">
                    Ouvrir <i class="fas fa-arrow-right"></i>
                </span>
            </div>
        </div>`;
    }).join('');

    // Délégation d'événement — évite les bugs avec apostrophes dans les slugs/IDs
    grid.onclick = (e) => {
        const card = e.target.closest('.course-card-v2');
        if (!card) return;
        window.openCourse(card.dataset.courseId, card.dataset.courseSlug);
    };
}

// ╔══════════════════════════════════════════════════════════╗
// ║  PAGE 2 — course-detail.html                            ║
// ╚══════════════════════════════════════════════════════════╝
let currentCourse = null;

async function initCourseDetailPage() {
    // Format 1 : /course/mon-slug (Firebase Hosting)
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'course' && pathParts[2]) {
        return loadCourseBySlug(decodeURIComponent(pathParts[2]));
    }

    // Format 2 : GitHub Pages — slug sauvegardé dans sessionStorage par 404.html
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath) {
        sessionStorage.removeItem('redirect_path');
        const parts = redirectPath.split('/');
        if (parts[1] === 'course' && parts[2]) {
            return loadCourseBySlug(decodeURIComponent(parts[2]));
        }
    }

    // Format 3 (fallback legacy) : /course-detail?id=XXX
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { showErrorDetail(); return; }
    try {
        const snap = await getDoc(doc(db,'courses',id));
        if (!snap.exists()) { showErrorDetail(); return; }
        currentCourse = { id: snap.id, ...snap.data() };
        renderCourseDetail();
    } catch(e) { console.error(e); showErrorDetail(); }
}

async function loadCourseBySlug(slug) {
    try {
        const snap = await getDocs(query(collection(db, 'courses'), where('slug', '==', slug)));
        if (snap.empty) { showErrorDetail(); return; }
        currentCourse = { id: snap.docs[0].id, ...snap.docs[0].data() };
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
    return sessions.map((sess,ssi) => {
        const url = currentCourse.slug
            ? `/seance/${currentCourse.slug}/seq-${si+1}/seance-${ssi+1}`
            : `/session-detail?courseId=${currentCourse.id}&seqIndex=${si}&sessionIndex=${ssi}`;
        return `
        <div class="session-item" onclick="location.href='${url}'">
            <div class="session-icon"><i class="fas fa-play"></i></div>
            <div class="session-info">
                <div class="session-number">Séance ${ssi+1}</div>
                <h4 class="session-title">${esc(sess.title||`Séance ${ssi+1}`)}</h4>
                ${sess.pdfUrl ? `<div class="session-has-pdf">
                    <i class="fas fa-file-pdf"></i> PDF disponible</div>` : ''}
            </div>
            <i class="fas fa-chevron-right session-arrow"></i>
        </div>`;
    }).join('');
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
    // GitHub Pages : récupère le path depuis sessionStorage (priorité absolue)
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath) {
        sessionStorage.removeItem('redirect_path');
        const rParts = redirectPath.split('/');
        if (rParts[1] === 'seance' && rParts[2]) {
            const courseSlug = decodeURIComponent(rParts[2]);
            sdSeqIdx  = parseInt((rParts[3] || 'seq-1').replace('seq-', '')) - 1;
            sdSessIdx = parseInt((rParts[4] || 'seance-1').replace('seance-', '')) - 1;
            try {
                const snap = await getDocs(query(collection(db,'courses'), where('slug','==',courseSlug)));
                if (snap.empty) { sdShowError('Cours introuvable.'); return; }
                sdCourse = { id: snap.docs[0].id, ...snap.docs[0].data() };
                sdRender();
            } catch(e) { console.error(e); sdShowError('Erreur réseau.'); }
            return;
        }
    }

    // Nouveau format SEO direct : /seance/cours-slug/seq-N/seance-N
    const parts = location.pathname.split('/');
    if (parts[1] === 'seance' && parts[2]) {
        const courseSlug = decodeURIComponent(parts[2]);
        sdSeqIdx  = parseInt((parts[3] || 'seq-1').replace('seq-', '')) - 1;
        sdSessIdx = parseInt((parts[4] || 'seance-1').replace('seance-', '')) - 1;
        try {
            const snap = await getDocs(query(collection(db,'courses'), where('slug','==',courseSlug)));
            if (snap.empty) { sdShowError('Cours introuvable.'); return; }
            sdCourse = { id: snap.docs[0].id, ...snap.docs[0].data() };
            sdRender();
        } catch(e) { console.error(e); sdShowError('Erreur réseau.'); }
        return;
    }

    // Fallback legacy : ?courseId=XXX&seqIndex=N&sessionIndex=N
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
    // IDs correspondant à session-detail.html
    hide('loadingState');
    show('sessionPage');

    const bl = $id('backButton');
    if (bl) bl.href = sdCourse.slug ? `/course/${sdCourse.slug}` : `/course-detail?id=${sdCourse.id}`;

    sdRenderSession();
}

// (sidebar supprimée — session-detail.html n'a pas de sidebarNav)

function sdRenderSession() {
    const seqs = sdCourse.sequences || [];
    const seq  = seqs[sdSeqIdx];
    const sess = seq?.sessions?.[sdSessIdx];

    document.title = `${sess?.title||'Séance'} | ElectroInfo`;

    // IDs du HTML actuel : sessionBadge, sessionTitle, sessionContent
    setText('sessionBadge', `Séance ${sdSessIdx + 1}`);
    setText('sessionTitle', sess?.title || `Séance ${sdSessIdx + 1}`);

    const contentEl = $id('sessionContent');
    if (contentEl) {
        contentEl.innerHTML = sess?.content
            ? sess.content
            : `<div style="text-align:center;padding:4rem;color:#94a3b8;">
                   <i class="fas fa-inbox" style="font-size:3rem;margin-bottom:1rem;display:block;"></i>
                   <p>Aucun contenu disponible pour cette séance.</p>
               </div>`;
    }

    // PDF — IDs du HTML actuel : pdfSection, pdfDownloadBtn
    if (sess?.pdfUrl) {
        show('pdfSection');
        setAttr('pdfDownloadBtn', 'href', sess.pdfUrl);
    } else {
        hide('pdfSection');
    }

    // Bouton retour
    const bl = $id('backButton');
    if (bl) bl.href = sdCourse.slug ? `/course/${sdCourse.slug}` : `/course-detail?id=${sdCourse.id}`;

    sdUpdateNav();
    const reader = $id('sessionContent');
    if (reader) reader.scrollTop = 0;
}

function sdUpdateNav() {
    const seqs = sdCourse.sequences || [];
    const sess = seqs[sdSeqIdx]?.sessions?.[sdSessIdx];

    // Bouton précédent — ID : prevSessionBtn
    const prevBtn = $id('prevSessionBtn');
    const nextBtn = $id('nextSessionBtn');

    let prevHref = null, nextHref = null;
    const makeUrl = (si, ssi) => sdCourse.slug
        ? `/seance/${sdCourse.slug}/seq-${si+1}/seance-${ssi+1}`
        : `/session-detail?courseId=${sdCourse.id}&seqIndex=${si}&sessionIndex=${ssi}`;

    if (sdSessIdx > 0) {
        prevHref = makeUrl(sdSeqIdx, sdSessIdx - 1);
    } else if (sdSeqIdx > 0) {
        const prevLen = seqs[sdSeqIdx - 1]?.sessions?.length || 0;
        if (prevLen > 0) prevHref = makeUrl(sdSeqIdx - 1, prevLen - 1);
    }

    const curLen = seqs[sdSeqIdx]?.sessions?.length || 0;
    if (sdSessIdx < curLen - 1) {
        nextHref = makeUrl(sdSeqIdx, sdSessIdx + 1);
    } else if (sdSeqIdx < seqs.length - 1) {
        if ((seqs[sdSeqIdx + 1]?.sessions?.length || 0) > 0) nextHref = makeUrl(sdSeqIdx + 1, 0);
    }

    if (prevBtn) {
        if (prevHref) { prevBtn.href = prevHref; prevBtn.classList.remove('disabled'); }
        else { prevBtn.removeAttribute('href'); prevBtn.classList.add('disabled'); }
    }
    if (nextBtn) {
        if (nextHref) { nextBtn.href = nextHref; nextBtn.classList.remove('disabled'); }
        else { nextBtn.removeAttribute('href'); nextBtn.classList.add('disabled'); }
    }
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

function sdPushUrl() {
    if (sdCourse.slug) {
        // Nouveau format SEO
        const newUrl = `/seance/${sdCourse.slug}/seq-${sdSeqIdx+1}/seance-${sdSessIdx+1}`;
        history.pushState({}, '', newUrl);
    } else {
        // Fallback legacy
        const url = new URL(location.href);
        url.searchParams.set('seqIndex',     sdSeqIdx);
        url.searchParams.set('sessionIndex', sdSessIdx);
        history.pushState({}, '', url);
    }
}

// (highlight sidebar supprimé — session-detail.html n'a pas de sidebar)

function sdShowError(msg) {
    const ls = $id('loadingState');
    if (ls) ls.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:2.5rem;"></i>
        <p style="font-size:1rem;font-weight:600;margin-top:1rem;">${msg}</p>
        <a href="/courses"
           style="margin-top:1rem;padding:.6rem 1.5rem;background:#1d4ed8;color:white;
                  border-radius:7px;text-decoration:none;font-weight:700;
                  display:inline-flex;align-items:center;gap:.5rem;">
            <i class="fas fa-arrow-left"></i> Retour aux cours
        </a>`;
}

console.log(`✅ courses.js chargé — page: ${PAGE}`);