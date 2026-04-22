// admin-courses.js — Gestion des matières (Matière → Séquences → Séances)
// Collection Firestore : matieres
// Champs séance : titre, contenu (pas content), pdfUrl, pdfMethod, contentMode

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, doc, getDoc,
    addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getStorage, ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
const storage = getStorage(app);

let currentUser    = null;
let currentMatiereId = null;
let allMatieres    = [];

// ============================================
// AUTH
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'auth.html'; return; }
    currentUser = user;
    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.data()?.role;
        if (!snap.exists() || !['admin','superadmin'].includes(role)) {
            alert('Accès refusé.'); window.location.href = 'index.html'; return;
        }
        loadMatieres();
    } catch(e) { window.location.href = 'index.html'; }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth); window.location.href = 'index.html';
});

// ============================================
// ONGLETS
// ============================================
window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[onclick*="switchTab('${tab}')"]`)?.classList.add('active');
    document.getElementById('matieresListTab').classList.toggle('hidden', tab !== 'list');
    document.getElementById('matiereFormTab').classList.toggle('hidden', tab !== 'form');
};

// ============================================
// CHARGER LA LISTE DES MATIÈRES
// ============================================
async function loadMatieres() {
    try {
        const q = query(collection(db, 'matieres'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        allMatieres = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTable(allMatieres);
    } catch(e) {
        console.error('Erreur chargement matieres:', e);
        document.getElementById('loadingState').innerHTML = '<p style="color:red">Erreur de chargement. Vérifiez votre connexion.</p>';
    }
}

function renderTable(list) {
    const loading = document.getElementById('loadingState');
    const empty   = document.getElementById('emptyState');
    const table   = document.getElementById('matieresTable');
    const tbody   = document.getElementById('matieresTableBody');

    loading.classList.add('hidden');

    if (!list.length) {
        empty.classList.remove('hidden');
        table.style.display = 'none';
        return;
    }
    empty.classList.add('hidden');
    table.style.display = 'table';

    tbody.innerHTML = list.map(m => {
        const seqs   = m.sequences || [];
        const nbSeq  = seqs.length;
        const nbSeance = seqs.reduce((t, s) => t + (s.seances?.length || 0), 0);
        return `
        <tr>
            <td><strong>${m.titre || ''}</strong><br><small style="color:#9ca3af;">${m.slug || ''}</small></td>
            <td><span class="badge">${m.diplome || ''}</span></td>
            <td><span class="badge badge-info">${m.niveau || ''}</span></td>
            <td>${nbSeq} séquence${nbSeq>1?'s':''}</td>
            <td>${nbSeance} séance${nbSeance>1?'s':''}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editMatiere('${m.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-delete" onclick="deleteMatiere('${m.id}','${(m.titre||'').replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Filtrage
window.filterMatieres = function() {
    const dip = document.getElementById('filterDiplome').value;
    const niv = document.getElementById('filterNiveau').value;
    const q   = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allMatieres.filter(m =>
        (!dip || m.diplome === dip) &&
        (!niv || m.niveau  === niv) &&
        (!q   || (m.titre||'').toLowerCase().includes(q))
    );
    renderTable(filtered);
};

// ============================================
// OUVRIR FORMULAIRE NOUVELLE MATIÈRE
// ============================================
window.openNewMatiereForm = function() {
    currentMatiereId = null;
    document.getElementById('formTitle').textContent = 'Créer une nouvelle matière';
    document.getElementById('matiereForm').reset();
    document.getElementById('sequencesContainer').innerHTML = '';
    window._cmInstances = {};
    window._wySessionInited = {};
    window._wySessionSelImg = {};
    switchTab('form');
};

// ============================================
// ÉDITER UNE MATIÈRE
// ============================================
window.editMatiere = async function(id) {
    try {
        const snap = await getDoc(doc(db, 'matieres', id));
        if (!snap.exists()) { alert('Matière introuvable.'); return; }
        const m = snap.data();
        currentMatiereId = id;

        document.getElementById('formTitle').textContent = 'Modifier la matière';
        document.getElementById('matiereTitle').value       = m.titre        || '';
        document.getElementById('matiereDescription').value = m.description  || '';
        document.getElementById('matiereDiploma').value     = m.diplome      || '';
        document.getElementById('matiereLevel').value       = m.niveau       || 'Débutant';

        // Reconstruire séquences
        document.getElementById('sequencesContainer').innerHTML = '';
        window._cmInstances = {};
        window._wySessionInited = {};
        window._wySessionSelImg = {};

        (m.sequences || []).forEach((seq, i) => addSequenceToForm(seq, i));
        switchTab('form');
    } catch(e) { console.error('Erreur edit:', e); alert('Erreur lors du chargement.'); }
};

// ============================================
// SUPPRIMER UNE MATIÈRE
// ============================================
window.deleteMatiere = async function(id, titre) {
    if (!confirm(`Supprimer "${titre}" ? Cette action est irréversible.`)) return;
    try {
        await deleteDoc(doc(db, 'matieres', id));
        showToast('Matière supprimée', 'ok');
        loadMatieres();
    } catch(e) { showToast('Erreur suppression', 'err'); }
};

function showToast(msg, type='ok') {
    let t = document.getElementById('_toast');
    if (!t) { t = document.createElement('div'); t.id = '_toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:2rem;right:2rem;z-index:9999;padding:.875rem 1.5rem;border-radius:10px;font-weight:700;color:white;background:${type==='ok'?'#065f46':'#991b1b'};box-shadow:0 8px 24px rgba(0,0,0,.3);`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

// ============================================
// AJOUTER UNE SÉQUENCE
// ============================================
window.addSequence = function() {
    const existing = document.querySelectorAll('.sequence-item').length;
    addSequenceToForm(null, existing);
};

function addSequenceToForm(sequenceData = null, index = 0) {
    const container = document.getElementById('sequencesContainer');
    const div = document.createElement('div');
    div.className = 'sequence-item';
    div.dataset.index = index;

    // Construire les séances : noter que le champ s'appelle "seances" (pas sessions)
    const seancesHtml = (sequenceData?.seances || [])
        .map((s, si) => createSeanceHtml(index, si, s))
        .join('');

    div.innerHTML = `
        <div class="sequence-header">
            <h4>Séquence ${index + 1}</h4>
            <button type="button" onclick="removeSequence(this)" class="btn-remove">
                <i class="fas fa-times"></i> Supprimer la séquence
            </button>
        </div>
        <div class="form-group">
            <label>Titre de la séquence</label>
            <input type="text" class="sequence-title" value="${escapeHtml(sequenceData?.titre || '')}" placeholder="Ex: Introduction à l'électricité">
        </div>
        <div class="seances-container" id="seances-${index}">${seancesHtml}</div>
        <button type="button" onclick="addSeance(${index})" class="btn btn-secondary" style="margin-top:.5rem;">
            <i class="fas fa-plus"></i> Ajouter une séance
        </button>
    `;
    container.appendChild(div);

    // Init CodeMirror pour séances HTML existantes
    (sequenceData?.seances || []).forEach((s, si) => {
        const content = s?.contenu || '';
        const isHtml  = content.trim().startsWith('<') || content.includes('<p>');
        const mode    = s?.contentMode || (isHtml ? 'html' : 'plain');
        if (mode === 'html') {
            setTimeout(() => initCodeMirrorForSeance(`cm-editor-${index}-${si}`, `cm-hidden-${index}-${si}`), 80);
        }
    });
}

// ============================================
// HTML D'UNE SÉANCE (avec éditeur WYSIWYG + CodeMirror)
// ============================================
function createSeanceHtml(seqIndex, seanceIndex, seanceData = null) {
    const pdfMethod = seanceData?.pdfMethod || 'none';
    const pdfValue  = seanceData?.pdfUrl    || '';
    const githubFilename = pdfMethod === 'github' ? pdfValue.replace(/^cours-pdf\//, '') : '';
    const firebaseExistingUrl = pdfMethod === 'firebase' ? pdfValue : '';
    const editorId  = `cm-editor-${seqIndex}-${seanceIndex}`;
    const hiddenId  = `cm-hidden-${seqIndex}-${seanceIndex}`;
    const plainId   = `plain-${seqIndex}-${seanceIndex}`;
    // IMPORTANT : champ "contenu" (pas "content")
    const content   = seanceData?.contenu || '';
    const isHtml    = content.trim().startsWith('<') || content.includes('<p>') || content.includes('<div>');
    const initialMode = seanceData?.contentMode || (isHtml ? 'html' : 'plain');

    return `
    <div class="session-item" data-seq="${seqIndex}" data-session="${seanceIndex}">
        <div class="session-header">
            <h5>Séance ${seanceIndex + 1}</h5>
            <button type="button" onclick="removeSeance(this)" class="btn-remove-small"><i class="fas fa-times"></i></button>
        </div>
        <div class="form-group">
            <label>Titre de la séance</label>
            <input type="text" class="session-title" value="${escapeHtml(seanceData?.titre || '')}" placeholder="Ex: Les bases de l'électricité">
        </div>

        <!-- ÉDITEUR CONTENU -->
        <div class="form-group">
            <label>Contenu de la séance</label>
            <div class="session-mode-selector">
                <button type="button" class="session-mode-btn ${initialMode === 'plain' ? 'active' : ''}"
                    id="btn-plain-${seqIndex}-${seanceIndex}"
                    onclick="switchSeanceMode('${seqIndex}', '${seanceIndex}', 'plain')">
                    <i class="fas fa-align-left"></i> Texte Normal
                </button>
                <button type="button" class="session-mode-btn ${initialMode === 'html' ? 'active' : ''}"
                    id="btn-html-${seqIndex}-${seanceIndex}"
                    onclick="switchSeanceMode('${seqIndex}', '${seanceIndex}', 'html')">
                    <i class="fas fa-code"></i> HTML / Éditeur Word
                </button>
            </div>

            <!-- MODE TEXTE SIMPLE -->
            <div id="plain-section-${seqIndex}-${seanceIndex}" ${initialMode !== 'plain' ? 'style="display:none;"' : ''}>
                <textarea id="${plainId}" class="session-plain-textarea"
                    placeholder="Rédigez le contenu de la séance...">${initialMode === 'plain' ? escapeHtml(content) : ''}</textarea>
            </div>

            <!-- MODE HTML + WYSIWYG -->
            <div id="html-section-${seqIndex}-${seanceIndex}" ${initialMode !== 'html' ? 'style="display:none;"' : ''}>
                <div style="display:flex;border-bottom:2px solid #282a36;margin-bottom:0;">
                    <button type="button" class="sub-tab-btn active"
                        id="sub-code-${seqIndex}-${seanceIndex}"
                        onclick="switchSeanceSubTab(${seqIndex},${seanceIndex},'code')">
                        <i class="fas fa-code"></i> Code HTML
                    </button>
                    <button type="button" class="sub-tab-btn"
                        id="sub-wy-${seqIndex}-${seanceIndex}"
                        onclick="switchSeanceSubTab(${seqIndex},${seanceIndex},'wy')">
                        <i class="fas fa-edit"></i> Éditeur Word
                    </button>
                </div>

                <!-- Pane CODE -->
                <div id="code-pane-${seqIndex}-${seanceIndex}">
                    <div class="editor-toolbar">
                        <span class="editor-label"><i class="fas fa-code"></i> HTML de la séance</span>
                        <div class="editor-actions">
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','heading')">H2</button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','paragraph')"><i class="fas fa-paragraph"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','table')"><i class="fas fa-table"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','image')"><i class="fas fa-image"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','list')"><i class="fas fa-list"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','alert')"><i class="fas fa-exclamation-circle"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}','grid')"><i class="fas fa-th"></i></button>
                            <button type="button" class="editor-btn btn-format" onclick="formatCode('${editorId}')"><i class="fas fa-magic"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSimulationLink('${editorId}')" style="background:#7c3aed;color:white;">⚡ Simulation</button>
                        </div>
                    </div>
                    <div class="editor-container">
                        <div id="${editorId}" class="codemirror-wrapper"></div>
                        <textarea id="${hiddenId}" class="session-content" style="display:none;">${initialMode === 'html' ? escapeHtml(content) : ''}</textarea>
                    </div>
                    <div class="editor-footer">
                        <span class="char-count" id="count-${editorId}">0 caractères</span>
                        <span class="editor-hint">💡 HTML complet — tables, flex, grid, images, styles inline</span>
                    </div>
                </div>

                <!-- Pane WYSIWYG -->
                <div id="wy-pane-${seqIndex}-${seanceIndex}" style="display:none;">
                    <div class="wy-wrap" id="wy-wrap-${seqIndex}-${seanceIndex}"
                        style="border:2px solid #e2e8f0;border-radius:10px;overflow:visible;background:#fff;position:relative;">
                        <div class="wy-toolbar wy-toolbar-session" id="wy-tb-${seqIndex}-${seanceIndex}"></div>
                        <div class="wy-body" id="wy-body-${seqIndex}-${seanceIndex}"
                            contenteditable="true" spellcheck="false"
                            data-ph="Commencez à écrire..."
                            data-seq="${seqIndex}" data-sess="${seanceIndex}"></div>
                        <div class="wy-drop" id="wy-drop-${seqIndex}-${seanceIndex}">
                            <i class="fas fa-image"></i><span>Dépose l'image ici</span>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:.35rem .5rem;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;font-size:.75rem;color:#9ca3af;">
                        <span>💡 Toolbar sticky — défile, les outils restent visibles</span>
                        <span id="wy-count-${seqIndex}-${seanceIndex}">0 car.</span>
                    </div>
                </div>
            </div>

            <!-- Mode caché -->
            <input type="hidden" class="session-content-mode" value="${initialMode}">
        </div>

        <!-- PDF -->
        <div class="form-group pdf-methods">
            <label>📄 Document PDF (optionnel)</label>
            <div class="pdf-method-selector">
                <label class="radio-option"><input type="radio" name="pdf-method-${seqIndex}-${seanceIndex}" value="none" ${pdfMethod==='none'?'checked':''} onchange="changePdfMethod(this,${seqIndex},${seanceIndex})"><span>🚫 Aucun PDF</span></label>
                <label class="radio-option"><input type="radio" name="pdf-method-${seqIndex}-${seanceIndex}" value="github" ${pdfMethod==='github'?'checked':''} onchange="changePdfMethod(this,${seqIndex},${seanceIndex})"><span>📁 Dossier GitHub</span></label>
                <label class="radio-option"><input type="radio" name="pdf-method-${seqIndex}-${seanceIndex}" value="firebase" ${pdfMethod==='firebase'?'checked':''} onchange="changePdfMethod(this,${seqIndex},${seanceIndex})"><span>🔥 Firebase Storage</span></label>
                <label class="radio-option"><input type="radio" name="pdf-method-${seqIndex}-${seanceIndex}" value="url" ${pdfMethod==='url'?'checked':''} onchange="changePdfMethod(this,${seqIndex},${seanceIndex})"><span>🔗 URL externe</span></label>
            </div>
            <div class="pdf-input pdf-github ${pdfMethod==='github'?'':'hidden'}" data-method="github">
                <label>Nom du fichier dans cours-pdf/</label>
                <input type="text" class="pdf-github-path" value="${githubFilename}" placeholder="Ex: electricite-chap1.pdf">
                <small>📁 Fichier dans <code>cours-pdf/</code> sur GitHub</small>
            </div>
            <div class="pdf-input pdf-firebase ${pdfMethod==='firebase'?'':'hidden'}" data-method="firebase">
                <input type="file" class="pdf-firebase-file" accept=".pdf">
                ${seanceData?.pdfUrl && pdfMethod==='firebase' ? `<div class="current-file"><i class="fas fa-file-pdf"></i> <a href="${seanceData.pdfUrl}" target="_blank">PDF actuel</a></div>` : ''}
                <input type="hidden" class="pdf-firebase-url" value="${firebaseExistingUrl}">
            </div>
            <div class="pdf-input pdf-url ${pdfMethod==='url'?'':'hidden'}" data-method="url">
                <label>URL complète du PDF</label>
                <input type="url" class="pdf-url-input" value="${pdfMethod==='url'?pdfValue:''}" placeholder="https://example.com/document.pdf">
            </div>
        </div>
    </div>`;
}

// ============================================
// INIT CODEMIRROR
// ============================================
window.initCodeMirrorForSeance = function(editorId, hiddenId) {
    const wrapper = document.getElementById(editorId);
    const hidden  = document.getElementById(hiddenId);
    if (!wrapper || !hidden) return;

    const textarea = document.createElement('textarea');
    textarea.value = hidden.value
        ? hidden.value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"')
        : '';
    wrapper.appendChild(textarea);

    const cm = CodeMirror.fromTextArea(textarea, {
        mode: 'htmlmixed', theme: 'dracula', lineNumbers: true, lineWrapping: true,
        autoCloseTags: true, autoCloseBrackets: true, matchTags: { bothTags: true },
        foldGutter: true, gutters: ['CodeMirror-linenumbers','CodeMirror-foldgutter'],
        extraKeys: {
            'Ctrl-Space': 'autocomplete', 'Ctrl-/': 'toggleComment',
            'Tab': cm => cm.replaceSelection('    ')
        },
        indentUnit: 4, tabSize: 4, scrollbarStyle: 'overlay'
    });
    cm.setSize('100%', '350px');
    hidden.value = cm.getValue();
    cm.on('change', () => {
        hidden.value = cm.getValue();
        const c = document.getElementById(`count-${editorId}`);
        if (c) c.textContent = cm.getValue().length + ' caractères';
    });
    const c = document.getElementById(`count-${editorId}`);
    if (c) c.textContent = cm.getValue().length + ' caractères';
    window._cmInstances = window._cmInstances || {};
    window._cmInstances[editorId] = cm;
};

// ============================================
// BASCULER MODE SÉANCE (plain/html)
// ============================================
window.switchSeanceMode = function(seqIndex, seanceIndex, mode) {
    const plainSection = document.getElementById(`plain-section-${seqIndex}-${seanceIndex}`);
    const htmlSection  = document.getElementById(`html-section-${seqIndex}-${seanceIndex}`);
    const btnPlain = document.getElementById(`btn-plain-${seqIndex}-${seanceIndex}`);
    const btnHtml  = document.getElementById(`btn-html-${seqIndex}-${seanceIndex}`);
    const modeInput = document.querySelector(`[data-seq="${seqIndex}"][data-session="${seanceIndex}"] .session-content-mode`);

    if (mode === 'plain') {
        plainSection.style.display = 'block'; htmlSection.style.display = 'none';
        btnPlain.classList.add('active'); btnHtml.classList.remove('active');
        const cm = window._cmInstances?.[`cm-editor-${seqIndex}-${seanceIndex}`];
        const plainTA = document.getElementById(`plain-${seqIndex}-${seanceIndex}`);
        if (plainTA && !plainTA.value && cm?.getValue()) {
            const tmp = document.createElement('div'); tmp.innerHTML = cm.getValue();
            plainTA.value = tmp.textContent || '';
        }
    } else {
        plainSection.style.display = 'none'; htmlSection.style.display = 'block';
        btnPlain.classList.remove('active'); btnHtml.classList.add('active');
        const editorId = `cm-editor-${seqIndex}-${seanceIndex}`;
        const hiddenId = `cm-hidden-${seqIndex}-${seanceIndex}`;
        const plainTA  = document.getElementById(`plain-${seqIndex}-${seanceIndex}`);
        const plainContent = plainTA?.value || '';
        if (!window._cmInstances?.[editorId]) {
            setTimeout(() => {
                initCodeMirrorForSeance(editorId, hiddenId);
                if (plainContent) {
                    const cm = window._cmInstances?.[editorId];
                    if (cm) cm.setValue(`<p>${plainContent.replace(/\n\n/g,'</p>\n<p>').replace(/\n/g,'<br>')}</p>`);
                }
            }, 50);
        }
    }
    if (modeInput) modeInput.value = mode;
};

// ============================================
// SOUS-ONGLETS code/wy
// ============================================
window.switchSeanceSubTab = function(seqI, sessI, tab) {
    const codePane = document.getElementById(`code-pane-${seqI}-${sessI}`);
    const wyPane   = document.getElementById(`wy-pane-${seqI}-${sessI}`);
    const btnCode  = document.getElementById(`sub-code-${seqI}-${sessI}`);
    const btnWy    = document.getElementById(`sub-wy-${seqI}-${sessI}`);
    const editorId = `cm-editor-${seqI}-${sessI}`;
    const cm       = window._cmInstances?.[editorId];

    if (tab === 'code') {
        const wyBody = document.getElementById(`wy-body-${seqI}-${sessI}`);
        if (wyBody && cm) cm.setValue(wyBody.innerHTML);
        codePane.style.display = 'block'; wyPane.style.display = 'none';
        btnCode?.classList.add('active'); btnWy?.classList.remove('active');
    } else {
        codePane.style.display = 'none'; wyPane.style.display = 'block';
        btnCode?.classList.remove('active'); btnWy?.classList.add('active');
        const key = `${seqI}-${sessI}`;
        if (!window._wySessionInited?.[key]) {
            _initSeanceWy(seqI, sessI);
            window._wySessionInited[key] = true;
        }
        const wyBody = document.getElementById(`wy-body-${seqI}-${sessI}`);
        if (wyBody) {
            if (cm?.getValue().trim()) { wyBody.innerHTML = cm.getValue(); }
            else {
                const h = document.getElementById(`cm-hidden-${seqI}-${sessI}`);
                if (h?.value.trim()) {
                    wyBody.innerHTML = h.value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
                }
            }
        }
    }
};

// ============================================
// INIT WYSIWYG POUR UNE SÉANCE
// ============================================
function _initSeanceWy(seqI, sessI) {
    const tb   = document.getElementById(`wy-tb-${seqI}-${sessI}`);
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const wrap = document.getElementById(`wy-wrap-${seqI}-${sessI}`);
    const drop = document.getElementById(`wy-drop-${seqI}-${sessI}`);
    const key  = `${seqI}-${sessI}`;

    tb.innerHTML = _wyToolbarHTML(seqI, sessI);

    tb.addEventListener('mousedown', e => {
        const btn = e.target.closest('[data-cmd]');
        if (btn) { e.preventDefault(); body.focus(); document.execCommand(btn.dataset.cmd, false, null); _wyTbState(seqI,sessI); _wySync(seqI,sessI); }
    });
    tb.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === 'imgUrl')     { _wySaveRange(key); _wyInsertImgUrl(seqI,sessI); }
        if (act === 'link')       { _wySaveRange(key); _wyInsertLink(seqI,sessI); }
        if (act === 'table')      { _wySaveRange(key); _wyInsertTable(seqI,sessI); }
        if (act === 'hr')         { body.focus(); document.execCommand('insertHorizontalRule'); _wySync(seqI,sessI); }
        if (act === 'simulation') { _wySaveRange(key); _wyInsertSimulation(seqI,sessI); }
    });
    tb.querySelector(`#wySessBlock-${seqI}-${sessI}`)?.addEventListener('change', e => {
        body.focus(); document.execCommand('formatBlock', false, e.target.value); _wySync(seqI,sessI);
    });
    tb.querySelector(`#wySessFg-${seqI}-${sessI}`)?.addEventListener('input', e => {
        tb.querySelector(`#wySessFgBar-${seqI}-${sessI}`).style.background = e.target.value;
        body.focus(); document.execCommand('foreColor', false, e.target.value); _wySync(seqI,sessI);
    });
    tb.querySelector(`#wySessBg-${seqI}-${sessI}`)?.addEventListener('input', e => {
        tb.querySelector(`#wySessBgBar-${seqI}-${sessI}`).style.background = e.target.value;
        body.focus(); document.execCommand('hiliteColor', false, e.target.value); _wySync(seqI,sessI);
    });
    tb.querySelector(`#wySessFile-${seqI}-${sessI}`)?.addEventListener('change', e => {
        const f = e.target.files[0]; if (f) _wyInsertImgFile(seqI,sessI,f); e.target.value = '';
    });

    body.addEventListener('input',  () => { _wySync(seqI,sessI); _wyTbState(seqI,sessI); _wyUpdateCount(seqI,sessI); });
    body.addEventListener('keyup',  () => _wyTbState(seqI,sessI));
    body.addEventListener('mouseup',() => _wyTbState(seqI,sessI));
    body.addEventListener('click',  e => { if (e.target.tagName === 'IMG') _wySelectImg(seqI,sessI,e.target); else _wyDeselect(); });

    wrap.addEventListener('dragover', e => { if ([...e.dataTransfer.items].some(i=>i.type.startsWith('image/'))) { e.preventDefault(); drop.classList.add('show'); } });
    wrap.addEventListener('dragleave',e => { if (!wrap.contains(e.relatedTarget)) drop.classList.remove('show'); });
    wrap.addEventListener('drop', e => {
        e.preventDefault(); drop.classList.remove('show');
        const f = [...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));
        if (f) _wyInsertImgFile(seqI,sessI,f);
    });
    body.addEventListener('paste', e => {
        const item = [...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));
        if (item) { e.preventDefault(); _wyInsertImgFile(seqI,sessI,item.getAsFile()); }
    });
}

