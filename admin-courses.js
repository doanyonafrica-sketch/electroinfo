// admin-courses.js — Gestion des matières (nouvelle structure)
// Collection Firestore : matieres
// Structure : { titre, diplome, niveau, description, slug, createdAt,
//               sequences: [{ titre, seances: [{ titre, contenu, pdfUrl }] }] }

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }
    from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc,
         doc, getDoc, query, orderBy, serverTimestamp }
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

// ── Utilitaires ───────────────────────────────────────────
const $    = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');

function toast(msg, type = '') {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast ${type}`;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function generateSlug(titre, diplome) {
    return (diplome + '-' + titre)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ── Auth guard ─────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
    if (!user) { location.href = '/auth'; return; }
    try {
        const ud = await getDoc(doc(db, 'users', user.uid));
        if (!ud.exists() || !['admin','superadmin'].includes(ud.data().role)) {
            location.href = '/'; return;
        }
    } catch(_) { location.href = '/'; return; }
    init();
});

$('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.href = '/auth'; });

// ============================================================
// ÉTAT
// ============================================================
let allMatieres   = [];
let editingId     = null;   // null = création, string = édition
let sequences     = [];     // état du builder

// ============================================================
// INIT
// ============================================================
function init() {
    loadMatieres();

    $('btnNouvelleMatiere')?.addEventListener('click', () => openForm(null));
    $('btnRetourListe')?.addEventListener('click', showList);
    $('btnAnnuler')?.addEventListener('click', showList);
    $('btnAjouterSeq')?.addEventListener('click', addSequence);
    $('btnSauvegarder')?.addEventListener('click', saveMatiere);
    $('filterDiplome')?.addEventListener('change', renderTable);
    $('searchMatieres')?.addEventListener('input', renderTable);
    $('modalCancel')?.addEventListener('click', () => hide('modalConfirm'));
}

// ============================================================
// CHARGEMENT
// ============================================================
async function loadMatieres() {
    show('matieres-loading-admin');
    hide('matieres-table-wrap');
    try {
        const snap = await getDocs(query(collection(db, 'matieres'), orderBy('createdAt', 'desc')));
        allMatieres = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
        console.error(e);
        toast('Erreur de chargement', 'error');
        allMatieres = [];
    }
    hide('matieres-loading-admin');
    show('matieres-table-wrap');
    renderTable();
}

// ============================================================
// TABLEAU
// ============================================================
function renderTable() {
    const diplome = $('filterDiplome')?.value || '';
    const search  = ($('searchMatieres')?.value || '').toLowerCase().trim();

    let list = allMatieres;
    if (diplome) list = list.filter(m => m.diplome === diplome);
    if (search)  list = list.filter(m => (m.titre||'').toLowerCase().includes(search));

    const tbody = $('matieres-tbody');
    if (!list.length) {
        tbody.innerHTML = '';
        show('matieres-empty-admin');
        return;
    }
    hide('matieres-empty-admin');

    tbody.innerHTML = list.map(m => {
        const seqs   = m.sequences?.length || 0;
        let seances  = 0;
        m.sequences?.forEach(s => seances += s.seances?.length || 0);
        return `
        <tr>
            <td class="td-titre">
                ${escHtml(m.titre)}
                <small>${escHtml(m.slug || m.id)}</small>
            </td>
            <td><span class="badge-diplome">${escHtml(m.diplome||'')}</span></td>
            <td><span class="badge-niveau">${escHtml(m.niveau||'')}</span></td>
            <td>${seqs}</td>
            <td>${seances}</td>
            <td>
                <div class="btn-actions">
                    <button class="btn btn-outline btn-sm" onclick="editMatiere('${m.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete('${m.id}','${escHtml(m.titre)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function escHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

// ============================================================
// VUES
// ============================================================
function showList() {
    show('view-list');
    hide('view-form');
    loadMatieres();
}

function openForm(matiere) {
    editingId = matiere ? matiere.id : null;
    $('form-title').textContent = matiere ? 'Modifier la matière' : 'Nouvelle matière';

    // Remplir les champs
    $('fTitre').value       = matiere?.titre       || '';
    $('fDiplome').value     = matiere?.diplome      || '';
    $('fNiveau').value      = matiere?.niveau       || 'Débutant';
    $('fDescription').value = matiere?.description  || '';

    // Builder séquences
    sequences = matiere?.sequences
        ? JSON.parse(JSON.stringify(matiere.sequences))  // deep clone
        : [];
    renderBuilder();

    hide('view-list');
    show('view-form');
    window.scrollTo(0, 0);
}

window.editMatiere = function(id) {
    const m = allMatieres.find(x => x.id === id);
    if (m) openForm(m);
};

// ============================================================
// BUILDER SÉQUENCES
// ============================================================
function renderBuilder() {
    const box = $('sequences-builder');
    if (!sequences.length) {
        box.innerHTML = '';
        show('seq-empty');
        return;
    }
    hide('seq-empty');

    box.innerHTML = sequences.map((seq, si) => `
        <div class="seq-block" id="seq-block-${si}">
            <div class="seq-block-header">
                <span class="seq-block-num">Séquence ${si+1}</span>
                <input type="text" placeholder="Titre de la séquence" value="${escHtml(seq.titre||'')}"
                    oninput="updateSeqTitre(${si}, this.value)">
                <button class="btn-remove-seq" onclick="removeSeq(${si})" title="Supprimer">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="seances-builder" id="seances-builder-${si}">
                ${renderSeancesBuilder(seq.seances || [], si)}
                <button class="btn-add-seance" onclick="addSeance(${si})">
                    <i class="fas fa-plus"></i> Ajouter une séance
                </button>
            </div>
        </div>`).join('');
}

function renderSeancesBuilder(seances, si) {
    return seances.map((sc, ssi) => `
        <div class="seance-row" id="seance-row-${si}-${ssi}">
            <span class="seance-row-num">${ssi+1}</span>
            <input type="text" placeholder="Titre de la séance" value="${escHtml(sc.titre||'')}"
                oninput="updateSeanceTitre(${si},${ssi},this.value)">
            <input type="url" placeholder="URL PDF (optionnel)" value="${escHtml(sc.pdfUrl||'')}"
                oninput="updateSeancePdf(${si},${ssi},this.value)">
            <button class="btn-edit-content" onclick="openContentEditor(${si},${ssi})">
                <i class="fas fa-pen"></i>
                ${sc.contenu ? 'Modifier' : 'Ajouter'} le contenu
            </button>
            <button class="btn-remove-seance" onclick="removeSeance(${si},${ssi})" title="Supprimer">
                <i class="fas fa-times"></i>
            </button>
        </div>`).join('');
}

function addSequence() {
    sequences.push({ titre: '', seances: [] });
    renderBuilder();
    // Scroll vers la nouvelle séquence
    setTimeout(() => {
        $(`seq-block-${sequences.length-1}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 100);
}

window.removeSeq = function(si) {
    sequences.splice(si, 1);
    renderBuilder();
};

window.updateSeqTitre = function(si, val) {
    if (sequences[si]) sequences[si].titre = val;
};

window.addSeance = function(si) {
    if (!sequences[si]) return;
    sequences[si].seances = sequences[si].seances || [];
    sequences[si].seances.push({ titre: '', contenu: '', pdfUrl: '' });
    renderBuilder();
};

window.removeSeance = function(si, ssi) {
    sequences[si]?.seances?.splice(ssi, 1);
    renderBuilder();
};

window.updateSeanceTitre = function(si, ssi, val) {
    if (sequences[si]?.seances?.[ssi]) sequences[si].seances[ssi].titre = val;
};

window.updateSeancePdf = function(si, ssi, val) {
    if (sequences[si]?.seances?.[ssi]) sequences[si].seances[ssi].pdfUrl = val;
};

// ── Éditeur de contenu HTML ────────────────────────────────
let editorSi  = null;
let editorSsi = null;

window.openContentEditor = function(si, ssi) {
    editorSi  = si;
    editorSsi = ssi;
    const contenu = sequences[si]?.seances?.[ssi]?.contenu || '';

    // Crée l'overlay si pas encore présent
    let overlay = $('contentEditorOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'contentEditorOverlay';
        overlay.className = 'content-editor-overlay';
        overlay.innerHTML = `
            <div class="content-editor-box">
                <div class="content-editor-header">
                    <h3><i class="fas fa-code"></i> Contenu de la séance (HTML)</h3>
                    <button class="btn-close-editor" id="btnCloseEditor">✕</button>
                </div>
                <div class="content-editor-body">
                    <textarea id="contentEditorTextarea" placeholder="Entrez le contenu HTML de la séance..."></textarea>
                </div>
                <div class="content-editor-footer">
                    <button class="btn btn-outline" id="btnCancelEditor">Annuler</button>
                    <button class="btn btn-primary" id="btnSaveEditor">
                        <i class="fas fa-check"></i> Valider
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        $('btnCloseEditor')?.addEventListener('click', closeContentEditor);
        $('btnCancelEditor')?.addEventListener('click', closeContentEditor);
        $('btnSaveEditor')?.addEventListener('click', saveContentEditor);
    }

    $('contentEditorTextarea').value = contenu;
    overlay.classList.remove('hidden');
};

function closeContentEditor() {
    $('contentEditorOverlay')?.classList.add('hidden');
}

function saveContentEditor() {
    if (editorSi === null || editorSsi === null) return;
    const val = $('contentEditorTextarea').value;
    if (sequences[editorSi]?.seances?.[editorSsi]) {
        sequences[editorSi].seances[editorSsi].contenu = val;
        // Met à jour le libellé du bouton
        renderBuilder();
    }
    closeContentEditor();
}

// ============================================================
// SAUVEGARDE
// ============================================================
async function saveMatiere() {
    const titre       = $('fTitre').value.trim();
    const diplome     = $('fDiplome').value;
    const niveau      = $('fNiveau').value;
    const description = $('fDescription').value.trim();

    if (!titre)   { toast('Le titre est obligatoire', 'error'); return; }
    if (!diplome) { toast('Le diplôme est obligatoire', 'error'); return; }

    const slug = generateSlug(titre, diplome);
    const btn  = $('btnSauvegarder');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';

    // Nettoyer les séquences (supprimer champs vides)
    const cleanSeqs = sequences.map(seq => ({
        titre: seq.titre || '',
        seances: (seq.seances || []).map(sc => ({
            titre:   sc.titre   || '',
            contenu: sc.contenu || '',
            pdfUrl:  sc.pdfUrl  || ''
        }))
    }));

    const data = { titre, diplome, niveau, description, slug, sequences: cleanSeqs };

    try {
        if (editingId) {
            await updateDoc(doc(db, 'matieres', editingId), data);
            toast('Matière mise à jour ✓', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'matieres'), data);
            toast('Matière créée ✓', 'success');
        }
        showList();
    } catch(e) {
        console.error(e);
        toast('Erreur lors de la sauvegarde', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
    }
}

// ============================================================
// SUPPRESSION
// ============================================================
let deleteId = null;

window.confirmDelete = function(id, titre) {
    deleteId = id;
    $('modalMsg').textContent = `Supprimer "${titre}" ? Cette action est irréversible.`;
    show('modalConfirm');
};

$('modalConfirmBtn')?.addEventListener('click', async () => {
    if (!deleteId) return;
    hide('modalConfirm');
    try {
        await deleteDoc(doc(db, 'matieres', deleteId));
        toast('Matière supprimée', 'success');
        allMatieres = allMatieres.filter(m => m.id !== deleteId);
        renderTable();
    } catch(e) {
        console.error(e);
        toast('Erreur lors de la suppression', 'error');
    }
    deleteId = null;
});

console.log('\u2705 admin-courses.js charg\u00e9');
