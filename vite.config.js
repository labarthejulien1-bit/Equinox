import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Le numéro de version (affiché dans les réglages) vient de package.json.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base: './' → tous les chemins sont relatifs. Le même build fonctionne ainsi
// sur GitHub Pages (dans un sous-dossier) et dans l'application Android (Capacitor).
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  define: { 'import.meta.env.VITE_VERSION': JSON.stringify(version) },
});
