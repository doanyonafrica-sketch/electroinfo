// admin-enhancements.js
// Script complémentaire pour la recherche et les accordéons
// À inclure APRÈS admin.js

import { createArticleItem } from './admin.js';

// ============================================
// VARIABLES GLOBALES POUR RECHERCHE & PAGINATION
// ============================================
let allArticlesData = {
    published: [],
    scheduled: [],
    drafts: []
};

let filteredArticlesData = {
    published: [],
    scheduled: [],
    drafts: []
};

const ITEMS_PER_PAGE = 10;
let currentPages = {
    published: 1,
    scheduled: 1,
    drafts: 1
};

// ============================================
// ACCORDÉON
// ============================================
window.toggleAccordion = function(section) {
    const accordion = document.getElementById(`${section}Accordion`);
    const icon = document.getElementById(`${section}Icon`);
    
    if (accordion.classList.contains('collapsed')) {
        accordion.classList.remove('collapsed');
        icon.classList.remove('rotated');
    } else {
        accordion.classList.add('collapsed');
        icon.classList.add('rotated');
    }
};

// ============================================
// RECHERCHE ADMIN
// ============================================
const searchInput = document.getElementById('adminSearchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const searchResultsCount = document.getElementById('searchResultsCount');

searchInput?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // ✅ Fix : ne pas chercher si les données ne sont pas encore chargées
    const totalArticles = allArticlesData.published.length + allArticlesData.scheduled.length + allArticlesData.drafts.length;
    if (totalArticles === 0) {
        searchResultsCount.textContent = 'Chargement des articles en cours...';
        searchResultsCount.classList.remove('hidden');
        return;
    }

    if (searchTerm.length > 0) {
        clearSearchBtn.classList.remove('hidden');
        performSearch(searchTerm);
    } else {
        clearSearchBtn.classList.add('hidden');
        searchResultsCount.classList.add('hidden');
        clearAdminSearch();
    }
});

function performSearch(searchTerm) {
    let totalResults = 0;
    
    // Rechercher dans chaque section
    ['published', 'scheduled', 'drafts'].forEach(section => {
        const articles = allArticlesData[section];
        
        const filtered = articles.filter(item => {
            const article = item.data;
            const title = (article.title || '').toLowerCase();
            const category = (article.category || '').toLowerCase();
            const tags = (article.tags || []).join(' ').toLowerCase();
            const summary = (article.summary || '').toLowerCase();
            
            return title.includes(searchTerm) || 
                   category.includes(searchTerm) || 
                   tags.includes(searchTerm) ||
                   summary.includes(searchTerm);
        });
        
        filteredArticlesData[section] = filtered;
        totalResults += filtered.length;
        
        // Réafficher avec résultats filtrés
        currentPages[section] = 1;
        displayArticlesInSectionPaginated(
            `${section}ArticlesList`, 
            filtered, 
            section === 'published' ? 'publié' : section === 'scheduled' ? 'programmé' : 'brouillon',
            section
        );
    });
    
    // Afficher le compteur de résultats
    if (totalResults > 0) {
        searchResultsCount.textContent = `${totalResults} résultat${totalResults > 1 ? 's' : ''} trouvé${totalResults > 1 ? 's' : ''}`;
        searchResultsCount.classList.remove('hidden');
    } else {
        searchResultsCount.textContent = 'Aucun résultat trouvé';
        searchResultsCount.classList.remove('hidden');
    }
}

window.clearAdminSearch = function() {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchResultsCount.classList.add('hidden');
    
    // Restaurer tous les articles
    filteredArticlesData = {
        published: [...allArticlesData.published],
        scheduled: [...allArticlesData.scheduled],
        drafts: [...allArticlesData.drafts]
    };
    
    // Réafficher toutes les sections
    ['published', 'scheduled', 'drafts'].forEach(section => {
        currentPages[section] = 1;
        displayArticlesInSectionPaginated(
            `${section}ArticlesList`,
            filteredArticlesData[section],
            section === 'published' ? 'publié' : section === 'scheduled' ? 'programmé' : 'brouillon',
            section
        );
    });
};

