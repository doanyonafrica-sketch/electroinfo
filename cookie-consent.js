// cookie-consent.js - Bannière de consentement RGPD conforme
// Gère les cookies, conditions d'utilisation et politique de confidentialité

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        cookieName: 'electroinfo_consent',
        cookieExpiry: 365,
        version: '1.0',
        links: {
            terms: 'terms.html',
            privacy: 'privacy.html',
            cookies: 'cookies.html'
        }
    };

    // État du consentement
    let consentState = {
        necessary: true,
        analytics: false,
        marketing: false,
        accepted: false,
        timestamp: null,
        version: null
    };

    // Vérifier si déjà consenti
    function checkExistingConsent() {
        try {
            const stored = localStorage.getItem(CONFIG.cookieName);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.version === CONFIG.version) {
                    consentState = parsed;
                    return true;
                }
            }
        } catch (e) {
            console.error('Erreur lecture consentement:', e);
        }
        return false;
    }

    // Sauvegarder le consentement
    function saveConsent() {
        consentState.timestamp = new Date().toISOString();
        consentState.version = CONFIG.version;
        try {
            localStorage.setItem(CONFIG.cookieName, JSON.stringify(consentState));
        } catch (e) {
            console.error('Erreur sauvegarde consentement:', e);
        }
        
        window.dispatchEvent(new CustomEvent('consentUpdated', { 
            detail: consentState 
        }));
        
        applyConsent();
    }

    // Appliquer les choix de consentement
    function applyConsent() {
        if (consentState.analytics) {
            enableAnalytics();
        } else {
            disableAnalytics();
        }
        console.log('Consentement appliqué:', consentState);
    }

    function enableAnalytics() {
        if (window.gtag) {
            window.gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
    }

    function disableAnalytics() {
        if (window.gtag) {
            window.gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
    }

    // Créer la bannière HTML
    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'consent-banner';
        banner.className = 'consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Consentement aux cookies et conditions d\'utilisation');
        banner.setAttribute('aria-modal', 'true');
        
        banner.innerHTML = `
            <div class="consent-container">
                <div class="consent-content">
                    <div class="consent-header">
                        <i class="fas fa-shield-alt consent-icon"></i>
                        <h2>Votre vie privée est importante</h2>
                    </div>
                    
                    <div class="consent-body">
                        <p class="consent-intro">
                            En utilisant <strong>Electroinfo</strong>, vous acceptez nos 
                            <a href="${CONFIG.links.terms}" target="_blank" class="consent-link">Conditions d'Utilisation</a> 
                            et notre 
                            <a href="${CONFIG.links.privacy}" target="_blank" class="consent-link">Politique de Confidentialité</a>.
                        </p>
                        
                        <div class="consent-details">
                            <p>Nous utilisons des cookies pour :</p>
                            <ul class="consent-list">
                                <li><i class="fas fa-check-circle text-success"></i> Assurer le fonctionnement du site (connexion, sécurité)</li>
                                <li><i class="fas fa-chart-line text-info"></i> Analyser l'utilisation et améliorer nos services</li>
                                <li><i class="fas fa-graduation-cap text-primary"></i> Mémoriser vos préférences de cours et niveaux</li>
                            </ul>
                        </div>

                        <div class="consent-toggles">
                            <div class="consent-toggle-item disabled">
                                <label class="consent-toggle">
                                    <input type="checkbox" checked disabled>
                                    <span class="consent-slider"></span>
                                </label>
                                <div class="consent-toggle-text">
                                    <strong>Cookies essentiels</strong>
                                    <span>Nécessaires au fonctionnement du site. Ne peuvent pas être désactivés.</span>
                                </div>
                            </div>
                            
                            <div class="consent-toggle-item">
                                <label class="consent-toggle">
                                    <input type="checkbox" id="analytics-toggle">
                                    <span class="consent-slider"></span>
                                </label>
                                <div class="consent-toggle-text">
                                    <strong>Cookies analytiques</strong>
                                    <span>Nous aident à comprendre comment vous utilisez le site (Google Analytics).</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="consent-actions">
                        <button class="consent-btn consent-btn-secondary" id="consent-customize">
                            <i class="fas fa-sliders-h"></i> Personnaliser
                        </button>
                        <button class="consent-btn consent-btn-outline" id="consent-reject">
                            <i class="fas fa-times"></i> Refuser tout
                        </button>
                        <button class="consent-btn consent-btn-primary" id="consent-accept">
                            <i class="fas fa-check"></i> Tout accepter
                        </button>
                    </div>
                    
                    <div class="consent-footer">
                        <small>
                            Vous pouvez modifier vos préférences à tout moment via le lien 
                            <a href="#" onclick="window.CookieConsent.show(); return false;">Gestion des cookies</a> 
                            en bas de page.
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        return banner;
    }

    // Afficher la bannière
    function showBanner() {
        if (document.getElementById('consent-banner')) return;
        
        const banner = createBanner();
        document.body.appendChild(banner);
        
        document.body.style.overflow = 'hidden';
        
        setupEventListeners(banner);
        
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);
    }

    // Masquer la bannière
    function hideBanner() {
        const banner = document.getElementById('consent-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }

    // Gestionnaires d'événements
    function setupEventListeners(banner) {
        // Accepter tout
        banner.querySelector('#consent-accept').addEventListener('click', () => {
            consentState.necessary = true;
            consentState.analytics = true;
            consentState.marketing = false;
            consentState.accepted = true;
            saveConsent();
            hideBanner();
            showNotification('Merci ! Vos préférences ont été enregistrées.', 'success');
        });

        // Refuser tout
        banner.querySelector('#consent-reject').addEventListener('click', () => {
            consentState.necessary = true;
            consentState.analytics = false;
            consentState.marketing = false;
            consentState.accepted = true;
            saveConsent();
            hideBanner();
            showNotification('Vos préférences ont été enregistrées. Seuls les cookies essentiels sont activés.', 'info');
        });

        // Personnaliser
        const customizeBtn = banner.querySelector('#consent-customize');
        const detailsSection = banner.querySelector('.consent-toggles');
        
        customizeBtn.addEventListener('click', () => {
            detailsSection.classList.toggle('show');
            customizeBtn.innerHTML = detailsSection.classList.contains('show') 
                ? '<i class="fas fa-chevron-up"></i> Masquer' 
                : '<i class="fas fa-sliders-h"></i> Personnaliser';
        });

        // Toggle analytics
        const analyticsToggle = banner.querySelector('#analytics-toggle');
        analyticsToggle.addEventListener('change', (e) => {
            consentState.analytics = e.target.checked;
        });
    }

    // Notification simple
    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        const notif = document.createElement('div');
        notif.className = `notification ${type} show`;
        notif.style.cssText = `
            position: fixed;
            top: 5rem;
            right: 1rem;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            border-left: 4px solid ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#1e40af'};
        `;
        
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        const color = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#1e40af';
        
        notif.innerHTML = `
            <i class="fas fa-${icon}" style="font-size: 1.25rem; color: ${color};"></i>
            <span style="color: #374151; font-weight: 500;">${message}</span>
        `;

        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(100%)';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // Réinitialiser le consentement
    function resetConsent() {
        localStorage.removeItem(CONFIG.cookieName);
        location.reload();
    }

    // Afficher la bannière manuellement
    function showConsentManager() {
        if (checkExistingConsent()) {
            showBanner();
            setTimeout(() => {
                const analyticsToggle = document.querySelector('#analytics-toggle');
                if (analyticsToggle) {
                    analyticsToggle.checked = consentState.analytics;
                }
            }, 150);
        } else {
            showBanner();
        }
    }

    // Initialisation
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }

    function initialize() {
        if (!checkExistingConsent()) {
            setTimeout(showBanner, 500);
        } else {
            applyConsent();
        }
    }

    // ✅ EXPOSER L'API GLOBALE IMMÉDIATEMENT
    window.CookieConsent = {
        show: showConsentManager,
        reset: resetConsent,
        getState: function() { return { ...consentState }; },
        version: CONFIG.version
    };

    // Démarrer
    init();

})();