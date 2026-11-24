import { defineConfig } from 'vite';

// base: './' → tous les chemins sont relatifs. Le même build fonctionne ainsi
// sur GitHub Pages (dans un sous-dossier) et dans l'application Android (Capacitor).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
