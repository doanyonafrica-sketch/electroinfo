#!/usr/bin/env node
// ============================================================
// sitemap-generator.js — ElectroInfo
// Génère sitemap-full.xml en lisant toutes les fiches Firestore
//
// USAGE :
//   node sitemap-generator.js
//
// PRÉREQUIS :
//   npm install firebase-admin
//   Placer le fichier serviceAccountKey.json à la racine
//   (téléchargeable depuis Firebase Console > Paramètres > Comptes de service)
//
// RÉSULTAT :
//   Génère sitemap-full.xml à placer à la racine du site
//   Soumettre ensuite dans Google Search Console
// ============================================================

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────
const SITE_URL      = 'https://electroinfo.online';
const OUTPUT_FILE   = path.join(__dirname, 'sitemap-full.xml');
const SERVICE_ACCOUNT = path.join(__dirname, 'serviceAccountKey.json');

// Pages statiques (même contenu que sitemap.xml)
const STATIC_PAGES = [
  { loc: '/',             changefreq: 'daily',   priority: 1.0  },
  { loc: '/articles',     changefreq: 'daily',   priority: 0.9  },
  { loc: '/encyclopedie', changefreq: 'daily',   priority: 0.95 },
  { loc: '/courses',      changefreq: 'weekly',  priority: 0.8  },
  { loc: '/about',        changefreq: 'monthly', priority: 0.6  },
  { loc: '/contact',      changefreq: 'monthly', priority: 0.6  },
  { loc: '/mentions-legales', changefreq: 'yearly', priority: 0.2 },
  { loc: '/privacy',      changefreq: 'yearly',  priority: 0.2  },
  { loc: '/terms',        changefreq: 'yearly',  priority: 0.2  },
];

// ── Initialisation Firebase Admin ────────
let db;
try {
  const serviceAccount = require(SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin initialisé');
} catch(e) {
  console.error('❌ Impossible d\'initialiser Firebase Admin :', e.message);
  console.error('   → Assure-toi que serviceAccountKey.json est présent à la racine');
  process.exit(1);
}

// ── Formater une date ISO en YYYY-MM-DD ──
function toDate(isoStr) {
  try {
    return new Date(isoStr).toISOString().split('T')[0];
  } catch(e) {
    return new Date().toISOString().split('T')[0];
  }
}

// ── Générer une entrée <url> ──────────────
function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${SITE_URL}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

// ── Main ──────────────────────────────────
async function generate() {
  console.log('🔄 Lecture des fiches Firestore…');

  let fiches = [];
  try {
    const snap = await db.collection('encyclopedie').orderBy('title').get();
    fiches = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      // Exclure les fiches brouillon si jamais tu en ajoutes
      .filter(f => !f.draft);
    console.log(`✅ ${fiches.length} fiche(s) trouvée(s)`);
  } catch(e) {
    console.error('❌ Erreur Firestore :', e.message);
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];

  // Construire les entrées
  const staticEntries = STATIC_PAGES.map(p =>
    urlEntry({ ...p, lastmod: today })
  );

  const ficheEntries = fiches.map(f =>
    urlEntry({
      loc:        `/encyclopedie/${f.id}`,
      lastmod:    f.updatedAt ? toDate(f.updatedAt) : today,
      changefreq: 'monthly',
      priority:   0.85,
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ElectroInfo — sitemap-full.xml
  Généré automatiquement le ${today} par sitemap-generator.js
  ${fiches.length} fiches encyclopédie + ${STATIC_PAGES.length} pages statiques
  Total : ${fiches.length + STATIC_PAGES.length} URLs
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${staticEntries.join('\n\n')}

  <!-- ─── FICHES ENCYCLOPÉDIE (${fiches.length}) ─── -->

${ficheEntries.join('\n\n')}

</urlset>`;

  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`✅ Sitemap généré : ${OUTPUT_FILE}`);
  console.log(`   ${STATIC_PAGES.length} pages statiques + ${fiches.length} fiches = ${STATIC_PAGES.length + fiches.length} URLs`);
  console.log(`\n📌 PROCHAINES ÉTAPES :`);
  console.log(`   1. Copier sitemap-full.xml à la racine de ton site GitHub Pages`);
  console.log(`   2. Dans Google Search Console → Sitemaps → Soumettre :`);
  console.log(`      ${SITE_URL}/sitemap-full.xml`);
  console.log(`   3. Re-générer à chaque ajout massif de fiches`);

  process.exit(0);
}

generate();
