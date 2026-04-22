// simulations/retour.js
// À inclure dans CHAQUE page de simulation.
// Ce script lit les paramètres de l'URL pour savoir d'où l'élève vient,
// puis injecte automatiquement un bouton "Retour au cours" en haut de la page.

(function() {
    'use strict';

    // ── Lire les paramètres passés dans l'URL ──────────────────────────
    const params     = new URLSearchParams(window.location.search);
    const returnUrl  = params.get('retour');   // URL de la page séance
    const scrollPos  = params.get('scroll');   // Position de scroll à restaurer
    const sessionName = params.get('seance');  // Nom lisible de la séance (optionnel)

    // ── Injecter le bouton dès que le DOM est prêt ─────────────────────
    function injectBtn() {
        // Ne pas injecter deux fois
        if (document.getElementById('sim-retour-btn')) return;

        const bar = document.createElement('div');
        bar.id = 'sim-retour-bar';
        bar.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 9999;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            padding: 0.6rem 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-family: system-ui, -apple-system, sans-serif;
        `;

        // Bouton retour
        if (returnUrl) {
            const btn = document.createElement('a');
            btn.id   = 'sim-retour-btn';
            btn.href = '#';
            btn.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(255,255,255,0.2);
                color: white;
                text-decoration: none;
                padding: 0.4rem 1rem;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 600;
                border: 1px solid rgba(255,255,255,0.3);
                transition: background 0.2s;
                -webkit-tap-highlight-color: transparent;
            `;
            btn.innerHTML = '&#8592; Retour au cours';

            btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.35)'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.2)';  });

            btn.addEventListener('click', function(e) {
                e.preventDefault();
                // Construire l'URL de retour avec la position de scroll
                let url = returnUrl;
                if (scrollPos) {
                    // Ajouter le paramètre scroll pour que session-detail.js restaure la position
                    const sep = url.includes('?') ? '&' : '?';
                    url = `${url}${sep}scrollRestore=${scrollPos}`;
                }
                window.location.href = url;
            });

            bar.appendChild(btn);
        }

        // Titre "Simulation" + nom de la séance
        const label = document.createElement('span');
        label.style.cssText = `
            color: rgba(255,255,255,0.9);
            font-size: 0.85rem;
            font-weight: 500;
        `;
        label.innerHTML = sessionName
            ? `&#9889; Simulation &mdash; <em>${decodeURIComponent(sessionName)}</em>`
            : '&#9889; Simulation interactive';
        bar.appendChild(label);

        // Insérer la barre AVANT le premier élément du body
        document.body.insertBefore(bar, document.body.firstChild);

        // Pousser le contenu vers le bas pour ne pas être caché par la barre
        const barHeight = bar.offsetHeight || 48;
        document.body.style.paddingTop = (barHeight + 4) + 'px';
    }

    // Exécuter dès que possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBtn);
    } else {
        injectBtn();
    }

})();