function _wyToolbarHTML(seqI, sessI) {
    return `
    <div class="wy-tb-group">
        <select class="wy-tb-select" id="wySessBlock-${seqI}-${sessI}" title="Style">
            <option value="p">Paragraphe</option><option value="h1">Titre 1</option>
            <option value="h2">Titre 2</option><option value="h3">Titre 3</option>
            <option value="pre">Code</option><option value="blockquote">Citation</option>
        </select>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn" data-cmd="bold"        title="Gras"><b>G</b></button>
        <button type="button" class="wy-tb-btn" data-cmd="italic"      title="Italique"><i>I</i></button>
        <button type="button" class="wy-tb-btn" data-cmd="underline"   title="Souligné"><u>S</u></button>
        <button type="button" class="wy-tb-btn" data-cmd="strikeThrough" title="Barré"><s>B</s></button>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <div class="wy-color-wrap" title="Couleur texte">
            <i class="fas fa-font"></i>
            <input type="color" id="wySessFg-${seqI}-${sessI}" value="#1f2937">
            <div class="wy-color-bar" id="wySessFgBar-${seqI}-${sessI}" style="background:#1f2937"></div>
        </div>
        <div class="wy-color-wrap" title="Surlignage">
            <i class="fas fa-fill-drip"></i>
            <input type="color" id="wySessBg-${seqI}-${sessI}" value="#ffff00">
            <div class="wy-color-bar" id="wySessBgBar-${seqI}-${sessI}" style="background:#ffff00"></div>
        </div>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn" data-cmd="justifyLeft"   title="Gauche"><i class="fas fa-align-left"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="justifyCenter" title="Centre"><i class="fas fa-align-center"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="justifyRight"  title="Droite"><i class="fas fa-align-right"></i></button>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn" data-cmd="insertUnorderedList" title="Liste"><i class="fas fa-list-ul"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="insertOrderedList"   title="Numérotée"><i class="fas fa-list-ol"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="indent"  title="Indenter"><i class="fas fa-indent"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="outdent" title="Désindenter"><i class="fas fa-outdent"></i></button>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn" data-act="link"  title="Lien"><i class="fas fa-link"></i></button>
        <button type="button" class="wy-tb-btn" data-act="table" title="Tableau"><i class="fas fa-table"></i></button>
        <button type="button" class="wy-tb-btn" data-act="hr"    title="Séparateur"><i class="fas fa-minus"></i></button>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn wy-tb-btn-wide" data-act="imgUrl" title="Image URL"><i class="fas fa-link"></i> URL</button>
        <label class="wy-tb-btn wy-tb-btn-wide" style="cursor:pointer;" title="Image fichier">
            <i class="fas fa-upload"></i> Fichier
            <input type="file" accept="image/*" id="wySessFile-${seqI}-${sessI}" style="display:none;">
        </label>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn" data-cmd="undo" title="Annuler"><i class="fas fa-undo"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="redo" title="Rétablir"><i class="fas fa-redo"></i></button>
        <button type="button" class="wy-tb-btn" data-cmd="removeFormat" title="Effacer format"><i class="fas fa-eraser"></i></button>
    </div>
    <div class="wy-tb-sep"></div>
    <div class="wy-tb-group">
        <button type="button" class="wy-tb-btn wy-tb-btn-wide" data-act="simulation"
            style="background:#7c3aed;color:white;">⚡ Simulation</button>
    </div>`;
}

