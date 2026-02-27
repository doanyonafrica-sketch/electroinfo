// admin-users.js — Gestion des utilisateurs & permissions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, doc, getDoc, updateDoc,
    query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============ FIREBASE ============
const app = initializeApp({
    apiKey: "AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk",
    authDomain: "electroino-app.firebaseapp.com",
    projectId: "electroino-app",
    storageBucket: "electroino-app.firebasestorage.app",
    messagingSenderId: "864058526638",
    appId: "1:864058526638:web:17b821633c7cc99be1563f"
});
const db = getFirestore(app);
const auth = getAuth(app);

// ============ STATE ============
let currentUser = null;
let currentUserRole = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let editingUserId = null;
let confirmCallback = null;

// ============ DOM HELPERS ============
const $ = id => document.getElementById(id);

// ============ AUTH CHECK ============
onAuthStateChanged(auth, async user => {
    if (!user) return window.location.href = 'auth.html?redirect=admin-users.html';

    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return showDenied();

        const data = snap.data();
        currentUserRole = data.role;

        // Only superadmin can access this page
        if (currentUserRole !== 'superadmin') return showDenied();

        currentUser = user;
        $('loadingSection').classList.add('hidden');
        $('adminDashboard').classList.remove('hidden');
        $('superadminNotice').style.display = 'flex';
        loadUsers();
    } catch (e) {
        console.error(e);
        showDenied();
    }
});

function showDenied() {
    $('loadingSection').classList.add('hidden');
    $('accessDenied').classList.remove('hidden');
}

