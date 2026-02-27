const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configuration SMTP (exemple avec Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'votre-email@gmail.com',
    pass: 'votre-mot-de-passe-app' // Mot de passe d'application
  }
});

// Fonction qui s'exécute quand un document est créé dans newsletter_sends
exports.sendEmail = functions.firestore
  .document('newsletter_sends/{sendId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    const mailOptions = {
      from: 'ElectroInfo <votre-email@gmail.com>',
      to: data.email,
      subject: data.subject,
      html: data.htmlContent
    };

    try {
      await transporter.sendMail(mailOptions);
      // Met à jour le statut en "sent"
      await snap.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Email envoyé à:', data.email);
    } catch (error) {
      console.error('Erreur envoi email:', error);
      await snap.ref.update({ status: 'error', error: error.message });
    }
  });