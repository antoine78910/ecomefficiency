import type { Metadata } from "next";
import Script from "next/script";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.ecomefficiency.com"),
  title: "Ecom Efficiency Tools",
  description: "Ecom Efficiency tools hub.",
  alternates: { canonical: "/pro" },
  openGraph: {
    title: "Ecom Efficiency Tools",
    description: "Ecom Efficiency tools hub.",
    url: "/pro",
    type: "website",
  },
};

export default function ProToolsHubPage() {
  return (
    <>
      {/* Font Awesome (as in legacy HTML) */}
      <Script src="https://kit.fontawesome.com/a076d05399.js" crossOrigin="anonymous" strategy="afterInteractive" />

      {/* Legacy CSS (style.css) */}
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;700;1000&family=Montserrat:wght@400;800&family=Open+Sans:wght@400;600&display=swap');

body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 0;
  text-align: center;
}

body::before {
  display: none;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

h1 {
  color: #333;
  margin-top: 50px;
  font-family: 'Kanit', sans-serif;
  font-weight: 1000;
  font-size: 40px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

.tool-icon img {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.tool-image {
  object-fit: contain;
  width: 4rem;
  height: 4rem;
  margin: 0.5rem;
}

.spy-image {
  width: 8rem;
  height: 8rem;
  margin: 2rem;
}

.seo-image {
  width: 8rem;
  height: 8rem;
  margin: 2.6rem;
}

.ai-image {
  width: 8rem;
  height: 8rem;
  margin: 2.6rem;
}

.tool-card {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 6px 20px rgba(0, 0, 0, 0.2);
  padding: 20px;
  text-decoration: none;
  color: #333;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid black;
}

.tool-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2), 0 12px 24px rgba(0, 0, 0, 0.4);
  border-color: #333;
}

.tool-icon {
  font-size: 40px;
  margin-bottom: 10px;
  color: #007bff;
}

.tool-name {
  font-size: 24px;
  margin-bottom: 10px;
  text-align: left;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
}

.tool-description {
  font-size: 14px;
  margin-bottom: 10px;
  font-family: 'Open Sans', sans-serif;
  color: #464646;
}

.tool-includes img {
  width: 40px;
  height: 40px;
  margin: 5px;
}

.tool-badge {
  background-color: #007bff;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 12px;
  margin-top: 10px;
  display: inline-block;
}

.tool-building {
  background-color: #ff7f00;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 15px;
  margin-top: 10px;
  display: inline-block;
}

.tool-card .tool-badge.animated-badge {
  animation: pulse 1.5s infinite;
}

.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  padding-top: 100px;
  text-align: center;
}

.modal-content {
  background-color: #fff;
  margin: auto;
  padding: 20px;
  border: 1px solid #888;
  width: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

button {
  margin: 10px;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.btn-yes {
  background-color: green;
  color: white;
}

.btn-no {
  background-color: red;
  color: white;
}

.btn-yes:hover, .btn-no:hover {
  opacity: 0.8;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
      `}</style>

      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute top-0 z-0 h-screen w-screen custom-background" />
        <style>{`
          .custom-background {
            background-color: #000000;
            background-image: radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, #00091d 1px);
            background-size: 20px 20px;
          }
        `}</style>

        {/* Popup confirmation (as provided) */}
        <div id="confirmationModal" className="modal">
          <div className="modal-content">
            <span id="closeModal" className="close">
              &times;
            </span>
            <h3>Êtes-vous sûr de vouloir continuer ?</h3>
            <button id="yesButton" className="btn-yes">
              Oui
            </button>
            <button id="noButton" className="btn-no">
              Non
            </button>
          </div>
        </div>

        <h1 className="text-center text-4xl font-bold mt-8">Ecom Efficiency</h1>

        <div className="tools-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4 relative z-10">
          <a href="https://rankerfox.com/login/" className="tool-card" target="_blank" rel="noopener noreferrer">
            <img src="/tools-images/seo.png" alt="seo" className="tool-image seo-image" />
            <div className="tool-name">+30 SEO Tools</div>
            <div className="tool-description">Includes:</div>
            <div className="tool-includes">
              <img src="/tools-images/sem.png" alt="Semrush" className="tool-image seo-image" />
              <img src="/tools-images/uber.png" alt="Ubersuggest" className="tool-image seo-image" />
              <img src="/tools-images/js.png" alt="JungleScout" className="tool-image seo-image" />
              <img src="/tools-images/canv.png" alt="Canva" className="tool-image seo-image" />
            </div>
            <div className="tool-description">And more ...</div>
          </a>

          <a href="https://app.flair.ai/explore" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/flair.png" alt="Flair AI" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Flair AI</div>
            <div className="tool-description">
              An AI-powered visual editor for product photography. Drag and drop to create high-quality ecommerce photoshoots in seconds.
            </div>
          </a>

          <a href="https://chatgpt.com/" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/gpt.png" alt="Chat GPT Pro" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Chat GPT Pro</div>
            <div className="tool-description">
              Chat helps you answer questions, write texts, provide advice and automate conversations in a variety of fields.
            </div>
          </a>

          <a href="https://www.midjourney.com/explore?tab=top" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/mid.png" alt="Midjourney" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Midjourney</div>
            <div className="tool-description">
              MidJourney is an AI-driven platform that generates high-quality images from text prompts, enabling users to create unique visuals quickly
            </div>
          </a>

          <a href="https://www.semrush.com/app/exploding-topics/" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/exp.png" alt="Exploding Topics" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Exploding Topics</div>
            <div className="tool-description">Tracks and identifies emerging trends using search data and online insights</div>
          </a>

          <a href="https://www.pipiads.com/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/pipi.png" alt="Pipiads" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Pipiads</div>
            <div className="tool-description">
              The largest TikTok & Facebook ad library, and the most powerful tiktok ad spy, facebook adspy, tiktok shop data tool
            </div>
          </a>

          <a href="https://www.kalodata.com/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/kalo.png" alt="Kalodata" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Kalodata</div>
            <div className="tool-description">Data analysis platform specialized in TikTok ecommerce.</div>
          </a>

          <a href="https://app.winninghunter.com/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/win.png" alt="Winning Hunter" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Winning Hunter</div>
            <div className="tool-description">Spy tool for finding top-performing Facebook and TikTok ads.</div>
          </a>

          <a href="https://www.capcut.com/fr-fr/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/cap.png" alt="Capcut" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Capcut</div>
            <div className="tool-description">
              Create and edit stunning videos for social media and personal projects using CapCut's intuitive interface and advanced editing features.
            </div>
          </a>

          <a href="https://app.sendshort.ai/en/home" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/send.png" alt="SendShort" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">SendShort</div>
            <div className="tool-description">An AI tool for automatically generating and translating video subtitles</div>
          </a>

          <a href="https://noxtools.com/secure/page/Helium10" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/h.png" alt="Helium 10" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Helium 10</div>
            <div className="tool-description">Amazon seller tools for product research and optimization.</div>
          </a>

          <a href="https://app.dropship.io/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/dropship.png" alt="Dropship.io" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Dropship.io</div>
            <div className="tool-description">
              All-in-one Shopify tool to find winning products and track competitors with real-time sales and ad data.
            </div>
          </a>

          <a href="https://app.shophunter.io/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/shophunter.png" alt="Shophunter" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Shophunter</div>
            <div className="tool-description">Sales Tracker Spy &amp; Product Research Tool. Spy on Competitor Sales.</div>
          </a>

          <a href="https://app.tryatria.com/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/atria.png" alt="Atria" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Atria</div>
            <div className="tool-description">
              A tool to discover winning products, ad creatives, store funnels, and market insights — all in one place.
            </div>
          </a>

          <a href="https://app.heygen.com/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-logos/heygen.png" alt="Heygen" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Heygen</div>
            <div className="tool-description">
              AI video creation platform to generate talking avatars, product demos, and multilingual videos from text in minutes.
            </div>
          </a>

          <a href="https://www.fotor.com/fr/" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-logos/fotor.png" alt="Fotor" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Fotor</div>
            <div className="tool-description">
              Create any image you want in real time with our AI image creator. Type your description and turn text into images and AI art
            </div>
          </a>

          <a href="https://app.foreplay.co/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/foreplay.png" alt="ForePlay" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">ForePlay</div>
            <div className="tool-description">Save ads, build briefs and produce high converting Facebook stamp, TikTok ads at scale.</div>
          </a>

          <a href="https://elevenlabs.io/app/sign-in" className="tool-card group" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-images/11.png" alt="ElevenLabs" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">ElevenLabs</div>
            <div className="tool-description">
              AI-powered voice synthesis technology that creates realistic and customizable human-like speech for various applications
            </div>
          </a>

          <a href="https://noxtools.com/secure/page/Runwayml" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-logos/runway.png" alt="Runway" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Runway</div>
            <div className="tool-description">
              AI-driven platform for creating, editing, and enhancing multimedia content, including images and videos.
            </div>
          </a>

          <a href="https://app.trendtrack.io/en/login" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-logos/trendtrack.png" alt="Trendtrack" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Trendtrack</div>
            <div className="tool-description">Track emerging e-commerce trends in real time and spot winning products before they go mainstream.</div>
          </a>

          <a href="https://app.brandsearch.co/" className="tool-card" target="_blank" rel="noopener noreferrer">
            <div className="tool-icon">
              <img src="/tools-logos/brandsearch.png" alt="Brandsearch" className="w-16 h-16 object-contain" />
            </div>
            <div className="tool-name">Brandsearch</div>
            <div className="tool-description">
              Discover and analyze top-performing e-commerce brands to uncover strategies, products, and growth opportunities.
            </div>
            <div className="tool-badge">Newly Added</div>
          </a>
        </div>
      </div>
    </>
  );
}

