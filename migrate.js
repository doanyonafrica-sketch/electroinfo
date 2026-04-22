const admin = require('firebase-admin');

const ancienneApp = admin.initializeApp({
  credential: admin.credential.cert(require('./ancienne-cle.json'))
}, 'ancienne');

const nouvelleApp = admin.initializeApp({
  credential: admin.credential.cert(require('./nouvelle-cle.json'))
}, 'nouvelle');

const oldDb = ancienneApp.firestore();
const newDb = nouvelleApp.firestore();

// Les noms exacts que nous avons trouvés dans votre base
const collections = ['admins', 'articles', 'courses', 'newsletter', 'users'];

async function migrer() {
  for (const col of collections) {
    console.log(`Migration de : ${col}...`);
    const snap = await oldDb.collection(col).get();
    const batch = newDb.batch();
    snap.forEach(doc => {
      batch.set(newDb.collection(col).doc(doc.id), doc.data());
    });
    await batch.commit();
    console.log(`✅ ${col} migré !`);
  }
  console.log('Terminé ! Vos articles sont maintenant sur electroino-app.');
}

migrer().catch(console.error);