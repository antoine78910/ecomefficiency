/**
 * Helper function to safely call DataFast tracking
 * Only calls DataFast on the main domain to prevent 403 errors on subdomains
 */
export function safeDataFastCall(event: string, metadata?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  try {
    const hostname = window.location.hostname;
    // Only call DataFast on main domain
    const isMainDomain = 
      hostname === 'ecomefficiency.com' || 
      hostname === 'www.ecomefficiency.com' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';
    
    if (!isMainDomain) {
      return; // Skip DataFast calls on subdomains
    }

    const datafast = (window as any)?.datafast;
    if (datafast && typeof datafast === 'function') {
      datafast(event, metadata || {});
    }
  } catch (error) {
    // Silently fail - analytics should not break the app
  }
}


