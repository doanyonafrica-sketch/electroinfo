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
      // Plugin personnalisé : intercepte /article/slug → article-detail.html
      name: 'article-slug-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Si l'URL commence par /article/ et n'est pas un fichier statique
          if (req.url.startsWith('/article/') && !req.url.includes('.')) {
            req.url = '/article-detail.html';
          }
          next();
        });
      }
    }
  ]
})