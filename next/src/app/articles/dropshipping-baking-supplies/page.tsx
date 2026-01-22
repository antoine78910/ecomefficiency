import type { Metadata } from "next";
import Link from "next/link";
import ArticleToc, { type TocItem } from "../../../components/ArticleToc";
import EcomToolsCta from "@/components/EcomToolsCta";

import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";

export const metadata: Metadata = {
  title: "Dropshipping baking supplies : produits, fournisseurs, marges & SEO | Ecom Efficiency",
  description:
    "Guide complet pour lancer une boutique de baking supplies en dropshipping : choix des produits, conformité food-contact, sourcing fournisseurs, packaging, pricing, SEO, acquisition et FAQ.",
  alternates: { canonical: "/articles/dropshipping-baking-supplies" },
  openGraph: {
    type: "article",
    url: "/articles/dropshipping-baking-supplies",
    title: "Dropshipping baking supplies : produits, fournisseurs, marges & SEO",
    description:
      "Un playbook actionnable pour vendre des accessoires et ingrédients de pâtisserie en dropshipping : sélection produit, sourcing, qualité, pricing, SEO et croissance.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Dropshipping baking supplies" }],
  },
};

const toc: TocItem[] = [
  { id: "what-is-baking-supplies-dropshipping", label: "Qu’est-ce que le dropshipping de baking supplies ?" },
  { id: "why-baking-niche", label: "Pourquoi cette niche peut marcher (et quand éviter)" },
  { id: "winning-products", label: "Produits gagnants : quoi vendre (et quoi éviter)" },
  { id: "suppliers-quality", label: "Trouver des fournisseurs fiables + contrôle qualité" },
  { id: "compliance-food-contact", label: "Conformité & sécurité (food-contact, ingrédients, étiquetage)" },
  { id: "shipping-packaging", label: "Expédition & packaging : fragile, température, retours" },
  { id: "pricing-margins", label: "Pricing & marges : viser un business rentable" },
  { id: "seo-content-strategy", label: "SEO : structure, pages, mots-clés, contenu" },
  { id: "marketing-channels", label: "Acquisition : TikTok, Pinterest, Google, email" },
  { id: "ops-cs", label: "Ops & customer support : SAV, UGC, répétition d’achat" },
  { id: "faq", label: "FAQ" },
  { id: "references", label: "Références" },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

export default function DropshippingBakingSuppliesArticlePage() {
  const publishedIso = new Date("2026-01-22T00:00:00.000Z").toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Dropshipping baking supplies : le guide complet (produits, fournisseurs, marges, SEO)",
    datePublished: publishedIso,
    dateModified: publishedIso,
    author: { "@type": "Organization", name: "Ecom Efficiency Team" },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://ecomefficiency.com/ecomefficiency.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": "https://ecomefficiency.com/articles/dropshipping-baking-supplies" },
    description: metadata.description,
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <Link href="/articles" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <span className="text-sm">← Retour aux articles</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Dropshipping
            </span>
            <span className="text-xs text-gray-500">Mise à jour : {new Date(publishedIso).toLocaleDateString("fr-FR")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Temps de lecture : ~25 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Dropshipping de <span className="gradient-text">baking supplies</span> : produits, fournisseurs, marges & SEO
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            La pâtisserie “maison” explose (batch cooking, meal prep, TikTok recipes, cakes design) et les{" "}
            <strong>accessoires de pâtisserie</strong> sont parfaits pour une stratégie e-commerce orientée contenu :
            démonstrations courtes, avant/après, UGC, et intention d’achat forte.
          </p>
          <p className="text-gray-300 text-lg leading-relaxed mt-4">
            Dans ce guide, je te donne un playbook clair pour lancer une boutique de baking supplies en dropshipping — en
            évitant les pièges (qualité, food-contact, retours, marges).
          </p>
        </header>

        {/* Mobile TOC */}
        <div className="lg:hidden mt-8 p-4 rounded-2xl bg-gray-900 border border-white/10">
          <ArticleToc
            items={toc}
            heading="ON THIS PAGE"
            linkClassName="px-3 py-2 rounded-lg border border-transparent text-gray-300 hover:text-white hover:bg-white/5"
            activeLinkClassName="text-white font-semibold bg-white/5 border-white/10"
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          {/* Content */}
          <div className="min-w-0 max-w-3xl mx-auto lg:mx-0">
            <SectionTitle id="what-is-baking-supplies-dropshipping">What is baking supplies dropshipping?</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Le <strong>dropshipping de baking supplies</strong>, c’est vendre des accessoires (moules, poches à douille,
              spatules, tapis silicone, cake toppers) et parfois des consommables (décors, colorants, emballages){" "}
              <strong>sans stock</strong> : tu encaisses la commande, puis ton fournisseur expédie au client final.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              La différence entre une boutique qui marche et une boutique “me-too” se joue sur 3 points :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Le choix produit</strong> : éviter les gadgets bas de gamme et viser des items démontrables.
              </li>
              <li>
                <strong>L’offre</strong> : bundles et kits “recette + outils” qui simplifient l’achat.
              </li>
              <li>
                <strong>La confiance</strong> : qualité, normes food-contact, livraison, SAV irréprochable.
              </li>
            </ul>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">La promesse à vendre (en 1 phrase)</p>
              <p className="text-gray-300 leading-relaxed">
                “Aide-moi à réussir <strong>un résultat précis</strong> (glaçage net, biscuits réguliers, cupcakes dignes d’une
                boutique) avec <strong>les bons outils</strong>, sans galérer et sans gaspiller.”
              </p>
            </div>

            <SectionTitle id="why-baking-niche">Pourquoi cette niche peut marcher (et quand éviter)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Les baking supplies ont des signaux intéressants pour le e-commerce :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>UGC naturel</strong> : un moule ou une douille se montre en 6 secondes.
              </li>
              <li>
                <strong>Achat impulsif</strong> + “justification rationnelle” (je vais l’utiliser souvent).
              </li>
              <li>
                <strong>Répétition</strong> via consommables (emballages, décors, liners) et saisonnalité (Noël, Pâques,
                anniversaires).
              </li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Les 3 segments qui payent le mieux</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Débutants motivés</strong> : veulent des résultats rapides, adorent les kits “tout-en-un”.
              </li>
              <li>
                <strong>Passionnés cake design</strong> : achètent des “petites améliorations” (douilles, scrapers, supports).
              </li>
              <li>
                <strong>Micro-bakers</strong> (side hustle) : cherchent du matériel fiable + packaging pro.
              </li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Saisonnalité (utilise-la au lieu de la subir)</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Fais un calendrier simple : <strong>Noël</strong> (décors/packaging), <strong>Saint-Valentin</strong> (moules),
              <strong>Pâques</strong> (emporte-pièces), <strong>été</strong> (cupcakes/party), <strong>rentrée</strong> (batch cooking).
              Tu prépares pages SEO + bundles 4–6 semaines avant.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              À éviter si tu ne veux pas gérer un minimum d’exigence qualité : sur des produits food-contact, une seule
              mauvaise série peut te coûter cher (retours, avis, chargebacks). La niche est excellente si tu acceptes de
              travailler “comme une vraie marque”.
            </p>

            <SectionTitle id="winning-products">Produits gagnants : quoi vendre (et quoi éviter)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Pense “résultat visible” et “friction réduite”. Les meilleurs items sont ceux qui :
              <strong> améliorent un résultat</strong> (plus net, plus rapide, plus propre) ou{" "}
              <strong>réduisent la complexité</strong> (kit complet).
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Framework “Hero product” (rapide)</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border border-white/10 rounded-xl overflow-hidden">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="text-left text-white text-sm font-semibold p-3 border-b border-white/10">Critère</th>
                    <th className="text-left text-white text-sm font-semibold p-3 border-b border-white/10">Ce que tu veux</th>
                  </tr>
                </thead>
                <tbody className="bg-black">
                  <tr className="border-b border-white/10">
                    <td className="p-3 text-gray-300 text-sm">Démonstration</td>
                    <td className="p-3 text-gray-300 text-sm">Résultat visible en 5–15s (avant/après)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-3 text-gray-300 text-sm">Différenciation</td>
                    <td className="p-3 text-gray-300 text-sm">Taille, usage, forme, bundle, guide — pas “spatule générique”</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-3 text-gray-300 text-sm">Fragilité</td>
                    <td className="p-3 text-gray-300 text-sm">Faible casse + packaging simple</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="p-3 text-gray-300 text-sm">Panier moyen</td>
                    <td className="p-3 text-gray-300 text-sm">Bundle possible ≥ 29€ (pour absorber pub + SAV)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-300 text-sm">Confiance</td>
                    <td className="p-3 text-gray-300 text-sm">Matériaux clairs + docs + instructions + FAQ</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Angles produit qui convertissent</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Cake design</strong> : set de douilles + poches + coupleurs, “Russian tips”, lisseurs (scrapers),
                plateaux tournants, supports à étages.
              </li>
              <li>
                <strong>Air fryer & mini pâtisserie</strong> : petits moules silicone adaptés, liners, tapis antiadhésifs.
              </li>
              <li>
                <strong>Meal prep sucré</strong> : boîtes pâtisserie, packaging, étiquettes, rubans, inserts.
              </li>
              <li>
                <strong>Kids & family</strong> : emporte-pièces, tampons biscuits, moules “fun” (attention normes).
              </li>
              <li>
                <strong>Gains de temps</strong> : doseurs, pelles, distributeurs de pâte, grilles de refroidissement.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Idées de bundles (qui font grimper l’AOV)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Kit cupcakes “clean finish”</strong> : poche + set de douilles + coupleurs + brosse de nettoyage + mini guide.
              </li>
              <li>
                <strong>Kit cookies réguliers</strong> : emporte-pièces + tampon + tapis silicone + spatule fine.
              </li>
              <li>
                <strong>Kit layer cake</strong> : plateau tournant + scrapers + supports + cake toppers.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Ce que je déconseille en dropshipping pur</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Ingrédients “sensibles”</strong> (périssables, allergènes, température) si tu n’as pas une chaîne
                logistique solide.
              </li>
              <li>
                <strong>Verre / céramique</strong> trop fragile (taux de casse + retours).
              </li>
              <li>
                <strong>Produits ultra-commodités</strong> (spatule basique, balance générique) : concurrence prix/ads.
              </li>
            </ul>

            <SectionTitle id="suppliers-quality">Trouver des fournisseurs fiables + contrôle qualité</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Le “secret” dans cette niche, c’est de traiter le fournisseur comme un partenaire industriel :
              documentation, exigences, et échantillons.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Questions à poser (copie/colle)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Quels matériaux exacts ? Température max ? Compatible lave-vaisselle ?</li>
              <li>Docs disponibles : déclaration de conformité, rapports de tests, lots/traçabilité ?</li>
              <li>Délais réels de production + expédition + options d’emballage renforcé ?</li>
              <li>Politique remplacement en cas de défaut / casse ?</li>
              <li>Possibilité d’insert, notice, QR code vers guide (white label) ?</li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Contrôle qualité minimal (sans usine)</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Tu peux faire 80% du job avec un process simple : échantillons, checklist, photos/vidéos du fournisseur avant envoi,
              et un SKU “sentinel” (un produit que tu testes à chaque nouveau lot).
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Checklist avant de lancer un SKU</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Échantillons</strong> : 2–3 unités, et si possible 2 fournisseurs différents.
              </li>
              <li>
                <strong>Odeur / texture</strong> (silicone), rigidité, finitions, tolérances (fermetures, pas de vis).
              </li>
              <li>
                <strong>Tests d’usage</strong> : lave-vaisselle, chaleur, coloration, déformation.
              </li>
              <li>
                <strong>Packaging</strong> : protection, notice, avertissements, code-barres si besoin.
              </li>
              <li>
                <strong>Lead time</strong> et tracking : promesse réaliste sur la page produit.
              </li>
            </ul>

            <p className="text-gray-300 leading-relaxed mb-6">
              Astuce marge : crée des <strong>bundles</strong> avec des pièces “cheap” mais utiles (coupleurs, brosses,
              adaptateurs). Tu augmentes l’AOV sans augmenter beaucoup le coût réel, et ton offre devient moins comparable.
            </p>

            <SectionTitle id="compliance-food-contact">Conformité & sécurité (food-contact, ingrédients, étiquetage)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Dès que ton produit touche la nourriture (moule, douille, tapis silicone, boîte), tu entres dans le monde{" "}
              <strong>food-contact</strong>. Tu n’as pas besoin d’être juriste, mais tu dois éviter les erreurs basiques :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Exiger des docs</strong> : déclarations de conformité, rapports de tests, matériaux, température
                max, usage.
              </li>
              <li>
                <strong>Éviter les promesses médicales</strong> et les claims “safe” sans preuve.
              </li>
              <li>
                <strong>Clarifier l’usage</strong> : four, micro-ondes, congélateur, lave-vaisselle, etc.
              </li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Red flags (si tu vois ça, passe)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Le fournisseur refuse d’envoyer des documents ou répond “don’t worry, it’s safe”.</li>
              <li>Température max non précisée (silicone) ou “safe for everything”.</li>
              <li>Finitions grossières, odeur forte, colorants douteux sur échantillons.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              Si tu vends en UE, vise des fournisseurs capables de fournir des documents alignés avec les règlements
              applicables (matériaux au contact des aliments). Si tu vends aux US, renseigne-toi sur les exigences FDA et
              les catégories de matériaux.
            </p>

            <SectionTitle id="shipping-packaging">Expédition & packaging : fragile, température, retours</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Dans cette niche, la logistique n’est pas “sexy”, mais c’est elle qui protège tes marges. Les points clés :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Protection anti-écrasement</strong> pour les douilles, pièces en métal et boîtes.
              </li>
              <li>
                <strong>Anti-fuites / anti-humidité</strong> pour consommables et décors.
              </li>
              <li>
                <strong>Promesse livraison</strong> cohérente (éviter les “3-5 jours” si tu n’es pas certain).
              </li>
              <li>
                <strong>Politique retours</strong> claire : “food-contact non retournable” selon tes conditions (à vérifier
                selon pays).
              </li>
            </ul>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Astuce anti-retours</p>
              <p className="text-gray-300 leading-relaxed">
                Mets les <strong>dimensions exactes</strong> (cm) + photos en main + une phrase “compatibilité” (four/micro-ondes/lave-vaisselle).
                Beaucoup de retours viennent d’un produit “plus petit que prévu”.
              </p>
            </div>

            <SectionTitle id="pricing-margins">Pricing & marges : viser un business rentable</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Le piège classique : vendre une spatule à 9,90€ parce que “ça se vend”, et découvrir que{" "}
              <strong>les coûts cachés</strong> (SAV, retours, paiement, packaging, pub) mangent tout.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Mini modèle (à adapter)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Coût rendu</strong> = produit + expédition + packaging + défauts (petit %).
              </li>
              <li>
                <strong>Coût variable</strong> = frais paiement + support + retours (estimations prudentes).
              </li>
              <li>
                <strong>Objectif</strong> : un prix qui supporte ton canal (SEO/UGC vs ads) et te laisse une marge nette.
              </li>
            </ul>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <p className="text-white font-semibold mb-2">Exemple ultra simple</p>
              <p className="text-gray-300 leading-relaxed">
                Si ton bundle te coûte 11€ rendu, que tu prévois 2€ de frais variables, et que ton CAC moyen est 12€,
                il te faut un prix qui laisse de l’air : 39€–49€ est souvent plus réaliste que 24€.
              </p>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">Une règle simple pour démarrer :</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Produit à démontrer</strong> : viser une marge brute confortable (souvent x3 à x5 sur le coût
                rendu, selon canal).
              </li>
              <li>
                <strong>Bundles</strong> : construire une offre à 29€–59€ pour absorber pub + SAV.
              </li>
              <li>
                <strong>Upsells</strong> : brosses de nettoyage, set supplémentaire, packaging cadeau.
              </li>
            </ul>

            <SectionTitle id="seo-content-strategy">SEO : structure, pages, mots-clés, contenu</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              La pâtisserie est une niche SEO “naturelle” : énormément de requêtes (recettes, techniques, outils) et une
              forte intention d’achat sur les accessoires.
            </p>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Clusters de mots-clés (exemples)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Intentions “outil”</strong> : “meilleures douilles pâtisserie”, “poche à douille réutilisable”, “tapis silicone pâtisserie”.
              </li>
              <li>
                <strong>Intentions “problème”</strong> : “glaçage lisse sans traces”, “cupcakes qui s’affaissent”, “biscuits qui collent”.
              </li>
              <li>
                <strong>Intentions “usage”</strong> : “douille pour roses”, “moule layer cake”, “boîte cupcakes transport”.
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              Ton avantage : tu peux connecter “recette/technique” → “outil” sans forcer. Exemple : un article “comment lisser un buttercream”
              qui renvoie naturellement vers scrapers + plateau tournant.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Architecture simple qui rank</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Collections</strong> : “Poches & douilles”, “Moules silicone”, “Cake design”.
              </li>
              <li>
                <strong>Pages guides</strong> : “Quelle poche à douille choisir ?”, “Meilleurs moules silicone : guide”.
              </li>
              <li>
                <strong>Articles intention produit</strong> : “Top 7 kits cake design débutant”, “Douilles : tailles et usages”.
              </li>
              <li>
                <strong>Comparatifs</strong> : silicone vs métal, tapis silicone vs papier cuisson.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Checklist contenu (qualité + conversion)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Photos/vidéos</strong> : close-ups, “résultat final”, démonstration 10–20s.
              </li>
              <li>
                <strong>FAQ sur la page produit</strong> : compatibilité four, nettoyage, dimensions exactes.
              </li>
              <li>
                <strong>Tableau des tailles</strong> et usages (douilles, moules).
              </li>
              <li>
                <strong>UGC</strong> : reviews avec photos, exemples de créations.
              </li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3 détails SEO qui font la différence</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Images</strong> : noms de fichiers + alt utiles (“douille 1M buttercream roses”) au lieu de “IMG_123”.
              </li>
              <li>
                <strong>Internal linking</strong> : chaque guide doit pousser vers 1 collection + 1 produit “hero”.
              </li>
              <li>
                <strong>Preuves</strong> : photos d’échantillons, tests, températures, matériaux → confiance + conversion.
              </li>
            </ul>

            <SectionTitle id="marketing-channels">Acquisition : TikTok, Pinterest, Google, email</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Pour “baking”, tes meilleurs canaux sont ceux qui montrent un résultat :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>TikTok / Reels</strong> : hooks “avant/après”, “3 erreurs à éviter”, “tool hack”.
              </li>
              <li>
                <strong>Pinterest</strong> : pins “how-to” + liens vers guides/collections (trafic long terme).
              </li>
              <li>
                <strong>Google Shopping</strong> : très fort sur accessoires “clairs” (mais attention prix concurrence).
              </li>
              <li>
                <strong>Email</strong> : séquences “recettes + outils”, bundles saisonniers.
              </li>
            </ul>
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Plan contenu 14 jours (simple)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>J1–J3 : 3 vidéos “résultat” (avant/après) avec le hero product.</li>
              <li>J4–J7 : 4 vidéos “erreurs + solution” (ex: glaçage irrégulier → scraper + plateau).</li>
              <li>J8–J10 : 3 UGC “unboxing + test” (format 15–25s).</li>
              <li>J11–J14 : 4 contenus “checklist” + 2 pins Pinterest par jour (recyclage des vidéos).</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              Stratégie simple : 1 hero product + 1 bundle + 2 upsells. Tu crées ensuite 10–15 contenus UGC qui montrent
              le résultat, puis tu déclines en SEO (guides) pour capter la demande “evergreen”.
            </p>

            <SectionTitle id="ops-cs">Ops & customer support : SAV, UGC, répétition d’achat</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Le SAV est une “arme secrète” : dans une niche passion, un bon support = avis + UGC + réachat.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>
                <strong>Macro réponses</strong> : dimensions, compatibilité, nettoyage, livraison.
              </li>
              <li>
                <strong>Guide d’usage PDF</strong> (ou page) : “comment réussir tes premières douilles”.
              </li>
              <li>
                <strong>UGC loop</strong> : demander une photo en échange d’un code -10% sur prochain achat.
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              Le plus rentable : construire une <strong>liste email</strong> avec 2–3 freebies (mini guide, checklist d’outils,
              calendrier saisonnier) et pousser des bundles à chaque pic de saison.
            </p>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Est-ce qu’on peut dropshipper des ingrédients de pâtisserie ?</p>
                <p className="text-gray-300 leading-relaxed">
                  Possible, mais plus risqué : température, DLC, allergènes, retours. En général, démarre par les
                  accessoires/packaging, puis ajoute des consommables stables seulement si ton sourcing est solide.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Quels produits sont “le plus SEO friendly” ?</p>
                <p className="text-gray-300 leading-relaxed">
                  Les catégories avec comparatifs et choix technique : douilles (tailles/usages), moules (formes/matières),
                  tapis silicone, tourne-disques, scrapers, packaging pâtisserie.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                <p className="text-white font-semibold mb-2">Comment éviter la guerre des prix ?</p>
                <p className="text-gray-300 leading-relaxed">
                  Bundle + contenu + marque. Si ton offre se résume à “spatule silicone”, tu es comparable. Si tu vends un
                  kit cake design “débutant” (avec guide + tailles + exemples), tu vends un résultat.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-14">
              <EcomToolsCta />
            </div>

            <SectionTitle id="references">Références</SectionTitle>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>
                Matériaux au contact des aliments (UE) :{" "}
                <a className="text-purple-400 hover:text-purple-300 underline" href="https://food.ec.europa.eu/safety/chemical-safety/food-contact-materials_en">
                  food.ec.europa.eu — Food contact materials
                </a>
              </li>
              <li>
                FDA (US) — Food contact substances :{" "}
                <a className="text-purple-400 hover:text-purple-300 underline" href="https://www.fda.gov/food/packaging-food-contact-substances-fcs">
                  fda.gov — Packaging & Food Contact Substances
                </a>
              </li>
            </ul>
          </div>

          {/* Right nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 h-[calc(100vh-6rem)] flex flex-col">
              <div className="overflow-auto pr-2 pb-6">
                <ArticleToc
                  items={toc}
                  heading="ON THIS PAGE"
                  linkClassName="px-3 py-2 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  activeLinkClassName="text-white font-semibold bg-white/5 border-white/10"
                />

                <div className="mt-6 p-4 rounded-xl bg-gray-900 border border-white/10">
                  <p className="text-sm font-semibold text-white mb-2">Objectif du playbook</p>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                    <li>Choisir des produits “winner” non-commodités</li>
                    <li>Mettre une offre claire (bundles + upsells)</li>
                    <li>Sécuriser qualité + conformité</li>
                    <li>Construire une base SEO qui convertit</li>
                  </ul>
                </div>
              </div>

              {/* Keep the CTA visible (space below TOC) */}
              <div className="pt-4 border-t border-white/10">
                <EcomToolsCta compact />
              </div>
            </div>
          </aside>
        </div>
      </article>

      <Footer />
    </div>
  );
}

