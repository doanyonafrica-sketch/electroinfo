// ============================================================
// courses.js — FICHIER UNIQUE pour 3 pages publiques
//   • courses.html   → sélection diplôme + liste matières
//   • matiere.html   → détail matière (séquences + séances)
//   • seance.html    → lecture plein écran d'une séance
//
// Structure Firestore :
//   matieres/{id} {
//     titre, diplome, niveau, description, slug,
//     sequences: [{ titre, seances: [{ titre, contenu, pdfUrl }] }]
//   }
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
    if (p.includes('seance.html') || p.startsWith('/seance/')) return 'seance';
    if (p.includes('matiere.html') || p.startsWith('/matiere/')) return 'matiere';
    return 'courses';
})();

// ── Utilitaires DOM ───────────────────────────────────────
const $    = id => document.getElementById(id);
const esc  = t  => { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');
const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
const setAttr = (id, a, v) => { const e = $(id); if (e) e[a] = v; };

// ── Cache localStorage ─────────────────────────────────────
const CACHE_KEY = 'electroinfo_matieres_v1';
const CACHE_TTL = 10 * 60 * 1000;

function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch(_) {}
}
function loadCache() {
    try {
        const r = localStorage.getItem(CACHE_KEY);
        if (!r) return null;
        const { data, ts } = JSON.parse(r);
        return Date.now() - ts < CACHE_TTL ? data : null;
    } catch(_) { return null; }
}

