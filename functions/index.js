const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, 
  auth: {
    user: "a30448001@smtp-brevo.com", // Ton identifiant SMTP Brevo
    pass: "xsmtpsib-83b9827065ed194a1be54ace1908d0249eb096a3d51e7a694978d5c20b9bf49d-FAvRzMeeVJJUoLlt",    // REMPLACE par ta clé générée sur Brevo
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