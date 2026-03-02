/**
 * ElectroInfo — Système de traduction multilingue
 * Langues : Eʋegbe (ewe) | Français (fr) | English (en)
 * Langue par défaut : Eʋegbe
 */

const TRANSLATIONS = {

  /* =============================================
     EWE (Eʋegbe) — langue de base
  ============================================= */
  ewe: {
    // Navigation
    nav_home:       "Ŋɔliƒe",
    nav_articles:   "Nuŋlɔɖiwo",
    nav_courses:    "Ɖeɖewo",
    nav_about:      "Míaƒe xinye",
    nav_contact:    "Ɖoɖo",
    nav_login:      "Ŋkɔ gbɔa",
    nav_logout:     "Yi egbe",
    nav_profile:    "Ame ŋutifafa",
    nav_admin:      "Ŋutiƒoƒo",

    // Hero (index)
    hero_title:     "Woezo ElectroInfo dzi",
    hero_subtitle:  "Mia ƒe fiaƒia kple lɔlɔ̃ƒe le industrial electricity me.\nNuŋlɔɖiwo, ɖeɖewo kple alɔɖeɖe ame ƒe kple wɔlawo ƒe nyuiwo.",
    hero_btn_articles: "Kpɔ Nuŋlɔɖiwo",
    hero_btn_courses:  "Kpɔ Ɖeɖewo",

    // Features section
    features_title: "Alɔɖeɖe si míe wɔ",
    features_subtitle: "Nusiwo hã ame le agble me le electricity me",
    feat_news_title:  "Dɔwɔƒea ƒe Nuti",
    feat_news_desc:   "Ƒoƒo dzidzii kple trendowo le industrial electricity me, ŋgɔɖoɖo blibo.",
    feat_courses_title: "Ɖeɖe Nyui",
    feat_courses_desc:  "Ɖeɖewo ƒe BAC PRO, BEP, CAP, BTS kple Licence le electricity kple electrotechnique me.",
    feat_tuto_title:  "Alɔɖeɖewo",
    feat_tuto_desc:   "Alɔɖeɖe kple tutorialwo ameɖe me ɖe electricity teƒewo ŋuti.",
    feat_security_title: "Teƒe nyuitɔ",
    feat_security_desc:  "Normes, nyatakakawo kple dɔ nyui ɖe teƒe nyuitɔ ŋuti.",
    feat_newsletter_title: "Newsletter",
    feat_newsletter_desc:  "Ƒu nuŋlɔɖi kple nuti yeye siwo yɔu le ne email me.",
    feat_community_title: "Haɖegbɔgbɔ",
    feat_community_desc:  "Ze ŋu ɖo dzihaɖegbɔgbɔ ame kple electricity ƒe wɔlawo dome.",

    // Latest articles section
    latest_title:    "Nuŋlɔɖi Yeye",
    latest_subtitle: "Mia ƒe nuŋlɔɖi yeye siwo",
    view_all:        "Kpɔ nuŋlɔɖi katã",

    // CTA Newsletter section
    cta_title:       "Le ŋgɔ eye wòkpɔ nuti",
    cta_subtitle:    "Ze ŋu ɖo míaƒe newsletter me ƒu nuŋlɔɖi yeye kple ɖeɖe yeye",
    newsletter_placeholder: "wò@email.fr",
    newsletter_btn:  "Ze ŋu",

    // Footer
    footer_desc:     "Mia ƒe fiaƒia kple lɔlɔ̃ƒe le electricity kple electronics me. Míe gbɔ volt, ampère kple watt.",
    footer_nav:      "Biabia Ŋutifafa",
    footer_resources: "Alɔɖeɖewo",
    footer_legal:    "Ame ŋutifafa",
    footer_follow:   "Míetso míaƒe",
    footer_privacy:  "Ame ŋutifafa ƒe teƒe",
    footer_terms:    "Zãzã ƒe nyatakakawo",
    footer_legal_mentions: "Kɔkɔɛ nyatakakawo",
    footer_cookies:  "Cookie ŋutiŋuti",
    footer_copyright: "© 2025 ElectroInfo. Dɔ katã kpɔe.",
    footer_credit:   "Wɔ le ƒo me",

    // Articles page
    articles_page_title: "Nuŋlɔɖi Katã",
    articles_page_subtitle: "Kpɔ míaƒe nuŋlɔɖiwo le industrial electricity, ƒoƒodzidzii, teƒe nyuitɔ, alɔɖeɖewo kple gãwo ŋuti",
    search_placeholder: "Ba nuŋlɔɖi ŋuti...",
    filter_all:       "Katã",
    filter_innovation: "Ƒoƒo",
    filter_security:  "Teƒe nyuitɔ",
    filter_new:       "Yeye",
    filter_tuto:      "Alɔɖeɖe",
    filter_domotique: "Ŋɔliƒe teƒe",
    sort_label:       "Ɖo enu:",
    sort_recent:      "Yeye be",
    sort_old:         "Dɔna be",
    sort_popular:     "Ame dada be",
    sort_title:       "Nuŋlɔ (A-Z)",
    loading_articles: "Nuŋlɔɖiwo loƒo...",
    sidebar_popular:  "Nuŋlɔɖi Dada",
    sidebar_courses:  "Ɖeɖe & Bia gbɔgblɔ",
    sidebar_courses_levels: "BAC PRO · BEP · CAP · BTS · Licence",
    sidebar_courses_btn:  "Kpɔ ɖeɖewo →",
    sidebar_newsletter:   "Newsletter",
    sidebar_newsletter_desc: "Le ŋgɔ eye wòkpɔ electricity ƒe nuti yeye",
    sidebar_newsletter_btn: "Ze ŋu",
    sidebar_about:    "Míaƒe xinye",
    sidebar_about_text: "Woezo mia ƒe fiaƒia me. Afi sia, míe gbɔ volt, ampère kple watt.",

    // Article detail page
    loading_article: "Nuŋlɔɖi loƒo...",
    article_not_found: "Nuŋlɔɖi mewoam̃",
    article_not_found_desc: "Nusɔsɔ, nuŋlɔɖi sia meganɔ ó alo wowɔ ne yi.",
    back_home:       "Tso ŋɔliƒe",
    reading_time_suffix: " aɖabaƒoƒo",
    views_suffix:    " kpɔkpɔ",
    share_copy:      "Kɔpi link",
    share_twitter:   "Ɖo Twitter dzi",
    share_linkedin:  "Ɖo LinkedIn dzi",
    share_whatsapp:  "Ɖo WhatsApp dzi",
    tags_title:      "Tagswo",
    comments_title:  "Nyatakaka ŋutiŋutiwo",
    comment_name_placeholder:  "Wò ŋkɔ",
    comment_email_placeholder: "Wò email",
    comment_text_placeholder:  "Wò nyatakaka...",
    comment_submit:  "Ƒu nuŋlɔ",
    newsletter_widget_title: "Newsletter",
    newsletter_widget_text:  "Ƒu nuŋlɔɖi yeye le ne email me.",
    newsletter_email_placeholder: "wò@email.fr",
    newsletter_subscribe_btn: "Ze ŋu",
    related_articles: "Nuŋlɔɖi si tso edzi ɖa",

    // Modal
    modal_newsletter_title: "Ze ŋu míaƒe Newsletter me",
    modal_newsletter_desc: "Ƒu nuti yeye le ne email me.",
    modal_newsletter_btn:  "Ze ŋu",
    modal_thanks_title: "Akpe!",
    modal_thanks_desc: "Wòze ŋu míaƒe newsletter me.",

    // Theme
    theme_dark:  "Gbã",
    theme_light: "Ɣeyiɣi",
  },

  /* =============================================
     FRANÇAIS
  ============================================= */
  fr: {
    nav_home:       "Accueil",
    nav_articles:   "Articles",
    nav_courses:    "Cours",
    nav_about:      "À propos",
    nav_contact:    "Contact",
    nav_login:      "Connexion",
    nav_logout:     "Déconnexion",
    nav_profile:    "Mon profil",
    nav_admin:      "Administration",

    hero_title:     "Bienvenue sur ElectroInfo",
    hero_subtitle:  "Votre portail d'expertise en électricité industrielle.\nActualités, cours complets et ressources pour professionnels et étudiants.",
    hero_btn_articles: "Découvrir les articles",
    hero_btn_courses:  "Voir les cours",

    features_title:   "Ce que nous proposons",
    features_subtitle: "Tout ce dont vous avez besoin pour exceller dans le domaine de l'électricité",
    feat_news_title:   "Actualités",
    feat_news_desc:    "Les dernières innovations et tendances en électricité industrielle, mises à jour régulièrement.",
    feat_courses_title: "Cours Complets",
    feat_courses_desc:  "Formations pour BAC PRO, BEP, CAP, BTS et Licence en électricité et électrotechnique.",
    feat_tuto_title:   "Tutoriels",
    feat_tuto_desc:    "Guides pratiques et tutoriels détaillés pour maîtriser les techniques électriques.",
    feat_security_title: "Sécurité",
    feat_security_desc:  "Normes, réglementations et bonnes pratiques pour travailler en toute sécurité.",
    feat_newsletter_title: "Newsletter",
    feat_newsletter_desc:  "Recevez les derniers articles et actualités directement dans votre boîte mail.",
    feat_community_title:  "Communauté",
    feat_community_desc:   "Rejoignez une communauté de passionnés et professionnels de l'électricité.",

    latest_title:    "Derniers Articles",
    latest_subtitle: "Découvrez nos publications les plus récentes",
    view_all:        "Voir tous les articles",

    cta_title:    "Restez informé",
    cta_subtitle: "Abonnez-vous à notre newsletter pour recevoir les dernières actualités et nouveaux cours",
    newsletter_placeholder: "votre@email.fr",
    newsletter_btn: "S'abonner",

    footer_desc:      "Votre portail d'expertise en électricité et électronique. Nous parlons volt, ampère et watt sans concession.",
    footer_nav:       "Navigation",
    footer_resources: "Ressources",
    footer_legal:     "Informations Légales",
    footer_follow:    "Suivez-nous",
    footer_privacy:   "Politique de confidentialité",
    footer_terms:     "Conditions d'utilisation",
    footer_legal_mentions: "Mentions légales",
    footer_cookies:   "Gestion des cookies",
    footer_copyright: "© 2025 ElectroInfo. Tous droits réservés.",
    footer_credit:    "Développé avec ❤️ pour la communauté électrique",

    articles_page_title:    "Tous les Articles",
    articles_page_subtitle: "Explorez nos publications sur l'électricité industrielle, les innovations et les tutoriels pratiques",
    search_placeholder: "Rechercher un article...",
    filter_all:       "Tous",
    filter_innovation: "Innovation",
    filter_security:  "Sécurité",
    filter_new:       "Nouveauté",
    filter_tuto:      "Tuto",
    filter_domotique: "Domotique",
    sort_label:       "Trier par :",
    sort_recent:      "Plus récent",
    sort_old:         "Plus ancien",
    sort_popular:     "Plus populaire",
    sort_title:       "Titre (A-Z)",
    loading_articles: "Chargement des articles...",
    sidebar_popular:  "Articles Populaires",
    sidebar_courses:  "Cours & Exercices",
    sidebar_courses_levels: "BAC PRO · BEP · CAP · BTS · Licence",
    sidebar_courses_btn:    "Voir les cours →",
    sidebar_newsletter:     "Newsletter",
    sidebar_newsletter_desc: "Restez informé des dernières actualités électriques",
    sidebar_newsletter_btn: "S'abonner",
    sidebar_about:    "À Propos",
    sidebar_about_text: "Bienvenue sur votre portail d'expertise. Ici, nous parlons volt, ampère et watt sans concession.",

    loading_article: "Chargement de l'article...",
    article_not_found: "Article introuvable",
    article_not_found_desc: "Désolé, cet article n'existe pas ou a été supprimé.",
    back_home:       "Retour à l'accueil",
    reading_time_suffix: " min de lecture",
    views_suffix:    " vues",
    share_copy:      "Copier le lien",
    share_twitter:   "Partager sur Twitter",
    share_linkedin:  "Partager sur LinkedIn",
    share_whatsapp:  "Partager sur WhatsApp",
    tags_title:      "Tags",
    comments_title:  "Commentaires",
    comment_name_placeholder:  "Votre nom",
    comment_email_placeholder: "Votre email",
    comment_text_placeholder:  "Votre commentaire...",
    comment_submit:  "Publier",
    newsletter_widget_title: "Newsletter",
    newsletter_widget_text:  "Recevez les derniers articles directement dans votre boîte mail.",
    newsletter_email_placeholder: "votre@email.fr",
    newsletter_subscribe_btn: "S'abonner",
    related_articles: "Articles similaires",

    modal_newsletter_title: "Abonnez-vous à notre Newsletter",
    modal_newsletter_desc:  "Recevez les dernières actualités directement dans votre boîte mail.",
    modal_newsletter_btn:   "S'abonner",
    modal_thanks_title: "Merci !",
    modal_thanks_desc: "Vous êtes maintenant inscrit à notre newsletter.",

    theme_dark:  "Sombre",
    theme_light: "Clair",
  },

  /* =============================================
     ENGLISH
  ============================================= */
  en: {
    nav_home:       "Home",
    nav_articles:   "Articles",
    nav_courses:    "Courses",
    nav_about:      "About",
    nav_contact:    "Contact",
    nav_login:      "Login",
    nav_logout:     "Logout",
    nav_profile:    "My Profile",
    nav_admin:      "Administration",

    hero_title:     "Welcome to ElectroInfo",
    hero_subtitle:  "Your industrial electricity expertise portal.\nNews, complete courses and resources for professionals and students.",
    hero_btn_articles: "Explore Articles",
    hero_btn_courses:  "View Courses",

    features_title:   "What We Offer",
    features_subtitle: "Everything you need to excel in the field of electricity",
    feat_news_title:   "News",
    feat_news_desc:    "The latest innovations and trends in industrial electricity, updated regularly.",
    feat_courses_title: "Complete Courses",
    feat_courses_desc:  "Training for BAC PRO, BEP, CAP, BTS and Licence in electricity and electrotechnics.",
    feat_tuto_title:   "Tutorials",
    feat_tuto_desc:    "Practical guides and detailed tutorials to master electrical techniques.",
    feat_security_title: "Safety",
    feat_security_desc:  "Standards, regulations and best practices for safe working.",
    feat_newsletter_title: "Newsletter",
    feat_newsletter_desc:  "Receive the latest articles and news directly in your inbox.",
    feat_community_title:  "Community",
    feat_community_desc:   "Join a community of electricity enthusiasts and professionals.",

    latest_title:    "Latest Articles",
    latest_subtitle: "Discover our most recent publications",
    view_all:        "View all articles",

    cta_title:    "Stay Informed",
    cta_subtitle: "Subscribe to our newsletter to receive the latest news and new courses",
    newsletter_placeholder: "your@email.com",
    newsletter_btn: "Subscribe",

    footer_desc:      "Your expertise portal in electricity and electronics. We talk volts, amps and watts without compromise.",
    footer_nav:       "Navigation",
    footer_resources: "Resources",
    footer_legal:     "Legal Information",
    footer_follow:    "Follow Us",
    footer_privacy:   "Privacy Policy",
    footer_terms:     "Terms of Use",
    footer_legal_mentions: "Legal Notices",
    footer_cookies:   "Cookie Settings",
    footer_copyright: "© 2025 ElectroInfo. All rights reserved.",
    footer_credit:    "Built with ❤️ for the electrical community",

    articles_page_title:    "All Articles",
    articles_page_subtitle: "Explore our publications on industrial electricity, innovations and practical tutorials",
    search_placeholder: "Search an article...",
    filter_all:       "All",
    filter_innovation: "Innovation",
    filter_security:  "Safety",
    filter_new:       "New",
    filter_tuto:      "Tutorial",
    filter_domotique: "Home Automation",
    sort_label:       "Sort by:",
    sort_recent:      "Most recent",
    sort_old:         "Oldest",
    sort_popular:     "Most popular",
    sort_title:       "Title (A-Z)",
    loading_articles: "Loading articles...",
    sidebar_popular:  "Popular Articles",
    sidebar_courses:  "Courses & Exercises",
    sidebar_courses_levels: "BAC PRO · BEP · CAP · BTS · Degree",
    sidebar_courses_btn:    "View courses →",
    sidebar_newsletter:     "Newsletter",
    sidebar_newsletter_desc: "Stay updated on the latest electrical news",
    sidebar_newsletter_btn: "Subscribe",
    sidebar_about:    "About",
    sidebar_about_text: "Welcome to your expertise portal. Here, we talk volts, amps and watts without compromise.",

    loading_article: "Loading article...",
    article_not_found: "Article not found",
    article_not_found_desc: "Sorry, this article does not exist or has been deleted.",
    back_home:       "Back to Home",
    reading_time_suffix: " min read",
    views_suffix:    " views",
    share_copy:      "Copy link",
    share_twitter:   "Share on Twitter",
    share_linkedin:  "Share on LinkedIn",
    share_whatsapp:  "Share on WhatsApp",
    tags_title:      "Tags",
    comments_title:  "Comments",
    comment_name_placeholder:  "Your name",
    comment_email_placeholder: "Your email",
    comment_text_placeholder:  "Your comment...",
    comment_submit:  "Post",
    newsletter_widget_title: "Newsletter",
    newsletter_widget_text:  "Receive the latest articles directly in your inbox.",
    newsletter_email_placeholder: "your@email.com",
    newsletter_subscribe_btn: "Subscribe",
    related_articles: "Related Articles",

    modal_newsletter_title: "Subscribe to our Newsletter",
    modal_newsletter_desc:  "Receive the latest news directly in your inbox.",
    modal_newsletter_btn:   "Subscribe",
    modal_thanks_title: "Thank you!",
    modal_thanks_desc: "You are now subscribed to our newsletter.",

    theme_dark:  "Dark",
    theme_light: "Light",
  }
};

