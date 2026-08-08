import type { Metadata } from "next";
import Script from "next/script";
import PropToolsGrid from "./PropToolsGrid";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export const metadata: Metadata = {
  title: "Ecom Efficiency Tools (Demo)",
  description: "Ecom Efficiency full tools hub — demo.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/prop" },
  openGraph: {
    title: "Ecom Efficiency Tools (Demo)",
    description: "Ecom Efficiency full tools hub — demo.",
    url: "/prop",
    type: "website",
  },
};

export default function PropToolsHubDemoPage() {
  const ASSET_VERSION = "20260808-prop-logos-v2";
  return (
    <>
      {/* Font Awesome (as in legacy HTML) */}
      <Script src="https://kit.fontawesome.com/a076d05399.js" crossOrigin="anonymous" strategy="afterInteractive" />

      {/* Legacy CSS (style.css) */}
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;700;1000&family=Montserrat:wght@400;800&family=Open+Sans:wght@400;600&display=swap');

body {
  font-family: Arial, sans-serif;
  background-color: #ffffff;
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
  font-weight: 700;
  font-size: 30px;
}

.tools-grid {
  display: grid;
  /* Responsive: add/remove columns as space changes (incl. zoom) */
  /* Tuned so normal desktop fits 6 per row more often */
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  /* Small side gutter so cards don't touch edges */
  padding: 16px 12px;
  box-sizing: border-box;
  justify-items: center;
}

@media (min-width: 640px) {
  .tools-grid {
    padding: 16px 16px;
  }
}

/* Default desktop: keep 6 per row (no 8) */
@media (min-width: 1024px) {
  .tools-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

/* Ultra-wide / zoomed out: allow more columns */
@media (min-width: 1700px) {
  .tools-grid {
    /* Avoid stretching cards: keep a fixed max column width */
    grid-template-columns: repeat(auto-fit, minmax(170px, 240px));
    justify-content: center;
  }
}

.tool-icon img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  transform-origin: center;
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
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.10);
  padding: 12px;
  text-decoration: none;
  color: #333;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  border: 1px solid black;
  will-change: transform;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  position: relative;
  height: 260px; /* keep cards the same height (a bit taller) */
  overflow: hidden;
  width: 100%;
  max-width: 240px; /* prevents overly wide/elongated cards */
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
  border-color: #333;
}

@media (prefers-reduced-motion: reduce) {
  .tool-card {
    transition: none;
  }
  .tool-card:hover {
    transform: none;
  }
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 0 0 auto;
  height: 150px; /* consistent logo area across cards */
  padding: 10px;
}

.logo-small {
  transform: scale(0.88);
}

.logo-large {
  transform: scale(1.12);
}

.brain-logo {
  transform: scale(1.55);
  max-width: 100%;
  max-height: 100%;
}

.claude-logo {
  width: auto !important;
  height: auto !important;
  max-width: 205px;
  max-height: 78px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  transform: none;
}

.tool-name {
  font-size: 13px;
  margin: 0;
  text-align: left;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-description {
  font-size: 10px;
  line-height: 1.2;
  margin: 0;
  font-family: 'Open Sans', sans-serif;
  color: #464646;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* Ensure SEO card shows "Includes" + "And more" fully */
.tool-card.seo-card .tool-description {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}

.tool-includes {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 6px;
}

.tool-includes img {
  width: 18px;
  height: 18px;
  margin: 0; /* no overlap */
}

.tool-badge {
  background-color: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  position: absolute;
  right: 10px;
  top: 10px;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
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

        <h1 className="text-center mt-8">Ecom Efficiency</h1>

        <PropToolsGrid assetVersion={ASSET_VERSION} />
      </div>
    </>
  );
}