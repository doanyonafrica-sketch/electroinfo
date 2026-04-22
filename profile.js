// profile.js — Gestion du profil utilisateur ElectroInfo
// Firebase Auth + Firestore + Firebase Storage (base64 fallback)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, doc, getDoc, setDoc, updateDoc,
    collection, query, where, getDocs, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged, signOut,
    updateProfile, updatePassword, reauthenticateWithCredential,
    EmailAuthProvider, deleteUser
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getStorage, ref, uploadString, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============================================
// FIREBASE INIT
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
    authDomain: "electroino-app.firebaseapp.com",
    projectId: "electroino-app",
    storageBucket: "electroino-app.firebasestorage.app",
    messagingSenderId: "864058526638",
    appId: "1:864058526638:web:17b821633c7cc99be1563f"
};

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

// ============================================
// STATE
// ============================================
let currentUser   = null;
let userProfile   = {};
let selectedAvatar = null;     // URL ou dataURL de l'avatar sélectionné dans le modal
let croppedDataURL = null;     // résultat du crop
let cropImage      = null;     // Image chargée pour le canvas

// ============================================
// AUTH STATE
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserProfile(user);
        renderProfile(user);
        loadActivity(user);
        document.getElementById('pageLoading').classList.add('hidden');
        document.getElementById('profileMain').classList.remove('hidden');
    } else {
        document.getElementById('pageLoading').classList.add('hidden');
        document.getElementById('notConnected').classList.remove('hidden');
    }
});

// ============================================
// LOAD / RENDER PROFILE
// ============================================
async function loadUserProfile(user) {
    try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            userProfile = snap.data();
        } else {
            // Créer le document si premier login
            userProfile = {
                displayName: user.displayName || '',
                email: user.email,
                bio: '',
                location: '',
                website: '',
                photoURL: user.photoURL || '',
                role: 'user',
                createdAt: new Date(),
                preferences: { articles: true, comments: true, newsletter: false }
            };
            await setDoc(docRef, userProfile);
        }
    } catch (e) {
        console.error('Erreur chargement profil:', e);
    }
}

