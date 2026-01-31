import Link from "next/link";

import type { TocItem } from "@/components/ToolToc";

export const pipiadsToc: TocItem[] = [
  { id: "pipiads-definition", label: "C’est quoi Pipiads ?" },
  { id: "pipiads-use-cases", label: "À quoi ça sert (concret)" },
  { id: "pipiads-features", label: "Fonctionnalités clés" },
  { id: "pipiads-method", label: "Méthode rapide (produit gagnant)" },
  { id: "pipiads-creatives", label: "Analyser une créa TikTok qui convertit" },
  { id: "pipiads-pricing", label: "Prix & bundles" },
  { id: "pipiads-limits", label: "Limites & pièges" },
  { id: "pipiads-alternatives", label: "Alternatives" },
  { id: "faq", label: "FAQ" },
];

export const pipiadsFaq = [
  {
    q: "Pipiads est-il fiable pour trouver des produits gagnants ?",
    a: "Oui, si tu filtres par durée de diffusion (ads actives depuis 7–14 jours) et que tu valides avec une seconde source (ex: data TikTok Shop).",
  },
  {
    q: "Pipiads marche pour autre chose que TikTok ?",
    a: "Le cœur de valeur est TikTok Ads. Vérifie les sources exactes disponibles dans ton plan, mais pour du multi-plateforme, Minea est souvent plus adapté.",
  },
  {
    q: "Quelle métrique regarder en priorité ?",
    a: "La longévité (durée de diffusion) + la répétition d’une créa. Les likes/partages peuvent être trompeurs (viral ≠ rentable).",
  },
  {
    q: "Comment éviter de copier une pub à l’identique ?",
    a: "Copie le “pourquoi ça marche” (hook, angle, preuve, structure), puis recrée une version avec ton offre, ton script et tes assets.",
  },
  {
    q: "Pipiads vaut-il le coup si je débute TikTok Ads ?",
    a: "Oui si tu l’utilises comme bibliothèque de patterns (hooks, angles, formats) et pas comme une machine à “recettes magiques”.",
  },
  {
    q: "Combien coûte Pipiads ?",
    a: "Généralement ~ $77 à $155/mois selon le plan. Tu peux aussi l’avoir inclus dans un bundle via Ecom Efficiency.",
  },
] as const;

