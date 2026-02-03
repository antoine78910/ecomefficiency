import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import EcomToolsCta from "@/components/EcomToolsCta";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import ToolToc, { type TocItem } from "@/components/ToolToc";

export const metadata: Metadata = {
  title: "Recherche produit dropshipping (2026) : méthode PipiAds & Dropship.io | Ecom Efficiency",
  description:
    "Méthode concrète pour trouver des produits rentables en dropshipping avec PipiAds et Dropship.io. Process clair, niches, exemples, erreurs et plan d’action 7 jours.",
  alternates: { canonical: "/articles/dropshipping-product-research-2026" },
  openGraph: {
    type: "article",
    url: "/articles/dropshipping-product-research-2026",
    title: "Recherche produit dropshipping : méthode PipiAds & Dropship.io (2026)",
    description:
      "Un process réel pour trouver une pépite dropshipping avec PipiAds + Dropship.io : critères, filtres, validation, erreurs à éviter et checklist actionnable.",
    images: [{ url: "/header_ee.png?v=8", width: 1200, height: 630, alt: "Recherche produit dropshipping 2026" }],
  },
};

const toc: TocItem[] = [
  { id: "intro", label: "Objectif (méthode réelle, pas des hacks)", level: 2 },
  { id: "global-logic", label: "La logique globale : 4 étapes simples", level: 2 },
  { id: "step-1", label: "Étape 1 — Les critères qui font la différence", level: 2 },
  { id: "step-2", label: "Étape 2 — Scanner le marché avec PipiAds", level: 2 },
  { id: "pipiads-live", label: "PipiAds en action (captures)", level: 3 },
  { id: "step-3", label: "Étape 3 — Valider avec Dropship.io", level: 2 },
  { id: "dropship-live", label: "Dropship.io en action (captures)", level: 3 },
  { id: "mistakes", label: "Erreurs classiques (et leur impact)", level: 2 },
  { id: "checklist", label: "Checklist actionnable", level: 2 },
  { id: "seven-days", label: "Plan d’action 7 jours", level: 2 },
  { id: "faq", label: "FAQ", level: 2 },
  { id: "conclusion", label: "Conclusion", level: 2 },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold text-white mt-12 mb-4">
      {children}
    </h2>
  );
}

function SubTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-28 text-xl md:text-2xl font-semibold text-white mt-8 mb-3">
      {children}
    </h3>
  );
}

function ScreenshotGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-5">{children}</div>;
}

function ScreenshotCard({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-gray-900/30 overflow-hidden">
      <div className="relative w-full aspect-[16/10]">
        <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
      </div>
      {caption ? <figcaption className="p-3 text-sm text-gray-400">{caption}</figcaption> : null}
    </figure>
  );
}