function renderProfile(user) {
    const name = userProfile.displayName || user.displayName || user.email.split('@')[0];
    const avatarUrl = userProfile.photoURL || user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff&size=200`;

    // Header
    document.getElementById('headerDisplayName').textContent = name;
    document.getElementById('headerEmail').textContent = user.email;
    document.getElementById('profileAvatarDisplay').src = avatarUrl;

    if (userProfile.role === 'admin' || userProfile.role === 'superadmin') {
        document.getElementById('headerBadge').style.display = 'inline-flex';
    }

    // Form fields
    document.getElementById('fieldDisplayName').value = name;
    document.getElementById('fieldEmail').value = user.email;
    document.getElementById('fieldBio').value      = userProfile.bio || '';
    document.getElementById('fieldLocation').value = userProfile.location || '';
    document.getElementById('fieldWebsite').value  = userProfile.website || '';

    // Preferences
    const prefs = userProfile.preferences || {};
    document.getElementById('prefArticles').checked   = prefs.articles   !== false;
    document.getElementById('prefComments').checked   = prefs.comments   !== false;
    document.getElementById('prefNewsletter').checked = !!prefs.newsletter;

    // Session browser info
    document.getElementById('sessionBrowser').textContent = navigator.userAgent.split(' ').slice(-2).join(' ');

    // Days member
    if (userProfile.createdAt) {
        const created = userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
        const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        document.getElementById('statDays').textContent = days;
    }

    // Theme
    const savedTheme = localStorage.getItem('electroinfo-theme') || 'light';
    updateThemeBtn(savedTheme);
}

// ============================================
// TABS
// ============================================
document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
});

// ============================================
// SAVE PROFILE INFO
// ============================================
document.getElementById('saveInfoBtn').addEventListener('click', async () => {
    if (!currentUser) return;

    const name     = document.getElementById('fieldDisplayName').value.trim();
    const bio      = document.getElementById('fieldBio').value.trim();
    const location = document.getElementById('fieldLocation').value.trim();
    const website  = document.getElementById('fieldWebsite').value.trim();

    if (!name) { showToast('Le nom est requis.', 'error'); return; }

    try {
        setLoading('saveInfoBtn', true);

        // Update Firebase Auth display name
        await updateProfile(currentUser, { displayName: name });

        // Update Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: name, bio, location, website
        });

        userProfile = { ...userProfile, displayName: name, bio, location, website };

        document.getElementById('headerDisplayName').textContent = name;
        showToast('Profil mis à jour !');
    } catch (e) {
        console.error(e);
        showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
        setLoading('saveInfoBtn', false);
    }
});

document.getElementById('cancelInfoBtn').addEventListener('click', () => {
    if (!currentUser) return;
    const name = userProfile.displayName || currentUser.displayName || '';
    document.getElementById('fieldDisplayName').value = name;
    document.getElementById('fieldBio').value      = userProfile.bio || '';
    document.getElementById('fieldLocation').value = userProfile.location || '';
    document.getElementById('fieldWebsite').value  = userProfile.website || '';
    showToast('Modifications annulées.', 'info');
});

// ============================================
// SAVE PASSWORD
// ============================================
document.getElementById('fieldNewPwd').addEventListener('input', (e) => {
    const val = e.target.value;
    const bar  = document.getElementById('pwdStrengthBar');
    const text = document.getElementById('pwdStrengthText');
    let strength = 0;
    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const colors = ['#dc2626','#f59e0b','#16a34a','#059669'];
    const labels = ['Trop faible','Moyen','Bon','Excellent'];
    bar.style.width   = (strength * 25) + '%';
    bar.style.background = colors[strength - 1] || '#e5e7eb';
    text.textContent  = val ? labels[strength - 1] || '' : '';
});

document.getElementById('savePwdBtn').addEventListener('click', async () => {
    if (!currentUser) return;

    const current  = document.getElementById('fieldCurrentPwd').value;
    const newPwd   = document.getElementById('fieldNewPwd').value;
    const confirm  = document.getElementById('fieldConfirmPwd').value;

    if (!current || !newPwd) { showToast('Remplissez tous les champs.', 'error'); return; }
    if (newPwd !== confirm)  { showToast('Les mots de passe ne correspondent pas.', 'error'); return; }
    if (newPwd.length < 8)   { showToast('Minimum 8 caractères.', 'error'); return; }

    try {
        setLoading('savePwdBtn', true);

        const credential = EmailAuthProvider.credential(currentUser.email, current);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPwd);

        document.getElementById('fieldCurrentPwd').value = '';
        document.getElementById('fieldNewPwd').value     = '';
        document.getElementById('fieldConfirmPwd').value = '';

        showToast('Mot de passe mis à jour !');
    } catch (e) {
        console.error(e);
        const msg = e.code === 'auth/wrong-password'
            ? 'Mot de passe actuel incorrect.'
            : 'Erreur lors de la mise à jour.';
        showToast(msg, 'error');
    } finally {
        setLoading('savePwdBtn', false);
    }
});

// ============================================
// DELETE ACCOUNT
// ============================================
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    if (!currentUser) return;

    const confirmed = confirm(
        '⚠️ Êtes-vous sûr de vouloir supprimer votre compte ?\n\nCette action est IRRÉVERSIBLE. Toutes vos données seront perdues.'
    );
    if (!confirmed) return;

    const pwd = prompt('Entrez votre mot de passe pour confirmer :');
    if (!pwd) return;

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, pwd);
        await reauthenticateWithCredential(currentUser, credential);
        await deleteUser(currentUser);
        window.location.href = '/index.html';
    } catch (e) {
        console.error(e);
        showToast('Erreur : mot de passe incorrect ou erreur serveur.', 'error');
    }
});

// ============================================
// LOGOUT
// ============================================
document.getElementById('logoutHeaderBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = '/index.html';
});

// ============================================
// PREFERENCES
// ============================================
document.getElementById('savePrefsBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    const prefs = {
        articles:   document.getElementById('prefArticles').checked,
        comments:   document.getElementById('prefComments').checked,
        newsletter: document.getElementById('prefNewsletter').checked
    };
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), { preferences: prefs });
        userProfile.preferences = prefs;
        showToast('Préférences sauvegardées !');
    } catch (e) {
        showToast('Erreur lors de la sauvegarde.', 'error');
    }
});

// ============================================
// THEME TOGGLE
// ============================================
document.getElementById('toggleThemeBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('electroinfo-theme', next);
    updateThemeBtn(next);
});

function updateThemeBtn(theme) {
    const icon = document.getElementById('themeIconPref');
    const text = document.getElementById('themeTextPref');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Activer le mode clair';
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Activer le mode sombre';
        document.documentElement.removeAttribute('data-theme');
    }
}

// Apply saved theme on load
const savedTheme = localStorage.getItem('electroinfo-theme');
if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

// ============================================
// ACTIVITY
// ============================================
async function loadActivity(user) {
    try {
        // Commentaires
        const commentsQ = query(
            collection(db, 'comments'),
            where('authorEmail', '==', user.email),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const commentsSnap = await getDocs(commentsQ);
        document.getElementById('statComments').textContent = commentsSnap.size;

        // Afficher les dernières activités
        const activities = [];
        commentsSnap.forEach(d => {
            activities.push({
                type: 'comment',
                icon: 'fas fa-comment',
                iconClass: 'comment',
                text: `Commentaire : "${d.data().text?.substring(0, 60)}..."`,
                time: d.data().createdAt
            });
        });

        activities.sort((a, b) => {
            const ta = a.time?.toDate?.() || new Date(0);
            const tb = b.time?.toDate?.() || new Date(0);
            return tb - ta;
        });

        const list = document.getElementById('activityList');
        if (activities.length === 0) {
            list.innerHTML = '<li style="padding:1.5rem;text-align:center;color:var(--gray-400);"><i class="fas fa-clock"></i> Aucune activité récente</li>';
        } else {
            list.innerHTML = activities.slice(0, 8).map(a => `
                <li class="activity-item">
                    <div class="activity-icon ${a.iconClass}">
                        <i class="${a.icon}"></i>
                    </div>
                    <div>
                        <div class="activity-text">${a.text}</div>
                        <div class="activity-time">${formatRelativeTime(a.time)}</div>
                    </div>
                </li>
            `).join('');
        }
    } catch (e) {
        console.error('Erreur activité:', e);
    }
}

// ============================================
// AVATAR PICKER MODAL
// ============================================

// Color palettes for generated avatars
const COLOR_COMBOS = [
    { bg: '#1e40af', fg: '#ffffff' },
    { bg: '#dc2626', fg: '#ffffff' },
    { bg: '#059669', fg: '#ffffff' },
    { bg: '#7c3aed', fg: '#ffffff' },
    { bg: '#d97706', fg: '#ffffff' },
    { bg: '#0891b2', fg: '#ffffff' },
    { bg: '#be185d', fg: '#ffffff' },
    { bg: '#1f2937', fg: '#ffffff' },
    { bg: '#065f46', fg: '#ffffff' },
    { bg: '#92400e', fg: '#ffffff' },
    { bg: '#1d4ed8', fg: '#fbbf24' },
    { bg: '#7f1d1d', fg: '#fca5a5' },
];

// UI Avatars preset styles (different shapes/letters)
const PRESET_STYLES = [
    'bottts', 'avataaars', 'big-smile', 'micah', 'personas',
    'miniavs', 'pixel-art', 'adventurer', 'croodles', 'fun-emoji',
    'lorelei', 'notionists'
];

function buildAvatarModal() {
    // Color avatars grid
    const colorGrid = document.getElementById('colorAvatarsGrid');
    const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'U';
    const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

    colorGrid.innerHTML = COLOR_COMBOS.map((combo, i) => `
        <div class="color-avatar-option"
             style="background:${combo.bg};color:${combo.fg};"
             data-avatar-type="color"
             data-avatar-value="color:${combo.bg}:${combo.fg}:${encodeURIComponent(initials)}"
             title="Avatar coloré ${i+1}">
            ${initials}
        </div>
    `).join('');

    // Preset avatars (using DiceBear API - free, no signup)
    const presetGrid = document.getElementById('presetAvatarsGrid');
    const seed = encodeURIComponent(currentUser?.uid || 'electroinfo');

    presetGrid.innerHTML = PRESET_STYLES.map(style => {
        const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&size=80&backgroundColor=transparent`;
        return `
            <img src="${url}" alt="${style}"
                 class="preset-avatar"
                 data-avatar-type="preset"
                 data-avatar-value="${url}"
                 title="${style}"
                 onerror="this.style.display='none'">
        `;
    }).join('');

    // Click handlers for avatars
    colorGrid.querySelectorAll('.color-avatar-option').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.color-avatar-option, .preset-avatar').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            selectedAvatar = el.dataset.avatarValue;
            document.getElementById('applyAvatarBtn').disabled = false;
        });
    });

    presetGrid.querySelectorAll('.preset-avatar').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.color-avatar-option, .preset-avatar').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            selectedAvatar = el.dataset.avatarValue;
            document.getElementById('applyAvatarBtn').disabled = false;
        });
    });
}

