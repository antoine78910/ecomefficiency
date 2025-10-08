"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Footer = () => {
  const isHomePage = typeof window !== 'undefined' && window.location.pathname === '/';

  return (
    <footer className="bg-black border-t border-white/10 py-8 md:py-12 pl-3 pr-4 md:px-6 lg:px-8">
      <div className="w-full mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-2 pl-1">
            <div className="mb-4 flex flex-col items-start gap-2 md:gap-3">
              <Image
                src="/ecomefficiency.png"
                alt="Ecom Efficiency"
                width={160}
                height={64}
                className="h-10 md:h-12 w-auto -ml-2 md:-ml-4 rounded-xl mix-blend-screen"
                priority
              />
              {/* Social Media Links below the logo */}
              <div className="flex space-x-3 md:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                asChild
              >
                <a href="https://x.com/EcomEfficiency" target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="sr-only">X (Twitter)</span>
                </a>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                asChild
              >
                <a href="https://www.instagram.com/ecom.efficiency/" target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm5 3a5 5 0 100 10 5 5 0 000-10zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM17.5 6a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
                  </svg>
                  <span className="sr-only">Instagram</span>
                </a>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                asChild
              >
                <a href="https://www.tiktok.com/@ecom.efficiency" target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  <span className="sr-only">TikTok</span>
                </a>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                asChild
              >
                <a href="https://discord.com/invite/bKg7J625Sm" target="_blank" rel="noopener noreferrer">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0003 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                  </svg>
                  <span className="sr-only">Discord</span>
                </a>
              </Button>
              </div>
            </div>
            {/* Description removed per request */}

            {/* Empty spacer collapsed */}
          </div>

          {/* Quick Links */}
          <div className="pl-1">
            <h3 className="text-white font-semibold text-xs md:text-sm mb-2 md:mb-3">Quick Links</h3>
            <ul className="space-y-1.5">
              <li><a href="/" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Home</a></li>
              {!isHomePage && (
                <li><a href="/tools" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">All Tools</a></li>
              )}
              <li><a href="/pricing" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Pricing</a></li>
              <li><a href="/affiliate" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Affiliate</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold text-xs md:text-sm mb-2 md:mb-3">Support</h3>
            <ul className="space-y-1.5">
              <li className="flex flex-wrap items-baseline gap-1">
                <span className="text-gray-400 text-xs md:text-sm">Email:</span>
                <a href="mailto:admin@ecomefficiency.com" className="text-gray-200 hover:text-white transition-colors text-xs md:text-sm break-all">admin@ecomefficiency.com</a>
              </li>
              <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Privacy Policy</a></li>
              <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Terms of Service</a></li>
              <li><a href="/terms-of-sale" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm">Terms of Sale</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar (no separator line) */}
        <div className="pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-gray-400 text-xs md:text-sm">© 2025 EcomEfficiency. All rights reserved.</p>
          <CurrentIpBadge />
        </div>
      </div>
    </footer>
  );
};

function CurrentIpBadge() {
  const [country, setCountry] = React.useState<string | null>(null)
  const [browserIp, setBrowserIp] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Get country and IP from ipapi.co
        const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (mounted) {
          if (j?.country) setCountry(j.country)
          if (j?.ip) setBrowserIp(j.ip)
        }
      } catch {
        // Fallback: just get IP
        try {
          const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
          const j = await r.json().catch(() => ({}))
          if (j?.ip && mounted) setBrowserIp(j.ip)
        } catch {}
      }
    })()
    return () => { mounted = false }
  }, [])
  
  return (
    <div className="text-[10px] md:text-xs text-gray-500">
      {country && <span className="text-gray-300 font-semibold">{country}</span>}
      {country && browserIp && <span className="mx-1">·</span>}
      {browserIp && <span className="text-gray-400">{browserIp}</span>}
      {!country && !browserIp && <span>—</span>}
    </div>
  )
}

export default Footer;