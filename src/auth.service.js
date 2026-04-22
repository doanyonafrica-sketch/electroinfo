/**
 * ============================================
 * SERVICE D'AUTHENTIFICATION
 * ============================================
 * 
 * Ce service gère toutes les opérations d'authentification
 * des utilisateurs (login, logout, register, etc.)
 * 
 * @module core/auth.service
 * @author ElectroInfo Team
 * @version 2.0.0
 */

import { getFirebaseAuth, getFirebaseDb, handleFirebaseError } from './firebase.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc,
    getDoc,
    setDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { devLog } from '../config/firebase.config.js';
import { USER_ROLES, COLLECTIONS } from '../config/constants.js';

// ============================================
// VARIABLES PRIVÉES
// ============================================

let _currentUser = null;
let _authStateCallbacks = [];

// ============================================
// CONNEXION
// ============================================

/**
 * Connecte un utilisateur avec email et mot de passe
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - Données utilisateur
 * @throws {Error} - Si la connexion échoue
 */
export async function login(email, password) {
    try {
        devLog('🔐 Tentative de connexion...', { email });
        
        const auth = getFirebaseAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        devLog('✅ Connexion réussie', { uid: user.uid });

        // Charger les données utilisateur depuis Firestore
        const userData = await getUserData(user.uid);

        // Mettre à jour la date de dernière connexion
        await updateLastLogin(user.uid);

        _currentUser = { ...user, ...userData };

        return _currentUser;

    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        throw new Error(handleFirebaseError(error));
    }
}

/**
 * Connecte un utilisateur avec Google
 * @returns {Promise<Object>} - Données utilisateur
 * @throws {Error} - Si la connexion échoue
 */
export async function loginWithGoogle() {
    try {
        devLog('🔐 Tentative de connexion avec Google...');
        
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        devLog('✅ Connexion Google réussie', { uid: user.uid });

        // Vérifier si l'utilisateur existe déjà dans Firestore
        const db = getFirebaseDb();
        const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // Créer le profil utilisateur
            await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                role: USER_ROLES.USER,
                provider: 'google',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            devLog('✅ Profil utilisateur créé');
        } else {
            // Mettre à jour la dernière connexion
            await updateLastLogin(user.uid);
        }

        const userData = await getUserData(user.uid);
        _currentUser = { ...user, ...userData };

        return _currentUser;

    } catch (error) {
        console.error('❌ Erreur connexion Google:', error);
        throw new Error(handleFirebaseError(error));
    }
}

// ============================================
// INSCRIPTION
// ============================================

/**
 * Crée un nouveau compte utilisateur
 * @param {string} email - Email
 * @param {string} password - Mot de passe
 * @param {string} displayName - Nom d'affichage
 * @returns {Promise<Object>} - Données utilisateur
 * @throws {Error} - Si l'inscription échoue
 */
