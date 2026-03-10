// admin-courses.js - VERSION AVEC 3 MÉTHODES PDF
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    addDoc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    query,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
  authDomain: "electroino-app.firebaseapp.com",
  projectId: "electroino-app",
  storageBucket: "electroino-app.firebasestorage.app",
  messagingSenderId: "864058526638",
  appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Variables globales
let currentUser = null;
let currentCourseId = null;
let currentMatiereId = null; // ← NOUVEAU
let currentTab = 'list';
let allCourses = [];

// ============================================
// VÉRIFICATION AUTHENTIFICATION ADMIN
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    currentUser = user;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const role = userDoc.data()?.role;
        if (!userDoc.exists() || (role !== 'admin' && role !== 'superadmin')) {
            alert('Accès refusé. Vous devez être administrateur.');
            window.location.href = 'index.html';
            return;
        }

        loadCourses();
    } catch (error) {
        console.error('Erreur vérification admin:', error);
        window.location.href = 'index.html';
    }
});

// DÉCONNEXION
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
});

// ============================================
// GESTION DES ONGLETS
// ============================================
window.switchTab = function(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick*="switchTab('${tab}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const coursesListTab = document.getElementById('coursesListTab');
    const courseFormTab  = document.getElementById('courseFormTab');
    const matieresTab    = document.getElementById('matieresTab'); // ← NOUVEAU
    
    if (coursesListTab) coursesListTab.classList.add('hidden');
    if (courseFormTab)  courseFormTab.classList.add('hidden');
    if (matieresTab)    matieresTab.classList.add('hidden');
    
    if (tab === 'list' && coursesListTab) {
        coursesListTab.classList.remove('hidden');
        loadCourses();
    } else if (tab === 'form' && courseFormTab) {
        courseFormTab.classList.remove('hidden');
    } else if (tab === 'matieres' && matieresTab) { // ← NOUVEAU
        matieresTab.classList.remove('hidden');
    }
};

