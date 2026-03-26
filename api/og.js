// api/og.js — Vercel Function pour meta Open Graph ElectroInfo
// Intercepte /article/[slug] pour les crawlers (Facebook, WhatsApp, Google)
// et retourne un HTML avec les bonnes meta tags + redirect vers le vrai site

const FIREBASE_PROJECT_ID = 'electroino-app';
const FIREBASE_API_KEY    = 'AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk';
const SITE_URL            = 'https://electroinfo.online';

export default async function handler(req, res) {
    // Extraire le slug depuis l'URL : /article/mon-slug
    const { slug } = req.query;

    if (!slug) {
        return res.redirect(302, SITE_URL);
    }

    try {
        // Fetch Firestore REST API (pas besoin du SDK côté serveur)
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;

        const body = {
            structuredQuery: {
                from: [{ collectionId: 'articles' }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'slug' },
                        op: 'EQUAL',
                        value: { stringValue: slug }
                    }
                },
                limit: 1
            }
        };

        const response = await fetch(firestoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        // Extraire les données de l'article
        let title       = 'ElectroInfo — Électricité industrielle';
        let description = 'Découvrez nos articles sur l\'électricité industrielle, les normes et les tutoriels pratiques.';
        let image       = `${SITE_URL}/images/logo.png`;
        let canonicalUrl = `${SITE_URL}/article/${slug}`;

        const doc = data?.[0]?.document;
        if (doc?.fields) {
            const f = doc.fields;
            title       = f.title?.stringValue       || title;
            description = f.summary?.stringValue      ||
                          f.description?.stringValue   ||
                          f.excerpt?.stringValue       || description;
            image       = f.image?.stringValue        ||
                          f.coverImage?.stringValue    ||
                          f.imageUrl?.stringValue      || image;
        }

        // Tronquer la description à 200 caractères
        if (description.length > 200) {
            description = description.substring(0, 197) + '...';
        }

        // Générer le HTML avec meta OG + redirect immédiat vers GitHub Pages
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph -->
  <meta property="og:type"        content="article">
  <meta property="og:site_name"   content="ElectroInfo">
  <meta property="og:url"         content="${canonicalUrl}">
  <meta property="og:title"       content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image"       content="${escapeHtml(image)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale"      content="fr_FR">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image"       content="${escapeHtml(image)}">

  <!-- Redirect vers GitHub Pages pour les vrais utilisateurs -->
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}">
  <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
  <p>Redirection vers <a href="${canonicalUrl}">${escapeHtml(title)}</a>…</p>
  <script>window.location.replace("${canonicalUrl}");</script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Cache 1 heure pour les crawlers
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Erreur OG function:', error);
        return res.redirect(302, `${SITE_URL}/article/${slug}`);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