// Open / close modal
document.getElementById('openAvatarModal').addEventListener('click', () => {
    buildAvatarModal();
    const modal = document.getElementById('avatarModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    selectedAvatar = null;
    croppedDataURL = null;
    document.getElementById('applyAvatarBtn').disabled = true;
    document.getElementById('cropSection').classList.remove('show');
    document.getElementById('avatarFileInput').value = '';
});

function closeModal() {
    const modal = document.getElementById('avatarModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
}

document.getElementById('closeAvatarModal').addEventListener('click', closeModal);
document.getElementById('cancelAvatarModal').addEventListener('click', closeModal);
document.getElementById('avatarModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('avatarModal')) closeModal();
});

// ============================================
// FILE UPLOAD + CANVAS CROP
// ============================================
const fileInput = document.getElementById('avatarFileInput');
const cropCanvas = document.getElementById('cropCanvas');
const ctx = cropCanvas.getContext('2d');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Fichier trop volumineux (max 5 Mo).', 'error'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            cropImage = img;
            drawCrop(img);
            document.getElementById('cropSection').classList.add('show');
            document.getElementById('colorAvatarsSection').style.display = 'none';
            croppedDataURL = cropCanvas.toDataURL('image/jpeg', 0.85);
            updateCropPreview();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

function drawCrop(img) {
    const size = Math.min(img.width, img.height);
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;
    ctx.clearRect(0, 0, 200, 200);
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200);
    // Circle mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

function updateCropPreview() {
    const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.85);
    croppedDataURL = dataUrl;
    document.getElementById('cropPreviewCircle').src = dataUrl;
}

