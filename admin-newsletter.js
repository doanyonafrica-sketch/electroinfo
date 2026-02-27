// admin-newsletter.js — Gestion Newsletter complète
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, where, serverTimestamp, writeBatch, limit
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

// ============ CONFIGURATION ============
// Collection avec accent (comme dans votre base de données)
let NEWSLETTER_COLLECTION = "Bulletin d'information";

// ============ STATE ============
let currentUser = null;
let allSubscribers = [];
let filteredSubscribers = [];
let campaigns = [];
let subPage = 1;
let camPage = 1;
const SUB_PAGE_SIZE = 20;
const CAM_PAGE_SIZE = 10;
let selectedSegment = 'all';
let selectedSubs = new Set();
let importData = [];

// ============ DOM HELPER ============
window.$ = id => document.getElementById(id);

// ============ AUTH ============
onAuthStateChanged(auth, async user => {
    if (!user) return window.location.href = 'auth.html?redirect=admin-newsletter.html';

    try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return showDenied();

        const data = snap.data();
        const role = data.role;
        const perms = data.permissions || [];

        // Access: superadmin OR admin with newsletter permission
        if (role !== 'superadmin' && !(role === 'admin' && perms.includes('newsletter'))) {
            return showDenied();
        }

        currentUser = user;
        $('loadingSection').classList.add('hidden');
        $('adminDashboard').classList.remove('hidden');

        await Promise.all([loadSubscribers(), loadCampaigns()]);
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

// ============ LOAD SUBSCRIBERS ============
async function loadSubscribers() {
    try {
        console.log('Chargement depuis:', NEWSLETTER_COLLECTION);
        const snap = await getDocs(collection(db, NEWSLETTER_COLLECTION));
        allSubscribers = [];
        snap.forEach(d => {
            const data = d.data();
            console.log('Abonne trouve:', d.id, data);
            allSubscribers.push({ id: d.id, ...data });
        });
        console.log('Total abonnes charges:', allSubscribers.length);
        applySubFilters();
        updateStats();
        updateSegmentCounts();
    } catch (e) {
        console.error('Erreur abonnes:', e);
        showToast('Erreur: ' + e.message, 'error');
    }
}

// ============ LOAD CAMPAIGNS ============
async function loadCampaigns() {
    try {
        const snap = await getDocs(query(collection(db, 'newsletter_campaigns'), orderBy('createdAt', 'desc')));
        campaigns = [];
        snap.forEach(d => campaigns.push({ id: d.id, ...d.data() }));
        renderCampaigns();
        $('statCampaigns').textContent = campaigns.filter(c => c.status === 'sent').length;
    } catch (e) {
        console.error('Erreur campagnes:', e);
    }
}

// ============ STATS ============
function updateStats() {
    const active = allSubscribers.filter(s => {
        const status = s.status || 'active';
        return status !== 'unsubscribed';
    });
    const unsub = allSubscribers.filter(s => s.status === 'unsubscribed');
    
    $('statTotal').textContent = allSubscribers.length;
    $('statActive').textContent = active.length;
    $('statUnsub').textContent = unsub.length;
    $('recipientCount').textContent = active.length;
}

function updateSegmentCounts() {
    const active = allSubscribers.filter(s => (s.status || 'active') !== 'unsubscribed');
    $('seg-all-count').textContent = `${active.length} abonnés actifs`;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newSubs = active.filter(s => {
        const dateRaw = s['abonnéAt'] || s.createdAt || s.subscribedAt;
        const d = dateRaw?.toDate ? dateRaw.toDate() : null;
        return d && d >= thirtyDaysAgo;
    });
    
    $('seg-new-count').textContent = `${newSubs.length} nouveaux abonnés`;
}

// ============ FILTER SUBSCRIBERS ============
$('subSearch').addEventListener('input', applySubFilters);
$('subFilter').addEventListener('change', applySubFilters);

function applySubFilters() {
    const q = $('subSearch').value.toLowerCase().trim();
    const status = $('subFilter').value;
    
    filteredSubscribers = allSubscribers.filter(s => {
        const email = (s.Email || s.email || '').toLowerCase();
        const name = (s.nom || s.name || '').toLowerCase();
        const matchSearch = !q || email.includes(q) || name.includes(q);
        const matchStatus = status === 'all' || (s.status || 'active') === status;
        return matchSearch && matchStatus;
    });
    
    subPage = 1;
    $('subCount').textContent = `${filteredSubscribers.length} résultat(s)`;
    renderSubTable();
}

// ============ RENDER SUBSCRIBERS TABLE ============
function renderSubTable() {
    const tbody = $('subTableBody');
    const start = (subPage - 1) * SUB_PAGE_SIZE;
    const paged = filteredSubscribers.slice(start, start + SUB_PAGE_SIZE);

    if (paged.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fas fa-inbox"></i>Aucun abonné trouvé</td></tr>`;
        $('subPagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = paged.map(s => {
        const status = s.status || 'active';
        const dateRaw = s['abonnéAt'] || s.createdAt || s.subscribedAt;
        const date = dateRaw?.toDate ? formatDate(dateRaw.toDate()) : '—';
        const source = s.source || 'site';
        const email = s.Email || s.email || '—';
        const name = s.nom || s.name || '—';
        const isChecked = selectedSubs.has(s.id) ? 'checked' : '';
        
        return `
        <tr>
            <td><input type="checkbox" value="${s.id}" ${isChecked} onchange="toggleSubSelect(this)"></td>
            <td style="font-weight:600">${escHtml(email)}</td>
            <td style="color:var(--gray-600)">${escHtml(name)}</td>
            <td><span class="status-badge ${status}">${statusLabel(status)}</span></td>
            <td><span class="source-chip">${escHtml(source)}</span></td>
            <td style="font-size:.875rem;color:var(--gray-500)">${date}</td>
            <td>
                <div style="display:flex;gap:.5rem">
                    ${status !== 'unsubscribed'
                        ? `<button class="btn btn-danger btn-sm" onclick="unsubscribeOne('${s.id}', '${escHtml(email)}')"><i class="fas fa-user-minus"></i></button>`
                        : `<button class="btn btn-success btn-sm" onclick="resubscribeOne('${s.id}', '${escHtml(email)}')"><i class="fas fa-user-plus"></i></button>`
                    }
                </div>
            </td>
        </tr>`;
    }).join('');

    renderSubPagination();
    updateBulkBar();
}

function renderSubPagination() {
    renderPagination($('subPagination'), filteredSubscribers.length, SUB_PAGE_SIZE, subPage, p => {
        subPage = p;
        renderSubTable();
    });
}

// ============ TOGGLE SELECT ============
window.toggleSelectAll = function(cb) {
    const start = (subPage - 1) * SUB_PAGE_SIZE;
    const paged = filteredSubscribers.slice(start, start + SUB_PAGE_SIZE);
    paged.forEach(s => cb.checked ? selectedSubs.add(s.id) : selectedSubs.delete(s.id));
    renderSubTable();
};

window.toggleSubSelect = function(cb) {
    cb.checked ? selectedSubs.add(cb.value) : selectedSubs.delete(cb.value);
    updateBulkBar();
};

function updateBulkBar() {
    const bar = $('bulkActions');
    if (selectedSubs.size > 0) {
        bar.classList.remove('hidden');
        bar.style.display = 'flex';
        $('selectedCount').textContent = `${selectedSubs.size} sélectionné(s)`;
    } else {
        bar.classList.add('hidden');
    }
}

// ============ BULK UNSUBSCRIBE ============
window.bulkUnsubscribe = async function() {
    if (!confirm(`Désabonner ${selectedSubs.size} abonné(s) ?`)) return;
    const batch = writeBatch(db);
    selectedSubs.forEach(id => {
        batch.update(doc(db, NEWSLETTER_COLLECTION, id), { status: 'unsubscribed' });
    });
    try {
        await batch.commit();
        selectedSubs.clear();
        await loadSubscribers();
        showToast('Abonnés désabonnés avec succès', 'success');
    } catch (e) {
        showToast('Erreur lors du désabonnement', 'error');
    }
};

// ============ EXPORT SELECTED ============
window.exportSelected = function() {
    const toExport = allSubscribers.filter(s => selectedSubs.has(s.id));
    exportCsv(toExport, 'selection-newsletter');
};

function exportCsv(subs, filename) {
    const header = 'email,nom,statut,source,date\n';
    const rows = subs.map(s => {
        const dateField = s['abonnéAt'] || s.createdAt || s.subscribedAt;
        const date = dateField?.toDate ? dateField.toDate().toISOString().split('T')[0] : '';
        const email = s.Email || s.email || '';
        const name = s.nom || s.name || '';
        return `"${email}","${name}","${s.status || 'active'}","${s.source || 'site'}","${date}"`;
    }).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast(`Export de ${subs.length} abonnés effectué`, 'success');
}

// ============ UNSUBSCRIBE ONE ============
window.unsubscribeOne = async function(id, email) {
    if (!confirm(`Désabonner ${email} ?`)) return;
    try {
        await updateDoc(doc(db, NEWSLETTER_COLLECTION, id), { status: 'unsubscribed' });
        const idx = allSubscribers.findIndex(s => s.id === id);
        if (idx !== -1) allSubscribers[idx].status = 'unsubscribed';
        applySubFilters();
        updateStats();
        showToast(`${email} désabonné`, 'success');
    } catch (e) {
        showToast('Erreur lors du désabonnement', 'error');
    }
};

window.resubscribeOne = async function(id, email) {
    try {
        await updateDoc(doc(db, NEWSLETTER_COLLECTION, id), { status: 'active' });
        const idx = allSubscribers.findIndex(s => s.id === id);
        if (idx !== -1) allSubscribers[idx].status = 'active';
        applySubFilters();
        updateStats();
        showToast(`${email} réabonné`, 'success');
    } catch (e) {
        showToast('Erreur lors du réabonnement', 'error');
    }
};

// ============ TABS ============
window.switchTab = function(tab) {
    ['subscribers', 'compose', 'history'].forEach(t => {
        $(`tab-${t}`).classList.remove('active');
        $(`pane-${t}`).classList.remove('active');
    });
    $(`tab-${tab}`).classList.add('active');
    $(`pane-${tab}`).classList.add('active');
};

// ============ PREVIEW ============
window.updatePreview = function() {
    const subject = $('campaignSubject').value;
    const title = $('campaignTitle').value;
    const intro = $('campaignIntro').value;
    const body = $('campaignBody').value;
    const btnUrl = $('campaignBtnUrl').value;
    const btnLabel = $('campaignBtnLabel').value;

    $('previewSubjectLine').textContent = subject ? `Objet : ${subject}` : 'Objet : (aucun)';
    $('subjectCount').textContent = subject.length;
    $('prev-title').textContent = title || 'Titre de l\'email';
    $('prev-intro').textContent = intro || 'Votre accroche ici…';
    $('prev-body').innerHTML = body || '<span style="color:#9ca3af;font-style:italic">Le corps de votre message apparaîtra ici.</span>';

    const btnWrap = $('prev-btn-wrap');
    if (btnUrl && btnLabel) {
        btnWrap.style.display = 'block';
        $('prev-btn').href = btnUrl;
        $('prev-btn').textContent = btnLabel;
    } else {
        btnWrap.style.display = 'none';
    }
};

window.updateBodyCount = function() {
    $('bodyCount').textContent = $('campaignBody').value.length;
};

// ============ SEGMENT ============
window.selectSegment = function(seg, el) {
    selectedSegment = seg;
    document.querySelectorAll('.segment-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');

    const active = allSubscribers.filter(s => (s.status || 'active') !== 'unsubscribed');
    if (seg === 'all') {
        $('recipientCount').textContent = active.length;
    } else if (seg === 'new') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newSubs = active.filter(s => {
            const dateRaw = s['abonnéAt'] || s.createdAt || s.subscribedAt;
            const d = dateRaw?.toDate ? dateRaw.toDate() : null;
            return d && d >= thirtyDaysAgo;
        });
        $('recipientCount').textContent = newSubs.length;
    }
};

// ============ SAVE DRAFT ============
window.saveDraft = async function() {
    const subject = $('campaignSubject').value.trim();
    const body = $('campaignBody').value.trim();
    if (!subject && !body) { showToast('Remplissez au moins l\'objet ou le corps', 'error'); return; }
    try {
        await addDoc(collection(db, 'newsletter_campaigns'), {
            subject: $('campaignSubject').value,
            title: $('campaignTitle').value,
            intro: $('campaignIntro').value,
            body: $('campaignBody').value,
            btnUrl: $('campaignBtnUrl').value,
            btnLabel: $('campaignBtnLabel').value,
            segment: selectedSegment,
            status: 'draft',
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid
        });
        showToast('Brouillon sauvegardé !', 'success');
        await loadCampaigns();
    } catch (e) {
        showToast('Erreur sauvegarde brouillon', 'error');
    }
};

// ============ OPEN SEND CONFIRM ============
window.openSendConfirm = function() {
    const subject = $('campaignSubject').value.trim();
    const body = $('campaignBody').value.trim();
    if (!subject) { showToast('L\'objet est obligatoire', 'error'); return; }
    if (!body) { showToast('Le corps du message est obligatoire', 'error'); return; }

    $('confirmRecipCount').textContent = $('recipientCount').textContent + ' abonnés';
    $('confirmSubjectLine').textContent = subject;
    $('sendConfirmModal').classList.remove('hidden');
};

// ============ SEND CAMPAIGN ============
window.sendCampaign = async function() {
    $('sendConfirmModal').classList.add('hidden');
    $('confirmSendBtn').disabled = true;

    const subject = $('campaignSubject').value.trim();
    const title = $('campaignTitle').value.trim();
    const intro = $('campaignIntro').value.trim();
    const body = $('campaignBody').value.trim();
    const btnUrl = $('campaignBtnUrl').value.trim();
    const btnLabel = $('campaignBtnLabel').value.trim();

    const active = allSubscribers.filter(s => (s.status || 'active') !== 'unsubscribed');
    let recipients = active;

    if (selectedSegment === 'new') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        recipients = active.filter(s => {
            const dateRaw = s['abonnéAt'] || s.createdAt || s.subscribedAt;
            const d = dateRaw?.toDate ? dateRaw.toDate() : null;
            return d && d >= thirtyDaysAgo;
        });
    }

    const progress = $('sendProgress');
    progress.classList.add('visible');
    $('progressLabel').textContent = `Envoi en cours… 0 / ${recipients.length}`;
    $('progressFill').style.width = '0%';

    try {
        const campaignRef = await addDoc(collection(db, 'newsletter_campaigns'), {
            subject, title, intro, body, btnUrl, btnLabel,
            segment: selectedSegment,
            recipientCount: recipients.length,
            status: 'sending',
            createdAt: serverTimestamp(),
            sentAt: serverTimestamp(),
            createdBy: currentUser.uid
        });

        const emailHtml = buildEmailHtml({ subject, title, intro, body, btnUrl, btnLabel });

        let sent = 0;
        const batchSize = 25;
        for (let i = 0; i < recipients.length; i += batchSize) {
            const chunk = recipients.slice(i, i + batchSize);
            const batch = writeBatch(db);
            chunk.forEach(sub => {
                const sendRef = doc(collection(db, 'newsletter_sends'));
                batch.set(sendRef, {
                    campaignId: campaignRef.id,
                    email: sub.Email || sub.email,
                    name: sub.nom || sub.name || '',
                    subscriberId: sub.id,
                    subject,
                    htmlContent: emailHtml,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            sent += chunk.length;
            const pct = Math.round((sent / recipients.length) * 100);
            $('progressFill').style.width = `${pct}%`;
            $('progressLabel').textContent = `Envoi en cours… ${sent} / ${recipients.length}`;
        }

        await updateDoc(doc(db, 'newsletter_campaigns', campaignRef.id), {
            status: 'sent',
            sentAt: serverTimestamp()
        });

        $('progressLabel').textContent = `✅ Campagne envoyée à ${recipients.length} abonnés !`;
        $('progressFill').style.width = '100%';
        showToast(`Campagne envoyée à ${recipients.length} abonnés !`, 'success');

        setTimeout(() => {
            ['campaignSubject', 'campaignTitle', 'campaignIntro', 'campaignBody', 'campaignBtnUrl', 'campaignBtnLabel'].forEach(id => $(id).value = '');
            updatePreview();
            progress.classList.remove('visible');
            $('confirmSendBtn').disabled = false;
        }, 3000);

        await loadCampaigns();
    } catch (e) {
        console.error(e);
        $('progressLabel').textContent = '❌ Erreur lors de l\'envoi';
        showToast('Erreur lors de l\'envoi', 'error');
        $('confirmSendBtn').disabled = false;
    }
};

// ============ BUILD EMAIL HTML ============
function buildEmailHtml({ subject, title, intro, body, btnUrl, btnLabel }) {
    const btnSection = (btnUrl && btnLabel) ? `
        <div style="text-align:center;margin:2rem 0">
            <a href="${btnUrl}" style="background:#7c3aed;color:white;padding:.875rem 2rem;border-radius:.5rem;text-decoration:none;font-weight:700;font-size:1rem;display:inline-block">${btnLabel}</a>
        </div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica Neue,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:2rem 1rem">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:2.5rem 2rem;border-radius:.75rem .75rem 0 0;text-align:center">
<h1 style="color:white;font-size:1.75rem;margin:0 0 .5rem">${escHtml(title || subject)}</h1>
<p style="color:rgba(255,255,255,.85);margin:0;font-size:1rem">${escHtml(intro || '')}</p>
</td></tr>
<tr><td style="background:white;padding:2rem 2.5rem;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 .75rem .75rem">
<div style="color:#374151;line-height:1.8;font-size:1rem">${body}</div>
${btnSection}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:2rem 0">
<p style="color:#9ca3af;font-size:.8rem;text-align:center;margin:0">
Vous recevez cet email car vous êtes abonné à ElectroInfo.<br>
<a href="{{unsubscribe_url}}" style="color:#9ca3af">Se désabonner</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ============ RENDER CAMPAIGNS ============
function renderCampaigns() {
    const container = $('campaignsList');
    const start = (camPage - 1) * CAM_PAGE_SIZE;
    const paged = campaigns.slice(start, start + CAM_PAGE_SIZE);

    if (paged.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--gray-400)"><i class="fas fa-inbox" style="font-size:3rem;display:block;margin-bottom:1rem;color:var(--gray-300)"></i><p style="font-size:1.1rem">Aucune campagne pour l'instant</p><small>Cliquez sur "Rédiger" pour créer votre première campagne</small></div>`;
        $('campaignPagination').innerHTML = '';
        return;
    }

    container.innerHTML = paged.map(c => {
        const date = c.sentAt?.toDate ? formatDate(c.sentAt.toDate()) : (c.createdAt?.toDate ? formatDate(c.createdAt.toDate()) : '—');
        const statusBadge = c.status === 'sent' ? '<span class="badge-sent"><i class="fas fa-check"></i> Envoyée</span>'
            : c.status === 'draft' ? '<span class="badge-draft"><i class="fas fa-pen"></i> Brouillon</span>'
            : '<span class="badge-scheduled"><i class="fas fa-clock"></i> Programmée</span>';

        return `
        <div class="campaign-item">
            <div class="campaign-header">
                <div>
                    <div class="campaign-title">${escHtml(c.subject || '(sans objet)')}</div>
                    <div class="campaign-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                        ${c.recipientCount ? `<span><i class="fas fa-users"></i> ${c.recipientCount} destinataires</span>` : ''}
                        <span><i class="fas fa-layer-group"></i> ${c.segment === 'new' ? 'Nouveaux abonnés' : 'Tous les abonnés'}</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
                    ${statusBadge}
                    <button class="btn btn-secondary btn-sm" onclick="viewCampaign('${c.id}')"><i class="fas fa-eye"></i> Voir</button>
                    ${c.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="loadDraft('${c.id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                </div>
            </div>
            ${c.body ? `<div class="campaign-preview">${escHtml((c.body || '').replace(/<[^>]*>/g, '').substring(0, 120))}…</div>` : ''}
        </div>`;
    }).join('');

    renderPagination($('campaignPagination'), campaigns.length, CAM_PAGE_SIZE, camPage, p => {
        camPage = p;
        renderCampaigns();
    });
}

// ============ VIEW CAMPAIGN ============
window.viewCampaign = function(id) {
    const c = campaigns.find(x => x.id === id);
    if (!c) return;
    $('viewCampaignTitle').innerHTML = `<i class="fas fa-envelope" style="color:var(--primary)"></i> ${escHtml(c.subject || 'Campagne')}`;
    const date = c.sentAt?.toDate ? formatDate(c.sentAt.toDate()) : '—';
    $('viewCampaignBody').innerHTML = `
        <div style="background:var(--gray-50);border-radius:var(--radius);padding:1rem;margin-bottom:1rem;font-size:.875rem;display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
            <div><strong>Statut :</strong> ${c.status}</div>
            <div><strong>Date :</strong> ${date}</div>
            <div><strong>Destinataires :</strong> ${c.recipientCount || '—'}</div>
            <div><strong>Segment :</strong> ${c.segment === 'new' ? 'Nouveaux abonnés' : 'Tous les abonnés'}</div>
        </div>
        <div style="border:2px solid var(--gray-200);border-radius:var(--radius);overflow:hidden">
            <div style="background:var(--gray-800);color:white;padding:.5rem 1rem;font-size:.8rem"><i class="fas fa-envelope"></i> Aperçu</div>
            <div style="padding:1.5rem">${buildEmailHtml(c)}</div>
        </div>`;
    $('viewCampaignModal').classList.remove('hidden');
};

// ============ LOAD DRAFT ============
window.loadDraft = function(id) {
    const c = campaigns.find(x => x.id === id);
    if (!c) return;
    $('campaignSubject').value = c.subject || '';
    $('campaignTitle').value = c.title || '';
    $('campaignIntro').value = c.intro || '';
    $('campaignBody').value = c.body || '';
    $('campaignBtnUrl').value = c.btnUrl || '';
    $('campaignBtnLabel').value = c.btnLabel || '';
    updatePreview();
    switchTab('compose');
    showToast('Brouillon chargé', 'info');
};

// ============ IMPORT ============
window.openImportModal = function() {
    importData = [];
    $('importPreview').classList.add('hidden');
    $('importBtn').disabled = true;
    $('importFile').value = '';
    $('importModal').classList.remove('hidden');
};

window.handleDragOver = function(e) {
    e.preventDefault();
    $('importDrop').classList.add('dragover');
};

window.handleImportDrop = function(e) {
    e.preventDefault();
    $('importDrop').classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processImportFile(file);
};

window.processImportFile = function(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        importData = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let skipped = 0;

        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            const email = parts[0];
            const name = parts[1] || '';
            if (emailRegex.test(email)) {
                importData.push({ email, name });
            } else {
                skipped++;
            }
        });

        const preview = importData.slice(0, 8).map(d => `${d.email}${d.name ? ` (${d.name})` : ''}`).join('\n');
        $('importPreviewText').textContent = preview + (importData.length > 8 ? `\n… et ${importData.length - 8} autres` : '');
        $('importCountValid').textContent = importData.length;
        $('importCountSkipped').textContent = skipped > 0 ? `${skipped} ignoré(s) (format invalide)` : '';
        $('importPreview').classList.remove('hidden');
        $('importBtn').disabled = importData.length === 0;
    };
    reader.readAsText(file);
};

