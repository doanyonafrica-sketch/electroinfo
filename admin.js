// admin.js - Script d'administration SÉCURISÉ AVEC SLUGS
import { initSmartSearch, smartFilter, addToHistory } from '/smart-search.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
    authDomain: "electroino-app.firebaseapp.com",
    projectId: "electroino-app",
    storageBucket: "electroino-app.firebasestorage.app",
    messagingSenderId: "864058526638",
    appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables globales
let currentUser = null;
let quillEditor = null;
let editMode = false;
let currentEditId = null;
let articleToDelete = null;

// Éléments DOM
const loadingSection = document.getElementById('loadingSection');
const accessDenied = document.getElementById('accessDenied');
const adminDashboard = document.getElementById('adminDashboard');
const articleForm = document.getElementById('articleForm');
const articlesList = document.getElementById('articlesList');       // ✅ conservé de l'original
const newsletterList = document.getElementById('newsletterList');

// ============================================
// 🧹 NETTOYAGE — QUILL UNIQUEMENT
// ⚠️  Ne jamais appeler sur du HTML brut CodeMirror
// ============================================
function cleanQuillHTML(html) {
    let cleaned = html
        // Supprimer les attributs inutiles ajoutés par Quill
        .replace(/class="ql-[^"]*"/g, '')
        // Supprimer les <p> vides avec seulement <br> ou espaces
        .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
        .replace(/<p>\s*&nbsp;\s*<\/p>/gi, '')
        .replace(/<p>\s*<\/p>/gi, '')
        // Supprimer les <br> en fin de <p> avant fermeture
        .replace(/<br\s*\/?>\s*<\/p>/gi, '</p>')
        // Supprimer plusieurs <br> consécutifs (max 1)
        .replace(/(<br\s*\/?>){2,}/gi, '<br>')
        // Réduire espaces multiples
        .replace(/\s+/g, ' ')
        // Supprimer espaces entre balises
        .replace(/>\s+</g, '><')
        .trim();

    return cleaned;
}

function getContentSize(content) {
    const encoder = new TextEncoder();
    return encoder.encode(content).length;
}

function truncateContent(html, maxBytes = 950000) {
    const encoder = new TextEncoder();
    let encoded = encoder.encode(html);

    if (encoded.length <= maxBytes) {
        return html;
    }

    console.warn(`⚠️ Contenu trop long: ${encoded.length} bytes. Troncature à ${maxBytes} bytes.`);

    let truncated = html.substring(0, Math.floor(html.length * maxBytes / encoded.length));

    const lastTag = truncated.lastIndexOf('<');
    const lastClose = truncated.lastIndexOf('>');

    if (lastTag > lastClose) {
        truncated = truncated.substring(0, lastTag);
    }

    return truncated + '\n<p><em style="color: #e74c3c;">[⚠️ Contenu tronqué automatiquement - article trop long. Taille max: 950KB]</em></p>';
}

// ============================================
// 🆕 FONCTION GÉNÉRATION SLUG
// ============================================
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
}

async function isSlugUnique(slug, excludeId = null) {
    const q = query(collection(db, 'articles'), where('slug', '==', slug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;

    if (excludeId) {
        const existingDoc = snapshot.docs[0];
        return existingDoc.id === excludeId;
    }

    return false;
}

async function generateUniqueSlug(title, excludeId = null) {
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (!(await isSlugUnique(slug, excludeId))) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

// ============================================
// 🔐 VÉRIFICATION ADMIN (CRITIQUE)
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html?redirect=admin.html';
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            showAccessDenied();
            return;
        }

        const userData = userDoc.data();

        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            showAccessDenied();
            return;
        }

        currentUser = user;
        showAdminDashboard(user, userData);
        initQuillEditor();
        await checkAndPublishScheduled(); // ✅ Auto-publication
        loadArticles();
        loadStatistics();
        loadNewsletterSubscribers();

    } catch (error) {
        console.error('Erreur vérification admin:', error);
        showAccessDenied();
    }
});

function showAccessDenied() {
    loadingSection.classList.add('hidden');
    accessDenied.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
}