document.getElementById('cancelCropBtn').addEventListener('click', () => {
    document.getElementById('cropSection').classList.remove('show');
    document.getElementById('colorAvatarsSection').style.display = 'block';
    document.getElementById('avatarFileInput').value = '';
    croppedDataURL = null;
    cropImage = null;
});

document.getElementById('applyCropBtn').addEventListener('click', () => {
    if (!croppedDataURL) return;
    selectedAvatar = 'upload:' + croppedDataURL;
    document.getElementById('applyAvatarBtn').disabled = false;
    document.getElementById('cropSection').classList.remove('show');
    document.getElementById('colorAvatarsSection').style.display = 'block';

    // Show a small selected indicator
    showToast('Photo sélectionnée, cliquez sur Appliquer.', 'info');
});

// Drag & drop
const uploadZone = document.getElementById('uploadZone');
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        // Manually trigger
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

// ============================================
// APPLY AVATAR
// ============================================
document.getElementById('applyAvatarBtn').addEventListener('click', async () => {
    if (!selectedAvatar || !currentUser) return;

    try {
        setLoading('applyAvatarBtn', true);
        let finalUrl = '';

        if (selectedAvatar.startsWith('upload:')) {
            // Upload to Firebase Storage
            const dataUrl = selectedAvatar.replace('upload:', '');
            const storageRef = ref(storage, `avatars/${currentUser.uid}/profile.jpg`);
            await uploadString(storageRef, dataUrl, 'data_url');
            finalUrl = await getDownloadURL(storageRef);

        } else if (selectedAvatar.startsWith('color:')) {
            // Generate a ui-avatars URL based on color combo
            const parts = selectedAvatar.split(':');
            // parts: ['color', '#hexbg', '#hexfg', 'initials']
            const bg = parts[1].replace('#', '');
            const fg = parts[2].replace('#', '');
            const initials = decodeURIComponent(parts[3]);
            finalUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${fg}&size=200&bold=true`;

        } else {
            // Preset SVG url from DiceBear
            finalUrl = selectedAvatar;
        }

        // Update Firebase Auth
        await updateProfile(currentUser, { photoURL: finalUrl });

        // Update Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: finalUrl });

        userProfile.photoURL = finalUrl;
        document.getElementById('profileAvatarDisplay').src = finalUrl;

        closeModal();
        showToast('Photo de profil mise à jour !');

    } catch (e) {
        console.error('Erreur upload avatar:', e);
        showToast('Erreur lors de l\'upload. Vérifiez les règles Firebase Storage.', 'error');
    } finally {
        setLoading('applyAvatarBtn', false);
    }
});

// ============================================
// UTILS
// ============================================
function showToast(msg, type = 'success') {
    const toast = document.getElementById('saveToast');
    const msgEl = document.getElementById('toastMsg');
    const icon  = toast.querySelector('i');

    msgEl.textContent = msg;

    if (type === 'error') {
        toast.style.background = '#7f1d1d';
        icon.className = 'fas fa-exclamation-circle';
    } else if (type === 'info') {
        toast.style.background = '#1e3a8a';
        icon.className = 'fas fa-info-circle';
    } else {
        toast.style.background = '#065f46';
        icon.className = 'fas fa-check-circle';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    }
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff  = Date.now() - date.getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return 'À l\'instant';
    if (mins < 60)  return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30)  return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
}

// Mobile menu
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
mobileMenuToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = mobileMenuToggle.querySelector('i');
    if (navMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
});
