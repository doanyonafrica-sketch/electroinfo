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
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    const coursesListTab = document.getElementById('coursesListTab');
    const courseFormTab = document.getElementById('courseFormTab');
    
    if (coursesListTab) coursesListTab.classList.add('hidden');
    if (courseFormTab) courseFormTab.classList.add('hidden');
    
    if (tab === 'list' && coursesListTab) {
        coursesListTab.classList.remove('hidden');
        loadCourses();
    } else if (tab === 'form' && courseFormTab) {
        courseFormTab.classList.remove('hidden');
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
    
    if (!coursesTableBody) {
        console.error('Element coursesTableBody not found');
        return;
    }
    
    coursesTableBody.innerHTML = allCourses.map(course => {
        const sequencesCount = course.sequences?.length || 0;
        let sessionsCount = 0;
        if (course.sequences) {
            course.sequences.forEach(seq => {
                sessionsCount += seq.sessions?.length || 0;
            });
        }

        const date = course.createdAt?.toDate?.() || new Date();
        const formattedDate = date.toLocaleDateString('fr-FR');

        return `
            <tr>
                <td>${escapeHtml(course.title)}</td>
                <td><span class="badge">${escapeHtml(course.diploma || 'N/A')}</span></td>
                <td><span class="badge badge-info">${escapeHtml(course.level || 'N/A')}</span></td>
                <td>${sequencesCount}</td>
                <td>${sessionsCount}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editCourse('${course.id}')" class="btn-action btn-edit" title="Modifier">
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
    // FIX : Retirer le prefixe 'cours-pdf/' pour l'input GitHub
    // Sinon re-sauvegarder cree 'cours-pdf/cours-pdf/fichier.pdf'
    const githubFilename = pdfMethod === 'github'
        ? pdfValue.replace(/^cours-pdf\//, '')
        : '';
    // FIX : Firebase URL existante uniquement si methode = 'firebase'
    const firebaseExistingUrl = pdfMethod === 'firebase' ? pdfValue : '';
    const editorId = `cm-editor-${seqIndex}-${sessionIndex}`;
    const hiddenId = `cm-hidden-${seqIndex}-${sessionIndex}`;
    const previewId = `cm-preview-${seqIndex}-${sessionIndex}`;
    const content = sessionData?.content || '';

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
                    <div class="editor-toolbar">
                        <span class="editor-label"><i class="fas fa-code"></i> Contenu HTML de la séance</span>
                        <div class="editor-actions">
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'heading')" title="Titre h2">H2</button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'paragraph')" title="Paragraphe"><i class="fas fa-paragraph"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'table')" title="Tableau"><i class="fas fa-table"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'image')" title="Image"><i class="fas fa-image"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'list')" title="Liste"><i class="fas fa-list"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'alert')" title="Alerte"><i class="fas fa-exclamation-circle"></i></button>
                            <button type="button" class="editor-btn" onclick="insertSnippet('${editorId}', 'grid')" title="Grille"><i class="fas fa-th"></i></button>
                            <button type="button" class="editor-btn btn-format" onclick="formatCode('${editorId}')" title="Formater"><i class="fas fa-magic"></i></button>
                            <button type="button" class="editor-btn btn-preview" onclick="togglePreview('${editorId}', '${previewId}')" title="Aperçu"><i class="fas fa-eye"></i> Aperçu</button>
                        </div>
                    </div>
                    <div class="editor-container">
                        <div id="${editorId}" class="codemirror-wrapper"></div>
                        <textarea id="${hiddenId}" class="session-content" style="display:none;">${initialMode === 'html' ? escapeHtml(content) : ''}</textarea>
                    </div>
                    <div id="${previewId}" class="html-preview hidden">
                        <div class="preview-header"><i class="fas fa-eye"></i> Aperçu du rendu</div>
                        <div class="preview-body"></div>
                    </div>
                    <div class="editor-footer">
                        <span class="char-count" id="count-${editorId}">0 caractères</span>
                        <span class="editor-hint">💡 Collez votre HTML complet ici — tables, flex, grid, images, styles inline supportés</span>
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
// APERÇU HTML EN DIRECT
// ============================================
window.togglePreview = function(editorId, previewId) {
    const cm = window._cmInstances?.[editorId];
    const previewEl = document.getElementById(previewId);
    if (!cm || !previewEl) return;

    if (previewEl.classList.contains('hidden')) {
        previewEl.querySelector('.preview-body').innerHTML = cm.getValue();
        previewEl.classList.remove('hidden');
    } else {
        previewEl.classList.add('hidden');
    }
};

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
// SOUMETTRE LE FORMULAIRE
// ============================================
document.getElementById('courseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        
        const courseData = {
            title: document.getElementById('courseTitle').value.trim(),
            description: document.getElementById('courseDescription').value.trim(),
            diploma: document.getElementById('courseDiploma').value,
            level: document.getElementById('courseLevel').value,
            sequences: await collectSequencesData(),
            updatedAt: serverTimestamp()
        };
        
        if (currentCourseId) {
            await updateDoc(doc(db, 'courses', currentCourseId), courseData);
            alert('Cours modifié avec succès !');
        } else {
            courseData.createdAt = serverTimestamp();
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
                // Mode HTML : lire le textarea caché de CodeMirror
                sessionContent = sessionItem.querySelector('.session-content').value.trim();
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
});