// Helpers WYSIWYG
function _wySaveRange(key) {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) window['_wyRange_'+key] = sel.getRangeAt(0).cloneRange();
}
function _wyRestoreRange(seqI, sessI) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    body.focus();
    const saved = window['_wyRange_'+`${seqI}-${sessI}`];
    if (saved) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved); }
}
function _wySelectImg(seqI, sessI, img) {
    _wyDeselect();
    window._wySessionSelImg[`${seqI}-${sessI}`] = img;
    img.style.outline = '2px solid #2563eb';
    _posImgOverlay(img, seqI, sessI);
}
function _posImgOverlay(img, seqI, sessI) {
    const box = document.getElementById('wyImgBox');
    const itb = document.getElementById('wyImgToolbar');
    const r = img.getBoundingClientRect();
    const sy = window.scrollY, sx = window.scrollX;
    box.style.cssText = `display:block;top:${r.top+sy-3}px;left:${r.left+sx-3}px;width:${r.width+6}px;height:${r.height+6}px;`;
    box.dataset.seqI = seqI; box.dataset.sessI = sessI;
    itb.style.display = 'flex';
    let top = r.top+sy-44; if (top < sy+4) top = r.bottom+sy+6;
    itb.style.top  = top+'px'; itb.style.left = Math.max(4,r.left+sx)+'px';
    itb.dataset.seqI = seqI; itb.dataset.sessI = sessI;
    document.getElementById('wyImgSize').textContent = Math.round(r.width)+'×'+Math.round(r.height);
}
function _wyDeselect() {
    Object.keys(window._wySessionSelImg||{}).forEach(k => { if (window._wySessionSelImg[k]) { window._wySessionSelImg[k].style.outline=''; delete window._wySessionSelImg[k]; } });
    document.getElementById('wyImgBox').style.display = 'none';
    document.getElementById('wyImgToolbar').style.display = 'none';
}
function _wyInsertImgUrl(seqI, sessI) {
    const url = prompt("URL de l'image :"); if (!url?.trim()) return;
    _wyRestoreRange(seqI,sessI); _wyInsertImgEl(seqI,sessI,url.trim(),'image');
}
function _wyInsertImgFile(seqI, sessI, file) {
    _wySaveRange(`${seqI}-${sessI}`);
    const r = new FileReader();
    r.onload = ev => { _wyRestoreRange(seqI,sessI); _wyInsertImgEl(seqI,sessI,ev.target.result,file.name.replace(/\.[^.]+$/,'')); };
    r.readAsDataURL(file);
}
function _wyInsertImgEl(seqI, sessI, src, alt) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const img = document.createElement('img'); img.src=src; img.alt=alt;
    img.style.cssText = 'max-width:100%;border-radius:6px;margin:.5rem 0;display:block;box-shadow:0 2px 8px rgba(0,0,0,.12);';
    const sel = window.getSelection();
    if (sel?.rangeCount > 0 && body.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0); range.collapse(false); range.insertNode(img);
        range.setStartAfter(img); range.setEndAfter(img); sel.removeAllRanges(); sel.addRange(range);
    } else { body.appendChild(img); }
    _wySync(seqI,sessI);
    setTimeout(() => _wySelectImg(seqI,sessI,img), 30);
}
function _wyInsertLink(seqI, sessI) {
    const url = prompt("URL du lien :"); if (!url) return;
    const txt = prompt("Texte du lien :") || url;
    _wyRestoreRange(seqI,sessI);
    document.execCommand('insertHTML',false,`<a href="${url}" target="_blank" style="color:#2563eb;">${txt}</a>`);
    _wySync(seqI,sessI);
}
function _wyInsertTable(seqI, sessI) {
    const cols = parseInt(prompt('Colonnes :','3'))||3;
    const rows = parseInt(prompt('Lignes :','3'))||3;
    const head = Array(cols).fill(0).map((_,i)=>`<th style="padding:8px 12px;background:#1e40af;color:white;border:1px solid #1e3a8a;">Col ${i+1}</th>`).join('');
    const brows= Array(rows-1).fill(0).map(()=>'<tr>'+Array(cols).fill('<td style="padding:8px 12px;border:1px solid #e2e8f0;"> </td>').join('')+'</tr>').join('');
    _wyRestoreRange(seqI,sessI);
    document.execCommand('insertHTML',false,`<div style="overflow-x:auto;margin:1rem 0;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${brows}</tbody></table></div>`);
    _wySync(seqI,sessI);
}
function _wyTbState(seqI, sessI) {
    ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','insertUnorderedList','insertOrderedList'].forEach(cmd => {
        const btn = document.querySelector(`#wy-tb-${seqI}-${sessI} [data-cmd="${cmd}"]`);
        if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
}
function _wySync(seqI, sessI) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`); if (!body) return;
    const cm   = window._cmInstances?.[`cm-editor-${seqI}-${sessI}`];
    if (cm) cm.setValue(body.innerHTML);
    else {
        const h = document.getElementById(`cm-hidden-${seqI}-${sessI}`);
        if (h) h.value = body.innerHTML;
    }
}
function _wyUpdateCount(seqI, sessI) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const cnt  = document.getElementById(`wy-count-${seqI}-${sessI}`);
    if (body && cnt) cnt.textContent = body.textContent.length + ' car.';
}
function _wyInsertSimulation(seqI, sessI) {
    const nomFichier = prompt('📁 Nom du fichier simulation :\nEx: deux-sens-de-marche.html','nom-simulation.html');
    if (!nomFichier) return;
    const texteVisible = prompt('✏️ Texte visible du lien :',nomFichier.replace('.html','').replace(/-/g,' '));
    if (!texteVisible) return;
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const link = document.createElement('a');
    link.href = `simulations/${nomFichier.trim()}`; link.className = 'sim-link';
    link.setAttribute('style','display:inline-flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:0.4rem 1rem;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.9rem;margin:0.25rem 0;');
    link.textContent = `⚡ ${texteVisible.trim()}`;
    _wyRestoreRange(seqI,sessI);
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) {
        const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(link);
        range.setStartAfter(link); range.collapse(true); sel.removeAllRanges(); sel.addRange(range);
    } else if (body) { body.appendChild(link); }
    _wySync(seqI,sessI);
}

// Init handlers globaux image
function _initWyGlobalHandlers() {
    const imgTb  = document.getElementById('wyImgToolbar');
    const imgBox = document.getElementById('wyImgBox');
    if (!imgTb || !imgBox) return;

    imgTb.addEventListener('click', e => {
        const btn = e.target.closest('[data-ia]'); if (!btn) return;
        const seqI = imgTb.dataset.seqI, sessI = imgTb.dataset.sessI;
        const img  = window._wySessionSelImg?.[`${seqI}-${sessI}`]; if (!img) return;
        const a = btn.dataset.ia;
        if (a==='left')   { img.style.cssFloat='left';  img.style.margin='4px 1rem 4px 0'; img.style.display=''; }
        if (a==='center') { img.style.cssFloat='';      img.style.margin='1rem auto';       img.style.display='block'; }
        if (a==='right')  { img.style.cssFloat='right'; img.style.margin='4px 0 4px 1rem'; img.style.display=''; }
        if (a==='full')   { img.style.width='100%'; img.style.height='auto'; }
        if (a==='half')   { img.style.width='50%';  img.style.height='auto'; }
        if (a==='url')    { const u=prompt('Nouvelle URL :'); if (u) img.src=u.trim(); }
        if (a==='alt')    { const t=prompt('Texte alt :',img.alt||''); if (t!==null) img.alt=t; }
        if (a==='del')    { img.remove(); _wyDeselect(); return; }
        if (seqI!==undefined) _wySync(seqI,sessI);
        if (img.parentNode) _posImgOverlay(img,seqI,sessI);
    });

    let _res=false, _sx,_sy,_sw,_sh,_dir;
    imgBox.querySelectorAll('.wy-rh').forEach(h => {
        h.addEventListener('mousedown', e => {
            const img = window._wySessionSelImg?.[`${imgBox.dataset.seqI}-${imgBox.dataset.sessI}`]; if (!img) return;
            e.preventDefault(); _res=true; _dir=h.dataset.d; _sx=e.clientX; _sy=e.clientY; _sw=img.offsetWidth; _sh=img.offsetHeight;
        });
    });
    document.addEventListener('mousemove', e => {
        if (!_res) return;
        const img = window._wySessionSelImg?.[`${imgBox.dataset.seqI}-${imgBox.dataset.sessI}`]; if (!img) return;
        const dx=e.clientX-_sx, dy=e.clientY-_sy, d=_dir;
        let w=_sw, h=_sh;
        if (d.includes('e')) w=Math.max(30,_sw+dx);
        if (d.includes('w')) w=Math.max(30,_sw-dx);
        if (d.includes('s')) h=Math.max(20,_sh+dy);
        if (d.includes('n')) h=Math.max(20,_sh-dy);
        if (e.shiftKey && ['se','ne','sw','nw'].includes(d)) h=Math.round(w*(_sh/_sw));
        img.style.width=w+'px'; img.style.height=(d==='e'||d==='w')?'auto':h+'px';
        _posImgOverlay(img,imgBox.dataset.seqI,imgBox.dataset.sessI);
    });
    document.addEventListener('mouseup', () => {
        if (_res) { _res=false; _wySync(imgBox.dataset.seqI,imgBox.dataset.sessI); }
    });
    document.addEventListener('scroll', () => {
        const img = window._wySessionSelImg?.[`${imgBox.dataset.seqI}-${imgBox.dataset.sessI}`];
        if (img) _posImgOverlay(img,imgBox.dataset.seqI,imgBox.dataset.sessI);
    }, true);
    document.addEventListener('mousedown', e => {
        if (!imgBox.contains(e.target) && !imgTb.contains(e.target)) _wyDeselect();
    });
}

// ============================================
// SNIPPETS HTML
// ============================================
window.insertSnippet = function(editorId, type) {
    const cm = window._cmInstances?.[editorId]; if (!cm) return;
    const snippets = {
        heading:    `<h2 style="border-bottom:2px solid #0056b3;color:#0056b3;padding-bottom:5px;">Titre de section</h2>\n`,
        paragraph:  `<p>Votre paragraphe ici...</p>\n`,
        table:      `<table style="width:100%;border-collapse:collapse;margin:20px 0;">\n  <thead>\n    <tr style="background:#f2f2f2;">\n      <th style="border:1px solid #ddd;padding:12px;">Col 1</th>\n      <th style="border:1px solid #ddd;padding:12px;">Col 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td style="border:1px solid #ddd;padding:12px;">Donnée 1</td>\n      <td style="border:1px solid #ddd;padding:12px;">Donnée 2</td>\n    </tr>\n  </tbody>\n</table>\n`,
        image:      `<div style="text-align:center;margin:20px 0;">\n  <img src="https://URL_IMAGE" alt="Description" style="width:100%;max-width:600px;border-radius:10px;">\n  <p style="font-size:.9em;color:#666;">Légende</p>\n</div>\n`,
        list:       `<ul style="line-height:2;">\n  <li><strong>Élément 1 :</strong> Description.</li>\n  <li><strong>Élément 2 :</strong> Description.</li>\n</ul>\n`,
        alert:      `<div style="margin:20px 0;padding:20px;border-left:5px solid #ff9800;background:#fff4e5;border-radius:4px;">\n  <strong>⚠️ Important :</strong> Votre message ici.\n</div>\n`,
        grid:       `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:20px 0;">\n  <div style="padding:15px;border:1px solid #eee;text-align:center;border-bottom:4px solid #0056b3;">\n    <strong>Titre 1</strong><br>Contenu 1\n  </div>\n  <div style="padding:15px;border:1px solid #eee;text-align:center;border-bottom:4px solid #0056b3;">\n    <strong>Titre 2</strong><br>Contenu 2\n  </div>\n</div>\n`,
    };
    const s = snippets[type]; if (s) { cm.replaceRange(s, cm.getCursor()); cm.focus(); }
};

