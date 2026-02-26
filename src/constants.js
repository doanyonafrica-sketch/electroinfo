/**
 * ============================================
 * CONSTANTES GLOBALES DU PROJET
 * ============================================
 * 
 * Ce fichier centralise toutes les constantes utilisées
 * dans l'application pour faciliter la maintenance.
 * 
 * @module config/constants
 * @author ElectroInfo Team
 * @version 2.0.0
 */

// ============================================
// COLLECTIONS FIRESTORE
// ============================================

/**
 * Noms des collections Firestore
 * @constant {Object}
 */
export const COLLECTIONS = {
    USERS: 'users',
    ARTICLES: 'articles',
    COURSES: 'courses',
    COMMENTS: 'comments',
    NEWSLETTER: 'newsletter',
    REACTIONS: 'reactions',
    STATS: 'stats'
};

// ============================================
// RÔLES UTILISATEURS
// ============================================

/**
 * Rôles disponibles dans l'application
 * @constant {Object}
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest'
};

// ============================================
// STATUTS D'ARTICLES
// ============================================

/**
 * Statuts possibles pour un article
 * @constant {Object}
 */
export const ARTICLE_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    SCHEDULED: 'scheduled',
    ARCHIVED: 'archived'
};

/**
 * Labels des statuts d'articles
 * @constant {Object}
 */
export const ARTICLE_STATUS_LABELS = {
    [ARTICLE_STATUS.DRAFT]: 'Brouillon',
    [ARTICLE_STATUS.PUBLISHED]: 'Publié',
    [ARTICLE_STATUS.SCHEDULED]: 'Programmé',
    [ARTICLE_STATUS.ARCHIVED]: 'Archivé'
};

// ============================================
// CATÉGORIES D'ARTICLES
// ============================================

/**
 * Catégories d'articles disponibles
 * @constant {Object}
 */
export const ARTICLE_CATEGORIES = {
    INNOVATION: 'INNOVATION',
    SECURITY: 'SÉCURITÉ',
    NEWS: 'NOUVEAUTÉ',
    TUTORIAL: 'TUTO',
    DOMOTICS: 'DOMOTIQUE'
   
};
/**
 * Configuration des catégories avec couleurs et icônes
 * @constant {Object}
 */
export const CATEGORY_CONFIG = {
    [ARTICLE_CATEGORIES.INNOVATION]: {
        label: 'Innovation',
        color: '#3b82f6',
        icon: 'fa-lightbulb',
        class: 'category-innovation'
    },
    [ARTICLE_CATEGORIES.SECURITY]: {
        label: 'Sécurité',
        color: '#dc2626',
        icon: 'fa-shield-alt',
        class: 'category-security'
    },
    [ARTICLE_CATEGORIES.NEWS]: {
        label: 'Nouveauté',
        color: '#10b981',
        icon: 'fa-star',
        class: 'category-news'
    },
    [ARTICLE_CATEGORIES.TUTORIAL]: {
        label: 'Tutoriel',
        color: '#f59e0b',
        icon: 'fa-graduation-cap',
        class: 'category-tutorial'
    },
    [ARTICLE_CATEGORIES.DOMOTICS]: {
        label: 'Domotique',
        color: '#8b5cf6',
        icon: 'fa-home',
        class: 'category-domotics'
    }
};

// ============================================
// TYPES DE RÉACTIONS
// ============================================

/**
 * Types de réactions disponibles
 * @constant {Object}
 */
export const REACTION_TYPES = {
    LIKE: 'like',
    LOVE: 'love',
    INSIGHT: 'insight',
    SUPPORT: 'support'
};

/**
 * Configuration des réactions
 * @constant {Object}
 */
export const REACTION_CONFIG = {
    [REACTION_TYPES.LIKE]: {
        label: 'J\'aime',
        icon: 'fa-thumbs-up',
        color: '#3b82f6'
    },
    [REACTION_TYPES.LOVE]: {
        label: 'Adore',
        icon: 'fa-heart',
        color: '#dc2626'
    },
    [REACTION_TYPES.INSIGHT]: {
        label: 'Instructif',
        icon: 'fa-lightbulb',
        color: '#f59e0b'
    },
    [REACTION_TYPES.SUPPORT]: {
        label: 'Soutien',
        icon: 'fa-hands-helping',
        color: '#10b981'
    }
};

// ============================================
// DIPLÔMES ET NIVEAUX
// ============================================

/**
 * Diplômes disponibles pour les cours
 * @constant {Object}
 */
export const DIPLOMAS = {
    BAC_PRO: 'BAC PRO',
    BEP: 'BEP',
    CAP: 'CAP',
    BTS: 'BTS',
    LICENSE: 'LICENCE'
};

/**
 * Niveaux de difficulté des cours
 * @constant {Object}
 */
export const COURSE_LEVELS = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé'
};

/**
 * Configuration des diplômes
 * @constant {Object}
 */
