export async function postGoal(name: string, metadata?: Record<string, string>) {
  try {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname;
    // Only fire on production domain unless explicitly enabled
    const enabled = host.includes('ecomefficiency');
    if (!enabled) return;

    // Call client queue if present (best effort)
    try { (window as any)?.datafast?.(name, metadata || {}); } catch {}

    await fetch('/api/analytics/goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, metadata })
    });
  } catch {}
}