window.formatCode = function(editorId) {
    const cm = window._cmInstances?.[editorId]; if (!cm) return;
    let code = cm.getValue();
    ['div','section','table','thead','tbody','tr','ul','ol','li','h1','h2','h3','h4','p'].forEach(t => {
        code = code.replace(new RegExp(`></${t}>`, 'gi'), `>\n</${t}>`).replace(new RegExp(`<${t}([^>]*)>`, 'gi'), `\n<${t}$1>`);
    });
    cm.setValue(code.replace(/\n{3,}/g,'\n\n').trim());
};

window.insertSimulationLink = function(editorId) {
    const cm = window._cmInstances?.[editorId]; if (!cm) return;
    const nom = prompt('📁 Nom du fichier simulation :\nEx: deux-sens-de-marche.html','nom-simulation.html');
    if (!nom) return;
    const txt = prompt('✏️ Texte visible :',nom.replace('.html','').replace(/-/g,' '));
    if (!txt) return;
    const snippet = `<a href="simulations/${nom.trim()}" class="sim-link" style="display:inline-flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:0.4rem 1rem;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.9rem;margin:0.25rem 0;">⚡ ${txt.trim()}</a>`;
    cm.replaceRange(snippet, cm.getCursor()); cm.focus();
};

// ============================================
// AJOUTER / SUPPRIMER SÉANCE & SÉQUENCE
// ============================================
window.addSeance = function(seqIndex) {
    const container = document.getElementById(`seances-${seqIndex}`);
    const count = container.querySelectorAll('.session-item').length;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createSeanceHtml(seqIndex, count);
    container.appendChild(wrapper.firstElementChild);
};