export default function DropshippingProductResearch2026ArticlePage() {
  const publishedIso = new Date("2026-02-03T00:00:00.000Z").toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Recherche produit dropshipping (2026) : méthode réelle PipiAds + Dropship.io",
    datePublished: publishedIso,
    dateModified: publishedIso,
    author: { "@type": "Organization", name: "Ecom Efficiency Team" },
    publisher: {
      "@type": "Organization",
      name: "Ecom Efficiency",
      logo: { "@type": "ImageObject", url: "https://www.ecomefficiency.com/ecomefficiency.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": "https://www.ecomefficiency.com/articles/dropshipping-product-research-2026" },
    description: metadata.description,
  };

  return (
    <div className="min-h-screen bg-black">
      <NewNavbar />

      <article className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <Link
          href="/articles"
          title="Back to all articles"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <span className="text-sm">← Back to articles</span>
        </Link>

        <header className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Dropshipping
            </span>
            <span className="text-xs text-gray-500">Updated: {new Date(publishedIso).toLocaleDateString("fr-FR")}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">Temps de lecture: ~9 min</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Comment trouver une <span className="gradient-text">pépite</span> en dropshipping en 2026
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Méthode réelle <Link className="text-purple-400 hover:text-purple-300 underline" href="/tools/pipiads">PipiAds</Link> +{" "}
            <Link className="text-purple-400 hover:text-purple-300 underline" href="/tools/dropship-io">Dropship.io</Link>, pour construire un cashflow stable
            (pas pour chasser des hacks).
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="hidden lg:block lg:sticky lg:top-24 self-start flex flex-col">
            <div
              className="min-h-0 overflow-y-auto pr-1
                [scrollbar-width:none] [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: "calc(100vh - 7rem - 220px)" }}
            >
              <ToolToc items={toc} defaultActiveId={toc[0]?.id} collapseSubheadings />
            </div>
            <div className="mt-6">
              <EcomToolsCta compact totalTools={50} />
            </div>
          </aside>

          <div className="min-w-0 max-w-3xl mx-auto lg:mx-0">
            <SectionTitle id="intro">L’objectif (méthode réelle, pas des hacks)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              L’objectif de cette méthode n’est pas de chasser des hacks ou des produits éphémères, mais de construire un cashflow{" "}
              <strong>stable, exploitable et scalable</strong>, sans méthodes bancales ni risques inutiles pour votre crédibilité business.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              La recherche produit efficace repose sur un <strong>process</strong>, pas sur l’intuition.
            </p>

            <SectionTitle id="global-logic">La logique globale : 4 étapes simples (mais mal exécutées par 90 % des gens)</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>Définir les bons critères de sélection</li>
                <li>Scanner le marché via PipiAds</li>
                <li>Valider / affiner avec Dropship.io</li>
                <li>Constituer une short‑list exploitable (produits + boutiques)</li>
              </ol>
            </div>

            <SectionTitle id="step-1">Étape 1 — Les critères qui font la différence (et évitent les fausses pépites)</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Privilégiez les <strong>boutiques nichées</strong> plutôt que le généraliste. Une boutique de niche permet de tester, pivoter et scaler
              sans repartir de zéro.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Ce qui fonctionne durablement</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Vêtements (cargo, gothique, old money, shapewear)</li>
                <li>Bijoux</li>
                <li>Jouets / loisirs créatifs</li>
                <li>Niches passion (poterie, déco, hobbies)</li>
                <li>Shapewear & produits body‑positive</li>
              </ul>
              <div className="text-white font-semibold mt-4 mb-2">Pourquoi ?</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Demande constante</li>
                <li>Faciles à transitionner en marque</li>
                <li>Plusieurs produits = moins de dépendance à un seul best‑seller</li>
              </ul>
            </div>

            <p className="text-gray-300 leading-relaxed mb-4">
              Le <strong>monoproduit</strong> reste valable (sous conditions). Il fonctionne uniquement si:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6">
              <li>Le contenu est qualitatif</li>
              <li>Le branding est propre</li>
              <li>Le produit résout un problème clair</li>
            </ul>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Avantages du monoproduit</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Focalisation totale sur un produit</li>
                <li>Moins de charge mentale</li>
                <li>Plus rapide à lancer</li>
              </ul>
            </div>

            <SectionTitle id="step-2">Étape 2 — Recherche rapide et efficace avec PipiAds</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Avec <Link className="text-purple-400 hover:text-purple-300 underline" href="/tools/pipiads">PipiAds</Link>, vous cherchez le Pareto:
              <strong> 20 % d’effort, 80 % de résultats</strong>.
            </p>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Chemin</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Annonceurs → Top Produits</li>
                <li>Affichage : 500 produits par page</li>
                <li>Classement : hebdomadaire</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Objectif: voir ce qui est massivement poussé sur TikTok, puis décider si vous pouvez <strong>faire mieux</strong> (contenu, angle, branding).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Ce qu’on analyse vraiment</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Qualité du contenu (pas la boutique)</li>
                <li>Angle marketing</li>
                <li>Potentiel d’adaptation (autre pays / autre positionnement)</li>
                <li>Saturation réelle (pas juste “ça tourne”)</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Exemples concrets (observables)</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Perruques niche afro → énorme potentiel FR</li>
                <li>Kits de poterie → demande intemporelle + TikTok friendly</li>
                <li>Cargos → tendance forte mais contenu à refaire</li>
                <li>Gothique / niches esthétiques → faible concurrence, forte identité</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Règle clé: un produit déjà vendu peut rester une pépite si vous faites <strong>mieux</strong> que la source.
              </p>
            </div>

            <SubTitle id="pipiads-live">PipiAds en action (captures)</SubTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Voici un exemple de scan rapide (top produits / ads) pour comprendre ce qui est push et pourquoi.
            </p>
            <ScreenshotGrid>
              <ScreenshotCard
                src="/articles/dropshipping-product-research-2026/pipiads-1.png"
                alt="PipiAds — Ad Search (scan des ads en ecommerce)"
                caption="Scan rapide: Ad Search (TikTok/Facebook) + filtres."
              />
              <ScreenshotCard
                src="/articles/dropshipping-product-research-2026/pipiads-2.png"
                alt="PipiAds — TikTok Shop Products (top produits)"
                caption="Top produits: tri + signaux (GMV, tendances, dates, etc.)."
              />
              <ScreenshotCard
                src="/articles/dropshipping-product-research-2026/pipiads-3.png"
                alt="PipiAds — analytics annonceur (données ads & stores)"
                caption="Validation rapide via analytics annonceur (ads, likes, spend, etc.)."
              />
            </ScreenshotGrid>

            <SectionTitle id="step-3">Étape 3 — Validation avancée avec Dropship.io</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Ici, on confirme et on détecte ce que PipiAds ne montre pas toujours: ventes, dynamique boutique, timing, cohérence catalogue.
              Utilisez <Link className="text-purple-400 hover:text-purple-300 underline" href="/tools/dropship-io">Dropship.io</Link> pour éviter les faux positifs.
            </p>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Filtrage produit recommandé</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Revenus mensuels : 21 000 $ → 70 000 $</li>
                <li>Date de création : ≤ 12 mois</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Objectif: produits récents, pas encore rincés.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Filtrage boutique (monoproduits & mini‑catalogues)</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Revenus : 58 000 $ → 300 000 $</li>
                <li>Nombre de produits : 1 à 20</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                C’est là que se cachent les vraies opportunités copiables (produit + offre + angle + catalogue).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="text-white font-semibold mb-2">Exemples de pépites (sans bullshit)</div>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Shapewear</strong> — marché ultra‑validé, plusieurs best‑sellers possibles, contenu facilement amélioré, scalabilité énorme.
                </li>
                <li>
                  <strong>Kits enfants / famille</strong> — achat émotionnel, mamans très réactives, Facebook + TikTok = combo solide.
                </li>
                <li>
                  <strong>Produits problème → solution</strong> — compression socks, ceintures lombaires, sommeil / récupération.
                </li>
              </ol>
              <div className="text-white font-semibold mt-4 mb-2">Toujours vérifier</div>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li>Normes fournisseurs</li>
                <li>Légalité</li>
                <li>Promesses marketing réalistes</li>
              </ul>
            </div>

            <SubTitle id="dropship-live">Dropship.io en action (captures)</SubTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Exemple: vous repérez des produits dans une base “store‑proven”, puis vous regardez les signaux de revenus, timing, catalogue et cohérence.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-5">
              <ScreenshotCard
                src="/articles/dropshipping-product-research-2026/dropship-1.png"
                alt="Dropship.io — Product Database (liste produits + revenus)"
                caption="Product Database: filtres + revenus mensuels + tracking."
              />
              <ScreenshotCard
                src="/articles/dropshipping-product-research-2026/dropship-2.png"
                alt="Dropship.io — exemples produits (cartes catalogue)"
                caption="Mini-catalogues: vérifier la logique boutique, l’offre et les angles."
              />
            </div>

            <SectionTitle id="mistakes">Les erreurs classiques (et leur impact direct)</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="space-y-2 text-gray-300">
                <li>
                  <strong>Copier des boutiques dropshipping mal faites</strong> → image low‑cost, taux de conversion faible
                </li>
                <li>
                  <strong>Lancer des produits trop saturés</strong> → CPC élevé, fatigue créative
                </li>
                <li>
                  <strong>Tester sans niche claire</strong> → impossible de scaler proprement
                </li>
                <li>
                  <strong>Ignorer le contenu</strong> → ads mortes avant même d’apprendre
                </li>
              </ul>
            </div>

            <SectionTitle id="checklist">Checklist actionnable — Recherche produit efficace</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <ul className="space-y-2 text-gray-300">
                <li>✅ Niche claire (pas généraliste)</li>
                <li>✅ Produit déjà validé quelque part</li>
                <li>✅ Contenu améliorable</li>
                <li>✅ Prix ≤ 70 $</li>
                <li>
                  ✅ Possibilité de sourcing optimisé (AliExpress →{" "}
                  <a
                    href="https://www.1688.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-purple-400 hover:text-purple-300 underline"
                    title="1688 (benchmark prix fournisseurs)"
                  >
                    1688
                  </a>
                  )
                </li>
                <li>✅ Potentiel multi‑produits ou branding</li>
              </ul>
            </div>

            <SectionTitle id="seven-days">Plan d’action 7 jours</SectionTitle>
            <div className="p-5 rounded-2xl bg-gray-900 border border-white/10 mb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 1–2</div>
                  <div className="text-gray-300 mt-1">Recherche PipiAds (top produits hebdo)</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 3</div>
                  <div className="text-gray-300 mt-1">Validation Dropship.io (produits + stores)</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 4</div>
                  <div className="text-gray-300 mt-1">Sélection de 3–5 produits maximum</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 5</div>
                  <div className="text-gray-300 mt-1">Récupération / adaptation du contenu</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 6</div>
                  <div className="text-gray-300 mt-1">Montage boutique simple & propre</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-white font-semibold">Jour 7</div>
                  <div className="text-gray-300 mt-1">Lancement test ads + tracking</div>
                </div>
              </div>
            </div>

            <SectionTitle id="faq">FAQ</SectionTitle>
            <div className="space-y-4">
              {[
                {
                  q: "Faut-il éviter les produits déjà vendus ?",
                  a: "Non. Il faut éviter les produits mal exécutés, pas ceux qui vendent. Si vous pouvez faire mieux (contenu, offre, branding), le produit reste exploitable.",
                },
                {
                  q: "Monoproduit ou boutique niche ?",
                  a: "Monoproduit = rapide. Boutique niche = durable. Les deux fonctionnent si l’exécution est propre, avec un contenu fort et un positionnement clair.",
                },
                {
                  q: "Quel CA minimum regarder ?",
                  a: "Indicatif: > 3 000 $/jour peut signaler un produit fort, mais le contenu prime sur le chiffre. Un bon contenu peut battre un produit “plus gros” mal exécuté.",
                },
                {
                  q: "Peut-on lancer en France un produit US ?",
                  a: "Oui, si le marché FR est mal servi ou mal brandé. Adaptez l’angle, le copy, les preuves et le pricing au contexte local.",
                },
                {
                  q: "TikTok Ads obligatoire ?",
                  a: "Non, mais c’est aujourd’hui le levier le plus rapide pour tester. Le bon mix dépend de la niche (Meta, Google, UGC, email).",
                },
              ].map((item) => (
                <div key={item.q} className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                  <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                  <h4 className="text-gray-300 leading-relaxed font-normal">{item.a}</h4>
                </div>
              ))}
            </div>

            <SectionTitle id="conclusion">Conclusion</SectionTitle>
            <p className="text-gray-300 leading-relaxed mb-4">
              Cette méthode fonctionne parce qu’elle repose sur l’observation réelle du marché, pas sur des théories.
            </p>
            <p className="text-gray-300 leading-relaxed mb-6">
              Si vous voulez structurer vos recherches produit, éviter les erreurs classiques et scaler proprement, cette approche est une base solide.
            </p>
            <p className="text-gray-300 leading-relaxed mb-8">
              Pour aller plus loin et structurer vos tests, votre sourcing et votre branding sans raccourcis douteux, la méthode complète est disponible sur{" "}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline" title="Ecom Efficiency pricing">
                Ecom Efficiency
              </Link>{" "}
              — scaling propre et durable.
            </p>

            <section className="mt-14">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Similar reads</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/tools/pipiads"
                  title="Pipiads tool page"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">Pipiads</div>
                  <div className="text-sm text-gray-400 mt-1">Trouver des ads TikTok gagnantes et analyser hooks, angles, créas.</div>
                </Link>
                <Link
                  href="/tools/dropship-io"
                  title="Dropship.io tool page"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">Dropship.io</div>
                  <div className="text-sm text-gray-400 mt-1">Valider des produits via l’adoption réelle des stores Shopify.</div>
                </Link>
                <Link
                  href="/articles/profitable-saturated-products"
                  title="How to be profitable on saturated products"
                  className="rounded-2xl border border-white/10 bg-gray-900/30 p-4 hover:border-purple-500/30 transition-colors"
                >
                  <div className="text-white font-semibold">Profitable saturated products (3 pillars)</div>
                  <div className="text-sm text-gray-400 mt-1">Créatives, product page et offre: le framework simple pour gagner.</div>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