export async function register(email, password, displayName) {
    try {
        devLog('📝 Tentative d\'inscription...', { email, displayName });

        const auth = getFirebaseAuth();
        const db = getFirebaseDb();

        // Créer le compte Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        devLog('✅ Compte Auth créé', { uid: user.uid });

        // Mettre à jour le profil
        await updateProfile(user, { displayName });
        devLog('✅ Profil mis à jour');

        // Créer le document Firestore
        const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
        await setDoc(userDocRef, {
            email,
            displayName,
            photoURL: null,
            role: USER_ROLES.USER,
            provider: 'email',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        devLog('✅ Document Firestore créé');

        const userData = await getUserData(user.uid);
        _currentUser = { ...user, ...userData };

        return _currentUser;

    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        throw new Error(handleFirebaseError(error));
    }
}

// ============================================
// DÉCONNEXION
// ============================================

/**
 * Déconnecte l'utilisateur courant
 * @returns {Promise<void>}
 * @throws {Error} - Si la déconnexion échoue
 */
export async function logout() {
    try {
        devLog('👋 Déconnexion...');

        const auth = getFirebaseAuth();
        await signOut(auth);

        _currentUser = null;

        devLog('✅ Déconnexion réussie');

    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        throw new Error(handleFirebaseError(error));
    }
}

// ============================================
// RÉINITIALISATION MOT DE PASSE
// ============================================

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<void>}
 * @throws {Error} - Si l'envoi échoue
 */
export async function resetPassword(email) {
    try {
        devLog('📧 Envoi email réinitialisation...', { email });

        const auth = getFirebaseAuth();
        await sendPasswordResetEmail(auth, email);

        devLog('✅ Email de réinitialisation envoyé');

    } catch (error) {
        console.error('❌ Erreur réinitialisation:', error);
        throw new Error(handleFirebaseError(error));
    }
}

// ============================================
// GESTION DES DONNÉES UTILISATEUR
// ============================================

/**
 * Récupère les données utilisateur depuis Firestore
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} - Données utilisateur
 * @throws {Error} - Si la récupération échoue
 */
export async function getUserData(userId) {
    try {
        const db = getFirebaseDb();
        const userDocRef = doc(db, COLLECTIONS.USERS, userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            throw new Error('Utilisateur non trouvé dans Firestore');
        }

        return {
            uid: userId,
            ...userDoc.data()
        };

    } catch (error) {
        console.error('❌ Erreur récupération données utilisateur:', error);
        throw error;
    }
}

/**
 * Met à jour la date de dernière connexion
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
    try {
        const db = getFirebaseDb();
        const userDocRef = doc(db, COLLECTIONS.USERS, userId);
        await setDoc(userDocRef, {
            lastLogin: serverTimestamp()
        }, { merge: true });

        devLog('✅ Dernière connexion mise à jour');

    } catch (error) {
        console.error('⚠️ Erreur mise à jour lastLogin:', error);
        // Ne pas bloquer le flow si ça échoue
    }
}

/**
 * Obtient l'utilisateur courant
 * @returns {Object|null} - Utilisateur courant ou null
 */
export function getCurrentUser() {
    const auth = getFirebaseAuth();
    return auth.currentUser;
}

/**
 * Vérifie si un utilisateur est connecté
 * @returns {boolean} - True si connecté
 */
export function isAuthenticated() {
    return getCurrentUser() !== null;
}

/**
 * Vérifie si l'utilisateur courant est admin
 * @returns {Promise<boolean>} - True si admin
 */
export async function isAdmin() {
    try {
        const user = getCurrentUser();
        if (!user) return false;

        const userData = await getUserData(user.uid);
        return userData.role === USER_ROLES.ADMIN;

    } catch (error) {
        console.error('❌ Erreur vérification admin:', error);
        return false;
    }
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * @param {string} requiredRole - Rôle requis
 * @returns {Promise<boolean>} - True si l'utilisateur a le rôle
 */
export async function hasRole(requiredRole) {
    try {
        const user = getCurrentUser();
        if (!user) return false;

        const userData = await getUserData(user.uid);
        return userData.role === requiredRole;

    } catch (error) {
        console.error('❌ Erreur vérification rôle:', error);
        return false;
    }
}

// ============================================
// OBSERVATEUR D'ÉTAT D'AUTHENTIFICATION
// ============================================

/**
 * Écoute les changements d'état d'authentification
 * @param {Function} callback - Fonction appelée lors du changement
 * @returns {Function} - Fonction de désabonnement
 */
export function onAuthChange(callback) {
    const auth = getFirebaseAuth();
    
    // Ajouter le callback à la liste
    _authStateCallbacks.push(callback);

    // Créer l'observateur
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        devLog('🔄 État auth changé', { user: user?.email });

        if (user) {
            try {
                const userData = await getUserData(user.uid);
                _currentUser = { ...user, ...userData };
                callback(_currentUser);
            } catch (error) {
                console.error('Erreur chargement données utilisateur:', error);
                callback(user);
            }
        } else {
            _currentUser = null;
            callback(null);
        }
    });

    // Retourner la fonction de désabonnement
    return () => {
        unsubscribe();
        const index = _authStateCallbacks.indexOf(callback);
        if (index > -1) {
            _authStateCallbacks.splice(index, 1);
        }
    };
}

/**
 * Attend que l'état d'authentification soit chargé
 * @returns {Promise<Object|null>} - Utilisateur ou null
 */
export function waitForAuthReady() {
    return new Promise((resolve) => {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// ============================================
// PROTECTION DES ROUTES
// ============================================

/**
 * Redirige vers la page de connexion si non authentifié
 * @param {string} redirectUrl - URL de redirection après connexion
 */
export function requireAuth(redirectUrl = '/auth.html') {
    const user = getCurrentUser();
    if (!user) {
        // Sauvegarder l'URL actuelle pour redirection après login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = redirectUrl;
    }
}

/**
 * Redirige vers l'accueil si non admin
 * @param {string} redirectUrl - URL de redirection
 */
export async function requireAdmin(redirectUrl = '/index.html') {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
        window.location.href = redirectUrl;
    }
}

/**
 * Redirige vers l'URL sauvegardée après login
 */
export function redirectAfterLogin() {
    const savedUrl = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = savedUrl || '/index.html';
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default {
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    getCurrentUser,
    getUserData,
    isAuthenticated,
    isAdmin,
    hasRole,
    onAuthChange,
    waitForAuthReady,
    requireAuth,
    requireAdmin,
    redirectAfterLogin
};