// ============================================================
// NAVBAR AUTH — commune aux 3 pages
// ============================================================
onAuthStateChanged(auth, async user => {
    if (user) {
        hide('loginBtn'); show('userMenu');
        const name   = user.displayName || user.email.split('@')[0];
        const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff`;
        ['userName','userNameDropdown'].forEach(id => setText(id, name));
        setText('userEmailDropdown', user.email);
        ['userAvatar','userAvatarDropdown'].forEach(id => setAttr(id, 'src', avatar));
        try {
            const ud = await getDoc(doc(db, 'users', user.uid));
            if (ud.exists() && ['admin','superadmin'].includes(ud.data().role)) {
                show('adminLink'); show('adminDivider');
            }
        } catch(_) {}
    } else {
        show('loginBtn'); hide('userMenu');
    }
});

$('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.href = '/'; });
$('userMenuToggle')?.addEventListener('click', e => { e.stopPropagation(); $('userDropdown')?.classList.toggle('hidden'); });
document.addEventListener('click', e => {
    const dd = $('userDropdown');
    if (dd && !dd.contains(e.target) && e.target !== $('userMenuToggle')) dd.classList.add('hidden');
});
$('mobileToggle')?.addEventListener('click', () => $('mobileMenu')?.classList.toggle('open'));

// ============================================================
// INIT selon la page
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (PAGE === 'courses') initCoursesPage();
    if (PAGE === 'matiere') initMatierePage();
    if (PAGE === 'seance')  initSeancePage();
});

// ============================================================
// PAGE 1 — courses.html
// ============================================================
let allMatieres = [];

async function initCoursesPage() {
    const cached = loadCache();
    if (cached) { allMatieres = cached; }

    try {
        const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000));
        const snap = await Promise.race([
            getDocs(query(collection(db, 'matieres'), orderBy('createdAt', 'desc'))),
            timeout
        ]);
        allMatieres = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        saveCache(allMatieres);
        console.log(`✅ ${allMatieres.length} matières chargées`);
    } catch(e) {
        console.warn('⚠️ Firebase inaccessible, cache utilisé.');
    }

    document.querySelectorAll('.diplome-card').forEach(card => {
        card.addEventListener('click', () => showNiveaux(card.dataset.diplome));
    });
    $('backToDiplomesFromNiveaux')?.addEventListener('click', () => showView('view-diplomes'));
    $('backToNiveaux')?.addEventListener('click', () => showView('view-niveaux'));
    $('backFromEmpty')?.addEventListener('click',  () => showView('view-niveaux'));
}

let currentDiplome = '';
let currentNiveau  = '';

function showView(id) {
    document.querySelectorAll('.courses-view').forEach(v => v.classList.remove('active-view'));
    $(id)?.classList.add('active-view');
    window.scrollTo(0, 0);
}

// VUE 2 : afficher les niveaux disponibles pour un diplôme
function showNiveaux(diplome) {
    currentDiplome = diplome;
    showView('view-niveaux');
    setText('niveaux-title', `Choisir un niveau — ${diplome}`);

    const NIVEAUX = [
        { id: 'Débutant',      icon: 'fas fa-seedling',   color: '#065f46', bg: '#d1fae5', desc: 'Bases et fondamentaux' },
        { id: 'Intermédiaire', icon: 'fas fa-chart-line', color: '#92400e', bg: '#fef3c7', desc: 'Approfondissement des connaissances' },
        { id: 'Avancé',        icon: 'fas fa-fire',        color: '#991b1b', bg: '#fee2e2', desc: 'Maîtrise et expertise' },
    ];

    const matieresDiplome = allMatieres.filter(m => m.diplome === diplome);
    const niveauxDispos   = NIVEAUX.filter(nv => matieresDiplome.some(m => m.niveau === nv.id));

    const grid = $('niveaux-grid');
    if (!grid) return;

    if (!niveauxDispos.length) {
        grid.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:3rem;">Aucune matière disponible pour ce diplôme.</p>';
        return;
    }

    grid.innerHTML = niveauxDispos.map(nv => {
        const count = matieresDiplome.filter(m => m.niveau === nv.id).length;
        return `
        <div class="niveau-card" onclick="showMatieres('${nv.id}')"
             style="border-top:4px solid ${nv.color};">
            <div class="nc-icon" style="background:${nv.bg};color:${nv.color};">
                <i class="${nv.icon}"></i>
            </div>
            <div class="nc-body">
                <h3 class="nc-titre" style="color:${nv.color};">${nv.id}</h3>
                <p class="nc-desc">${nv.desc}</p>
                <span class="nc-count">${count} matière${count > 1 ? 's' : ''}</span>
            </div>
            <div class="nc-arrow" style="color:${nv.color};">
                <i class="fas fa-arrow-right"></i>
            </div>
        </div>`;
    }).join('');
}

// VUE 3 : afficher les matières pour un diplôme + niveau
window.showMatieres = function(niveau) {
    currentNiveau = niveau;
    showView('view-matieres');
    setText('matieres-title', `${currentDiplome} · ${niveau}`);

    const list = allMatieres.filter(m => m.diplome === currentDiplome && m.niveau === niveau);
    renderMatieres(list);
}

function renderMatieres(matieres) {
    hide('matieres-loading');
    if (!matieres.length) {
        hide('matieres-grid');
        show('matieres-empty');
        return;
    }
    hide('matieres-empty');
    show('matieres-grid');

    const niveauColors = {
        'Débutant':      { bg:'#d1fae5', tx:'#065f46' },
        'Intermédiaire': { bg:'#fef3c7', tx:'#92400e' },
        'Avancé':        { bg:'#fee2e2', tx:'#991b1b' }
    };
    const covers = [
        'linear-gradient(135deg,#1e3a5f,#1e40af,#3b82f6)',
        'linear-gradient(135deg,#064e3b,#065f46,#059669)',
        'linear-gradient(135deg,#4c1d95,#5b21b6,#7c3aed)',
        'linear-gradient(135deg,#7c2d12,#9a3412,#ea580c)',
        'linear-gradient(135deg,#0f172a,#1e293b,#334155)',
        'linear-gradient(135deg,#831843,#9d174d,#db2777)',
    ];

    $('matieres-grid').innerHTML = matieres.map((m, i) => {
        const seqs  = m.sequences?.length || 0;
        let seances = 0;
        m.sequences?.forEach(s => seances += s.seances?.length || 0);
        const nv    = niveauColors[m.niveau] || { bg:'#f3f4f6', tx:'#374151' };
        const cover = covers[i % covers.length];
        const initials = (m.titre||'?').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');

        return `
        <div class="matiere-card" onclick="location.href='/matiere/${esc(m.slug||m.id)}'">
            <div class="mc-cover" style="background:${cover}">
                <div class="mc-initials">${initials}</div>
                <span class="mc-diplome">${esc(m.diplome)}</span>
            </div>
            <div class="mc-body">
                ${m.niveau ? `<span class="mc-niveau" style="background:${nv.bg};color:${nv.tx}">${esc(m.niveau)}</span>` : ''}
                <h3 class="mc-titre">${esc(m.titre)}</h3>
                ${m.description ? `<p class="mc-desc">${esc(m.description)}</p>` : ''}
            </div>
            <div class="mc-footer">
                <span><i class="fas fa-layer-group"></i> ${seqs} séq.</span>
                <span><i class="fas fa-file-alt"></i> ${seances} séance${seances>1?'s':''}</span>
                <span class="mc-cta">Ouvrir <i class="fas fa-arrow-right"></i></span>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// PAGE 2 — matiere.html
// ============================================================
let currentMatiere = null;

async function initMatierePage() {
    const param = getMatiereParam();
    if (!param) { showErrMatiere(); return; }

    try {
        let snap = null;
        if (param.type === 'slug') {
            const q = await getDocs(query(collection(db,'matieres'), where('slug','==',param.value)));
            if (q.empty) { showErrMatiere(); return; }
            snap = q.docs[0];
        } else {
            const d = await getDoc(doc(db,'matieres',param.value));
            if (!d.exists()) { showErrMatiere(); return; }
            snap = d;
        }
        currentMatiere = { id: snap.id, ...snap.data() };
        renderMatiere();
    } catch(e) { console.error(e); showErrMatiere(); }
}

function getMatiereParam() {
    const rp = sessionStorage.getItem('redirect_path');
    if (rp) {
        sessionStorage.removeItem('redirect_path');
        const parts = rp.split('/').filter(Boolean);
        if (parts[0] === 'matiere' && parts[1]) return { type:'slug', value: decodeURIComponent(parts[1]) };
    }
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'matiere' && parts[1]) return { type:'slug', value: decodeURIComponent(parts[1]) };
    const id = new URLSearchParams(location.search).get('id');
    if (id) return { type:'id', value: id };
    return null;
}

function renderMatiere() {
    hide('loadingState');
    show('matiereContainer');
    document.title = `${currentMatiere.titre} | ElectroInfo`;

    setText('matiereDiplome',     currentMatiere.diplome || '');
    setText('matiereNiveau',      currentMatiere.niveau  || '');
    setText('matiereTitle',       currentMatiere.titre   || '');
    setText('matiereDescription', currentMatiere.description || '');

    const seqs  = currentMatiere.sequences || [];
    let seances = 0;
    seqs.forEach(s => seances += s.seances?.length || 0);
    setText('seqCount',    seqs.length);
    setText('seanceCount', seances);

    renderSequencesNav(seqs);
    renderSequences(seqs);
}

function renderSequencesNav(seqs) {
    const nav = $('sequencesNav');
    if (!nav) return;
    if (!seqs.length) { nav.innerHTML = '<p style="color:#9ca3af;font-size:.9rem;padding:1rem;">Aucune s\u00e9quence</p>'; return; }
    nav.innerHTML = seqs.map((s,i) => `
        <div class="seq-nav-item" onclick="scrollToSeq(${i})">
            <i class="fas fa-chevron-right"></i>
            ${esc(s.titre || `S\u00e9quence ${i+1}`)}
        </div>`).join('');
}

function renderSequences(seqs) {
    const box = $('sequencesContainer');
    if (!seqs.length) { show('emptySequences'); return; }
    hide('emptySequences');

    box.innerHTML = seqs.map((seq, si) => `
        <div class="sequence-block" id="seq-${si}">
            <div class="sequence-header" onclick="toggleSeq(${si})">
                <div class="seq-info">
                    <span class="seq-num">S\u00e9quence ${si+1}</span>
                    <h2 class="seq-title">${esc(seq.titre || `S\u00e9quence ${si+1}`)}</h2>
                </div>
                <button class="seq-toggle-btn" id="seq-toggle-${si}">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="seances-list" id="seances-${si}">
                ${renderSeanceItems(seq.seances || [], si)}
            </div>
        </div>`).join('');
}

function renderSeanceItems(seances, si) {
    if (!seances.length) return `
        <div class="empty-seances">
            <i class="fas fa-inbox"></i>
            <p>Aucune s\u00e9ance dans cette s\u00e9quence</p>
        </div>`;

    return seances.map((sc, ssi) => {
        const url = currentMatiere.slug
            ? `/seance/${currentMatiere.slug}/seq-${si+1}/s-${ssi+1}`
            : `/seance.html?matiereId=${currentMatiere.id}&seqIndex=${si}&seanceIndex=${ssi}`;
        return `
        <div class="seance-item" onclick="location.href='${url}'">
            <div class="seance-item-icon"><i class="fas fa-play"></i></div>
            <div class="seance-item-info">
                <span class="seance-num">S\u00e9ance ${ssi+1}</span>
                <h4>${esc(sc.titre || `S\u00e9ance ${ssi+1}`)}</h4>
                ${sc.pdfUrl ? `<span class="has-pdf"><i class="fas fa-file-pdf"></i> PDF</span>` : ''}
            </div>
            <i class="fas fa-chevron-right seance-arrow"></i>
        </div>`;
    }).join('');
}

window.toggleSeq = function(i) {
    const list = $(`seances-${i}`);
    const btn  = $(`seq-toggle-${i}`);
    if (!list) return;
    const open = list.style.display !== 'none';
    list.style.display = open ? 'none' : 'block';
    if (btn) btn.querySelector('i').className = open ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
};

window.scrollToSeq = function(i) {
    $(`seq-${i}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
    document.querySelectorAll('.seq-nav-item').forEach((el, idx) =>
        el.classList.toggle('active', idx === i));
};

function showErrMatiere() {
    hide('loadingState');
    show('errorState');
}

// ============================================================
// PAGE 3 — seance.html
// ============================================================
let sdMatiere   = null;
let sdSeqIdx    = 0;
let sdSeanceIdx = 0;

async function initSeancePage() {
    const params = getSeanceParams();
    if (!params) { sdShowError('Param\u00e8tres manquants.'); return; }

    sdSeqIdx    = params.seqIndex;
    sdSeanceIdx = params.seanceIndex;

    try {
        let snap = null;
        if (params.slug) {
            const q = await getDocs(query(collection(db,'matieres'), where('slug','==',params.slug)));
            if (q.empty) { sdShowError('Mati\u00e8re introuvable.'); return; }
            snap = q.docs[0];
        } else if (params.matiereId) {
            const d = await getDoc(doc(db,'matieres',params.matiereId));
            if (!d.exists()) { sdShowError('Mati\u00e8re introuvable.'); return; }
            snap = d;
        } else { sdShowError('Mati\u00e8re non sp\u00e9cifi\u00e9e.'); return; }

        sdMatiere = { id: snap.id, ...snap.data() };
        sdRender();
    } catch(e) { console.error(e); sdShowError('Erreur r\u00e9seau.'); }
}

function getSeanceParams() {
    const rp = sessionStorage.getItem('redirect_path');
    if (rp) {
        sessionStorage.removeItem('redirect_path');
        const parts = rp.split('/').filter(Boolean);
        if (parts[0] === 'seance' && parts[1]) {
            return {
                slug:       decodeURIComponent(parts[1]),
                seqIndex:   parseInt((parts[2]||'seq-1').replace('seq-','')) - 1,
                seanceIndex:parseInt((parts[3]||'s-1').replace('s-','')) - 1
            };
        }
        const qi = rp.indexOf('?');
        if (qi !== -1) {
            const p = new URLSearchParams(rp.slice(qi));
            return {
                matiereId:  p.get('matiereId'),
                seqIndex:   parseInt(p.get('seqIndex'))   || 0,
                seanceIndex:parseInt(p.get('seanceIndex')) || 0
            };
        }
    }

    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'seance' && parts[1]) {
        return {
            slug:       decodeURIComponent(parts[1]),
            seqIndex:   parseInt((parts[2]||'seq-1').replace('seq-','')) - 1,
            seanceIndex:parseInt((parts[3]||'s-1').replace('s-','')) - 1
        };
    }

    const p = new URLSearchParams(location.search);
    const matiereId = p.get('matiereId');
    if (!matiereId) return null;
    return {
        matiereId,
        seqIndex:    parseInt(p.get('seqIndex'))   || 0,
        seanceIndex: parseInt(p.get('seanceIndex')) || 0
    };
}

function sdRender() {
    hide('loadingState');
    show('seancePage');
    const backUrl = sdMatiere.slug ? `/matiere/${sdMatiere.slug}` : `/matiere.html?id=${sdMatiere.id}`;
    setAttr('backButton', 'href', backUrl);
    sdRenderSeance();
}

function sdRenderSeance() {
    const seqs   = sdMatiere.sequences || [];
    const seq    = seqs[sdSeqIdx];
    const seance = seq?.seances?.[sdSeanceIdx];

    document.title = `${seance?.titre || 'S\u00e9ance'} | ElectroInfo`;
    setText('seanceBadge', `S\u00e9ance ${sdSeanceIdx + 1}`);
    setText('seqBadge',    `S\u00e9quence ${sdSeqIdx + 1}`);
    setText('seanceTitle', seance?.titre || `S\u00e9ance ${sdSeanceIdx + 1}`);

    const content = $('seanceContent');
    if (content) {
        content.innerHTML = seance?.contenu ||
            `<div style="text-align:center;padding:4rem;color:#94a3b8;">
                <i class="fas fa-inbox" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                <p>Aucun contenu pour cette s\u00e9ance.</p>
            </div>`;
    }

    if (seance?.pdfUrl) {
        show('pdfSection');
        setAttr('pdfDownloadBtn', 'href', seance.pdfUrl);
    } else {
        hide('pdfSection');
    }

    sdUpdateNav();
}

function sdUpdateNav() {
    const seqs    = sdMatiere.sequences || [];
    const prevBtn = $('prevSeanceBtn');
    const nextBtn = $('nextSeanceBtn');

    const makeUrl = (si, ssi) => sdMatiere.slug
        ? `/seance/${sdMatiere.slug}/seq-${si+1}/s-${ssi+1}`
        : `/seance.html?matiereId=${sdMatiere.id}&seqIndex=${si}&seanceIndex=${ssi}`;

    let prevHref = null;
    if (sdSeanceIdx > 0) {
        prevHref = makeUrl(sdSeqIdx, sdSeanceIdx - 1);
    } else if (sdSeqIdx > 0) {
        const prevLen = seqs[sdSeqIdx - 1]?.seances?.length || 0;
        if (prevLen > 0) prevHref = makeUrl(sdSeqIdx - 1, prevLen - 1);
    }

    let nextHref = null;
    const curLen = seqs[sdSeqIdx]?.seances?.length || 0;
    if (sdSeanceIdx < curLen - 1) {
        nextHref = makeUrl(sdSeqIdx, sdSeanceIdx + 1);
    } else if (sdSeqIdx < seqs.length - 1) {
        if ((seqs[sdSeqIdx + 1]?.seances?.length || 0) > 0) nextHref = makeUrl(sdSeqIdx + 1, 0);
    }

    if (prevBtn) { prevBtn.href = prevHref || '#'; prevBtn.classList.toggle('disabled', !prevHref); }
    if (nextBtn) { nextBtn.href = nextHref || '#'; nextBtn.classList.toggle('disabled', !nextHref); }
}

function sdShowError(msg) {
    const ls = $('loadingState');
    if (ls) ls.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:2.5rem;"></i>
        <p style="font-weight:600;margin-top:1rem;">${msg}</p>
        <a href="/courses" style="margin-top:1rem;padding:.6rem 1.5rem;background:#1d4ed8;
           color:white;border-radius:7px;text-decoration:none;font-weight:700;
           display:inline-flex;align-items:center;gap:.5rem;">
            <i class="fas fa-arrow-left"></i> Retour aux cours
        </a>`;
}

console.log(`\u2705 courses.js charg\u00e9 \u2014 page: ${PAGE}`);
