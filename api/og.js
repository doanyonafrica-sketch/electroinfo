// api/og.js — Vercel Function pour meta Open Graph ElectroInfo
// Intercepte /article/[slug] pour les crawlers (Facebook, WhatsApp, Google)
// et retourne un HTML avec les bonnes meta tags + contenu réel pour le SEO

const FIREBASE_PROJECT_ID = 'electroino-app';
const FIREBASE_API_KEY    = 'AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk';
const SITE_URL            = 'https://electroinfo.online';

// User-agents des crawlers connus (pas de redirect pour eux)
const CRAWLER_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot/i;

export default async function handler(req, res) {
    const { slug } = req.query;

    if (!slug) {
        return res.redirect(302, SITE_URL);
    }

    // Détecter si c'est un crawler ou un humain
    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = CRAWLER_UA.test(userAgent);

    // Si c'est un humain (pas un crawler), rediriger directement
    if (!isCrawler) {
        return res.redirect(302, `${SITE_URL}/article-detail.html?slug=${slug}`);
    }

    try {
        // Fetch Firestore REST API
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

        // Valeurs par défaut
        let title       = 'ElectroInfo — Électricité industrielle';
        let description = 'Découvrez nos articles sur l\'électricité industrielle, les normes et les tutoriels pratiques.';
        let image       = `${SITE_URL}/images/logo.png`;
        let content     = '';
        let author      = 'Équipe ElectroInfo';
        let publishedAt = '';
        let tags        = [];
        const canonicalUrl = `${SITE_URL}/article/${slug}`;

        const docData = data?.[0]?.document;
        if (docData?.fields) {
            const f = docData.fields;
            title       = f.title?.stringValue       || title;
            description = f.summary?.stringValue      ||
                          f.description?.stringValue   ||
                          f.excerpt?.stringValue       || description;
            image       = f.image?.stringValue        ||
                          f.coverImage?.stringValue    ||
                          f.imageUrl?.stringValue      || image;
            content     = f.content?.stringValue      || '';
            author      = f.author?.stringValue       || author;
            publishedAt = f.publishedAt?.stringValue  ||
                          f.createdAt?.timestampValue  || '';
            // Tags (array Firestore)
            tags = f.tags?.arrayValue?.values?.map(v => v.stringValue).filter(Boolean) || [];
        }

        // Tronquer la description à 160 caractères (optimal SEO)
        const metaDesc = description.length > 160
            ? description.substring(0, 157) + '...'
            : description;

        // Nettoyer le contenu HTML pour le body (supprimer scripts/styles)
        const cleanContent = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .substring(0, 5000); // Limiter à 5000 chars pour les crawlers

        // Date formatée
        const dateStr = publishedAt
            ? new Date(publishedAt).toLocaleDateString('fr-FR', { year:'numeric', month:'long', day:'numeric' })
            : '';

        // Données structurées JSON-LD pour Google
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": metaDesc,
            "image": image,
            "url": canonicalUrl,
            "author": {
                "@type": "Person",
                "name": author
            },
            "publisher": {
                "@type": "Organization",
                "name": "ElectroInfo",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${SITE_URL}/images/logo.png`
                }
            },
            ...(dateStr && { "datePublished": publishedAt }),
            ...(tags.length > 0 && { "keywords": tags.join(', ') })
        };

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ElectroInfo</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  ${tags.length > 0 ? `<meta name="keywords" content="${escapeHtml(tags.join(', '))}">` : ''}
  <meta name="author" content="${escapeHtml(author)}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:type"         content="article">
  <meta property="og:site_name"    content="ElectroInfo">
  <meta property="og:url"          content="${canonicalUrl}">
  <meta property="og:title"        content="${escapeHtml(title)}">
  <meta property="og:description"  content="${escapeHtml(metaDesc)}">
  <meta property="og:image"        content="${escapeHtml(image)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale"       content="fr_FR">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <meta name="twitter:image"       content="${escapeHtml(image)}">

  <!-- Données structurées JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .tags { margin-top: 1rem; }
    .tag { background: #e8f4ff; color: #1a73e8; padding: 2px 8px; border-radius: 4px; margin-right: 4px; font-size: 0.85rem; }
    img.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 1.5rem; }
    .content { line-height: 1.7; }
    a.cta { display: inline-block; margin-top: 2rem; padding: 10px 20px; background: #1a73e8; color: white; border-radius: 6px; text-decoration: none; }
  </style>
</head>
<body>
  <a href="${SITE_URL}" style="color:#1a73e8;text-decoration:none;">← ElectroInfo</a>

  <h1>${escapeHtml(title)}</h1>

  <div class="meta">
    ${dateStr ? `<span>📅 ${dateStr}</span> · ` : ''}
    <span>✍️ ${escapeHtml(author)}</span>
  </div>

  ${image !== `${SITE_URL}/images/logo.png` ? `<img class="cover" src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : ''}

  <p><strong>${escapeHtml(metaDesc)}</strong></p>

  ${cleanContent ? `<div class="content">${cleanContent}</div>` : ''}

  ${tags.length > 0 ? `<div class="tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}

  <a class="cta" href="${canonicalUrl}">Lire l'article complet sur ElectroInfo →</a>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Erreur OG function:', error);
        return res.redirect(302, `${SITE_URL}/article-detail.html?slug=${slug}`);
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