export const DIPLOMA_CONFIG = {
    [DIPLOMAS.BAC_PRO]: {
        label: 'BAC PRO',
        icon: 'fa-certificate',
        color: '#1e40af',
        order: 1
    },
    [DIPLOMAS.BEP]: {
        label: 'BEP',
        icon: 'fa-award',
        color: '#7c3aed',
        order: 2
    },
    [DIPLOMAS.CAP]: {
        label: 'CAP',
        icon: 'fa-medal',
        color: '#065f46',
        order: 3
    },
    [DIPLOMAS.BTS]: {
        label: 'BTS',
        icon: 'fa-user-graduate',
        color: '#b45309',
        order: 4
    },
    [DIPLOMAS.LICENSE]: {
        label: 'Licence',
        icon: 'fa-graduation-cap',
        color: '#9f1239',
        order: 5
    }
};

// ============================================
// PAGINATION
// ============================================

/**
 * Configuration de la pagination
 * @constant {Object}
 */
export const PAGINATION = {
    ARTICLES_PER_PAGE: 9,
    COURSES_PER_PAGE: 12,
    COMMENTS_PER_PAGE: 10,
    ADMIN_ITEMS_PER_PAGE: 10,
    MAX_PAGE_BUTTONS: 5
};

// ============================================
// FICHIERS ET UPLOADS
// ============================================

/**
 * Tailles maximales de fichiers (en bytes)
 * @constant {Object}
 */
export const MAX_FILE_SIZE = {
    IMAGE: 5 * 1024 * 1024,      // 5 MB
    PDF: 50 * 1024 * 1024,       // 50 MB
    AVATAR: 2 * 1024 * 1024,     // 2 MB
    TEMP: 10 * 1024 * 1024       // 10 MB
};

/**
 * Types MIME autorisés
 * @constant {Object}
 */
export const ALLOWED_MIME_TYPES = {
    IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    PDF: ['application/pdf'],
    ALL_IMAGES: 'image/*'
};

/**
 * Extensions de fichiers autorisées
 * @constant {Object}
 */
export const ALLOWED_EXTENSIONS = {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    PDF: ['.pdf']
};

// ============================================
// VALIDATION
// ============================================

/**
 * Règles de validation
 * @constant {Object}
 */
export const VALIDATION = {
    // Texte
    MIN_TITLE_LENGTH: 5,
    MAX_TITLE_LENGTH: 200,
    MIN_CONTENT_LENGTH: 50,
    MAX_CONTENT_LENGTH: 50000,
    MIN_SUMMARY_LENGTH: 20,
    MAX_SUMMARY_LENGTH: 300,
    
    // Commentaires
    MIN_COMMENT_LENGTH: 3,
    MAX_COMMENT_LENGTH: 2000,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    
    // Email
    EMAIL_REGEX: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // Mot de passe
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 128,
    
    // Slug
    SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    MAX_SLUG_LENGTH: 100,
    
    // Tags
    MIN_TAGS: 0,
    MAX_TAGS: 10,
    MAX_TAG_LENGTH: 30
};

// ============================================
// MESSAGES
// ============================================

/**
 * Messages d'erreur
 * @constant {Object}
 */
export const ERROR_MESSAGES = {
    // Auth
    'auth/email-already-in-use': 'Cet email est déjà utilisé',
    'auth/invalid-email': 'Email invalide',
    'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères)',
    'auth/user-not-found': 'Utilisateur non trouvé',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
    
    // Firestore
    'permission-denied': 'Permission refusée',
    'not-found': 'Ressource non trouvée',
    'already-exists': 'Cette ressource existe déjà',
    
    // Validation
    'invalid-title': 'Titre invalide',
    'invalid-email': 'Email invalide',
    'invalid-content': 'Contenu invalide',
    'file-too-large': 'Fichier trop volumineux',
    'invalid-file-type': 'Type de fichier non autorisé',
    
    // Général
    'network-error': 'Erreur réseau. Vérifiez votre connexion',
    'unknown-error': 'Une erreur est survenue'
};

/**
 * Messages de succès
 * @constant {Object}
 */
export const SUCCESS_MESSAGES = {
    ARTICLE_CREATED: 'Article créé avec succès',
    ARTICLE_UPDATED: 'Article mis à jour',
    ARTICLE_DELETED: 'Article supprimé',
    ARTICLE_PUBLISHED: 'Article publié',
    
    COURSE_CREATED: 'Cours créé avec succès',
    COURSE_UPDATED: 'Cours mis à jour',
    COURSE_DELETED: 'Cours supprimé',
    
    COMMENT_POSTED: 'Commentaire publié',
    COMMENT_DELETED: 'Commentaire supprimé',
    
    NEWSLETTER_SUBSCRIBED: 'Inscription à la newsletter réussie',
    
    LOGIN_SUCCESS: 'Connexion réussie',
    LOGOUT_SUCCESS: 'Déconnexion réussie',
    REGISTER_SUCCESS: 'Compte créé avec succès',
    
    FILE_UPLOADED: 'Fichier uploadé avec succès',
    
    SETTINGS_SAVED: 'Paramètres enregistrés'
};

