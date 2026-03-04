import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',

  server: {
    fs: {
      allow: ['.']
    }
  },

  plugins: [
    {
      name: 'clean-urls-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url.split('?')[0].split('#')[0];

          // Bloquer la redirection automatique / → /index.html
          if (req.url === '/index.html') {
            res.writeHead(301, { Location: '/' });
            res.end();
            return;
          }

          // /article/<slug> → article-detail.html
          if (req.url.startsWith('/article/') && !req.url.includes('.')) {
            req.url = '/article-detail.html';
            return next();
          }

          // /course/<slug> → course-detail.html
          if (req.url.startsWith('/course/') && !req.url.includes('.')) {
            req.url = '/course-detail.html';
            return next();
          }

          // Toutes les autres pages sans extension : /about → /about.html
          if (!url.includes('.') && url !== '/' && url !== '') {
            const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            req.url = url + '.html' + query;
          }

          next();
        });
      }
    }
  ]
})