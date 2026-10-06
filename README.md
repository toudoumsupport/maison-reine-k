# Maison Reine K — site + panier

Site statique (HTML, CSS, JS) avec panier et paiement par carte via Stripe.

- `index.html` (accueil), `boutique.html`, `cgv.html`, `livraison-retours.html`, `mentions-legales.html`, `confidentialite.html` : les pages.
- `css/style.css`, `js/site.js`, `img/` : style, panier et images, communs à toutes les pages.
  Le tout s'héberge tel quel sur GitHub Pages.
- `caisse-cloudflare/worker.js` : la caisse. Ce fichier ne tourne PAS sur GitHub : il se colle dans un Cloudflare Worker.

Sans caisse configurée, le site est en mode démonstration : le panier marche, le paiement est simulé.

## 1. Mettre le site sur GitHub Pages

1. Créer un dépôt GitHub et y déposer tout le contenu de ce dossier.
2. Dans le dépôt : Settings > Pages > Source : `main`, dossier `/ (root)`.
3. Le site est en ligne à `https://MONCOMPTE.github.io/NOM-DU-DEPOT`.

## 2. Installer la caisse sur Cloudflare (gratuit)

1. Créer un compte sur cloudflare.com.
2. Workers & Pages > Create > Worker. Lui donner un nom (ex. `caisse-reine-k`), puis Deploy.
3. Edit code : remplacer tout le contenu par celui de `caisse-cloudflare/worker.js`, puis Deploy.
4. Settings > Variables and Secrets, ajouter :
   - `STRIPE_SECRET_KEY` (type **Secret**) : la clé secrète Stripe. `sk_test_...` pour tester.
   - `SITE_URL` (type Text) : l'adresse du site, sans `/` final.
5. Noter l'adresse du Worker : `https://caisse-reine-k.MONCOMPTE.workers.dev`.

## 3. Relier le site à la caisse

Dans `js/site.js`, chercher `const CAISSE_URL = '';` et y coller l'adresse du Worker. Pousser sur GitHub.

## 4. Tester sans argent réel

Avec une clé `sk_test_...`, payer avec la carte de test Stripe `4242 4242 4242 4242`,
une date future et n'importe quel CVC. La commande apparaît dans le tableau de bord Stripe, en mode test.

## Changer un prix

Le prix est à modifier à DEUX endroits :
- dans `boutique.html` et `js/site.js` (ce que le client voit) ;
- dans `caisse-cloudflare/worker.js`, bloc `CATALOGUE` ou `BUNDLES` (ce qui est réellement encaissé), puis redéployer le Worker.

C'est le prix de la caisse qui fait foi.

## Sécurité

La clé secrète Stripe ne doit JAMAIS apparaître dans ce dépôt. Elle vit uniquement dans les secrets Cloudflare.

## Pages légales

Les passages surlignés en jaune (`[raison sociale]`, `[SIREN]`…) sont à compléter avec les informations de la société.
Ces textes sont des modèles : à faire relire par un professionnel du droit avant d'ouvrir la vente.