export default function PipiadsChapters() {
  return (
    <div className="space-y-10">
      <section id="pipiads-definition" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔍 Qu’est-ce que Pipiads ?</h2>
        <p className="text-gray-300">
          <strong>Pipiads</strong> est un outil de <strong>spy TikTok Ads</strong> (intelligence publicitaire) pour analyser des publicités actives et passées,
          repérer des patterns gagnants, et accélérer la recherche produit. L’objectif: scaler proprement, sans raccourcis douteux et sans abîmer la crédibilité.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Ce que tu identifies vite</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Produits qui tiennent dans le temps</li>
              <li>Créatives / hooks qui convertissent</li>
              <li>Angles, preuves, structure de script</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-white font-semibold">Requêtes que ça couvre</div>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Pipiads avis</li>
              <li>Pipiads prix</li>
              <li>Spy TikTok Ads / TikTok ad library</li>
              <li>Trouver produit gagnant TikTok</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-use-cases" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎯 À quoi sert Pipiads concrètement ?</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>
            <strong>Sortir des “tests au hasard”</strong>: tu pars d’ads qui tournent déjà, pas d’intuitions.
          </li>
          <li>
            <strong>Lire les signaux marché</strong>: pays, durée de diffusion, répétition d’une créa, engagement.
          </li>
          <li>
            <strong>Construire un swipe file</strong>: hooks, angles, formats, preuves, UGC scripts.
          </li>
          <li>
            <strong>Comprendre tes concurrents</strong>: cadence de tests, variations, relances, tendances d’offre.
          </li>
        </ul>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Questions utiles (à mettre dans tes briefs)</div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
            <li>Pourquoi cette pub tient 10+ jours: offre, créa, ou ciblage ?</li>
            <li>Quel hook est utilisé dans les 3 premières secondes ?</li>
            <li>Quelle “preuve” est montrée (avant/après, démo, UGC, avis) ?</li>
          </ul>
        </div>
      </section>

      <section id="pipiads-features" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚙️ Fonctionnalités clés de Pipiads</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">🔎 Recherche avancée</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Mots-clés / niche / promesse</li>
              <li>Pays</li>
              <li>Date de lancement</li>
              <li>Durée de diffusion</li>
              <li>Engagement (likes, commentaires, partages)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">📊 Signaux “rentabilité”</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Longévité d’une ad (indice fort)</li>
              <li>Relances / variations d’une créa</li>
              <li>Accès aux vidéos (analyse montage + script)</li>
              <li>Aperçu store / pages associées</li>
              <li>Sauvegarde + organisation des ads gagnantes</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-gray-900/30 p-4">
          <div className="text-white font-semibold">Mots-clés/termes à inclure (sans bourrage)</div>
          <p className="mt-2 text-gray-300">
            longévité, bibliothèque publicitaire, créatives TikTok, hook, angle, UGC, scaling, ads actives, concurrent, swipe file, stratégie créative.
          </p>
        </div>
      </section>

      <section id="pipiads-method" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🚀 Méthode rapide: trouver un produit gagnant avec Pipiads</h2>
        <div className="rounded-2xl border border-white/10 bg-gray-900/30 p-5">
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>
              <strong>Filtre “durée”</strong>: vise les ads actives depuis 7–14 jours (meilleur signal que les likes).
            </li>
            <li>
              <strong>Regroupe par offre</strong>: même produit, angles différents → tu vois ce qui scale.
            </li>
            <li>
              <strong>Décompose la créa</strong>: hook 0–3s, démo, preuve, CTA, rythme.
            </li>
            <li>
              <strong>Valide</strong>: demande (TikTok Shop / tendances), marge, shipping, contraintes SAV.
            </li>
            <li>
              <strong>Brief</strong>: 3 hooks + 2 angles + 1 preuve → pour ton créateur UGC / monteur.
            </li>
          </ol>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-white font-semibold">Checklist (rapide)</div>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 list-disc list-inside text-gray-300">
            <li>Ad 7–14 jours+</li>
            <li>Plusieurs variations</li>
            <li>Promesse claire</li>
            <li>Démo “visuelle”</li>
            <li>Offre crédible</li>
            <li>Produit livrable</li>
          </ul>
        </div>
      </section>

      <section id="pipiads-creatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🎥 Analyser les meilleures créatives TikTok Ads</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Framework “3–30–3”</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>
                <strong>3s</strong>: hook (problème/curiosité/preuve)
              </li>
              <li>
                <strong>30s</strong>: démo + bénéfices + preuve
              </li>
              <li>
                <strong>3s</strong>: offre + action (sans sur-promettre)
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Questions à extraire</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Quel est le “problème” montré à l’écran ?</li>
              <li>Quelle preuve est la plus forte (avant/après, mesure, avis, démo) ?</li>
              <li>Qu’est-ce qui rend l’offre crédible (garantie, bundle, rareté réelle) ?</li>
              <li>Quels mots reviennent dans les commentaires ?</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-pricing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">💰 Prix de Pipiads (et comment payer moins)</h2>
        <div className="rounded-xl border border-white/10 bg-gray-900/30 p-4 text-gray-300">
          <p>
            Pipiads fonctionne sur abonnement, en général autour de <strong>~ $77 à $155 / mois</strong> selon le plan et les options.
          </p>
          <p className="mt-2">
            Si tu veux l’utiliser avec d’autres outils (SEO, SPY, AI) dans une seule plateforme, tu peux regarder{" "}
            <Link href="/pricing" className="text-purple-200 hover:text-white underline underline-offset-4" title="Pricing Ecom Efficiency">
              le bundle Ecom Efficiency
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="pipiads-limits" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">⚠️ Limites à connaître (et erreurs fréquentes)</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Limites réalistes</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Focus principal: TikTok Ads (moins utile si tu n’achètes pas ce trafic)</li>
              <li>Une ad virale n’est pas forcément rentable</li>
              <li>La créa & l’offre restent le facteur n°1</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-white font-semibold">Erreurs qui coûtent cher</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-300">
              <li>Filtrer sur engagement uniquement (tu suis le bruit)</li>
              <li>Copier montage/script à l’identique (baisse de crédibilité + fatigue créa)</li>
              <li>Tester un produit sans vérifier marge, logistique, SAV</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pipiads-alternatives" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">🔁 Alternatives à Pipiads (selon ton besoin)</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>
            <Link href="/tools/onlyads" className="text-purple-200 hover:text-white underline underline-offset-4" title="OnlyAds tool page">
              OnlyAds
            </Link>{" "}
            : monitoring pub + signaux de marché (complément “SPY” simple).
          </li>
          <li>
            <Link href="/tools/atria" className="text-purple-200 hover:text-white underline underline-offset-4" title="Atria tool page">
              Atria
            </Link>{" "}
            : insights créatives et angles (utile pour améliorer briefs + itérations).
          </li>
          <li>
            <Link href="/tools/kalodata" className="text-purple-200 hover:text-white underline underline-offset-4" title="Kalodata tool page">
              Kalodata
            </Link>{" "}
            : data TikTok Shop + produits, très utile pour confirmer la demande.
          </li>
          <li>
            <Link href="/tools/foreplay" className="text-purple-200 hover:text-white underline underline-offset-4" title="Foreplay tool page">
              Foreplay
            </Link>{" "}
            : organisation de swipe file / workflow créatif (complément parfait).
          </li>
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-3">✅ FAQ</h2>
        <div className="space-y-3">
          {pipiadsFaq.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-gray-900/30 p-4">
              <summary className="cursor-pointer text-white font-semibold">{item.q}</summary>
              <p className="mt-2 text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-transparent p-5">
          <div className="text-white font-semibold">Verdict</div>
          <p className="mt-2 text-gray-300">
            Si tu fais du TikTok Ads, Pipiads est un accélérateur: tu passes plus de temps à exécuter (créa/offre) et moins de temps à deviner.
          </p>
          <p className="mt-3 text-gray-300">
            Pour y accéder avec d’autres outils au même endroit, tu peux{" "}
            <Link href="/sign-up" className="text-purple-200 hover:text-white underline underline-offset-4" title="Try Ecom Efficiency now">
              créer un compte
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