// ============================================
// AFFICHAGE AVEC PAGINATION
// ============================================
function displayArticlesInSectionPaginated(sectionId, articles, type, section) {
    const container = document.getElementById(sectionId);
    const page = currentPages[section];
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedArticles = articles.slice(start, end);
    
    if (articles.length === 0) {
        const icons = {
            'publié': 'check-circle',
            'programmé': 'clock',
            'brouillon': 'file-alt'
        };
        const messages = {
            'publié': 'Aucun article publié',
            'programmé': 'Aucun article programmé',
            'brouillon': 'Aucun brouillon'
        };
        const hints = {
            'publié': 'Publiez votre premier article !',
            'programmé': 'Programmez une publication future',
            'brouillon': 'Enregistrez vos articles en brouillon'
        };
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-${icons[type]}"></i>
                <p>${messages[type]}</p>
                <small>${hints[type]}</small>
            </div>
        `;
        
        // Cacher la pagination
        document.getElementById(`${section}Pagination`).classList.add('hidden');
        return;
    }
    
    container.innerHTML = '';
    paginatedArticles.forEach(item => {
        const articleElement = createArticleItem(item.id, item.data);
        container.appendChild(articleElement);
    });
    
    // Afficher la pagination
    displayPaginationForSection(section, articles.length);
}

function displayPaginationForSection(section, totalItems) {
    const paginationContainer = document.getElementById(`${section}Pagination`);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const currentPage = currentPages[section];
    
    if (totalPages <= 1) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    paginationContainer.innerHTML = '';
    
    // Bouton Précédent
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(section, currentPage - 1);
    paginationContainer.appendChild(prevBtn);
    
    // Pages
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => changePage(section, 1);
        paginationContainer.appendChild(firstBtn);
        
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.onclick = () => changePage(section, i);
        paginationContainer.appendChild(btn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'pagination-dots';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => changePage(section, totalPages);
        paginationContainer.appendChild(lastBtn);
    }
    
    // Bouton Suivant
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(section, currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}

function changePage(section, page) {
    currentPages[section] = page;
    const sectionId = `${section}ArticlesList`;
    const type = section === 'published' ? 'publié' : section === 'scheduled' ? 'programmé' : 'brouillon';
    
    displayArticlesInSectionPaginated(
        sectionId,
        filteredArticlesData[section],
        type,
        section
    );
    
    // Scroll vers le haut de la section
    document.getElementById(`${section}Accordion`).scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
}

// ============================================
// OVERRIDE DE LA FONCTION loadArticles
// ============================================
// Cette fonction sera appelée depuis admin.js
window.loadArticlesEnhanced = async function(snapshot) {
    // Séparer les articles par statut
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
    
    // Stocker dans les variables globales
    allArticlesData = {
        published: publishedArticles,
        scheduled: scheduledArticles,
        drafts: draftArticles
    };
    
    filteredArticlesData = {
        published: [...publishedArticles],
        scheduled: [...scheduledArticles],
        drafts: [...draftArticles]
    };
    
    // Réinitialiser les pages
    currentPages = {
        published: 1,
        scheduled: 1,
        drafts: 1
    };

    // Mettre à jour les compteurs dans les headers
    document.getElementById('publishedCount').textContent = publishedArticles.length;
    document.getElementById('scheduledCount').textContent = scheduledArticles.length;
    document.getElementById('draftsCount').textContent = draftArticles.length;

    // Afficher avec pagination
    displayArticlesInSectionPaginated('publishedArticlesList', publishedArticles, 'publié', 'published');
    displayArticlesInSectionPaginated('scheduledArticlesList', scheduledArticles, 'programmé', 'scheduled');
    displayArticlesInSectionPaginated('draftsArticlesList', draftArticles, 'brouillon', 'drafts');
};

// ============================================
// INFO BULLE POUR ARTICLES LONGS
// ============================================
// ✅ Fix : en module ES, DOMContentLoaded est déjà passé — exécuter directement
(function addInfoTip() {
    const formCard = document.querySelector('#articleForm')?.closest('.card');
    if (formCard) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'alert alert-info';
        infoDiv.style.marginTop = '1rem';
        infoDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>💡 Astuce</strong>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                    Utilisez la barre de recherche ci-dessous pour trouver rapidement vos articles.
                    Les sections peuvent être réduites en cliquant sur leur en-tête.
                </p>
            </div>
        `;
        formCard.querySelector('.card-body').appendChild(infoDiv);
    }
})();

console.log('✅ Admin enhancements chargé : Recherche + Accordéons + Pagination');

// ✅ Traiter un snapshot en attente si loadArticles() s'est exécuté avant nous
if (window.__pendingSnapshot) {
    window.loadArticlesEnhanced(window.__pendingSnapshot);
    window.__pendingSnapshot = null;
}

// ✅ Écouter les chargements futurs déclenchés depuis admin.js
window.addEventListener('articlesLoaded', (e) => {
    window.loadArticlesEnhanced(e.detail);
});