// ============ LOGOUT ============
$('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});

// ============ LOAD ALL USERS ============
async function loadUsers() {
    try {
        const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
        allUsers = [];
        snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
        applyFilters();
        updateStats();
    } catch (e) {
        console.error('Erreur chargement utilisateurs:', e);
        showToast('Erreur lors du chargement des utilisateurs', 'error');
    }
}

// ============ STATS ============
function updateStats() {
    $('statTotal').textContent = allUsers.length;
    $('statSuperAdmins').textContent = allUsers.filter(u => u.role === 'superadmin').length;
    $('statAdmins').textContent = allUsers.filter(u => u.role === 'admin').length;
    $('statUsers').textContent = allUsers.filter(u => !u.role || u.role === 'user').length;
}

// ============ FILTER & SEARCH ============
$('searchInput').addEventListener('input', applyFilters);
$('roleFilter').addEventListener('change', applyFilters);

function applyFilters() {
    const q = $('searchInput').value.toLowerCase().trim();
    const role = $('roleFilter').value;

    filteredUsers = allUsers.filter(u => {
        const name = (u.displayName || u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const uid = u.id.toLowerCase();
        const matchSearch = !q || name.includes(q) || email.includes(q) || uid.includes(q);
        const matchRole = role === 'all' || (u.role || 'user') === role;
        return matchSearch && matchRole;
    });

    currentPage = 1;
    renderTable();
}

// ============ RENDER TABLE ============
function renderTable() {
    const tbody = $('usersTableBody');
    const start = (currentPage - 1) * PAGE_SIZE;
    const paged = filteredUsers.slice(start, start + PAGE_SIZE);

    $('tableCount').textContent = `${filteredUsers.length} utilisateur${filteredUsers.length !== 1 ? 's' : ''}`;

    if (paged.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fas fa-user-slash"></i>Aucun utilisateur trouvé</td></tr>`;
        $('pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = paged.map(u => {
        const role = u.role || 'user';
        const name = u.displayName || u.name || 'Sans nom';
        const email = u.email || '—';
        const avatar = u.photoURL;
        const initials = name.charAt(0).toUpperCase();
        const perms = u.permissions || [];
        const created = u.createdAt?.toDate ? formatDate(u.createdAt.toDate()) : '—';
        const isSelf = u.id === currentUser?.uid;

        const avatarHtml = avatar
            ? `<img src="${avatar}" alt="${name}" class="user-avatar">`
            : `<div class="user-avatar-placeholder">${initials}</div>`;

        const roleHtml = `<span class="role-badge ${role}">${roleLabel(role)}</span>`;

        const permsHtml = role === 'admin' && perms.length > 0
            ? `<div class="perms-mini">${perms.map(p => `<span class="perm-chip active">${permLabel(p)}</span>`).join('')}</div>`
            : role === 'superadmin'
                ? `<span style="color:var(--warning);font-size:.8rem;font-weight:600"><i class="fas fa-crown"></i> Tout</span>`
                : `<span style="color:var(--gray-400);font-size:.8rem">—</span>`;

        const canEdit = role !== 'superadmin' || isSelf ? true : currentUserRole === 'superadmin';
        const editDisabled = (role === 'superadmin' && !isSelf) ? 'disabled title="Impossible de modifier un autre Super Admin"' : '';

        return `
        <tr>
            <td>
                <div class="user-cell">
                    ${avatarHtml}
                    <div>
                        <div class="user-name">${escHtml(name)}${isSelf ? ' <span style="font-size:.7rem;color:var(--primary);font-weight:700">(vous)</span>' : ''}</div>
                        <div class="user-uid">${u.id.substring(0, 16)}…</div>
                    </div>
                </div>
            </td>
            <td style="color:var(--gray-600)">${escHtml(email)}</td>
            <td>${roleHtml}</td>
            <td>${permsHtml}</td>
            <td style="color:var(--gray-500);font-size:.875rem">${created}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-primary btn-sm" onclick="openEditModal('${u.id}')" ${editDisabled}>
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    ${role !== 'user' && !isSelf ? `
                    <button class="btn btn-secondary btn-sm" onclick="confirmDegrade('${u.id}', '${escHtml(name)}')" ${role === 'superadmin' ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i> Rétrograder
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPagination();
}

// ============ PAGINATION ============
function renderPagination() {
    const total = Math.ceil(filteredUsers.length / PAGE_SIZE);
    const pg = $('pagination');

    if (total <= 1) { pg.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - currentPage) <= 1) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
        } else if (Math.abs(i - currentPage) === 2) {
            html += `<span style="color:var(--gray-400)">…</span>`;
        }
    }

    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    pg.innerHTML = html;
}

window.goPage = p => { currentPage = p; renderTable(); };

// ============ OPEN EDIT MODAL ============
window.openEditModal = function(uid) {
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;

    editingUserId = uid;
    const name = user.displayName || user.name || 'Sans nom';
    const email = user.email || '—';
    const role = user.role || 'user';
    const perms = user.permissions || [];
    const avatar = user.photoURL;

    // Header
    const avatarHtml = avatar
        ? `<img src="${avatar}" alt="" class="user-detail-avatar">`
        : `<div class="user-avatar-placeholder" style="width:60px;height:60px;font-size:1.4rem">${name.charAt(0).toUpperCase()}</div>`;

    $('editUserHeader').innerHTML = `
        ${avatarHtml}
        <div class="user-detail-info">
            <h4>${escHtml(name)}</h4>
            <p>${escHtml(email)}</p>
            <p style="font-size:.75rem;font-family:monospace;color:var(--gray-400)">${uid}</p>
        </div>
    `;

    // Role
    $('editRole').value = role;
    togglePermissionsVisibility(role);

    // Load permissions
    document.querySelectorAll('.perm-toggle').forEach(el => {
        const val = el.querySelector('input').value;
        if (perms.includes(val)) {
            el.classList.add('checked');
        } else {
            el.classList.remove('checked');
        }
    });

    $('editRole').addEventListener('change', e => togglePermissionsVisibility(e.target.value));
    $('editModal').classList.remove('hidden');
};

function togglePermissionsVisibility(role) {
    const section = $('permissionsSection');
    if (role === 'admin') {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}

window.togglePerm = function(el) {
    el.classList.toggle('checked');
};

window.closeEditModal = function() {
    $('editModal').classList.add('hidden');
    editingUserId = null;
};

// ============ SAVE USER ============
window.saveUserEdit = async function() {
    if (!editingUserId) return;

    const btn = $('saveUserBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement…';

    const newRole = $('editRole').value;
    const checkedPerms = [];

    if (newRole === 'admin') {
        document.querySelectorAll('.perm-toggle.checked input').forEach(inp => {
            checkedPerms.push(inp.value);
        });
    } else if (newRole === 'superadmin') {
        // All permissions
        checkedPerms.push('articles', 'courses', 'newsletter', 'users', 'stats', 'media', 'comments', 'settings');
    }

    try {
        await updateDoc(doc(db, 'users', editingUserId), {
            role: newRole,
            permissions: checkedPerms,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        });

        // Update local
        const idx = allUsers.findIndex(u => u.id === editingUserId);
        if (idx !== -1) {
            allUsers[idx].role = newRole;
            allUsers[idx].permissions = checkedPerms;
        }

        closeEditModal();
        applyFilters();
        updateStats();
        showToast(`Rôle mis à jour avec succès !`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Erreur lors de la mise à jour', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
};

// ============ CONFIRM DEGRADE ============
window.confirmDegrade = function(uid, name) {
    $('confirmTitle').innerHTML = '<i class="fas fa-arrow-down" style="color:var(--warning)"></i> Rétrograder l\'admin';
    $('confirmMessage').innerHTML = `Voulez-vous rétrograder <strong>${escHtml(name)}</strong> vers le rôle <strong>Utilisateur</strong> ? Toutes ses permissions seront supprimées.`;

    confirmCallback = async () => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                role: 'user',
                permissions: [],
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });
            const idx = allUsers.findIndex(u => u.id === uid);
            if (idx !== -1) { allUsers[idx].role = 'user'; allUsers[idx].permissions = []; }
            applyFilters();
            updateStats();
            showToast(`${name} a été rétrogradé en utilisateur.`, 'success');
        } catch (e) {
            showToast('Erreur lors de la rétrogradation', 'error');
        }
        closeConfirmModal();
    };

    $('confirmActionBtn').onclick = confirmCallback;
    $('confirmModal').classList.remove('hidden');
};

window.closeConfirmModal = function() {
    $('confirmModal').classList.add('hidden');
    confirmCallback = null;
};

// ============ TOAST ============
function showToast(msg, type = 'info') {
    const container = $('toastContainer');
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${icons[type]} ${type}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ============ HELPERS ============
function roleLabel(r) {
    return { superadmin: '👑 Super Admin', admin: '🛡️ Admin', user: '👤 Utilisateur' }[r] || r;
}

function permLabel(p) {
    return { articles: 'Articles', courses: 'Cours', newsletter: 'Newsletter', users: 'Utilisateurs', stats: 'Stats', media: 'Médias', comments: 'Commentaires', settings: 'Paramètres' }[p] || p;
}

function formatDate(d) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