// ============================================
// CHARGER LES COURS
// ============================================
async function loadCourses() {
    const coursesTableBody = document.getElementById('coursesTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    if (!coursesTableBody) {
        console.error('Element coursesTableBody not found');
        return;
    }

    try {
        if (loadingState) loadingState.classList.remove('hidden');
        coursesTableBody.innerHTML = '';
        if (emptyState) emptyState.classList.add('hidden');

        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        allCourses = [];
        querySnapshot.forEach((doc) => {
            allCourses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        if (loadingState) loadingState.classList.add('hidden');

        if (allCourses.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        displayCourses();
    } catch (error) {
        console.error('Erreur chargement cours:', error);
        if (loadingState) loadingState.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

// ============================================
// AFFICHER LES COURS DANS LE TABLEAU
// ============================================
function displayCourses() {
    const coursesTableBody = document.getElementById('coursesTableBody');
    const coursesTable     = document.getElementById('coursesTable');
    const loadingState     = document.getElementById('loadingState');
    const emptyState       = document.getElementById('emptyState');
    
    if (!coursesTableBody) {
        console.error('Element coursesTableBody not found');
        return;
    }
    
    coursesTableBody.innerHTML = allCourses.map(course => {
        const date = course.createdAt?.toDate?.() || new Date();
        const formattedDate = date.toLocaleDateString('fr-FR');

        return `
            <tr>
                <td>${escapeHtml(course.title)}</td>
                <td><span class="badge">${escapeHtml(course.diploma || 'N/A')}</span></td>
                <td><span class="badge badge-info">${escapeHtml(course.level || 'N/A')}</span></td>
                <td>
                    <button onclick="openMatieresPanel('${course.id}', '${escapeHtml(course.title)}')"
                        class="btn-action btn-matieres" title="Gérer les matières" style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .75rem;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:7px;font-size:.82rem;cursor:pointer;">
                        <i class="fas fa-book"></i> Matières
                    </button>
                </td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editCourse('${course.id}')" class="btn-action btn-edit" title="Modifier infos cours">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCourse('${course.id}')" class="btn-action btn-delete" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // ✅ Afficher la table et masquer loading/empty
    if (coursesTable)  coursesTable.style.display  = 'table';
    if (loadingState)  loadingState.style.display   = 'none';
    if (emptyState)    emptyState.classList.add('hidden');
}

// ============================================
// OUVRIR LE FORMULAIRE NOUVEAU COURS
// ============================================
window.openNewCourseForm = function() {
    currentCourseId = null;
    resetCourseForm();
    switchTab('form');
    
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    
    if (formTitle) formTitle.textContent = 'Créer un nouveau cours';
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Créer le cours';
};

// ============================================
// RÉINITIALISER LE FORMULAIRE
// ============================================
function resetCourseForm() {
    const courseForm = document.getElementById('courseForm');
    const sequencesContainer = document.getElementById('sequencesContainer');
    
    if (courseForm) courseForm.reset();
    if (sequencesContainer) sequencesContainer.innerHTML = '';
    currentCourseId = null;
}

// ============================================
// MODIFIER UN COURS
// ============================================
window.editCourse = async function(courseId) {
    currentCourseId = courseId;
    
    try {
        const docRef = doc(db, 'courses', courseId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert('Cours introuvable');
            return;
        }
        
        const course = docSnap.data();
        
        const titleInput = document.getElementById('courseTitle');
        const descInput = document.getElementById('courseDescription');
        const diplomaSelect = document.getElementById('courseDiploma');
        const levelSelect = document.getElementById('courseLevel');
        
        if (titleInput) titleInput.value = course.title || '';
        if (descInput) descInput.value = course.description || '';
        if (diplomaSelect) diplomaSelect.value = course.diploma || '';
        if (levelSelect) levelSelect.value = course.level || '';
        
        displaySequencesInForm(course.sequences || []);
        
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        
        if (formTitle) formTitle.textContent = 'Modifier le cours';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer les modifications';
        
        switchTab('form');
    } catch (error) {
        console.error('Erreur chargement cours:', error);
        alert('Erreur lors du chargement du cours');
    }
};

// ============================================
// AFFICHER LES SÉQUENCES DANS LE FORMULAIRE
// ============================================
function displaySequencesInForm(sequences) {
    const container = document.getElementById('sequencesContainer');
    if (!container) {
        console.error('Element sequencesContainer not found');
        return;
    }
    
    container.innerHTML = '';
    
    sequences.forEach((sequence, index) => {
        addSequenceToForm(sequence, index);
    });
}

// ============================================
// AJOUTER UNE SÉQUENCE
// ============================================
window.addSequence = function() {
    const existingSequences = document.querySelectorAll('.sequence-item');
    addSequenceToForm(null, existingSequences.length);
};

function addSequenceToForm(sequenceData = null, index = 0) {
    const container = document.getElementById('sequencesContainer');
    if (!container) {
        console.error('Element sequencesContainer not found');
        return;
    }
    
    const sequenceDiv = document.createElement('div');
    sequenceDiv.className = 'sequence-item';
    sequenceDiv.dataset.index = index;
    
    const sessionsHtml = sequenceData?.sessions ? 
        sequenceData.sessions.map((session, sIndex) => 
            createSessionHtml(index, sIndex, session)
        ).join('') : '';
    
    sequenceDiv.innerHTML = `
        <div class="sequence-header">
            <h4>Séquence ${index + 1}</h4>
            <button type="button" onclick="removeSequence(this)" class="btn-remove">
                <i class="fas fa-times"></i> Supprimer la séquence
            </button>
        </div>
        
        <div class="form-group">
            <label>Titre de la séquence</label>
            <input type="text" class="sequence-title" value="${escapeHtml(sequenceData?.title || '')}" placeholder="Ex: Introduction à l'électricité">
        </div>
        
        <div class="sessions-container" id="sessions-${index}">
            ${sessionsHtml}
        </div>
        
        <button type="button" onclick="addSession(${index})" class="btn btn-secondary">
            <i class="fas fa-plus"></i> Ajouter une séance
        </button>
    `;
    
    container.appendChild(sequenceDiv);
    
    // Init CodeMirror pour chaque séance existante (seulement si mode html)
    const sessions = sequenceData?.sessions || [];
    sessions.forEach((sessionData, sIndex) => {
        const editorId = `cm-editor-${index}-${sIndex}`;
        const hiddenId = `cm-hidden-${index}-${sIndex}`;
        const sessionContent = sessionData?.content || '';
        const isHtml = sessionContent.trim().startsWith('<') || sessionContent.includes('<p>') || sessionContent.includes('<div>');
        const mode = sessionData?.contentMode || (isHtml ? 'html' : 'plain');
        if (mode === 'html') {
            setTimeout(() => initCodeMirrorForSession(editorId, hiddenId), 50);
        }
    });
}

// ============================================
// CRÉER HTML POUR UNE SÉANCE - ÉDITEUR CODE + 3 MÉTHODES PDF
// ============================================
function createSessionHtml(seqIndex, sessionIndex, sessionData = null) {
    const pdfMethod = sessionData?.pdfMethod || 'none';
    const pdfValue = sessionData?.pdfUrl || '';
    const githubFilename = pdfMethod === 'github'
        ? pdfValue.replace(/^cours-pdf\//, '')
        : '';
    const firebaseExistingUrl = pdfMethod === 'firebase' ? pdfValue : '';
    const editorId = `cm-editor-${seqIndex}-${sessionIndex}`;
    const hiddenId = `cm-hidden-${seqIndex}-${sessionIndex}`;
    const previewId = `cm-preview-${seqIndex}-${sessionIndex}`;
    const plainId  = `plain-${seqIndex}-${sessionIndex}`;
    const content  = sessionData?.content || '';
    // Détecter le mode initial
    const isHtmlContent = content.trim().startsWith('<') || content.includes('<p>') || content.includes('<div>');
    const initialMode   = sessionData?.contentMode || (isHtmlContent ? 'html' : 'plain');

    return `
        <div class="session-item" data-seq="${seqIndex}" data-session="${sessionIndex}">
            <div class="session-header">
                <h5>Séance ${sessionIndex + 1}</h5>
                <button type="button" onclick="removeSession(this)" class="btn-remove-small">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-group">
                <label>Titre de la séance</label>
                <input type="text" class="session-title" value="${escapeHtml(sessionData?.title || '')}" placeholder="Ex: Les bases de l'électricité">
            </div>
            
            <!-- ÉDITEUR AVEC SÉLECTEUR DE MODE -->
            <div class="form-group">
                <label>Contenu de la séance</label>

                <!-- Sélecteur de mode -->
                <div class="session-mode-selector">
                    <button type="button"
                        class="session-mode-btn ${initialMode === 'plain' ? 'active' : ''}"
                        id="btn-plain-${seqIndex}-${sessionIndex}"
                        onclick="switchSessionMode('${seqIndex}', '${sessionIndex}', 'plain')">
                        <i class="fas fa-align-left"></i> Texte Normal
                    </button>
                    <button type="button"
                        class="session-mode-btn ${initialMode === 'html' ? 'active' : ''}"
                        id="btn-html-${seqIndex}-${sessionIndex}"
                        onclick="switchSessionMode('${seqIndex}', '${sessionIndex}', 'html')">
                        <i class="fas fa-code"></i> HTML Avancé
                    </button>
                </div>

                <!-- MODE TEXTE SIMPLE -->
                <div id="plain-section-${seqIndex}-${sessionIndex}" ${initialMode !== 'plain' ? 'style="display:none;"' : ''}>
                    <textarea id="${plainId}" class="session-plain-textarea" placeholder="Rédigez le contenu de la séance en texte simple...">${initialMode === 'plain' ? escapeHtml(content) : ''}</textarea>
                </div>

                <!-- MODE HTML CODEMIRROR -->
                <div id="html-section-${seqIndex}-${sessionIndex}" ${initialMode !== 'html' ? 'style="display:none;"' : ''}>

                    <!-- Sous-onglets: Code / Word -->
                    <div style="display:flex; border-bottom:2px solid #282a36; margin-bottom:0;">
                        <button type="button" class="sub-tab-btn active" id="sub-code-${seqIndex}-${sessionIndex}" onclick="switchSessionSubTab(${seqIndex},${sessionIndex},'code')">
                            <i class="fas fa-code"></i> Code HTML
                        </button>
                        <button type="button" class="sub-tab-btn" id="sub-wy-${seqIndex}-${sessionIndex}" onclick="switchSessionSubTab(${seqIndex},${sessionIndex},'wy')">
                            <i class="fas fa-edit"></i> Éditeur Word
                        </button>
                    </div>

                    <!-- Pane CODE -->
                    <div id="code-pane-${seqIndex}-${sessionIndex}">
                        <div class="editor-toolbar">
                            <span class="editor-label"><i class="fas fa-code"></i> HTML de la séance</span>
                            <div class="editor-actions">
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'heading')" title="H2">H2</button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'paragraph')" title="§"><i class="fas fa-paragraph"></i></button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'table')" title="Tableau"><i class="fas fa-table"></i></button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'image')" title="Image"><i class="fas fa-image"></i></button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'list')" title="Liste"><i class="fas fa-list"></i></button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'alert')" title="Alerte"><i class="fas fa-exclamation-circle"></i></button>
                                <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'grid')" title="Grille"><i class="fas fa-th"></i></button>
                                <button type="button" class="editor-btn btn-format" onclick="formatCode('${editorId}')" title="Formater"><i class="fas fa-magic"></i></button>
                                <button type="button" class="editor-btn btn-sim" onclick="insertSimulationLink('${editorId}')" title="Insérer un lien simulation" style="background:#7c3aed;color:white;border-color:#7c3aed;font-size:0.75rem;padding:0.25rem 0.6rem;">⚡ Simulation</button>
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
                    <div id="wy-pane-${seqIndex}-${sessionIndex}" style="display:none;">
                        <div class="wy-wrap" id="wy-wrap-${seqIndex}-${sessionIndex}" style="border:2px solid #e2e8f0; border-radius:10px; overflow:visible; background:#fff; position:relative;">
                            <div class="wy-toolbar wy-toolbar-session" id="wy-tb-${seqIndex}-${sessionIndex}"></div>
                            <div class="wy-body" id="wy-body-${seqIndex}-${sessionIndex}" contenteditable="true" spellcheck="false" data-ph="Commencez à écrire..." data-seq="${seqIndex}" data-sess="${sessionIndex}"></div>
                            <div class="wy-drop" id="wy-drop-${seqIndex}-${sessionIndex}"><i class="fas fa-image"></i><span>Dépose l'image ici</span></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:.35rem .5rem;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;font-size:.75rem;color:#9ca3af;">
                            <span>💡 Toolbar sticky — défile, les outils restent visibles</span>
                            <span id="wy-count-${seqIndex}-${sessionIndex}">0 car.</span>
                        </div>
                    </div>
                </div>

                <!-- Champ caché : stocke le mode actif -->
                <input type="hidden" class="session-content-mode" value="${initialMode}">
            </div>
            
            <!-- 3 MÉTHODES PDF -->
            <div class="form-group pdf-methods">
                <label>📄 Document PDF (optionnel)</label>
                <div class="pdf-method-selector">
                    <label class="radio-option">
                        <input type="radio" name="pdf-method-${seqIndex}-${sessionIndex}" value="none" 
                            ${pdfMethod === 'none' ? 'checked' : ''} 
                            onchange="changePdfMethod(this, ${seqIndex}, ${sessionIndex})">
                        <span>🚫 Aucun PDF</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="pdf-method-${seqIndex}-${sessionIndex}" value="github" 
                            ${pdfMethod === 'github' ? 'checked' : ''} 
                            onchange="changePdfMethod(this, ${seqIndex}, ${sessionIndex})">
                        <span>📁 Dossier GitHub</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="pdf-method-${seqIndex}-${sessionIndex}" value="firebase" 
                            ${pdfMethod === 'firebase' ? 'checked' : ''} 
                            onchange="changePdfMethod(this, ${seqIndex}, ${sessionIndex})">
                        <span>🔥 Firebase Storage</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="pdf-method-${seqIndex}-${sessionIndex}" value="url" 
                            ${pdfMethod === 'url' ? 'checked' : ''} 
                            onchange="changePdfMethod(this, ${seqIndex}, ${sessionIndex})">
                        <span>🔗 URL externe</span>
                    </label>
                </div>
                <div class="pdf-input pdf-github ${pdfMethod === 'github' ? '' : 'hidden'}" data-method="github">
                    <label>Nom du fichier dans cours-pdf/</label>
                    <input type="text" class="pdf-github-path" value="${githubFilename}" placeholder="Ex: electricite-chap1.pdf">
                    <small>📁 Fichier dans <code>cours-pdf/</code> sur GitHub</small>
                </div>
                <div class="pdf-input pdf-firebase ${pdfMethod === 'firebase' ? '' : 'hidden'}" data-method="firebase">
                    <input type="file" class="pdf-firebase-file" accept=".pdf">
                    ${sessionData?.pdfUrl && pdfMethod === 'firebase' ? `<div class="current-file"><i class="fas fa-file-pdf"></i> <a href="${sessionData.pdfUrl}" target="_blank">PDF actuel</a></div>` : ''}
                    <input type="hidden" class="pdf-firebase-url" value="${firebaseExistingUrl}">
                </div>
                <div class="pdf-input pdf-url ${pdfMethod === 'url' ? '' : 'hidden'}" data-method="url">
                    <label>URL complète du PDF</label>
                    <input type="url" class="pdf-url-input" value="${pdfMethod === 'url' ? pdfValue : ''}" placeholder="https://example.com/document.pdf">
                    <small>🔗 URL directe vers un PDF hébergé ailleurs</small>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// INITIALISER CODEMIRROR SUR UNE SÉANCE
// ============================================
window.initCodeMirrorForSession = function(editorId, hiddenId) {
    const wrapper = document.getElementById(editorId);
    const hidden = document.getElementById(hiddenId);
    if (!wrapper || !hidden) return;

    // Créer le textarea CodeMirror
    const textarea = document.createElement('textarea');
    textarea.value = hidden.value
        ? hidden.value
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
        : '';
    wrapper.appendChild(textarea);

    const cm = CodeMirror.fromTextArea(textarea, {
        mode: 'htmlmixed',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchTags: { bothTags: true },
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: {
            'Ctrl-Space': 'autocomplete',
            'Ctrl-/': 'toggleComment',
            'Ctrl-F': 'findPersistent',
            'Tab': function(cm) {
                const spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
                cm.replaceSelection(spaces);
            }
        },
        indentUnit: 4,
        tabSize: 4,
        scrollbarStyle: 'overlay'
    });

    cm.setSize('100%', '350px');

    // FIX : Sync immediat apres init (meme si l'user ne touche pas)
    hidden.value = cm.getValue();

    // Sync CodeMirror → hidden textarea
    cm.on('change', function() {
        hidden.value = cm.getValue();
        const count = document.getElementById(`count-${editorId}`);
        if (count) count.textContent = cm.getValue().length + ' caractères';
    });

    // Initialiser le compteur
    const count = document.getElementById(`count-${editorId}`);
    if (count) count.textContent = cm.getValue().length + ' caractères';

    // Stocker l'instance
    window._cmInstances = window._cmInstances || {};
    window._cmInstances[editorId] = cm;
};

// ============================================
// BASCULER LE MODE ÉDITEUR D'UNE SÉANCE
// ============================================
window.switchSessionMode = function(seqIndex, sessionIndex, mode) {
    const plainSection = document.getElementById(`plain-section-${seqIndex}-${sessionIndex}`);
    const htmlSection = document.getElementById(`html-section-${seqIndex}-${sessionIndex}`);
    const btnPlain = document.getElementById(`btn-plain-${seqIndex}-${sessionIndex}`);
    const btnHtml = document.getElementById(`btn-html-${seqIndex}-${sessionIndex}`);
    const modeInput = document.querySelector(
        `[data-seq="${seqIndex}"][data-session="${sessionIndex}"] .session-content-mode`
    );

    if (mode === 'plain') {
        // Récupérer contenu HTML actuel si CodeMirror existe
        const editorId = `cm-editor-${seqIndex}-${sessionIndex}`;
        const cm = window._cmInstances?.[editorId];
        const currentHtml = cm ? cm.getValue() : '';

        plainSection.style.display = 'block';
        htmlSection.style.display = 'none';
        btnPlain.classList.add('active');
        btnHtml.classList.remove('active');

        // Pré-remplir le textarea plain si vide
        const plainTextarea = document.getElementById(`plain-${seqIndex}-${sessionIndex}`);
        if (plainTextarea && !plainTextarea.value && currentHtml) {
            // Extraire le texte brut du HTML
            const tmp = document.createElement('div');
            tmp.innerHTML = currentHtml;
            plainTextarea.value = tmp.textContent || tmp.innerText || '';
        }
    } else {
        // Mode HTML : initialiser CodeMirror si pas encore fait
        const editorId = `cm-editor-${seqIndex}-${sessionIndex}`;
        const hiddenId = `cm-hidden-${seqIndex}-${sessionIndex}`;
        const plainTextarea = document.getElementById(`plain-${seqIndex}-${sessionIndex}`);
        const plainContent = plainTextarea ? plainTextarea.value : '';

        plainSection.style.display = 'none';
        htmlSection.style.display = 'block';
        btnPlain.classList.remove('active');
        btnHtml.classList.add('active');

        if (!window._cmInstances?.[editorId]) {
            // Initialiser CodeMirror
            setTimeout(() => {
                initCodeMirrorForSession(editorId, hiddenId);
                // Si contenu plain existant, le mettre dans l'éditeur
                if (plainContent) {
                    const cm = window._cmInstances?.[editorId];
                    if (cm) cm.setValue(`<p>${plainContent.replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`);
                }
            }, 50);
        } else {
            const cm = window._cmInstances?.[editorId];
            if (cm && plainContent && !cm.getValue()) {
                cm.setValue(`<p>${plainContent.replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`);
            }
        }
    }

    if (modeInput) modeInput.value = mode;
};

// ============================================
// SNIPPETS HTML PRÉDÉFINIS
// ============================================
window.insertSnippet = function(editorId, type) {
    const cm = window._cmInstances?.[editorId];
    if (!cm) return;

    const snippets = {
        heading: `<h2 style="border-bottom: 2px solid #0056b3; color: #0056b3; padding-bottom: 5px;">Titre de section</h2>\n`,
        paragraph: `<p>Votre paragraphe ici...</p>\n`,
        table: `<table style="width:100%; border-collapse:collapse; margin:20px 0;">\n    <thead>\n        <tr style="background:#f2f2f2;">\n            <th style="border:1px solid #ddd; padding:12px;">Colonne 1</th>\n            <th style="border:1px solid #ddd; padding:12px;">Colonne 2</th>\n            <th style="border:1px solid #ddd; padding:12px;">Colonne 3</th>\n        </tr>\n    </thead>\n    <tbody>\n        <tr>\n            <td style="border:1px solid #ddd; padding:12px;">Donnée 1</td>\n            <td style="border:1px solid #ddd; padding:12px;">Donnée 2</td>\n            <td style="border:1px solid #ddd; padding:12px;">Donnée 3</td>\n        </tr>\n    </tbody>\n</table>\n`,
        image: `<div style="text-align:center; margin:20px 0;">\n    <img src="https://URL_IMAGE" alt="Description" style="width:100%; max-width:600px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.1);">\n    <p style="font-size:0.9em; color:#666;">Légende de l'image</p>\n</div>\n`,
        list: `<ul style="line-height:2;">\n    <li><strong>Élément 1 :</strong> Description.</li>\n    <li><strong>Élément 2 :</strong> Description.</li>\n    <li><strong>Élément 3 :</strong> Description.</li>\n</ul>\n`,
        alert: `<div style="margin:20px 0; padding:20px; border-left:5px solid #ff9800; background:#fff4e5; border-radius:4px;">\n    <strong>⚠️ Important :</strong> Votre message d'alerte ici.\n</div>\n`,
        grid: `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin:20px 0;">\n    <div style="padding:15px; border:1px solid #eee; text-align:center; border-bottom:4px solid #0056b3;">\n        <strong>Titre 1</strong><br>Contenu 1\n    </div>\n    <div style="padding:15px; border:1px solid #eee; text-align:center; border-bottom:4px solid #0056b3;">\n        <strong>Titre 2</strong><br>Contenu 2\n    </div>\n    <div style="padding:15px; border:1px solid #eee; text-align:center; border-bottom:4px solid #0056b3;">\n        <strong>Titre 3</strong><br>Contenu 3\n    </div>\n</div>\n`,
        simulation: `<a href="simulations/NOM-SIMULATION.html" class="sim-link" style="display:inline-flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:0.4rem 1rem;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.9rem;margin:0.25rem 0;">⚡ Texte du lien</a>\n`,
    };

    const snippet = snippets[type];
    if (snippet) {
        const cursor = cm.getCursor();
        cm.replaceRange(snippet, cursor);
        cm.focus();
    }
};

// ============================================
// FORMATER LE CODE HTML
// ============================================
window.formatCode = function(editorId) {
    const cm = window._cmInstances?.[editorId];
    if (!cm) return;
    
    let code = cm.getValue();
    // Indentation simple : ajouter des sauts de ligne après les balises block
    const blockTags = ['div', 'section', 'header', 'footer', 'table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'p'];
    blockTags.forEach(tag => {
        code = code.replace(new RegExp(`></${tag}>`, 'gi'), `>\n</${tag}>`);
        code = code.replace(new RegExp(`<${tag}([^>]*)>`, 'gi'), `\n<${tag}$1>`);
    });
    code = code.replace(/\n{3,}/g, '\n\n').trim();
    cm.setValue(code);
};

// ============================================
// WYSIWYG WORD-LIKE — SÉANCES DE COURS
// ============================================

// Registre des instances WYSIWYG par séance
window._wySessionInited = {};
window._wySessionSelImg = {};

// Switcher sous-onglets code/wy pour une séance
window.switchSessionSubTab = function(seqI, sessI, tab) {
    const codePane = document.getElementById(`code-pane-${seqI}-${sessI}`);
    const wyPane   = document.getElementById(`wy-pane-${seqI}-${sessI}`);
    const btnCode  = document.getElementById(`sub-code-${seqI}-${sessI}`);
    const btnWy    = document.getElementById(`sub-wy-${seqI}-${sessI}`);
    const editorId = `cm-editor-${seqI}-${sessI}`;
    const cm       = window._cmInstances?.[editorId];

    if (tab === 'code') {
        // wy → code : synchro contenu
        const wyBody = document.getElementById(`wy-body-${seqI}-${sessI}`);
        if (wyBody && cm) cm.setValue(wyBody.innerHTML);
        codePane.style.display = 'block';
        wyPane.style.display   = 'none';
        if (btnCode) btnCode.classList.add('active');
        if (btnWy)   btnWy.classList.remove('active');
    } else {
        // code → wy : init WYSIWYG si besoin, puis injecter le contenu
        codePane.style.display = 'none';
        wyPane.style.display   = 'block';
        if (btnCode) btnCode.classList.remove('active');
        if (btnWy)   btnWy.classList.add('active');

        const key = `${seqI}-${sessI}`;
        if (!window._wySessionInited[key]) {
            _initSessionWy(seqI, sessI);
            window._wySessionInited[key] = true;
        }

        // Injecter le contenu dans le WYSIWYG :
        // priorité CodeMirror → sinon le textarea caché → sinon vide
        const wyBody = document.getElementById(`wy-body-${seqI}-${sessI}`);
        if (wyBody) {
            if (cm && cm.getValue().trim()) {
                wyBody.innerHTML = cm.getValue();
            } else {
                // CodeMirror pas encore init → lire le textarea caché
                const hiddenTA = document.getElementById(`cm-hidden-${seqI}-${sessI}`);
                if (hiddenTA && hiddenTA.value.trim()) {
                    const raw = hiddenTA.value
                        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
                    wyBody.innerHTML = raw;
                }
            }
        }
    }
};

function _initSessionWy(seqI, sessI) {
    const tbId   = `wy-tb-${seqI}-${sessI}`;
    const bodyId = `wy-body-${seqI}-${sessI}`;
    const wrapId = `wy-wrap-${seqI}-${sessI}`;
    const dropId = `wy-drop-${seqI}-${sessI}`;
    const key    = `${seqI}-${sessI}`;

    // Injecter la toolbar
    const tb = document.getElementById(tbId);
    tb.innerHTML = _wySessionToolbarHTML(seqI, sessI);

    const body = document.getElementById(bodyId);
    const wrap = document.getElementById(wrapId);
    const drop = document.getElementById(dropId);

    // Commandes execCommand
    tb.addEventListener('mousedown', e => {
        const btn = e.target.closest('[data-cmd]');
        if (btn) { e.preventDefault(); body.focus(); document.execCommand(btn.dataset.cmd, false, null); _wySessionTbState(seqI, sessI); _wySessionSync(seqI, sessI); }
    });

    // Actions spéciales
    tb.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === 'imgUrl')    { _wySessionSaveRange(key); _wySessionInsertImgUrl(seqI, sessI); }
        if (act === 'link')      { _wySessionSaveRange(key); _wySessionInsertLink(seqI, sessI); }
        if (act === 'table')     { _wySessionSaveRange(key); _wySessionInsertTable(seqI, sessI); }
        if (act === 'hr')        { body.focus(); document.execCommand('insertHorizontalRule'); _wySessionSync(seqI, sessI); }
        if (act === 'simulation'){ _wySessionSaveRange(key); _wySessionInsertSimulation(seqI, sessI); }
    });

    // Select formatBlock
    tb.querySelector(`#wySessBlock-${seqI}-${sessI}`).addEventListener('change', e => {
        body.focus(); document.execCommand('formatBlock', false, e.target.value); _wySessionSync(seqI, sessI);
    });

    // Couleurs
    tb.querySelector(`#wySessFg-${seqI}-${sessI}`).addEventListener('input', e => {
        tb.querySelector(`#wySessFgBar-${seqI}-${sessI}`).style.background = e.target.value;
        body.focus(); document.execCommand('foreColor', false, e.target.value); _wySessionSync(seqI, sessI);
    });
    tb.querySelector(`#wySessBg-${seqI}-${sessI}`).addEventListener('input', e => {
        tb.querySelector(`#wySessBgBar-${seqI}-${sessI}`).style.background = e.target.value;
        body.focus(); document.execCommand('hiliteColor', false, e.target.value); _wySessionSync(seqI, sessI);
    });

    // File input
    tb.querySelector(`#wySessFile-${seqI}-${sessI}`).addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) _wySessionInsertImgFile(seqI, sessI, file);
        e.target.value = '';
    });

    // Sync input
    body.addEventListener('input',  () => { _wySessionSync(seqI, sessI); _wySessionTbState(seqI, sessI); _wySessionUpdateCount(seqI, sessI); });
    body.addEventListener('keyup',  () => _wySessionTbState(seqI, sessI));
    body.addEventListener('mouseup',() => _wySessionTbState(seqI, sessI));

    // Clic image
    body.addEventListener('click', e => {
        if (e.target.tagName === 'IMG') _wySessionSelectImg(seqI, sessI, e.target);
        else _wyDeselect();
    });

    // Drag & drop
    wrap.addEventListener('dragover', e => {
        if ([...e.dataTransfer.items].some(i => i.type.startsWith('image/'))) { e.preventDefault(); drop.classList.add('show'); }
    });
    wrap.addEventListener('dragleave', e => { if (!wrap.contains(e.relatedTarget)) drop.classList.remove('show'); });
    wrap.addEventListener('drop', e => {
        e.preventDefault(); drop.classList.remove('show');
        const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
        if (file) _wySessionInsertImgFile(seqI, sessI, file);
    });

    // Coller image
    body.addEventListener('paste', e => {
        const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
        if (item) { e.preventDefault(); _wySessionInsertImgFile(seqI, sessI, item.getAsFile()); }
    });
}