function showAdminDashboard(user, userData) {
    loadingSection.classList.add('hidden');
    accessDenied.classList.add('hidden');
    adminDashboard.classList.remove('hidden');

    const displayName = userData.name || user.displayName || user.email.split('@')[0];
    const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1e40af&color=fff`;

    document.getElementById('adminName').textContent = displayName;
    document.getElementById('adminAvatar').src = avatarUrl;
}

// ============================================
// DÉCONNEXION
// ============================================
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
});

// ============================================
// QUILL EDITOR
// ============================================

// 📸 MODULE DE COMPRESSION D'IMAGES
async function compressImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                const sizeKB = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
                console.log(`📸 Image compressée: ${width}x${height}, ${sizeKB} KB`);

                resolve(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 🎛️ HANDLER PERSONNALISÉ POUR LES IMAGES
function customImageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');

    input.onchange = async () => {
        const file = input.files[0];

        if (!file) return;

        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`📁 Fichier original: ${fileSizeMB.toFixed(2)} MB`);

        const quality = await showImageQualityDialog(fileSizeMB);

        if (quality === null) return;

        showNotification('🔄 Compression de l\'image...', 'info');

        try {
            const compressedImage = await compressImage(file, quality.maxWidth, quality.quality);

            const range = quillEditor.getSelection(true);
            quillEditor.insertEmbed(range.index, 'image', compressedImage);
            quillEditor.setSelection(range.index + 1);

            setTimeout(() => {
                makeImagesResizable();
            }, 100);

            showNotification('✅ Image ajoutée avec succès !', 'success');

        } catch (error) {
            console.error('Erreur compression:', error);
            showNotification('❌ Erreur lors de l\'ajout de l\'image', 'error');
        }
    };

    input.click();
}

// 📐 RENDRE LES IMAGES REDIMENSIONNABLES
function makeImagesResizable() {
    const images = quillEditor.root.querySelectorAll('img');

    images.forEach(img => {
        if (img.classList.contains('resizable')) return;

        img.classList.add('resizable');
        img.style.cursor = 'nwse-resize';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        img.addEventListener('dblclick', function(e) {
            e.preventDefault();
            showResizeDialog(img);
        });

        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showImageOptions(img);
        });
    });
}

// 🎨 DIALOGUE DE QUALITÉ D'IMAGE
async function showImageQualityDialog(originalSizeMB) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-image"></i> Options de compression</h3>
                </div>
                <div class="modal-body">
                    <p>Taille originale: <strong>${originalSizeMB.toFixed(2)} MB</strong></p>

                    <div class="form-group">
                        <label>Qualité de l'image</label>
                        <select id="imageQuality" class="input">
                            <option value="high">Haute qualité (1200px, 85%)</option>
                            <option value="medium" selected>Moyenne (800px, 75%)</option>
                            <option value="low">Basse (600px, 65%)</option>
                            <option value="custom">Personnalisée...</option>
                        </select>
                    </div>

                    <div id="customSettings" style="display: none;">
                        <div class="form-group">
                            <label>Largeur maximale (px)</label>
                            <input type="number" id="customWidth" class="input" value="800" min="200" max="2000">
                        </div>
                        <div class="form-group">
                            <label>Qualité (%)</label>
                            <input type="range" id="customQuality" class="input" value="75" min="20" max="100">
                            <span id="qualityValue">75%</span>
                        </div>
                    </div>

                    <div class="alert alert-info" style="margin-top: 1rem;">
                        <i class="fas fa-info-circle"></i>
                        <strong>Conseil:</strong> Utilisez "Moyenne" pour un bon équilibre qualité/taille
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancelImageBtn" class="btn btn-secondary">Annuler</button>
                    <button id="confirmImageBtn" class="btn btn-primary">
                        <i class="fas fa-check"></i> Ajouter l'image
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.remove('hidden');

        const qualitySelect = modal.querySelector('#imageQuality');
        const customSettings = modal.querySelector('#customSettings');
        const customQuality = modal.querySelector('#customQuality');
        const qualityValue = modal.querySelector('#qualityValue');

        qualitySelect.addEventListener('change', () => {
            customSettings.style.display = qualitySelect.value === 'custom' ? 'block' : 'none';
        });

        customQuality.addEventListener('input', () => {
            qualityValue.textContent = customQuality.value + '%';
        });

        modal.querySelector('#cancelImageBtn').onclick = () => {
            modal.remove();
            resolve(null);
        };

        modal.querySelector('#confirmImageBtn').onclick = () => {
            const selected = qualitySelect.value;
            let config;

            if (selected === 'custom') {
                config = {
                    maxWidth: parseInt(modal.querySelector('#customWidth').value),
                    quality: parseInt(modal.querySelector('#customQuality').value) / 100
                };
            } else {
                const presets = {
                    high: { maxWidth: 1200, quality: 0.85 },
                    medium: { maxWidth: 800, quality: 0.75 },
                    low: { maxWidth: 600, quality: 0.65 }
                };
                config = presets[selected];
            }

            modal.remove();
            resolve(config);
        };
    });
}

// 📏 DIALOGUE DE REDIMENSIONNEMENT
function showResizeDialog(img) {
    const currentWidth = img.style.width ? parseInt(img.style.width) : img.naturalWidth;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fas fa-expand-arrows-alt"></i> Redimensionner l'image</h3>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Largeur (px ou %)</label>
                    <input type="text" id="imageWidth" class="input" value="${currentWidth}" placeholder="800 ou 50%">
                </div>
                <div class="form-group">
                    <label>Presets rapides</label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='25%'">25%</button>
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='50%'">50%</button>
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='75%'">75%</button>
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='100%'">100%</button>
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='400'">400px</button>
                        <button class="btn btn-sm btn-outline" onclick="document.getElementById('imageWidth').value='800'">800px</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancelResize" class="btn btn-secondary">Annuler</button>
                <button id="confirmResize" class="btn btn-primary">
                    <i class="fas fa-check"></i> Appliquer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');

    modal.querySelector('#cancelResize').onclick = () => modal.remove();
    modal.querySelector('#confirmResize').onclick = () => {
        const width = modal.querySelector('#imageWidth').value.trim();
        img.style.width = width;
        img.style.height = 'auto';
        modal.remove();
        showNotification('✅ Image redimensionnée !', 'success');
    };
}

// ⚙️ OPTIONS D'IMAGE (MENU CONTEXTUEL)
function showImageOptions(img) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3><i class="fas fa-cog"></i> Options de l'image</h3>
            </div>
            <div class="modal-body">
                <button class="btn btn-primary" style="width: 100%; margin-bottom: 0.5rem;" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('resize'))">
                    <i class="fas fa-expand-arrows-alt"></i> Redimensionner
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('align-left'))">
                    <i class="fas fa-align-left"></i> Aligner à gauche
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('align-center'))">
                    <i class="fas fa-align-center"></i> Centrer
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('align-right'))">
                    <i class="fas fa-align-right"></i> Aligner à droite
                </button>
                <button class="btn btn-danger" style="width: 100%;" onclick="this.closest('.modal').dispatchEvent(new CustomEvent('delete'))">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
            <div class="modal-footer">
                <button id="closeOptions" class="btn btn-secondary">Fermer</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');

    modal.querySelector('#closeOptions').onclick = () => modal.remove();

    modal.addEventListener('resize', () => {
        modal.remove();
        showResizeDialog(img);
    });

    modal.addEventListener('align-left', () => {
        img.style.display = 'block';
        img.style.marginLeft = '0';
        img.style.marginRight = 'auto';
        modal.remove();
    });

    modal.addEventListener('align-center', () => {
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
        modal.remove();
    });

    modal.addEventListener('align-right', () => {
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = '0';
        modal.remove();
    });

    modal.addEventListener('delete', () => {
        if (confirm('Supprimer cette image ?')) {
            img.remove();
            modal.remove();
        }
    });
}

function initQuillEditor() {
    if (typeof Quill !== 'undefined') {
        quillEditor = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link', 'image', 'video'],
                        ['clean']
                    ],
                    handlers: {
                        'video': insertYouTubeVideo,
                        'image': customImageHandler
                    }
                }
            },
            placeholder: 'Rédigez votre article ici...'
        });

        quillEditor.on('text-change', () => {
            makeImagesResizable();
        });

        window._quillEditorRef = quillEditor;
    }
}

// ============================================
// 🎥 FONCTION INSERTION VIDÉO YOUTUBE
// ============================================
function insertYouTubeVideo() {
    const url = prompt('Entrez l\'URL de la vidéo YouTube:');
    if (!url) return;

    let videoId = extractYouTubeID(url);

    if (!videoId) {
        showNotification('URL YouTube invalide. Utilisez un lien youtube.com ou youtu.be', 'error');
        return;
    }

    const embedHTML = `
        <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 2rem 0;">
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?enablejsapi=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
            </iframe>
        </div>
    `;

    const range = quillEditor.getSelection(true);
    quillEditor.clipboard.dangerouslyPasteHTML(range.index, embedHTML);
    quillEditor.setSelection(range.index + 1);

    showNotification('Vidéo YouTube ajoutée avec succès !', 'success');
}

function extractYouTubeID(url) {
    let match = url.match(/[?&]v=([^&]+)/);
    if (match) return match[1];

    match = url.match(/youtu\.be\/([^?]+)/);
    if (match) return match[1];

    match = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (match) return match[1];

    if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
        return url;
    }

    return null;
}

// ============================================
// PUBLICATION / MODIFICATION ARTICLE
// ✅ CORRECTIONS PRINCIPALES :
//    - HTML brut : pas de cleanQuillHTML()
//    - HTML brut : sync temps réel vers #content
//    - Mode wy (WYSIWYG) géré proprement
// ============================================
articleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log('📝 Début de soumission du formulaire...');

    try {
        let content;
        const editorMode = window.articleEditorMode || 'quill';

        // ─────────────────────────────────────────
        // MODE HTML BRUT (CodeMirror)
        // ✅ Lecture directe — AUCUN nettoyage
        // ─────────────────────────────────────────
        if (editorMode === 'html') {
            content = window.articleCmInstance
                ? window.articleCmInstance.getValue()
                : document.getElementById('content').value;

            const htmlTextContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            console.log('📏 Longueur du contenu HTML (texte seul):', htmlTextContent.length);

            if (!htmlTextContent) {
                showNotification('⚠️ Le contenu de l\'article est vide', 'error');
                return;
            }

            // ✅ Synchroniser le champ caché
            document.getElementById('content').value = content;

        // ─────────────────────────────────────────
        // MODE WYSIWYG (Éditeur Word)
        // ─────────────────────────────────────────
        } else if (editorMode === 'wy') {
            const wyBody = document.getElementById('wyBody');
            content = wyBody ? wyBody.innerHTML : '';

            const wyText = wyBody ? wyBody.textContent.trim() : '';
            if (!wyText) {
                showNotification('⚠️ Le contenu de l\'article est vide', 'error');
                return;
            }

            document.getElementById('content').value = content;

        // ─────────────────────────────────────────
        // MODE QUILL
        // ✅ Nettoyage et troncature uniquement ici
        // ─────────────────────────────────────────
        } else {
            if (!quillEditor) {
                console.error('❌ L\'éditeur Quill n\'est pas initialisé');
                showNotification('❌ Erreur: éditeur non initialisé. Rechargez la page.', 'error');
                return;
            }

            content = quillEditor.root.innerHTML;
            console.log('📄 Taille initiale du contenu:', getContentSize(content), 'bytes');

            content = cleanQuillHTML(content);
            console.log('🧹 Taille après nettoyage:', getContentSize(content), 'bytes');

            const contentSize = getContentSize(content);
            if (contentSize > 950000) {
                const confirmTruncate = confirm(
                    `⚠️ ATTENTION: Votre article est très long (${Math.round(contentSize / 1024)} KB).\n\n` +
                    `La limite Firebase est de 1MB par champ.\n\n` +
                    `Options:\n` +
                    `- OK: Tronquer automatiquement l'article\n` +
                    `- Annuler: Réduire manuellement le contenu\n\n` +
                    `Que souhaitez-vous faire ?`
                );

                if (!confirmTruncate) {
                    showNotification('⚠️ Publication annulée. Réduisez le contenu de votre article.', 'warning');
                    return;
                }

                content = truncateContent(content);
                console.log('✂️ Taille après troncature:', getContentSize(content), 'bytes');
            }

            const textContent = quillEditor.getText().trim();
            console.log('📏 Longueur du contenu texte:', textContent.length);

            if (!textContent) {
                showNotification('⚠️ Le contenu de l\'article est vide', 'error');
                return;
            }

            document.getElementById('content').value = content;
        }

        const title = document.getElementById('title').value.trim();
        const category = document.getElementById('category').value;
        const imageUrl = document.getElementById('imageUrl').value.trim();
        const summary = document.getElementById('summary').value.trim();
        const featured = document.getElementById('featured').checked;
        const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t);

        const publicationStatus = document.getElementById('publicationStatus').value;
        let scheduledDate = null;

        if (publicationStatus === 'scheduled') {
            const dateValue = document.getElementById('scheduleDate').value;
            const timeValue = document.getElementById('scheduleTime').value;

            if (!dateValue || !timeValue) {
                showNotification('⚠️ Veuillez définir une date et heure de publication', 'error');
                return;
            }

            scheduledDate = new Date(dateValue + 'T' + timeValue);

            // ✅ Tolérance de 1 minute pour éviter les blocages sur la même minute
            const minSchedule = new Date(Date.now() - 60000);
            if (scheduledDate <= minSchedule) {
                showNotification('⚠️ La date de publication doit être dans le futur', 'error');
                return;
            }

            console.log('⏰ Publication programmée pour:', scheduledDate);
        }

        console.log('📋 Données formulaire:', { title, category, summary, featured, tagsCount: tags.length, status: publicationStatus });

        if (!title) {
            showNotification('⚠️ Le titre est obligatoire', 'error');
            return;
        }

        if (!summary) {
            showNotification('⚠️ Le résumé est obligatoire', 'error');
            return;
        }

        const slug = await generateUniqueSlug(title, editMode ? currentEditId : null);

        // 🌍 Traductions multilingues
        const translations = window.__translations || (window.getTranslationsData ? window.getTranslationsData() : {});

        const articleData = {
            title,
            slug,
            category,
            imageUrl: imageUrl || null,
            summary,
            content,
            featured,
            tags,
            translations,
            contentType: editorMode,       // ✅ FIX 1 — type d'éditeur sauvegardé
            status: publicationStatus,
            author: {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email,
                email: currentUser.email
            }
        };

        if (publicationStatus === 'scheduled' && scheduledDate) {
            articleData.scheduledFor = scheduledDate;
            articleData.publishedAt = null;
        } else if (publicationStatus === 'published') {
            articleData.publishedAt = serverTimestamp();
            articleData.scheduledFor = null;
        } else {
            articleData.publishedAt = null;
            articleData.scheduledFor = null;
        }

        const totalSize = getContentSize(JSON.stringify(articleData));
        console.log('📦 Taille totale de l\'article:', totalSize, 'bytes');

        if (totalSize > 1000000) {
            showNotification('❌ Erreur: L\'article est toujours trop volumineux même après optimisation', 'error');
            alert('Votre article est trop long. Veuillez:\n\n' +
                  '1. Réduire le nombre d\'images intégrées\n' +
                  '2. Raccourcir le texte\n' +
                  '3. Ou diviser en plusieurs articles');
            return;
        }

        // ✅ FIX : Lire editMode et currentEditId UNE SEULE FOIS ici
        // pour éviter qu'un event asynchrone les réinitialise entre-temps
        const _isEdit = editMode;
        const _editId = currentEditId;
        console.log('📋 Mode soumission:', _isEdit ? `MODIFICATION (${_editId})` : 'CRÉATION');

        if (_isEdit && _editId) {
            console.log('🔄 Modification de l\'article:', _editId);
            await updateDoc(doc(db, 'articles', _editId), {
                ...articleData,
                updatedAt: serverTimestamp()
            });

            const statusText = publicationStatus === 'draft' ? 'brouillon enregistré' :
                             publicationStatus === 'scheduled' ? 'publication programmée' : 'modifié';
            showNotification(`✅ Article ${statusText} avec succès !`, 'success');
            cancelEdit();
        } else {
            console.log('🆕 Création d\'un nouvel article...');
            const docRef = await addDoc(collection(db, 'articles'), {
                ...articleData,
                createdAt: serverTimestamp(),
                views: 0,
                commentsCount: 0,
                reactions: { like: 0, love: 0, star: 0 }
            });

            console.log('✅ Article créé avec l\'ID:', docRef.id);

            const statusText = publicationStatus === 'draft' ? 'Brouillon enregistré' :
                             publicationStatus === 'scheduled' ? 'Publication programmée' : 'Article publié';
            showNotification(`✅ ${statusText} avec succès !`, 'success');

            articleForm.reset();
            if (quillEditor) quillEditor.setText('');
            if (window.articleCmInstance) window.articleCmInstance.setValue('');
            const wyBody = document.getElementById('wyBody');
            if (wyBody) wyBody.innerHTML = '';
            document.getElementById('content').value = '';
            document.getElementById('publicationStatus').value = 'published';
            if (typeof toggleScheduleFields === 'function') toggleScheduleFields();
        }

        loadArticles();
        loadStatistics();

    } catch (error) {
        console.error('❌ Erreur publication complète:', error);
        console.error('Détails:', error.message);
        console.error('Code:', error.code);

        let errorMessage = 'Erreur lors de la publication';
        if (error.code === 'invalid-argument' && error.message.includes('longer than')) {
            errorMessage = 'Article trop volumineux. Réduisez le contenu ou les images.';
        }

        showNotification(`❌ ${errorMessage}: ${error.message}`, 'error');
    }
});

