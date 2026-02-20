/**
 * ============================================
 * MODULE FIREBASE CORE - INITIALISATION
 * ============================================
 * 
 * Ce module centralise l'initialisation de Firebase
 * et expose les instances des services Firebase.
 * 
 * @module core/firebase
 * @author ElectroInfo Team
 * @version 2.0.0
 */

import { firebaseConfig, ENV, devLog } from '../config/firebase.config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============================================
// INITIALISATION FIREBASE
// ============================================

/**
 * Instance de l'application Firebase
 * @type {FirebaseApp}
 */
let firebaseApp = null;

/**
 * Instance du service d'authentification
 * @type {Auth}
 */
let auth = null;

/**
 * Instance du service Firestore
 * @type {Firestore}
 */
let db = null;

/**
 * Instance du service Storage
 * @type {Storage}
 */
let storage = null;

/**
 * Indicateur d'initialisation
 * @type {boolean}
 */
let isInitialized = false;

/**
 * Initialise Firebase et tous ses services
 * @returns {Promise<Object>} - Les instances des services Firebase
 * @throws {Error} - Si l'initialisation échoue
 */
export async function initializeFirebase() {
    if (isInitialized) {
        devLog('Firebase déjà initialisé, retour des instances existantes');
        return { app: firebaseApp, auth, db, storage };
    }

    try {
        devLog('🔥 Initialisation de Firebase...');

        // Initialiser l'application Firebase
        firebaseApp = initializeApp(firebaseConfig);
        devLog('✅ Application Firebase initialisée', { projectId: firebaseConfig.projectId });

        // Initialiser les services
        auth = getAuth(firebaseApp);
        devLog('✅ Service Auth initialisé');

        db = getFirestore(firebaseApp);
        devLog('✅ Service Firestore initialisé');

        storage = getStorage(firebaseApp);
        devLog('✅ Service Storage initialisé');

        // Activer la persistance Firestore (optionnel)
        if (ENV.isProduction) {
            try {
                await enableIndexedDbPersistence(db);
                devLog('✅ Persistance Firestore activée');
            } catch (error) {
                if (error.code === 'failed-precondition') {
                    devLog('⚠️ Persistance désactivée : plusieurs onglets ouverts');
                } else if (error.code === 'unimplemented') {
                    devLog('⚠️ Persistance non supportée par ce navigateur');
                } else {
                    console.warn('Erreur activation persistance:', error);
                }
            }
        }

        isInitialized = true;
        devLog('🎉 Firebase entièrement initialisé');

        return { app: firebaseApp, auth, db, storage };

    } catch (error) {
        console.error('❌ Erreur initialisation Firebase:', error);
        throw new Error(`Échec initialisation Firebase: ${error.message}`);
    }
}

/**
 * Obtient l'instance de l'application Firebase
 * @returns {FirebaseApp} - Instance Firebase App
 * @throws {Error} - Si Firebase n'est pas initialisé
 */
export function getFirebaseApp() {
    if (!isInitialized || !firebaseApp) {
        throw new Error('Firebase n\'est pas initialisé. Appelez initializeFirebase() d\'abord.');
    }
    return firebaseApp;
}

/**
 * Obtient l'instance du service d'authentification
 * @returns {Auth} - Instance Firebase Auth
 * @throws {Error} - Si Firebase n'est pas initialisé
 */
export function getFirebaseAuth() {
    if (!isInitialized || !auth) {
        throw new Error('Firebase Auth n\'est pas initialisé. Appelez initializeFirebase() d\'abord.');
    }
    return auth;
}

/**
 * Obtient l'instance du service Firestore
 * @returns {Firestore} - Instance Firestore
 * @throws {Error} - Si Firebase n'est pas initialisé
 */
export function getFirebaseDb() {
    if (!isInitialized || !db) {
        throw new Error('Firestore n\'est pas initialisé. Appelez initializeFirebase() d\'abord.');
    }
    return db;
}

/**
 * Obtient l'instance du service Storage
 * @returns {Storage} - Instance Firebase Storage
 * @throws {Error} - Si Firebase n'est pas initialisé
 */
export function getFirebaseStorage() {
    if (!isInitialized || !storage) {
        throw new Error('Firebase Storage n\'est pas initialisé. Appelez initializeFirebase() d\'abord.');
    }
    return storage;
}

/**
 * Vérifie si Firebase est initialisé
 * @returns {boolean} - True si initialisé
 */
export function isFirebaseInitialized() {
    return isInitialized;
}

/**
 * Réinitialise Firebase (utile pour les tests)
 * ⚠️ À utiliser avec précaution
 */
export function resetFirebase() {
    if (ENV.isDevelopment) {
        firebaseApp = null;
        auth = null;
        db = null;
        storage = null;
        isInitialized = false;
        devLog('🔄 Firebase réinitialisé');
    } else {
        console.warn('Reset Firebase non autorisé en production');
    }
}

// ============================================
// GESTION DES ERREURS FIREBASE
// ============================================

/**
 * Gère les erreurs Firebase et retourne un message lisible
 * @param {Error} error - Erreur Firebase
 * @returns {string} - Message d'erreur traduit
 */
export function handleFirebaseError(error) {
    const errorMessages = {
        // Auth errors
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères)',
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion',
        
        // Firestore errors
        'permission-denied': 'Permission refusée',
        'not-found': 'Ressource non trouvée',
        'already-exists': 'Cette ressource existe déjà',
        'cancelled': 'Opération annulée',
        'unavailable': 'Service temporairement indisponible',
        
        // Storage errors
        'storage/unauthorized': 'Non autorisé',
        'storage/canceled': 'Upload annulé',
        'storage/unknown': 'Erreur inconnue',
        'storage/object-not-found': 'Fichier non trouvé',
        'storage/quota-exceeded': 'Quota de stockage dépassé',
        'storage/unauthenticated': 'Authentification requise'
    };

    const errorCode = error.code || 'unknown-error';
    const message = errorMessages[errorCode] || error.message || 'Une erreur est survenue';

    // Logger l'erreur en développement
    if (ENV.isDevelopment) {
        console.error('🔴 Firebase Error:', {
            code: errorCode,
            message: error.message,
            stack: error.stack
        });
    }

    return message;
}

/**
 * Vérifie la connectivité Firebase
 * @returns {Promise<boolean>} - True si connecté
 */
export async function checkFirebaseConnection() {
    try {
        if (!isInitialized) {
            await initializeFirebase();
        }

        // Test simple : récupérer l'utilisateur courant
        const currentUser = auth.currentUser;
        devLog('✅ Connexion Firebase OK', { userConnected: !!currentUser });
        return true;

    } catch (error) {
        console.error('❌ Erreur connexion Firebase:', error);
        return false;
    }
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
    initializeFirebase,
    getFirebaseApp,
    getFirebaseAuth,
    getFirebaseDb,
    getFirebaseStorage,
    isFirebaseInitialized,
    resetFirebase,
    handleFirebaseError,
    checkFirebaseConnection
};