function _wySessionToolbarHTML(seqI, sessI) {
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
        <button type="button" class="wy-tb-btn" data-cmd="bold" title="Gras"><b>G</b></button>
        <button type="button" class="wy-tb-btn" data-cmd="italic" title="Italique"><i>I</i></button>
        <button type="button" class="wy-tb-btn" data-cmd="underline" title="Souligné"><u>S</u></button>
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
            title="Insérer un lien vers une simulation"
            style="background:#7c3aed;color:white;border-color:#7c3aed;">
            ⚡ Simulation
        </button>
    </div>`;
}

function _wySessionSaveRange(key) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) window['_wyRange_' + key] = sel.getRangeAt(0).cloneRange();
}
function _wySessionRestoreRange(seqI, sessI) {
    const key  = `${seqI}-${sessI}`;
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    body.focus();
    const saved = window['_wyRange_' + key];
    if (saved) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved); }
}

function _wySessionSelectImg(seqI, sessI, img) {
    _wyDeselect();
    window._wySessionSelImg[`${seqI}-${sessI}`] = img;
    img.style.outline = '2px solid #2563eb';
    _posImgOverlay(img, seqI, sessI);
}

function _posImgOverlay(img, seqI, sessI) {
    const box = document.getElementById('wyImgBox');
    const itb = document.getElementById('wyImgToolbar');
    const r   = img.getBoundingClientRect();
    const sy  = window.scrollY; const sx = window.scrollX;
    box.style.display = 'block';
    box.style.top    = (r.top + sy - 3)  + 'px';
    box.style.left   = (r.left + sx - 3) + 'px';
    box.style.width  = (r.width + 6) + 'px';
    box.style.height = (r.height + 6) + 'px';
    // Store current context on box for resize
    box.dataset.seqI = seqI; box.dataset.sessI = sessI;
    itb.style.display = 'flex';
    let top = r.top + sy - 44;
    if (top < sy + 4) top = r.bottom + sy + 6;
    itb.style.top  = top + 'px';
    itb.style.left = Math.max(4, r.left + sx) + 'px';
    itb.dataset.seqI = seqI; itb.dataset.sessI = sessI;
    document.getElementById('wyImgSize').textContent = Math.round(r.width) + '×' + Math.round(r.height);
}

function _wyDeselect() {
    // Désélectionner toutes les séances
    Object.keys(window._wySessionSelImg).forEach(k => {
        if (window._wySessionSelImg[k]) {
            window._wySessionSelImg[k].style.outline = '';
            delete window._wySessionSelImg[k];
        }
    });
    const box = document.getElementById('wyImgBox');
    const itb = document.getElementById('wyImgToolbar');
    if (box) box.style.display = 'none';
    if (itb) itb.style.display = 'none';
}

function _wySessionInsertImgUrl(seqI, sessI) {
    const url = prompt("URL de l\'image :");
    if (!url || !url.trim()) return;
    _wySessionRestoreRange(seqI, sessI);
    _wySessionInsertImgEl(seqI, sessI, url.trim(), 'image');
}
function _wySessionInsertImgFile(seqI, sessI, file) {
    _wySessionSaveRange(`${seqI}-${sessI}`);
    const reader = new FileReader();
    reader.onload = ev => { _wySessionRestoreRange(seqI, sessI); _wySessionInsertImgEl(seqI, sessI, ev.target.result, file.name.replace(/\.[^.]+$/, '')); };
    reader.readAsDataURL(file);
}
function _wySessionInsertImgEl(seqI, sessI, src, alt) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const img = document.createElement('img'); img.src = src; img.alt = alt;
    img.style.cssText = 'max-width:100%;border-radius:6px;margin:.5rem 0;display:block;box-shadow:0 2px 8px rgba(0,0,0,.12);';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && body.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0); range.collapse(false); range.insertNode(img);
        range.setStartAfter(img); range.setEndAfter(img); sel.removeAllRanges(); sel.addRange(range);
    } else { body.appendChild(img); }
    _wySessionSync(seqI, sessI);
    setTimeout(() => _wySessionSelectImg(seqI, sessI, img), 30);
}
function _wySessionInsertLink(seqI, sessI) {
    const url = prompt("URL du lien :"); if (!url) return;
    const txt = prompt("Texte du lien :") || url;
    _wySessionRestoreRange(seqI, sessI);
    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color:#2563eb;">${txt}</a>`);
    _wySessionSync(seqI, sessI);
}
function _wySessionInsertTable(seqI, sessI) {
    const cols = parseInt(prompt('Colonnes :', '3')) || 3;
    const rows = parseInt(prompt('Lignes :', '3')) || 3;
    const head = Array(cols).fill(0).map((_,i) => `<th style="padding:8px 12px;background:#1e40af;color:white;border:1px solid #1e3a8a;">Col ${i+1}</th>`).join('');
    const brows= Array(rows-1).fill(0).map(() => '<tr>'+Array(cols).fill('<td style="padding:8px 12px;border:1px solid #e2e8f0;"> </td>').join('')+'</tr>').join('');
    _wySessionRestoreRange(seqI, sessI);
    document.execCommand('insertHTML', false, `<div style="overflow-x:auto;margin:1rem 0;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${brows}</tbody></table></div>`);
    _wySessionSync(seqI, sessI);
}
function _wySessionTbState(seqI, sessI) {
    ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','insertUnorderedList','insertOrderedList'].forEach(cmd => {
        const btn = document.querySelector(`#wy-tb-${seqI}-${sessI} [data-cmd="${cmd}"]`);
        if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
}
function _wySessionSync(seqI, sessI) {
    const body     = document.getElementById(`wy-body-${seqI}-${sessI}`);
    if (!body) return;
    const editorId = `cm-editor-${seqI}-${sessI}`;
    const cm       = window._cmInstances?.[editorId];
    const html     = body.innerHTML;
    if (cm) {
        cm.setValue(html);
    } else {
        // CodeMirror pas encore init : stocker dans le textarea caché
        const hiddenTA = document.getElementById(`cm-hidden-${seqI}-${sessI}`);
        if (hiddenTA) hiddenTA.value = html;
    }
}
function _wySessionUpdateCount(seqI, sessI) {
    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const cnt  = document.getElementById(`wy-count-${seqI}-${sessI}`);
    if (body && cnt) cnt.textContent = body.textContent.length + ' car.';
}