window.confirmImport = async function() {
    if (importData.length === 0) return;
    $('importBtn').disabled = true;
    $('importBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Import…';

    const skipDuplicates = $('importSkipDuplicates').checked;
    const existingEmails = new Set(allSubscribers.map(s => (s.Email || s.email || '').toLowerCase()));
    let added = 0;
    let skipped = 0;

    const batch = writeBatch(db);

    importData.forEach(({ email, name }) => {
        if (skipDuplicates && existingEmails.has(email.toLowerCase())) {
            skipped++;
            return;
        }
        const ref = doc(collection(db, NEWSLETTER_COLLECTION));
        batch.set(ref, {
            Email: email,
            email: email,
            nom: name,
            name: name,
            status: 'active',
            source: 'import',
            'abonnéAt': serverTimestamp()
        });
        added++;
    });

    try {
        await batch.commit();
        $('importModal').classList.add('hidden');
        await loadSubscribers();
        showToast(`${added} abonnés importés${skipped > 0 ? `, ${skipped} doublons ignorés` : ''}`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Erreur lors de l\'import', 'error');
    } finally {
        $('importBtn').disabled = false;
        $('importBtn').innerHTML = '<i class="fas fa-upload"></i> Importer';
    }
};

// ============ PAGINATION HELPER ============
function renderPagination(container, total, pageSize, current, onPage) {
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="(${onPage.toString()})(${current - 1})" ${current === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - current) <= 1) {
            html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
        } else if (Math.abs(i - current) === 2) {
            html += `<span style="color:var(--gray-400)">…</span>`;
        }
    }

    html += `<button class="page-btn" onclick="(${onPage.toString()})(${current + 1})" ${current === pages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

// ============ TOAST ============
function showToast(msg, type = 'info') {
    const container = $('toastContainer');
    const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'} ${type}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// ============ HELPERS ============
function statusLabel(s) {
    return { active: '✅ Actif', unsubscribed: '❌ Désabonné', pending: '⏳ En attente' }[s] || s;
}

function formatDate(d) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}