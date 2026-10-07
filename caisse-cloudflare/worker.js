// Caisse Maison Reine K — Cloudflare Worker
// Reçoit le panier du site, vérifie les prix, crée la page de paiement Stripe.
//
// À régler dans Cloudflare (Settings > Variables and Secrets) :
//   STRIPE_SECRET_KEY  (Secret)  clé secrète Stripe : sk_test_... pour tester, sk_live_... en réel
//   SITE_URL           (Text)    adresse du site, sans / final. Plusieurs adresses possibles, séparées par des virgules.

// Prix en centimes. C'est ICI que les prix font foi : le site ne peut pas les modifier.
const CATALOGUE = {
  'scrub':                  { nom: 'Scrub',                           prix: 1900 },
  'leave-in':               { nom: 'Leave-in Kéra-Monoï',             prix: 2200 },
  'serum-elixir':           { nom: 'Sérum Élixir',                    prix: 2400 },
  'kit-lissage':            { nom: 'Kit de lissage Chrono Liss',      prix: 3900 },
  'curl-therapy-macadamia': { nom: 'Curl Therapy Macadamia',          prix: 4200 },
  'curl-therapy-figue':     { nom: 'Curl Therapy Figue de barbarie',  prix: 4200 },
};
// Mèches RAW : lot de 2 bundles, par longueur (pouces)
const BUNDLES = { 10:150, 12:170, 14:190, 16:210, 18:230, 20:250, 22:350, 24:370, 26:390, 28:430, 30:470 };
for (const [l, euros] of Object.entries(BUNDLES)) {
  CATALOGUE['bundle-' + l] = { nom: `Mèches RAW · lot de 2 bundles ${l}″`, prix: euros * 100 };
}

// Pays où la livraison est proposée (codes ISO)
const PAYS_LIVRAISON = [
  // Union européenne
  'FR','DE','AT','BE','BG','CY','HR','DK','ES','EE','FI','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','CZ','RO','SK','SI','SE',
  // Reste de l'Europe
  'MC','CH','GB','NO','IS','LI',
  // Amérique du Nord
  'US','CA',
];

export default {
  async fetch(request, env) {
    // SITE_URL peut contenir plusieurs adresses séparées par des virgules : on retient celle d'où vient la demande.
    const sites = (env.SITE_URL || '').split(',').map(x => x.trim().replace(/\/$/, '')).filter(Boolean);
    const origine = request.headers.get('Origin') || '';
    const site = sites.find(x => new URL(x).origin === origine) || sites[0] || '';
    const origineSite = site ? new URL(site).origin : '*';
    const cors = {
      'Access-Control-Allow-Origin': origineSite,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const repondre = (corps, statut = 200) =>
      new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return repondre({ erreur: 'Méthode non autorisée' }, 405);
    if (!env.STRIPE_SECRET_KEY || !site) return repondre({ erreur: 'Caisse non configurée' }, 500);

    let articles;
    try { ({ articles } = await request.json()); } catch { return repondre({ erreur: 'Panier illisible' }, 400); }
    if (!Array.isArray(articles) || !articles.length || articles.length > 30) return repondre({ erreur: 'Panier vide' }, 400);

    // Construction de la commande à partir du catalogue (jamais des prix envoyés par le site)
    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('locale', 'fr');
    f.set('success_url', site + '/boutique.html?commande=ok');
    f.set('cancel_url', site + '/boutique.html?commande=annulee');
    f.set('phone_number_collection[enabled]', 'true');
    PAYS_LIVRAISON.forEach((p, i) => f.set(`shipping_address_collection[allowed_countries][${i}]`, p));

    let i = 0;
    for (const a of articles) {
      const produit = CATALOGUE[a.id];
      const q = Math.floor(Number(a.q));
      if (!produit) return repondre({ erreur: 'Produit inconnu : ' + a.id }, 400);
      if (!(q >= 1 && q <= 20)) return repondre({ erreur: 'Quantité invalide' }, 400);
      f.set(`line_items[${i}][quantity]`, String(q));
      f.set(`line_items[${i}][price_data][currency]`, 'eur');
      f.set(`line_items[${i}][price_data][unit_amount]`, String(produit.prix));
      f.set(`line_items[${i}][price_data][product_data][name]`, produit.nom);
      i++;
    }

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f,
    });
    const session = await r.json();
    if (!r.ok) return repondre({ erreur: session.error?.message || 'Stripe a refusé la commande' }, 502);
    return repondre({ url: session.url });
  },
};