// ══════════════════════════════════════════════════════
// HANDLERS GLOBAUX WYSIWYG — image toolbar + resize
// Appelé depuis DOMContentLoaded pour garantir que
// #wyImgBox et #wyImgToolbar existent dans le DOM
// ══════════════════════════════════════════════════════
function _initWyGlobalHandlers() {
    const imgTb  = document.getElementById('wyImgToolbar');
    const imgBox = document.getElementById('wyImgBox');
    if (!imgTb || !imgBox) return;

    // ── Boutons de la toolbar image flottante ──
    imgTb.addEventListener('click', e => {
        const btn = e.target.closest('[data-ia]');
        if (!btn) return;
        const seqI  = imgTb.dataset.seqI;
        const sessI = imgTb.dataset.sessI;
        const key   = `${seqI}-${sessI}`;
        const img   = window._wySessionSelImg[key];
        if (!img) return;
        const a = btn.dataset.ia;
        if (a === 'left')   { img.style.cssFloat='left';  img.style.margin='4px 1rem 4px 0'; img.style.display=''; }
        if (a === 'center') { img.style.cssFloat='';      img.style.margin='1rem auto';       img.style.display='block'; }
        if (a === 'right')  { img.style.cssFloat='right'; img.style.margin='4px 0 4px 1rem'; img.style.display=''; }
        if (a === 'full')   { img.style.width='100%'; img.style.height='auto'; }
        if (a === 'half')   { img.style.width='50%';  img.style.height='auto'; }
        if (a === 'url')    { const u = prompt('Nouvelle URL :'); if (u) img.src = u.trim(); }
        if (a === 'alt')    { const t = prompt('Texte alt :', img.alt||''); if (t !== null) img.alt = t; }
        if (a === 'del')    { img.remove(); _wyDeselect(); return; }
        if (seqI !== undefined && seqI !== 'undefined') _wySessionSync(seqI, sessI);
        if (img.parentNode) _posImgOverlay(img, seqI, sessI);
    });

    // ── Resize handles ──
    let _res=false, _sx,_sy,_sw,_sh,_dir;

    imgBox.querySelectorAll('.wy-rh').forEach(h => {
        h.addEventListener('mousedown', e => {
            const seqI = imgBox.dataset.seqI, sessI = imgBox.dataset.sessI;
            const key  = `${seqI}-${sessI}`;
            const img  = window._wySessionSelImg[key];
            if (!img) return;
            e.preventDefault();
            _res=true; _dir=h.dataset.d;
            _sx=e.clientX; _sy=e.clientY;
            _sw=img.offsetWidth; _sh=img.offsetHeight;
        });
    });

    document.addEventListener('mousemove', e => {
        if (!_res) return;
        const seqI = imgBox.dataset.seqI, sessI = imgBox.dataset.sessI;
        const img  = window._wySessionSelImg[`${seqI}-${sessI}`];
        if (!img) return;
        const dx=e.clientX-_sx, dy=e.clientY-_sy, d=_dir;
        let w=_sw, h=_sh;
        if (d.includes('e')) w = Math.max(30, _sw+dx);
        if (d.includes('w')) w = Math.max(30, _sw-dx);
        if (d.includes('s')) h = Math.max(20, _sh+dy);
        if (d.includes('n')) h = Math.max(20, _sh-dy);
        if (e.shiftKey && (d==='se'||d==='ne'||d==='sw'||d==='nw')) h = Math.round(w * (_sh/_sw));
        img.style.width  = w + 'px';
        img.style.height = (d==='e'||d==='w') ? 'auto' : h + 'px';
        _posImgOverlay(img, seqI, sessI);
    });

    document.addEventListener('mouseup', () => {
        if (_res) {
            _res = false;
            const seqI = imgBox.dataset.seqI, sessI = imgBox.dataset.sessI;
            if (seqI !== undefined && seqI !== 'undefined') _wySessionSync(seqI, sessI);
        }
    });

    document.addEventListener('scroll', () => {
        const seqI = imgBox.dataset.seqI, sessI = imgBox.dataset.sessI;
        const img  = window._wySessionSelImg[`${seqI}-${sessI}`];
        if (img) _posImgOverlay(img, seqI, sessI);
    }, true);

    // Désélectionner si clic en dehors de l'image, des handles ou de la toolbar
    document.addEventListener('mousedown', e => {
        if (!imgBox.contains(e.target) && !imgTb.contains(e.target)) {
            _wyDeselect();
        }
    });
} // fin _initWyGlobalHandlers