/* =============================================
   MOTEUR DE TRADUCTION
============================================= */

const DEFAULT_LANG = 'ewe';
const STORAGE_KEY  = 'electroinfo_lang';

/** Retourne la langue actuelle */
function getLang() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
}

/** Change la langue et recharge les textes */
function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
  updateLangSwitcher(lang);
  document.documentElement.lang = lang === 'ewe' ? 'ee' : lang;
}

/** Applique toutes les traductions sur la page */
function applyTranslations(lang) {
  const dict = TRANSLATIONS[lang];
  if (!dict) return;

  // Textes simples : data-i18n="key"
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) {
      // Conserver le innerHTML si l'élément a des icônes (i.fas)
      const icon = el.querySelector('i.fas, i.fab, i.far');
      if (icon) {
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = ' ' + dict[key];
          }
        });
        if (!el.querySelector('i')) {
          el.textContent = dict[key];
        }
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Placeholders : data-i18n-placeholder="key"
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  // Titres (title attribute) : data-i18n-title="key"
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key] !== undefined) el.title = dict[key];
  });

  // Textes HTML (avec balises) : data-i18n-html="key"
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });
}

/** Met à jour l'affichage du sélecteur de langue */
function updateLangSwitcher(lang) {
  const labels = { ewe: '🌍 Eʋe', fr: '🇫🇷 FR', en: '🇬🇧 EN' };
  const btn = document.getElementById('langCurrentBtn');
  if (btn) btn.textContent = labels[lang] || lang.toUpperCase();

  // Cocher l'option active
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('lang-active', opt.dataset.lang === lang);
  });
}