// ============================================
// URLS ET ROUTES
// ============================================

/**
 * Routes de l'application
 * @constant {Object}
 */
export const ROUTES = {
    HOME: '/',
    ARTICLES: '/articles.html',
    ARTICLE_DETAIL: '/article-detail.html',
    COURSES: '/courses.html',
    COURSE_DETAIL: '/course-detail.html',
    SESSION_DETAIL: '/session-detail.html',
    ARCHIVES: '/archives.html',
    ABOUT: '/about.html',
    CONTACT: '/contact.html',
    AUTH: '/auth.html',
    ADMIN: '/admin.html',
    ADMIN_COURSES: '/admin-courses.html',
    ADMIN_CREATE: '/admin_créer.html',
    MENTIONS: '/mentions-legales.html'
};

/**
 * URLs des API externes
 * @constant {Object}
 */
export const EXTERNAL_URLS = {
    UNSPLASH_RANDOM: 'https://source.unsplash.com/random/800x600/?electricity',
    PLACEHOLDER_IMAGE: 'https://via.placeholder.com/800x600/1e40af/ffffff?text=ElectroInfo',
    UI_AVATARS: 'https://ui-avatars.com/api/'
};

// ============================================
// TIMERS ET DÉLAIS
// ============================================

/**
 * Durées en millisecondes
 * @constant {Object}
 */
export const DURATIONS = {
    NOTIFICATION: 3000,
    DEBOUNCE_SEARCH: 300,
    LOADING_MIN: 500,
    MODAL_ANIMATION: 300,
    TOAST_DURATION: 5000,
    AUTO_SAVE: 30000,
    SESSION_CHECK: 60000
};

// ============================================
// CACHE
// ============================================

/**
 * Configuration du cache
 * @constant {Object}
 */
export const CACHE = {
    ARTICLES_TTL: 5 * 60 * 1000,        // 5 minutes
    COURSES_TTL: 10 * 60 * 1000,        // 10 minutes
    USER_TTL: 15 * 60 * 1000,           // 15 minutes
    STATS_TTL: 60 * 60 * 1000,          // 1 heure
    ENABLE_CACHE: true
};

// ============================================
// FORMATAGE
// ============================================

/**
 * Options de formatage des dates
 * @constant {Object}
 */
export const DATE_FORMAT_OPTIONS = {
    SHORT: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    },
    LONG: {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    },
    FULL: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    },
    TIME_ONLY: {
        hour: '2-digit',
        minute: '2-digit'
    }
};

/**
 * Locale pour le formatage
 * @constant {string}
 */
export const LOCALE = 'fr-FR';

// ============================================
// SEO
// ============================================

/**
 * Configuration SEO
 * @constant {Object}
 */
export const SEO = {
    SITE_NAME: 'ElectroInfo',
    SITE_DESCRIPTION: 'Plateforme éducative en électricité et électronique industrielle',
    SITE_URL: 'https://electroinfo.online',
    DEFAULT_IMAGE: '/assets/images/logo.png',
    TWITTER_HANDLE: '@electroinfo',
    FACEBOOK_APP_ID: '',
    THEME_COLOR: '#1e40af',
    DEFAULT_KEYWORDS: ['électricité', 'électronique', 'formation', 'cours', 'tutoriels']
};

// ============================================
// ANALYTICS
// ============================================

/**
 * Events Google Analytics
 * @constant {Object}
 */
export const ANALYTICS_EVENTS = {
    PAGE_VIEW: 'page_view',
    ARTICLE_VIEW: 'article_view',
    COURSE_VIEW: 'course_view',
    DOWNLOAD_PDF: 'download_pdf',
    NEWSLETTER_SUBSCRIBE: 'newsletter_subscribe',
    COMMENT_POST: 'comment_post',
    REACTION_ADD: 'reaction_add',
    SEARCH: 'search',
    SHARE: 'share'
};

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

/**
 * Configuration globale exportée
 * @constant {Object}
 */
export default {
    COLLECTIONS,
    USER_ROLES,
    ARTICLE_STATUS,
    ARTICLE_STATUS_LABELS,
    ARTICLE_CATEGORIES,
    CATEGORY_CONFIG,
    REACTION_TYPES,
    REACTION_CONFIG,
    DIPLOMAS,
    COURSE_LEVELS,
    DIPLOMA_CONFIG,
    PAGINATION,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    VALIDATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    ROUTES,
    EXTERNAL_URLS,
    DURATIONS,
    CACHE,
    DATE_FORMAT_OPTIONS,
    LOCALE,
    SEO,
    ANALYTICS_EVENTS
};
