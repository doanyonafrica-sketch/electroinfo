// api/sitemap.js — Vercel Function pour générer le sitemap dynamique ElectroInfo
// Récupère tous les articles depuis Firestore et génère un sitemap.xml complet

const FIREBASE_PROJECT_ID = 'electroino-app';
const FIREBASE_API_KEY    = 'AIzaSyCuFgzytJXD6jt4HUW9LVSD_VpGuFfcEAk';
const SITE_URL            = 'https://electroinfo.online';

export default async function handler(req, res) {
    try {
        // Fetch tous les articles depuis Firestore
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/articles?key=${FIREBASE_API_KEY}&pageSize=200`;

        const response = await fetch(firestoreUrl);
        const data = await response.json();

        // Pages statiques
        const staticPages = [
            { url: '/',                                changefreq: 'daily',   priority: '1.0' },
            { url: '/articles',                        changefreq: 'daily',   priority: '0.9' },
            { url: '/encyclopedie',                    changefreq: 'daily',   priority: '0.95' },
            { url: '/encyclopedie/resistance',         changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/condensateur',       changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/transistor',         changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/diode',              changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/inductance',         changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/circuit-integre',    changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/tension',            changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/courant',            changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/puissance',          changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/loi-ohm',            changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/protection-diff',    changefreq: 'monthly', priority: '0.85' },
            { url: '/encyclopedie/nf-c-15-100',        changefreq: 'monthly', priority: '0.85' },
            { url: '/courses',                         changefreq: 'weekly',  priority: '0.8' },
            { url: '/about',                           changefreq: 'monthly', priority: '0.6' },
            { url: '/contact',                         changefreq: 'monthly', priority: '0.6' },
            { url: '/mentions-legales',                changefreq: 'yearly',  priority: '0.2' },
            { url: '/privacy',                         changefreq: 'yearly',  priority: '0.2' },
            { url: '/terms',                           changefreq: 'yearly',  priority: '0.2' },
        ];

        // Articles dynamiques depuis Firestore
        const articleEntries = [];
        if (data.documents) {
            for (const doc of data.documents) {
                const f = doc.fields;
                if (!f) continue;

                const slug = f.slug?.stringValue;
                if (!slug) continue;

                // Date de mise à jour
                const updatedAt = f.updatedAt?.timestampValue ||
                                  f.publishedAt?.timestampValue ||
                                  f.createdAt?.timestampValue ||
                                  new Date().toISOString();

                const dateStr = updatedAt.substring(0, 10); // YYYY-MM-DD

                articleEntries.push({
                    url: `/article/${slug}`,
                    lastmod: dateStr,
                    changefreq: 'monthly',
                    priority: '0.8'
                });
            }
        }

        // Générer le XML
        const today = new Date().toISOString().substring(0, 10);

        const staticXml = staticPages.map(p => `
  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

        const articlesXml = articleEntries.map(p => `
  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${articlesXml}
</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(xml);

    } catch (error) {
        console.error('Erreur sitemap function:', error);
        return res.status(500).send('Erreur lors de la génération du sitemap');
    }
}