/** Injecte le sélecteur de langue dans la nav */
function injectLangSwitcher() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.getElementById('langSwitcher')) return;

  const switcher = document.createElement('div');
  switcher.id = 'langSwitcher';
  switcher.className = 'lang-switcher';
  switcher.innerHTML = `
    <button id="langCurrentBtn" class="lang-current-btn" aria-label="Changer la langue" title="Choisir la langue">
      🌍 Eʋe
    </button>
    <div class="lang-dropdown" id="langDropdown">
      <button class="lang-option" data-lang="ewe">🌍 Eʋegbe</button>
      <button class="lang-option" data-lang="fr">🇫🇷 Français</button>
      <button class="lang-option" data-lang="en">🇬🇧 English</button>
    </div>
  `;

  // Insérer avant le premier enfant de nav-actions
  navActions.insertBefore(switcher, navActions.firstChild);

  // Toggle dropdown
  document.getElementById('langCurrentBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('langDropdown').classList.toggle('lang-open');
  });

  // Choisir langue
  switcher.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(btn.dataset.lang);
      document.getElementById('langDropdown').classList.remove('lang-open');
    });
  });

  // Fermer en cliquant ailleurs
  document.addEventListener('click', () => {
    const dd = document.getElementById('langDropdown');
    if (dd) dd.classList.remove('lang-open');
  });
}

