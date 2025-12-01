export async function postGoal(name: string, metadata?: Record<string, string>) {
  try {
    if (typeof window === 'undefined') return;
    
    let host: string;
    try {
      host = window.location.hostname;
    } catch {
      // Invalid window.location, skip
      return;
    }
    
    // Only fire on production domain unless explicitly enabled
    const enabled = host.includes('ecomefficiency');
    if (!enabled) return;

    // Call client queue if present (best effort)
    try { (window as any)?.datafast?.(name, metadata || {}); } catch {}

    // Validate name before sending
    if (!name || typeof name !== 'string') return;
    
    try {
      const response = await fetch('/api/analytics/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, metadata: metadata || {} })
      });
      
      // Check if response is ok, but don't throw on errors (analytics should be non-blocking)
      if (!response.ok) {
        console.warn('[Analytics] Goal tracking failed:', response.status, response.statusText);
      }
    } catch (fetchError) {
      // Silently fail analytics - don't break the page
      console.warn('[Analytics] Fetch error:', fetchError);
    }
  } catch (error) {
    // Silently handle all errors
    console.warn('[Analytics] postGoal error:', error);
  }
}


