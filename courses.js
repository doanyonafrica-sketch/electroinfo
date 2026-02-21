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
    onAuthStateChanged 
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
        window.location.href = 'auth.html?redirect=admin-courses.html';
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
}

// ============================================
// CRÉER HTML POUR UNE SÉANCE - 3 MÉTHODES PDF
// ============================================
function createSessionHtml(seqIndex, sessionIndex, sessionData = null) {
    const pdfMethod = sessionData?.pdfMethod || 'none';
    const pdfValue = sessionData?.pdfUrl || '';
    
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
            
            <div class="form-group">
                <label>Contenu (HTML)</label>
                <textarea class="session-content" rows="6" placeholder="<h2>Introduction</h2><p>Contenu de la séance...</p>">${escapeHtml(sessionData?.content || '')}</textarea>
            </div>
            
            <!-- NOUVELLE SECTION : 3 MÉTHODES PDF -->
            <div class="form-group pdf-methods">
                <label>📄 Document PDF (optionnel)</label>
                
                <!-- Sélecteur de méthode -->
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
                        <span>📁 Dossier GitHub (cours-pdf/)</span>
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
                        <span>🔗 Lien URL externe</span>
                    </label>
                </div>
                
                <!-- Option 1 : GitHub (chemin du fichier) -->
                <div class="pdf-input pdf-github ${pdfMethod === 'github' ? '' : 'hidden'}" data-method="github">
                    <label>Nom du fichier dans cours-pdf/</label>
                    <input type="text" class="pdf-github-path" 
                        value="${pdfMethod === 'github' ? pdfValue : ''}" 
                        placeholder="Ex: electricite-chap1.pdf">
                    <small>📁 Le fichier doit être dans le dossier <code>cours-pdf/</code></small>
                    <small>💡 URL finale : <code>cours-pdf/electricite-chap1.pdf</code></small>
                </div>
                
                <!-- Option 2 : Firebase Storage (upload) -->
                <div class="pdf-input pdf-firebase ${pdfMethod === 'firebase' ? '' : 'hidden'}" data-method="firebase">
                    <input type="file" class="pdf-firebase-file" accept=".pdf">
                    ${sessionData?.pdfUrl && pdfMethod === 'firebase' ? `
                        <div class="current-file">
                            <i class="fas fa-file-pdf"></i>
                            <a href="${sessionData.pdfUrl}" target="_blank">PDF actuel</a>
                        </div>
                    ` : ''}
                    <input type="hidden" class="pdf-firebase-url" value="${pdfMethod === 'firebase' ? pdfValue : ''}">
                </div>
                
                <!-- Option 3 : URL externe -->
                <div class="pdf-input pdf-url ${pdfMethod === 'url' ? '' : 'hidden'}" data-method="url">
                    <label>URL complète du PDF</label>
                    <input type="url" class="pdf-url-input" 
                        value="${pdfMethod === 'url' ? pdfValue : ''}" 
                        placeholder="https://example.com/document.pdf">
                    <small>🔗 Collez l'URL complète du PDF hébergé ailleurs</small>
                </div>
            </div>
        </div>
    `;
}

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
    
    const sessionDiv = document.createElement('div');
    sessionDiv.innerHTML = createSessionHtml(seqIndex, sessionCount);
    sessionDiv.className = sessionDiv.firstElementChild.className;
    sessionDiv.dataset.seq = seqIndex;
    sessionDiv.dataset.session = sessionCount;
    
    sessionsContainer.appendChild(sessionDiv.firstElementChild);
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
                const existingUrl = sessionItem.querySelector('.pdf-firebase-url').value;
                
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
            
            sessions.push({
                title: sessionItem.querySelector('.session-title').value.trim(),
                content: sessionItem.querySelector('.session-content').value.trim(),
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