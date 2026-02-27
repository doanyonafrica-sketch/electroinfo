const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, 
  auth: {
    user: "", // Ton identifiant SMTP Brevo
    pass: process.env.SMTP_PASSWORD,  // Utilise une variable d'environnement pour la sécurité
  },
});

exports.sendEmail = onDocumentCreated("newsletter_sends/{sendId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;

  const data = snapshot.data();
  const mailOptions = {
    from: '"ElectroInfo" <doanyonafrica@gmail.com>',
    to: data.email,
    subject: data.subject || "Test Newsletter",
    html: data.htmlContent || "<p>Connexion réussie ! Ton système fonctionne.</p>",
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Succès ! Email envoyé !");
    
    return snapshot.ref.update({ 
      status: "sent", 
      sentAt: new Date().toISOString() 
    });
  } catch (error) {
    console.error("❌ Erreur :", error);
    return snapshot.ref.update({ 
      status: "error", 
      error: error.message 
    });
  }
}); // <--- C'est cette accolade qui manquait !