window.removeSeance = function(btn) {
    if (confirm('Supprimer cette séance ?')) btn.closest('.session-item').remove();
};

window.removeSequence = function(btn) {
    if (confirm('Supprimer cette séquence et toutes ses séances ?')) {
        btn.closest('.sequence-item').remove();
        document.querySelectorAll('.sequence-item').forEach((el,i) => {
            el.dataset.index = i;
            el.querySelector('h4').textContent = `Séquence ${i+1}`;
        });
    }
};

// ============================================
// CHANGER MÉTHODE PDF
// ============================================
window.changePdfMethod = function(radio, seqIndex, seanceIndex) {
    const sessionItem = radio.closest('.session-item');
    sessionItem.querySelectorAll('.pdf-input').forEach(e => e.classList.add('hidden'));
    const method = radio.value;
    if (method !== 'none') sessionItem.querySelector(`.pdf-${method}`)?.classList.remove('hidden');
};

// ============================================
// COLLECTER LES DONNÉES POUR FIRESTORE
// ============================================
async function collectSequencesData() {
    const sequences = [];
    for (const seqItem of document.querySelectorAll('.sequence-item')) {
        const seqIndex = seqItem.dataset.index;
        const seances  = [];
        for (const seanceItem of seqItem.querySelectorAll('.session-item')) {
            const pdfRadio  = seanceItem.querySelector('input[type="radio"]:checked');
            const pdfMethod = pdfRadio?.value || 'none';
            let pdfUrl = null;
            if (pdfMethod === 'github') {
                const fn = seanceItem.querySelector('.pdf-github-path')?.value.trim();
                if (fn) pdfUrl = `cours-pdf/${fn}`;
            } else if (pdfMethod === 'firebase') {
                const fileInput = seanceItem.querySelector('.pdf-firebase-file');
                const existing  = seanceItem.querySelector('.pdf-firebase-url')?.value.trim();
                if (fileInput?.files.length > 0) pdfUrl = await uploadPDF(fileInput.files[0]);
                else if (existing) pdfUrl = existing;
            } else if (pdfMethod === 'url') {
                pdfUrl = seanceItem.querySelector('.pdf-url-input')?.value.trim() || null;
            }

            // Lire le contenu — champ "contenu" dans Firestore
            const contentMode = seanceItem.querySelector('.session-content-mode')?.value || 'html';
            const seqI  = seanceItem.dataset.seq;
            const sessI = seanceItem.dataset.session;
            let contenu = '';

            if (contentMode === 'plain') {
                contenu = seanceItem.querySelector(`#plain-${seqI}-${sessI}`)?.value.trim() || '';
            } else {
                const wyPane = document.getElementById(`wy-pane-${seqI}-${sessI}`);
                const wyBody = document.getElementById(`wy-body-${seqI}-${sessI}`);
                const cm     = window._cmInstances?.[`cm-editor-${seqI}-${sessI}`];
                const hidden = seanceItem.querySelector('.session-content');
                if (wyPane?.style.display !== 'none' && wyBody) {
                    contenu = wyBody.innerHTML.trim();
                    if (cm) cm.setValue(contenu);
                    else if (hidden) hidden.value = contenu;
                } else if (cm) {
                    contenu = cm.getValue().trim();
                } else if (hidden) {
                    contenu = hidden.value.trim();
                }
            }

            seances.push({
                titre:       seanceItem.querySelector('.session-title')?.value.trim() || '',
                contenu,           // ← "contenu" (pas "content")
                contentMode,
                pdfUrl,
                pdfMethod
            });
        }
        sequences.push({
            titre:   seqItem.querySelector('.sequence-title')?.value.trim() || '',
            seances  // ← "seances" (pas "sessions")
        });
    }
    return sequences;
}