/** Styles CSS du sélecteur injectés dynamiquement */
function injectLangStyles() {
  if (document.getElementById('lang-switcher-styles')) return;
  const style = document.createElement('style');
  style.id = 'lang-switcher-styles';
  style.textContent = `
    .lang-switcher {
      position: relative;
      display: inline-block;
      margin-right: 0.5rem;
    }
    .lang-current-btn {
      background: rgba(255,255,255,0.15);
      border: 1.5px solid rgba(255,255,255,0.4);
      color: inherit;
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .lang-current-btn:hover {
      background: rgba(255,255,255,0.25);
    }
    .lang-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: #fff;
      border-radius: 0.6rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      overflow: hidden;
      z-index: 9999;
      min-width: 150px;
    }
    .lang-dropdown.lang-open {
      display: block;
      animation: langFadeIn 0.15s ease;
    }
    @keyframes langFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .lang-option {
      display: block;
      width: 100%;
      padding: 0.65rem 1rem;
      text-align: left;
      background: none;
      border: none;
      font-size: 0.9rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: background 0.15s;
    }
    .lang-option:hover {
      background: #f3f4f6;
    }
    .lang-option.lang-active {
      background: #eff6ff;
      color: #1e40af;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
}

/** Initialisation au chargement de la page */
function initI18n() {
  injectLangStyles();
  injectLangSwitcher();
  const lang = getLang();
  applyTranslations(lang);
  updateLangSwitcher(lang);
}

// Lancer après le DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// Export pour usage dans d'autres modules JS
export { getLang, setLang, TRANSLATIONS };