// ============================================
// CHANGER LA MÉTHODE PDF
// ============================================
window.changePdfMethod = function(radio, seqIndex, sessionIndex) {
    const sessionItem = radio.closest('.session-item');
    const allInputs = sessionItem.querySelectorAll('.pdf-input');
    
    // Masquer tous les inputs
    allInputs.forEach(input => input.classList.add('hidden'));
    
    // Afficher l'input correspondant
    const method = radio.value;
    if (method !== 'none') {
        const targetInput = sessionItem.querySelector(`.pdf-${method}`);
        if (targetInput) {
            targetInput.classList.remove('hidden');
        }
    }
};

// ============================================
// AJOUTER UNE SÉANCE
// ============================================
window.addSession = function(seqIndex) {
    const sessionsContainer = document.getElementById(`sessions-${seqIndex}`);
    const sessionCount = sessionsContainer.querySelectorAll('.session-item').length;
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createSessionHtml(seqIndex, sessionCount);
    const sessionEl = wrapper.firstElementChild;
    sessionsContainer.appendChild(sessionEl);
    
    // Ne pas init CodeMirror automatiquement — la nouvelle séance démarre en mode "plain"
    // CodeMirror sera initialisé seulement si l'utilisateur bascule en mode HTML
};

// ============================================
// SUPPRIMER UNE SÉQUENCE
// ============================================
window.removeSequence = function(button) {
    if (confirm('Voulez-vous vraiment supprimer cette séquence ?')) {
        button.closest('.sequence-item').remove();
        updateSequenceNumbers();
    }
};

// ============================================
// SUPPRIMER UNE SÉANCE
// ============================================
window.removeSession = function(button) {
    if (confirm('Voulez-vous vraiment supprimer cette séance ?')) {
        button.closest('.session-item').remove();
    }
};

// ============================================
// METTRE À JOUR LES NUMÉROS DE SÉQUENCE
// ============================================
function updateSequenceNumbers() {
    document.querySelectorAll('.sequence-item').forEach((item, index) => {
        item.dataset.index = index;
        item.querySelector('h4').textContent = `Séquence ${index + 1}`;
    });
}

// ============================================
// GÉNÉRATION DE SLUG SEO
// ============================================
function generateCourseSlug(title, diploma) {
    const base = (diploma ? diploma + ' ' + title : title)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);
    return base;
}