// ============================================
// AUTO-PUBLIER LES ARTICLES PROGRAMMÉS
// Vérifie tous les articles "scheduled" dont
// scheduledFor <= maintenant et les publie
// ============================================
async function checkAndPublishScheduled() {
    try {
        const now = new Date();
        const snapshot = await getDocs(
            query(collection(db, 'articles'), where('status', '==', 'scheduled'))
        );

        const toPublish = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.scheduledFor) {
                const scheduledDate = data.scheduledFor.toDate ? data.scheduledFor.toDate() : new Date(data.scheduledFor);
                if (scheduledDate <= now) {
                    toPublish.push(docSnap.id);
                }
            }
        });

        if (toPublish.length === 0) return;

        await Promise.all(toPublish.map(id =>
            updateDoc(doc(db, 'articles', id), {
                status: 'published',
                publishedAt: serverTimestamp(),
                scheduledFor: null
            })
        ));

        console.log(`✅ ${toPublish.length} article(s) publié(s) automatiquement`);
        showNotification(`✅ ${toPublish.length} article(s) programmé(s) publié(s) automatiquement`, 'success');
    } catch (error) {
        console.error('Erreur auto-publication:', error);
    }
}

// ============================================
// CHARGER ARTICLES DANS LES 3 SECTIONS
// ============================================
async function loadArticles() {
    try {
        document.getElementById('publishedArticlesList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';
        document.getElementById('scheduledArticlesList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';
        document.getElementById('draftsArticlesList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';

        const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const publishedArticles = [];
        const scheduledArticles = [];
        const draftArticles = [];

        snapshot.forEach(doc => {
            const article = doc.data();
            const status = article.status || 'published';
            const item = { id: doc.id, data: article };

            if (status === 'published') {
                publishedArticles.push(item);
            } else if (status === 'scheduled') {
                scheduledArticles.push(item);
            } else if (status === 'draft') {
                draftArticles.push(item);
            }
        });

        document.getElementById('publishedCount').textContent = publishedArticles.length;
        document.getElementById('scheduledCount').textContent = scheduledArticles.length;
        document.getElementById('draftsCount').textContent = draftArticles.length;

        if (typeof window.loadArticlesEnhanced === 'function') {
            await window.loadArticlesEnhanced(snapshot);
            return;
        }

        window.__pendingSnapshot = snapshot;
        window.dispatchEvent(new CustomEvent('articlesLoaded', { detail: snapshot }));

        displayArticlesInSection('publishedArticlesList', publishedArticles, 'publié');
        displayArticlesInSection('scheduledArticlesList', scheduledArticles, 'programmé');
        displayArticlesInSection('draftsArticlesList', draftArticles, 'brouillon');

        // Stocker tous les articles pour la recherche intelligente
        window.__allAdminArticles = [
            ...publishedArticles.map(i => ({ ...i.data, id: i.id })),
            ...scheduledArticles.map(i => ({ ...i.data, id: i.id })),
            ...draftArticles.map(i => ({ ...i.data, id: i.id })),
        ];
        initAdminSmartSearch();

    } catch (error) {
        console.error('Erreur chargement articles:', error);
        document.getElementById('publishedArticlesList').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement</p></div>';
    }
}

function displayArticlesInSection(sectionId, articles, type) {
    const container = document.getElementById(sectionId);

    if (articles.length === 0) {
        const icons    = { 'publié': 'check-circle', 'programmé': 'clock', 'brouillon': 'file-alt' };
        const messages = { 'publié': 'Aucun article publié', 'programmé': 'Aucun article programmé', 'brouillon': 'Aucun brouillon' };
        const hints    = { 'publié': 'Publiez votre premier article !', 'programmé': 'Programmez une publication future', 'brouillon': 'Enregistrez vos articles en brouillon' };

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${icons[type]}"></i>
                <p>${messages[type]}</p>
                <small>${hints[type]}</small>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    articles.forEach(item => {
        const articleElement = createArticleItem(item.id, item.data);
        container.appendChild(articleElement);
    });
}

export function createArticleItem(id, article) {
    const div = document.createElement('div');
    div.className = 'admin-article-item';

    const date = article.createdAt ? new Date(article.createdAt.toDate()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : 'Non daté';

    const featuredBadge = article.featured ? '<span class="badge badge-yellow"><i class="fas fa-star"></i> Vedette</span>' : '';

    const status = article.status || 'published';
    let statusBadge = '';

    if (status === 'draft') {
        statusBadge = '<span class="badge badge-gray"><i class="fas fa-file-alt"></i> Brouillon</span>';
    } else if (status === 'scheduled') {
        const scheduledDate = article.scheduledFor ? new Date(article.scheduledFor.toDate()) : null;
        const dateStr = scheduledDate ? scheduledDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        statusBadge = `<span class="badge badge-orange"><i class="fas fa-clock"></i> Programmé ${dateStr}</span>`;
    } else {
        statusBadge = '<span class="badge badge-green"><i class="fas fa-check-circle"></i> Publié</span>';
    }

    const slugInfo = article.slug ? `<br><small style="color: #6b7280;"><i class="fas fa-link"></i> /article/${article.slug}</small>` : '';

    let publishNowBtn = '';
    if (status !== 'published') {
        publishNowBtn = `
            <button class="btn btn-sm btn-success" onclick="publishNow('${id}')">
                <i class="fas fa-rocket"></i> Publier maintenant
            </button>
        `;
    }

    div.innerHTML = `
        <div class="article-info">
            <h3>${escapeHtml(article.title)} ${featuredBadge} ${statusBadge}</h3>
            ${slugInfo}
            <p class="article-meta">
                <span class="badge badge-${getCategoryClass(article.category)}">${escapeHtml(article.category)}</span>
                <span>${date}</span>
                <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                <span><i class="fas fa-comment"></i> ${article.commentsCount || 0}</span>
            </p>
        </div>
        <div class="article-actions">
            ${publishNowBtn}
            <button class="btn btn-sm btn-success" onclick="generateSharePage('${id}')">
                <i class="fas fa-share-alt"></i> Page Partage
            </button>
            <button class="btn btn-sm btn-primary" onclick="editArticle('${id}')">
                <i class="fas fa-edit"></i> Modifier
            </button>
            <button class="btn btn-sm btn-danger" onclick="showDeleteModal('${id}')">
                <i class="fas fa-trash"></i> Supprimer
            </button>
        </div>
    `;

    return div;
}

// 🆕 PUBLIER IMMÉDIATEMENT
window.publishNow = async function(articleId) {
    try {
        const confirmed = confirm('Publier cet article immédiatement ?');
        if (!confirmed) return;

        await updateDoc(doc(db, 'articles', articleId), {
            status: 'published',
            publishedAt: serverTimestamp(),
            scheduledFor: null
        });

        showNotification('✅ Article publié avec succès !', 'success');
        loadArticles();
        loadStatistics();

    } catch (error) {
        console.error('Erreur publication:', error);
        showNotification('❌ Erreur lors de la publication', 'error');
    }
};

// ============================================
// MODIFIER ARTICLE
// ✅ FIX 2 — Charge dans le bon éditeur selon contentType
// ✅ FIX — Sync #content pour le mode html
// ============================================
window.editArticle = async function(articleId) {
    try {
        const docSnap = await getDoc(doc(db, 'articles', articleId));

        if (!docSnap.exists()) {
            showNotification('Article introuvable', 'error');
            return;
        }

        const article = docSnap.data();

        document.getElementById('title').value = article.title;
        if (window.fillTranslationFields) window.fillTranslationFields(article);
        document.getElementById('category').value = article.category;
        document.getElementById('imageUrl').value = article.imageUrl || '';
        document.getElementById('summary').value = article.summary;
        document.getElementById('featured').checked = article.featured || false;
        document.getElementById('tags').value = (article.tags || []).join(', ');

        const status = article.status || 'published';
        document.getElementById('publicationStatus').value = status;

        if (status === 'scheduled' && article.scheduledFor) {
            const scheduledDate = new Date(article.scheduledFor.toDate());
            const now = new Date();

            if (scheduledDate <= now) {
                // ✅ Date passée : reprogrammer automatiquement à demain 09:00
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);

                const dateStr = tomorrow.getFullYear() + '-' +
                    String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
                    String(tomorrow.getDate()).padStart(2, '0');

                document.getElementById('scheduleDate').value = dateStr;
                document.getElementById('scheduleTime').value = '09:00';
                document.getElementById('publicationStatus').value = 'scheduled';

                showNotification('⚠️ La date programmée est passée. Date réinitialisée à demain 09:00 — veuillez choisir une nouvelle date.', 'error');
            } else {
                // ✅ Date future : utiliser date locale (pas UTC)
                const dateStr = scheduledDate.getFullYear() + '-' +
                    String(scheduledDate.getMonth() + 1).padStart(2, '0') + '-' +
                    String(scheduledDate.getDate()).padStart(2, '0');
                const timeStr = String(scheduledDate.getHours()).padStart(2, '0') + ':' +
                    String(scheduledDate.getMinutes()).padStart(2, '0');
                document.getElementById('scheduleDate').value = dateStr;
                document.getElementById('scheduleTime').value = timeStr;
            }
        }

        if (typeof toggleScheduleFields === 'function') toggleScheduleFields();

        // ✅ FIX 2 — Détecter le bon éditeur depuis article.contentType
        const savedContentType = article.contentType || 'quill';
        console.log(`🔍 Type d'éditeur détecté: ${savedContentType}`);

        if (typeof switchArticleEditorMode === 'function') {
            switchArticleEditorMode(savedContentType);
        }

        setTimeout(() => {
            if (savedContentType === 'html') {
                if (window.articleCmInstance) {
                    window.articleCmInstance.setValue(article.content || '');
                    window.articleCmInstance.refresh();
                    // ✅ Synchroniser le champ caché
                    document.getElementById('content').value = article.content || '';
                }
            } else if (savedContentType === 'wy') {
                const wyBody = document.getElementById('wyBody');
                if (wyBody) {
                    wyBody.innerHTML = article.content || '';
                    document.getElementById('content').value = article.content || '';
                }
            } else {
                if (quillEditor) {
                    // ✅ FIX : Écriture directe dans le DOM Quill
                    // quillEditor.root.innerHTML = ... repasse par le parser interne
                    // qui peut déclencher un text-change et corrompre editMode
                    quillEditor.root.innerHTML = '';
                    const _tmp = document.createElement('div');
                    _tmp.innerHTML = article.content || '';
                    while (_tmp.firstChild) quillEditor.root.appendChild(_tmp.firstChild);
                    // Forcer la mise à jour interne sans déclencher d'événements
                    quillEditor.history.clear();
                }
            }
        }, 150);

        editMode = true;
        currentEditId = articleId;
        document.getElementById('formTitle').textContent = 'Modifier l\'article';
        document.getElementById('submitBtnText').textContent = 'Mettre à jour';

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Erreur chargement article:', error);
        showNotification('Erreur lors du chargement', 'error');
    }
};

window.cancelEdit = function() {
    editMode = false;
    currentEditId = null;
    document.getElementById('formTitle').textContent = 'Nouvel Article';
    document.getElementById('submitBtnText').textContent = 'Publier';
    document.getElementById('publicationStatus').value = 'published';
    if (typeof toggleScheduleFields === 'function') toggleScheduleFields();
    articleForm.reset();
    if (quillEditor) quillEditor.setText('');
    if (window.articleCmInstance) window.articleCmInstance.setValue('');
    const wyBody = document.getElementById('wyBody');
    if (wyBody) wyBody.innerHTML = '';
    document.getElementById('content').value = '';
};

// ============================================
// SUPPRIMER ARTICLE
// ============================================
window.showDeleteModal = function(articleId) {
    articleToDelete = articleId;
    document.getElementById('deleteModal').classList.remove('hidden');
};

document.getElementById('cancelDelete')?.addEventListener('click', () => {
    document.getElementById('deleteModal').classList.add('hidden');
    articleToDelete = null;
});

document.getElementById('confirmDelete')?.addEventListener('click', async () => {
    if (!articleToDelete) return;

    try {
        await deleteDoc(doc(db, 'articles', articleToDelete));
        showNotification('Article supprimé', 'success');
        document.getElementById('deleteModal').classList.add('hidden');
        articleToDelete = null;
        loadArticles();
        loadStatistics();
    } catch (error) {
        console.error('Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
});

// ============================================
// STATISTIQUES
// ============================================
async function loadStatistics() {
    try {
        const articlesSnapshot = await getDocs(collection(db, 'articles'));

        let totalArticles = articlesSnapshot.size;
        let publishedCount = 0;
        let scheduledCount = 0;
        let draftCount = 0;

        articlesSnapshot.forEach(doc => {
            const article = doc.data();
            const status = article.status || 'published';

            if (status === 'published') {
                publishedCount++;
            } else if (status === 'scheduled') {
                scheduledCount++;
            } else if (status === 'draft') {
                draftCount++;
            }
        });

        document.getElementById('totalArticles').textContent = totalArticles;
        document.getElementById('publishedArticles').textContent = publishedCount;
        document.getElementById('scheduledArticles').textContent = scheduledCount;
        document.getElementById('draftArticles').textContent = draftCount;

    } catch (error) {
        console.error('Erreur stats:', error);
    }
}

// ============================================
// NEWSLETTER
// ============================================
async function loadNewsletterSubscribers() {
    try {
        newsletterList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';

        const snapshot = await getDocs(collection(db, 'newsletter'));

        if (snapshot.empty) {
            newsletterList.innerHTML = '<p class="empty-text">Aucun abonné</p>';
            return;
        }

        newsletterList.innerHTML = '';

        snapshot.forEach(doc => {
            const sub = doc.data();
            const date = sub.subscribedAt ? new Date(sub.subscribedAt.toDate()).toLocaleDateString('fr-FR') : 'N/A';

            const div = document.createElement('div');
            div.className = 'newsletter-item';
            div.innerHTML = `
                <span class="newsletter-email">${escapeHtml(sub.email)}</span>
                <span class="newsletter-date">${date}</span>
            `;
            newsletterList.appendChild(div);
        });

    } catch (error) {
        console.error('Erreur newsletter:', error);
        newsletterList.innerHTML = '<p class="empty-text text-danger">Erreur de chargement</p>';
    }
}

window.exportNewsletterCSV = async function() {
    try {
        const snapshot = await getDocs(collection(db, 'newsletter'));

        if (snapshot.empty) {
            showNotification('Aucun abonné à exporter', 'info');
            return;
        }

        let csv = 'Email,Date d\'inscription\n';

        snapshot.forEach(doc => {
            const sub = doc.data();
            const date = sub.subscribedAt ? new Date(sub.subscribedAt.toDate()).toLocaleDateString('fr-FR') : 'N/A';
            csv += `${sub.email},${date}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        showNotification('Export réussi !', 'success');

    } catch (error) {
        console.error('Erreur export:', error);
        showNotification('Erreur lors de l\'export', 'error');
    }
};

// ============================================
// GÉNÉRATION PAGE DE PARTAGE
// ============================================
window.generateSharePage = async function(articleId) {
    try {
        showNotification('🔄 Génération de la page de partage...', 'info');

        const articleDoc = await getDoc(doc(db, 'articles', articleId));

        if (!articleDoc.exists()) {
            showNotification('❌ Article introuvable', 'error');
            return;
        }

        const article = articleDoc.data();
        const slug = article.slug || articleId;
        const title = escapeHtml(article.title || 'Article');
        const description = escapeHtml(article.summary || 'Découvrez cet article sur Électro-Actu');
        const imageUrl = escapeHtml(article.imageUrl || 'https://electroinfo.online/images/logo.png');
        const shareUrl = `https://electroinfo.online/share/${slug}.html`;

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>${title} | Électro-Actu</title>
    <meta name="description" content="${description}">
    
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
    
    <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Électro-Actu">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${shareUrl}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <!-- Redirection -->
    <meta http-equiv="refresh" content="0;url=/article/${slug}">
    <script>window.location.href="/article/${slug}";<\/script>
    
    <style>
        body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-align:center;padding:2rem}
        .spinner{border:4px solid rgba(255,255,255,.3);border-radius:50%;border-top:4px solid white;width:60px;height:60px;animation:spin 1s linear infinite;margin:0 auto 2rem}
        @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        h1{font-size:1.75rem;margin-bottom:1rem}
    </style>
</head>
<body>
    <div><div class="spinner"></div><h1>${title}</h1><p>Chargement...</p></div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const instructions = `✅ PAGE DE PARTAGE GÉNÉRÉE !

📁 Fichier téléchargé : ${slug}.html

📤 ÉTAPES SUIVANTES :
1. Créez un dossier "share" dans votre projet Firebase
2. Copiez le fichier ${slug}.html dans ce dossier
3. Déployez : firebase deploy --only hosting

🔗 URL À PARTAGER :
${shareUrl}

💡 Cette URL affichera l'image de couverture sur WhatsApp/Facebook !`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).catch(() => {});
        }

        showNotification('✅ Fichier téléchargé !', 'success');
        alert(instructions);

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('❌ Erreur lors de la génération', 'error');
    }
};

// ============================================
// MIGRATION DES ANCIENS ARTICLES
// ============================================
window.migrateOldArticles = async function() {
    try {
        const confirmed = confirm('⚠️ Cette opération va ajouter des slugs à tous les articles qui n\'en ont pas encore.\n\nContinuer ?');
        if (!confirmed) return;

        showNotification('🔄 Migration en cours...', 'info');

        const snapshot = await getDocs(collection(db, 'articles'));
        let migrated = 0;
        let errors = 0;

        for (const docSnapshot of snapshot.docs) {
            const article = docSnapshot.data();

            if (!article.slug) {
                try {
                    const slug = await generateUniqueSlug(article.title, docSnapshot.id);
                    await updateDoc(doc(db, 'articles', docSnapshot.id), { slug });
                    migrated++;
                    console.log(`✅ Migré: ${article.title} → ${slug}`);
                } catch (error) {
                    console.error(`❌ Erreur migration ${article.title}:`, error);
                    errors++;
                }
            }
        }

        showNotification(`✅ Migration terminée ! ${migrated} articles mis à jour${errors > 0 ? `, ${errors} erreurs` : ''}`, 'success');
        loadArticles();

    } catch (error) {
        console.error('Erreur migration:', error);
        showNotification('❌ Erreur lors de la migration', 'error');
    }
};

// ============================================
// UTILITAIRES
// ============================================
function getCategoryClass(category) {
    const map = {
        'INNOVATION': 'blue',
        'SÉCURITÉ': 'red',
        'NOUVEAUTÉ': 'green',
        'TUTO': 'orange',
        'DOMOTIQUE': 'purple'
    };
    return map[category] || 'blue';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// ============================================
// EXPOSITION POUR COMPATIBILITÉ
// ============================================
window.getTranslationsData = function() {
    return window.__translations || {};
};

// ============================================================
//  RECHERCHE INTELLIGENTE ADMIN
// ============================================================
let _adminSearchInited = false;

function initAdminSmartSearch() {
    const searchInput = document.getElementById('adminSearchInput');
    const clearBtn    = document.getElementById('clearSearch');
    const countEl     = document.getElementById('searchResultsCount');

    if (!searchInput || _adminSearchInited) return;
    _adminSearchInited = true;

    initSmartSearch({
        inputEl: searchInput,
        getArticles: () => window.__allAdminArticles || [],

        onSearch: (query, results) => {
            // Afficher/masquer le bouton clear
            if (clearBtn) clearBtn.classList.toggle('hidden', !query);

            // Afficher le compteur
            if (countEl) {
                if (query) {
                    const total = (window.__allAdminArticles || []).length;
                    countEl.textContent = `${results.length} résultat${results.length > 1 ? 's' : ''} sur ${total} articles`;
                    countEl.classList.remove('hidden');
                } else {
                    countEl.classList.add('hidden');
                }
            }

            // Filtrer et afficher dans chaque section
            const published = results.filter(a => (a.status || 'published') === 'published');
            const scheduled = results.filter(a => a.status === 'scheduled');
            const drafts    = results.filter(a => a.status === 'draft');

            if (query) {
                displayArticlesInSection('publishedArticlesList',
                    published.map(a => ({ id: a.id, data: a })), 'publié');
                displayArticlesInSection('scheduledArticlesList',
                    scheduled.map(a => ({ id: a.id, data: a })), 'programmé');
                displayArticlesInSection('draftsArticlesList',
                    drafts.map(a => ({ id: a.id, data: a })), 'brouillon');
            } else {
                // Réafficher tout si query vide
                const all = window.__allAdminArticles || [];
                displayArticlesInSection('publishedArticlesList',
                    all.filter(a => (a.status || 'published') === 'published').map(a => ({ id: a.id, data: a })), 'publié');
                displayArticlesInSection('scheduledArticlesList',
                    all.filter(a => a.status === 'scheduled').map(a => ({ id: a.id, data: a })), 'programmé');
                displayArticlesInSection('draftsArticlesList',
                    all.filter(a => a.status === 'draft').map(a => ({ id: a.id, data: a })), 'brouillon');
            }
        },
    });
}

// Exposer clearAdminSearch sur window (appelé par le bouton HTML)
window.clearAdminSearch = function() {
    const searchInput = document.getElementById('adminSearchInput');
    const clearBtn    = document.getElementById('clearSearch');
    const countEl     = document.getElementById('searchResultsCount');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (countEl) countEl.classList.add('hidden');
    // Réafficher tous les articles
    const all = window.__allAdminArticles || [];
    if (all.length) {
        displayArticlesInSection('publishedArticlesList',
            all.filter(a => (a.status || 'published') === 'published').map(a => ({ id: a.id, data: a })), 'publié');
        displayArticlesInSection('scheduledArticlesList',
            all.filter(a => a.status === 'scheduled').map(a => ({ id: a.id, data: a })), 'programmé');
        displayArticlesInSection('draftsArticlesList',
            all.filter(a => a.status === 'draft').map(a => ({ id: a.id, data: a })), 'brouillon');
    }
};