async function uploadPDF(file) {
    const fileName = `matieres/${Date.now()}_${file.name}`;
    const sRef = ref(storage, fileName);
    await uploadBytes(sRef, file);
    return await getDownloadURL(sRef);
}

// ============================================
// SLUG
// ============================================
function generateSlug(titre, diplome) {
    return ((diplome ? diplome+' '+titre : titre))
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-').substring(0,80);
}

// ============================================
// SOUMETTRE LE FORMULAIRE
// ============================================
document.getElementById('matiereForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const orig = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        const titre   = document.getElementById('matiereTitle').value.trim();
        const diplome = document.getElementById('matiereDiploma').value;

        const data = {
            titre,
            description: document.getElementById('matiereDescription').value.trim(),
            diplome,
            niveau:    document.getElementById('matiereLevel').value,
            sequences: await collectSequencesData(),
            updatedAt: serverTimestamp()
        };

        if (currentMatiereId) {
            const snap = await getDoc(doc(db, 'matieres', currentMatiereId));
            if (!snap.data()?.slug) data.slug = generateSlug(titre, diplome);
            await updateDoc(doc(db, 'matieres', currentMatiereId), data);
            showToast('Matière modifiée avec succès !');
        } else {
            data.createdAt = serverTimestamp();
            data.slug = generateSlug(titre, diplome);
            await addDoc(collection(db, 'matieres'), data);
            showToast('Matière créée avec succès !');
        }

        document.getElementById('matiereForm').reset();
        document.getElementById('sequencesContainer').innerHTML = '';
        currentMatiereId = null;
        await loadMatieres();
        switchTab('list');
    } catch(err) {
        console.error('Erreur:', err);
        showToast('Erreur lors de l\'enregistrement', 'err');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
});

// ============================================
// UTILITAIRE
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ admin-courses.js — Gestion des matières (matieres/sequences/seances)');
    window._cmInstances    = {};
    window._wySessionInited = {};
    window._wySessionSelImg = {};
    _initWyGlobalHandlers();
});