// ============================================
// SOUMETTRE LE FORMULAIRE
// ============================================
document.getElementById('courseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        
        const title = document.getElementById('courseTitle').value.trim();
        const diploma = document.getElementById('courseDiploma').value;

        const courseData = {
            title,
            description: document.getElementById('courseDescription').value.trim(),
            diploma,
            level: document.getElementById('courseLevel').value,
            sequences: await collectSequencesData(),
            updatedAt: serverTimestamp()
        };
        
        if (currentCourseId) {
            // Garder le slug existant ; en générer un si absent
            const existing = await getDoc(doc(db, 'courses', currentCourseId));
            if (!existing.data()?.slug) {
                courseData.slug = generateCourseSlug(title, diploma);
            }
            await updateDoc(doc(db, 'courses', currentCourseId), courseData);
            alert('Cours modifié avec succès !');
        } else {
            courseData.createdAt = serverTimestamp();
            courseData.slug = generateCourseSlug(title, diploma);
            await addDoc(collection(db, 'courses'), courseData);
            alert('Cours créé avec succès !');
        }
        
        resetCourseForm();
        switchTab('list');
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement du cours');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// ============================================
// COLLECTER LES DONNÉES - 3 MÉTHODES PDF
// ============================================
async function collectSequencesData() {
    const sequences = [];
    const sequenceItems = document.querySelectorAll('.sequence-item');
    
    for (const seqItem of sequenceItems) {
        const seqIndex = seqItem.dataset.index;
        const sessions = [];
        const sessionItems = seqItem.querySelectorAll('.session-item');
        
        for (const sessionItem of sessionItems) {
            // Déterminer quelle méthode PDF est sélectionnée
            const pdfMethodRadio = sessionItem.querySelector('input[type="radio"]:checked');
            const pdfMethod = pdfMethodRadio ? pdfMethodRadio.value : 'none';
            
            let pdfUrl = null;
            
            // Traiter selon la méthode choisie
            if (pdfMethod === 'github') {
                // Méthode 1 : GitHub - construire le chemin
                const filename = sessionItem.querySelector('.pdf-github-path').value.trim();
                if (filename) {
                    pdfUrl = `cours-pdf/${filename}`;
                }
                
            } else if (pdfMethod === 'firebase') {
                // Méthode 2 : Firebase Storage - upload si nouveau fichier
                const pdfFileInput = sessionItem.querySelector('.pdf-firebase-file');
                const existingUrl = sessionItem.querySelector('.pdf-firebase-url').value.trim();
                
                if (pdfFileInput.files.length > 0) {
                    pdfUrl = await uploadPDF(pdfFileInput.files[0]);
                } else if (existingUrl) {
                    pdfUrl = existingUrl;
                }
                
            } else if (pdfMethod === 'url') {
                // Méthode 3 : URL externe - utiliser directement l'URL
                const urlInput = sessionItem.querySelector('.pdf-url-input');
                pdfUrl = urlInput.value.trim() || null;
            }
            
            // Lire le contenu selon le mode actif
            const contentModeInput = sessionItem.querySelector('.session-content-mode');
            const contentMode = contentModeInput ? contentModeInput.value : 'html';
            let sessionContent = '';
            if (contentMode === 'plain') {
                // Mode texte : lire le textarea plain
                const seqIdx = sessionItem.dataset.seq;
                const sessIdx = sessionItem.dataset.session;
                const plainTA = sessionItem.querySelector(`#plain-${seqIdx}-${sessIdx}`);
                sessionContent = plainTA ? plainTA.value.trim() : '';
            } else {
                // Mode HTML : priorité WYSIWYG actif → CodeMirror → textarea caché
                const seqIdx  = sessionItem.dataset.seq;
                const sessIdx = sessionItem.dataset.session;
                const wyBody  = document.getElementById(`wy-body-${seqIdx}-${sessIdx}`);
                const cmId    = `cm-editor-${seqIdx}-${sessIdx}`;
                const cm      = window._cmInstances?.[cmId];
                const hiddenTA = sessionItem.querySelector('.session-content');
                // Si le pane WYSIWYG est visible, prendre son contenu (le plus récent)
                const wyPane = document.getElementById(`wy-pane-${seqIdx}-${sessIdx}`);
                if (wyPane && wyPane.style.display !== 'none' && wyBody) {
                    sessionContent = wyBody.innerHTML.trim();
                    // Synchro vers cm et textarea caché
                    if (cm) cm.setValue(sessionContent);
                    else if (hiddenTA) hiddenTA.value = sessionContent;
                } else if (cm) {
                    sessionContent = cm.getValue().trim();
                } else if (hiddenTA) {
                    sessionContent = hiddenTA.value.trim();
                }
            }

            sessions.push({
                title: sessionItem.querySelector('.session-title').value.trim(),
                content: sessionContent,
                contentMode: contentMode,
                pdfUrl: pdfUrl,
                pdfMethod: pdfMethod  // Sauvegarder la méthode utilisée
            });
        }
        
        sequences.push({
            title: seqItem.querySelector('.sequence-title').value.trim(),
            sessions: sessions
        });
    }
    
    return sequences;
}

// ============================================
// UPLOAD PDF (Firebase Storage)
// ============================================
async function uploadPDF(file) {
    try {
        const timestamp = Date.now();
        const fileName = `courses/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        return downloadURL;
    } catch (error) {
        console.error('Erreur upload PDF:', error);
        throw error;
    }
}

// ============================================
// SUPPRIMER UN COURS
// ============================================
window.deleteCourse = async function(courseId) {
    if (!confirm('Voulez-vous vraiment supprimer ce cours ? Cette action est irréversible.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        alert('Cours supprimé avec succès');
        loadCourses();
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression du cours');
    }
};

// ============================================
// ══════════════════════════════════════════════
//  GESTION DES MATIÈRES (NOUVEAU)
// ══════════════════════════════════════════════
// ============================================

// ── Ouvrir le panel matières d'un cours ──────────────────────────────────────
window.openMatieresPanel = async function(courseId, courseTitle) {
    currentCourseId = courseId;

    // Mettre à jour le titre du panel
    const titleEl = document.getElementById('matieresCourseTitle');
    if (titleEl) titleEl.textContent = courseTitle;

    switchTab('matieres');
    await loadMatieres(courseId);
};

// ── Charger les matières d'un cours ──────────────────────────────────────────
async function loadMatieres(courseId) {
    const container = document.getElementById('matieresListContainer');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;">
        <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p>Chargement…</p></div>`;

    try {
        const snap = await getDocs(query(
            collection(db, 'courses', courseId, 'matieres'),
            orderBy('order', 'asc')
        ));
        const matieres = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderMatieresAdmin(courseId, matieres, container);
    } catch(err) {
        console.error('[loadMatieres]', err);
        container.innerHTML = `<p style="color:#ef4444;padding:1rem;">Erreur de chargement : ${err.message}</p>`;
    }
}

// ── Afficher la liste des matières ───────────────────────────────────────────
function renderMatieresAdmin(courseId, matieres, container) {
    if (matieres.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem;color:#94a3b8;">
                <i class="fas fa-book" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>
                <p>Aucune matière — ajoutez la première !</p>
            </div>`;
        return;
    }

    const ICONS = ['fa-bolt','fa-microchip','fa-plug','fa-tools','fa-cogs','fa-network-wired',
                   'fa-wave-square','fa-battery-full','fa-solar-panel','fa-calculator','fa-book-open'];

    container.innerHTML = matieres.map(mat => `
        <div class="matiere-admin-row" data-id="${mat.id}">
            <div class="mar-drag"><i class="fas fa-grip-vertical"></i></div>
            <div class="mar-icon" style="background:#dbeafe;color:#1d4ed8;width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;">
                <i class="fas ${mat.icon || 'fa-bolt'}"></i>
            </div>
            <div class="mar-info" style="flex:1;">
                <strong style="color:#1e293b;">${escapeHtml(mat.title)}</strong>
                ${mat.description ? `<small style="display:block;color:#64748b;font-size:.8rem;">${escapeHtml(mat.description)}</small>` : ''}
            </div>
            <div class="mar-order" style="color:#94a3b8;font-size:.82rem;">Ordre : ${mat.order || '—'}</div>
            <div class="mar-actions" style="display:flex;gap:.4rem;">
                <button onclick="openEditMatiereModal('${courseId}','${mat.id}')"
                    style="padding:.35rem .7rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:7px;cursor:pointer;font-size:.82rem;">
                    <i class="fas fa-pen"></i> Modifier
                </button>
                <button onclick="openSequencesPanel('${courseId}','${mat.id}','${escapeHtml(mat.title)}')"
                    style="padding:.35rem .7rem;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:7px;cursor:pointer;font-size:.82rem;">
                    <i class="fas fa-list-ol"></i> Séquences
                </button>
                <button onclick="deleteMatiereConfirm('${courseId}','${mat.id}','${escapeHtml(mat.title)}')"
                    style="padding:.35rem .7rem;background:#fff5f5;color:#dc2626;border:1px solid #fecaca;border-radius:7px;cursor:pointer;font-size:.82rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

// ── Modal : ajouter une matière ───────────────────────────────────────────────
window.openAddMatiereModal = function() {
    if (!currentCourseId) return;
    showMatiereModal({ courseId: currentCourseId, mode: 'add' });
};

window.openEditMatiereModal = async function(courseId, matiereId) {
    try {
        const snap = await getDoc(doc(db, 'courses', courseId, 'matieres', matiereId));
        if (!snap.exists()) return alert('Matière introuvable');
        showMatiereModal({ courseId, matiereId, mode: 'edit', data: snap.data() });
    } catch(e) { alert('Erreur : ' + e.message); }
};

function showMatiereModal({ courseId, matiereId, mode, data = {} }) {
    const existing = document.getElementById('matiereFormModal');
    if (existing) existing.remove();

    const ICONS = ['fa-bolt','fa-microchip','fa-plug','fa-tools','fa-cogs','fa-network-wired',
                   'fa-wave-square','fa-battery-full','fa-solar-panel','fa-calculator','fa-book-open','fa-project-diagram'];
    const currentIcon = data.icon || 'fa-bolt';

    const modal = document.createElement('div');
    modal.id = 'matiereFormModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:2rem;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h3 style="font-size:1.2rem;font-weight:700;color:#1e293b;margin:0;">
                    ${mode === 'add' ? '<i class="fas fa-plus"></i> Nouvelle matière' : '<i class="fas fa-pen"></i> Modifier la matière'}
                </h3>
                <button onclick="document.getElementById('matiereFormModal').remove()"
                    style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;">✕</button>
            </div>

            <div class="form-group" style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;color:#374151;display:block;margin-bottom:.4rem;">Titre *</label>
                <input id="mfTitle" type="text" value="${escapeHtml(data.title || '')}"
                    placeholder="Ex: Électrotechnique, Automatisme…"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;font-size:.95rem;box-sizing:border-box;">
            </div>

            <div class="form-group" style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;color:#374151;display:block;margin-bottom:.4rem;">Description</label>
                <textarea id="mfDesc" placeholder="Brève description…" rows="2"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;font-size:.9rem;resize:vertical;box-sizing:border-box;">${escapeHtml(data.description || '')}</textarea>
            </div>

            <div class="form-group" style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;color:#374151;display:block;margin-bottom:.4rem;">Icône</label>
                <div style="display:flex;flex-wrap:wrap;gap:.4rem;">
                    ${ICONS.map(ic => `
                        <button type="button" id="mfIcon_${ic.replace('fa-','')}"
                            onclick="selectMatiereIcon('${ic}')"
                            style="width:38px;height:38px;border:2px solid ${ic === currentIcon ? '#2563eb' : '#e2e8f0'};border-radius:8px;
                                   background:${ic === currentIcon ? '#eff6ff' : 'white'};color:${ic === currentIcon ? '#2563eb' : '#64748b'};
                                   cursor:pointer;display:flex;align-items:center;justify-content:center;">
                            <i class="fas ${ic}"></i>
                        </button>`).join('')}
                </div>
                <input type="hidden" id="mfIcon" value="${currentIcon}">
            </div>

            <div class="form-group" style="margin-bottom:1.5rem;">
                <label style="font-weight:600;font-size:.9rem;color:#374151;display:block;margin-bottom:.4rem;">Ordre d'affichage</label>
                <input id="mfOrder" type="number" min="1" value="${data.order || 1}"
                    style="width:120px;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;font-size:.95rem;">
            </div>

            <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                <button onclick="document.getElementById('matiereFormModal').remove()"
                    style="padding:.7rem 1.4rem;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer;font-weight:600;">Annuler</button>
                <button onclick="saveMatiere('${courseId}','${matiereId || ''}','${mode}')"
                    style="padding:.7rem 1.4rem;background:#2563eb;color:white;border:none;border-radius:9px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-save"></i> ${mode === 'add' ? 'Créer' : 'Enregistrer'}
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

window.selectMatiereIcon = function(icon) {
    document.getElementById('mfIcon').value = icon;
    document.querySelectorAll('[id^="mfIcon_"]').forEach(btn => {
        const isSelected = btn.id === `mfIcon_${icon.replace('fa-','')}`;
        btn.style.borderColor = isSelected ? '#2563eb' : '#e2e8f0';
        btn.style.background  = isSelected ? '#eff6ff' : 'white';
        btn.style.color       = isSelected ? '#2563eb' : '#64748b';
    });
};

window.saveMatiere = async function(courseId, matiereId, mode) {
    const title = document.getElementById('mfTitle')?.value.trim();
    const desc  = document.getElementById('mfDesc')?.value.trim();
    const icon  = document.getElementById('mfIcon')?.value || 'fa-bolt';
    const order = parseInt(document.getElementById('mfOrder')?.value) || 1;

    if (!title || title.length < 2) return alert('Le titre est obligatoire (min. 2 caractères).');

    const btn = document.querySelector('#matiereFormModal button[onclick*="saveMatiere"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

    try {
        const data = { title, description: desc, icon, order, updatedAt: serverTimestamp() };

        if (mode === 'add') {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'courses', courseId, 'matieres'), data);
            showAdminToast('Matière créée !', 'success');
        } else {
            await updateDoc(doc(db, 'courses', courseId, 'matieres', matiereId), data);
            showAdminToast('Matière mise à jour !', 'success');
        }

        document.getElementById('matiereFormModal')?.remove();
        await loadMatieres(courseId);
    } catch(err) {
        console.error('[saveMatiere]', err);
        alert('Erreur : ' + err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer'; }
    }
};

window.deleteMatiereConfirm = async function(courseId, matiereId, titre) {
    if (!confirm(`Supprimer "${titre}" ?\n\n⚠️ Toutes ses séquences et séances seront aussi supprimées.`)) return;
    try {
        // Supprimer séquences + séances en cascade
        const seqSnap = await getDocs(collection(db,'courses',courseId,'matieres',matiereId,'sequences'));
        for (const seqDoc of seqSnap.docs) {
            const sSnap = await getDocs(collection(db,'courses',courseId,'matieres',matiereId,'sequences',seqDoc.id,'seances'));
            for (const s of sSnap.docs) await deleteDoc(s.ref);
            await deleteDoc(seqDoc.ref);
        }
        await deleteDoc(doc(db,'courses',courseId,'matieres',matiereId));
        showAdminToast('Matière supprimée.', 'success');
        await loadMatieres(courseId);
    } catch(err) {
        alert('Erreur : ' + err.message);
    }
};

// ── Panel séquences d'une matière ─────────────────────────────────────────────
window.openSequencesPanel = async function(courseId, matiereId, matiereTitle) {
    currentCourseId  = courseId;
    currentMatiereId = matiereId;

    const panel = document.getElementById('sequencesPanelOverlay');
    const titleEl = document.getElementById('sequencesPanelTitle');
    if (!panel) return;
    if (titleEl) titleEl.textContent = matiereTitle;
    panel.style.display = 'flex';

    await loadSequences(courseId, matiereId);
};

window.closeSequencesPanel = function() {
    const panel = document.getElementById('sequencesPanelOverlay');
    if (panel) panel.style.display = 'none';
};

async function loadSequences(courseId, matiereId) {
    const container = document.getElementById('sequencesPanelList');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i></div>`;

    try {
        const snap = await getDocs(query(
            collection(db,'courses',courseId,'matieres',matiereId,'sequences'),
            orderBy('order','asc')
        ));
        const seqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderSequencesPanel(courseId, matiereId, seqs, container);
    } catch(err) {
        container.innerHTML = `<p style="color:#ef4444;">Erreur : ${err.message}</p>`;
    }
}

function renderSequencesPanel(courseId, matiereId, seqs, container) {
    if (!seqs.length) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-list-ol" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i><p>Aucune séquence.</p></div>`;
        return;
    }
    container.innerHTML = seqs.map(seq => `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:.75rem;display:flex;align-items:center;gap:.75rem;">
            <div style="width:30px;height:30px;background:#1d4ed8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">${seq.order||'?'}</div>
            <div style="flex:1;">
                <strong style="color:#1e293b;">${escapeHtml(seq.title)}</strong>
                ${seq.description ? `<small style="display:block;color:#64748b;font-size:.8rem;">${escapeHtml(seq.description)}</small>` : ''}
            </div>
            <div style="display:flex;gap:.4rem;">
                <button onclick="openEditSequenceModal('${courseId}','${matiereId}','${seq.id}')"
                    style="padding:.3rem .65rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:7px;cursor:pointer;font-size:.8rem;">
                    <i class="fas fa-pen"></i>
                </button>
                <button onclick="openSeancesPanel('${courseId}','${matiereId}','${seq.id}','${escapeHtml(seq.title)}')"
                    style="padding:.3rem .65rem;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:7px;cursor:pointer;font-size:.8rem;">
                    <i class="fas fa-play-circle"></i> Séances
                </button>
                <button onclick="deleteSequenceConfirm('${courseId}','${matiereId}','${seq.id}','${escapeHtml(seq.title)}')"
                    style="padding:.3rem .65rem;background:#fff5f5;color:#dc2626;border:1px solid #fecaca;border-radius:7px;cursor:pointer;font-size:.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

window.openAddSequenceModal = function() {
    showSequenceModal({ courseId: currentCourseId, matiereId: currentMatiereId, mode: 'add' });
};

window.openEditSequenceModal = async function(courseId, matiereId, seqId) {
    const snap = await getDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId));
    showSequenceModal({ courseId, matiereId, seqId, mode: 'edit', data: snap.data() || {} });
};

function showSequenceModal({ courseId, matiereId, seqId, mode, data = {} }) {
    const existing = document.getElementById('sequenceFormModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sequenceFormModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:2rem;width:90%;max-width:460px;">
            <h3 style="margin:0 0 1.5rem;font-size:1.15rem;font-weight:700;color:#1e293b;">
                ${mode === 'add' ? '<i class="fas fa-plus"></i> Nouvelle séquence' : '<i class="fas fa-pen"></i> Modifier la séquence'}
            </h3>
            <div style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Titre *</label>
                <input id="sqTitle" type="text" value="${escapeHtml(data.title||'')}" placeholder="Ex: Séquence 1 — Introduction"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Description</label>
                <textarea id="sqDesc" rows="2" placeholder="Brève description…"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;resize:vertical;box-sizing:border-box;">${escapeHtml(data.description||'')}</textarea>
            </div>
            <div style="margin-bottom:1.5rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Ordre</label>
                <input id="sqOrder" type="number" min="1" value="${data.order||1}"
                    style="width:100px;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;">
            </div>
            <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                <button onclick="document.getElementById('sequenceFormModal').remove()"
                    style="padding:.7rem 1.4rem;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer;font-weight:600;">Annuler</button>
                <button onclick="saveSequence('${courseId}','${matiereId}','${seqId||''}','${mode}')"
                    style="padding:.7rem 1.4rem;background:#1d4ed8;color:white;border:none;border-radius:9px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-save"></i> ${mode === 'add' ? 'Créer' : 'Enregistrer'}
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

window.saveSequence = async function(courseId, matiereId, seqId, mode) {
    const title = document.getElementById('sqTitle')?.value.trim();
    const desc  = document.getElementById('sqDesc')?.value.trim();
    const order = parseInt(document.getElementById('sqOrder')?.value) || 1;
    if (!title) return alert('Le titre est obligatoire.');

    try {
        const data = { title, description: desc, order, updatedAt: serverTimestamp() };
        if (mode === 'add') {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db,'courses',courseId,'matieres',matiereId,'sequences'), data);
            showAdminToast('Séquence créée !', 'success');
        } else {
            await updateDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId), data);
            showAdminToast('Séquence mise à jour !', 'success');
        }
        document.getElementById('sequenceFormModal')?.remove();
        await loadSequences(courseId, matiereId);
    } catch(err) { alert('Erreur : ' + err.message); }
};

window.deleteSequenceConfirm = async function(courseId, matiereId, seqId, titre) {
    if (!confirm(`Supprimer la séquence "${titre}" et toutes ses séances ?`)) return;
    try {
        const sSnap = await getDocs(collection(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances'));
        for (const s of sSnap.docs) await deleteDoc(s.ref);
        await deleteDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId));
        showAdminToast('Séquence supprimée.', 'success');
        await loadSequences(courseId, matiereId);
    } catch(err) { alert('Erreur : ' + err.message); }
};

// ── Panel séances d'une séquence ──────────────────────────────────────────────
let currentSequenceId = null;

window.openSeancesPanel = async function(courseId, matiereId, seqId, seqTitle) {
    currentSequenceId = seqId;
    // Fermer panel séquences et ouvrir séances dans le même overlay
    const titleEl = document.getElementById('sequencesPanelTitle');
    if (titleEl) titleEl.textContent = `Séances — ${seqTitle}`;

    const container = document.getElementById('sequencesPanelList');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i></div>`;

    // Ajouter bouton retour
    const addBtn = document.getElementById('sequencesAddBtn');
    if (addBtn) {
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter une séance';
        addBtn.onclick = () => openAddSeanceModal(courseId, matiereId, seqId);
    }
    const backBtn = document.getElementById('sequencesBackBtn');
    if (backBtn) {
        backBtn.style.display = 'inline-flex';
        backBtn.onclick = async () => {
            if (addBtn) { addBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter une séquence'; addBtn.onclick = () => openAddSequenceModal(); }
            if (titleEl) titleEl.textContent = document.getElementById('matieresCourseTitle')?.textContent || '';
            backBtn.style.display = 'none';
            await loadSequences(courseId, matiereId);
        };
    }

    await loadSeances(courseId, matiereId, seqId, container);
};

async function loadSeances(courseId, matiereId, seqId, container) {
    try {
        const snap = await getDocs(query(
            collection(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances'),
            orderBy('order','asc')
        ));
        const seances = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderSeancesPanel(courseId, matiereId, seqId, seances, container);
    } catch(err) { container.innerHTML = `<p style="color:#ef4444;">Erreur : ${err.message}</p>`; }
}

function renderSeancesPanel(courseId, matiereId, seqId, seances, container) {
    if (!seances.length) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-play-circle" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i><p>Aucune séance.</p></div>`;
        return;
    }
    container.innerHTML = seances.map(s => `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin-bottom:.75rem;display:flex;align-items:center;gap:.75rem;">
            <div style="width:28px;height:28px;background:#dbeafe;color:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0;">${s.order||'?'}</div>
            <div style="flex:1;">
                <strong style="color:#1e293b;font-size:.95rem;">${escapeHtml(s.title)}</strong>
                ${s.pdfUrl ? `<small style="display:block;color:#d97706;font-size:.78rem;"><i class="fas fa-file-pdf"></i> PDF joint</small>` : ''}
            </div>
            <div style="display:flex;gap:.4rem;">
                <button onclick="openEditSeanceModal('${courseId}','${matiereId}','${seqId}','${s.id}')"
                    style="padding:.3rem .65rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:7px;cursor:pointer;font-size:.8rem;">
                    <i class="fas fa-pen"></i>
                </button>
                <button onclick="deleteSeanceConfirm('${courseId}','${matiereId}','${seqId}','${s.id}','${escapeHtml(s.title)}')"
                    style="padding:.3rem .65rem;background:#fff5f5;color:#dc2626;border:1px solid #fecaca;border-radius:7px;cursor:pointer;font-size:.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

window.openAddSeanceModal = function(courseId, matiereId, seqId) {
    showSeanceModal({ courseId, matiereId, seqId, mode: 'add' });
};

window.openEditSeanceModal = async function(courseId, matiereId, seqId, seanceId) {
    const snap = await getDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances',seanceId));
    showSeanceModal({ courseId, matiereId, seqId, seanceId, mode: 'edit', data: snap.data() || {} });
};

function showSeanceModal({ courseId, matiereId, seqId, seanceId, mode, data = {} }) {
    const existing = document.getElementById('seanceFormModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'seanceFormModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:1rem;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:2rem;width:100%;max-width:680px;">
            <h3 style="margin:0 0 1.5rem;font-size:1.15rem;font-weight:700;color:#1e293b;">
                ${mode === 'add' ? '<i class="fas fa-plus"></i> Nouvelle séance' : '<i class="fas fa-pen"></i> Modifier la séance'}
            </h3>

            <div style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Titre *</label>
                <input id="scTitle" type="text" value="${escapeHtml(data.title||'')}"
                    placeholder="Ex: Introduction aux circuits électriques"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;box-sizing:border-box;">
            </div>

            <div style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Ordre</label>
                <input id="scOrder" type="number" min="1" value="${data.order||1}"
                    style="width:100px;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;">
            </div>

            <div style="margin-bottom:1rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">Contenu HTML</label>
                <textarea id="scContent" rows="8" placeholder="Contenu HTML de la séance…"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;font-family:monospace;font-size:.85rem;resize:vertical;box-sizing:border-box;">${escapeHtml(data.content||'')}</textarea>
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="font-weight:600;font-size:.9rem;display:block;margin-bottom:.4rem;">URL PDF (optionnel)</label>
                <input id="scPdf" type="url" value="${escapeHtml(data.pdfUrl||'')}" placeholder="https://…"
                    style="width:100%;padding:.75rem;border:2px solid #e2e8f0;border-radius:9px;box-sizing:border-box;">
            </div>

            <div style="display:flex;gap:.75rem;justify-content:flex-end;">
                <button onclick="document.getElementById('seanceFormModal').remove()"
                    style="padding:.7rem 1.4rem;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer;font-weight:600;">Annuler</button>
                <button onclick="saveSeance('${courseId}','${matiereId}','${seqId}','${seanceId||''}','${mode}')"
                    style="padding:.7rem 1.4rem;background:#1d4ed8;color:white;border:none;border-radius:9px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-save"></i> ${mode === 'add' ? 'Créer' : 'Enregistrer'}
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

window.saveSeance = async function(courseId, matiereId, seqId, seanceId, mode) {
    const title   = document.getElementById('scTitle')?.value.trim();
    const order   = parseInt(document.getElementById('scOrder')?.value) || 1;
    const content = document.getElementById('scContent')?.value.trim();
    const pdfUrl  = document.getElementById('scPdf')?.value.trim() || null;

    if (!title) return alert('Le titre est obligatoire.');

    try {
        const data = { title, order, content: content || '', pdfUrl, updatedAt: serverTimestamp() };
        if (mode === 'add') {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances'), data);
            showAdminToast('Séance créée !', 'success');
        } else {
            await updateDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances',seanceId), data);
            showAdminToast('Séance mise à jour !', 'success');
        }
        document.getElementById('seanceFormModal')?.remove();
        const container = document.getElementById('sequencesPanelList');
        if (container) await loadSeances(courseId, matiereId, seqId, container);
    } catch(err) { alert('Erreur : ' + err.message); }
};

window.deleteSeanceConfirm = async function(courseId, matiereId, seqId, seanceId, titre) {
    if (!confirm(`Supprimer la séance "${titre}" ?`)) return;
    try {
        await deleteDoc(doc(db,'courses',courseId,'matieres',matiereId,'sequences',seqId,'seances',seanceId));
        showAdminToast('Séance supprimée.', 'success');
        const container = document.getElementById('sequencesPanelList');
        if (container) await loadSeances(courseId, matiereId, seqId, container);
    } catch(err) { alert('Erreur : ' + err.message); }
};

// ── Toast notifications admin ─────────────────────────────────────────────────
function showAdminToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;padding:.85rem 1.5rem;border-radius:10px;font-weight:600;font-size:.9rem;color:white;background:${type==='success'?'#16a34a':type==='error'?'#dc2626':'#2563eb'};box-shadow:0 4px 16px rgba(0,0,0,.15);animation:fadeIn .3s ease;`;
    toast.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ══════════════════════════════════════════════
//  FIN GESTION DES MATIÈRES
// ══════════════════════════════════════════════

// ============================================
// FONCTION UTILITAIRE
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Courses initialisé avec 3 méthodes PDF');
    // Initialiser les handlers globaux WYSIWYG (image toolbar + resize)
    _initWyGlobalHandlers();
});

// ============================================
// INSÉRER UN LIEN SIMULATION — ÉDITEUR CODE
// ============================================
window.insertSimulationLink = function(editorId) {
    const cm = window._cmInstances?.[editorId];
    if (!cm) return;

    // Boîte de dialogue pour récupérer les infos
    const nomFichier = prompt(
        '📁 Nom du fichier simulation (dans le dossier simulations/) :\nEx: deux-sens-de-marche.html',
        'nom-simulation.html'
    );
    if (!nomFichier) return;

    const texteVisible = prompt(
        '✏️ Texte visible du lien :\nEx: deux sens de marche',
        nomFichier.replace('.html', '').replace(/-/g, ' ')
    );
    if (!texteVisible) return;

    const snippet = `<a href="simulations/${nomFichier.trim()}" class="sim-link" style="display:inline-flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:0.4rem 1rem;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.9rem;margin:0.25rem 0;">⚡ ${texteVisible.trim()}</a>`;

    const cursor = cm.getCursor();
    cm.replaceRange(snippet, cursor);
    cm.focus();
};

// ============================================
// INSÉRER UN LIEN SIMULATION — ÉDITEUR WYSIWYG
// ============================================
function _wySessionInsertSimulation(seqI, sessI) {
    const nomFichier = prompt(
        '📁 Nom du fichier simulation (dans le dossier simulations/) :\nEx: deux-sens-de-marche.html',
        'nom-simulation.html'
    );
    if (!nomFichier) return;

    const texteVisible = prompt(
        '✏️ Texte visible du lien :\nEx: deux sens de marche',
        nomFichier.replace('.html', '').replace(/-/g, ' ')
    );
    if (!texteVisible) return;

    const body = document.getElementById(`wy-body-${seqI}-${sessI}`);
    const key  = `${seqI}-${sessI}`;

    // Créer l'élément lien directement
    const link = document.createElement('a');
    link.href      = `simulations/${nomFichier.trim()}`;
    link.className = 'sim-link';
    link.setAttribute('style', 'display:inline-flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:0.4rem 1rem;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.9rem;margin:0.25rem 0;');
    link.textContent = `⚡ ${texteVisible.trim()}`;

    // Restaurer la sélection et insérer
    _wySessionRestoreRange(seqI, sessI);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(link);
        // Placer le curseur après le lien
        range.setStartAfter(link);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (body) {
        body.appendChild(link);
    }

    _wySessionSync(seqI, sessI);
}

console.log('✅ Système de simulations initialisé');
