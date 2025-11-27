import 'server-only';

type BrevoEventProps = {
  email: string;
  eventName: string;
  eventProps?: Record<string, any>;
  contactProps?: Record<string, any>;
};

/**
 * Sends a custom event to Brevo (Sendinblue) using the v3 Events API.
 * Docs: https://developers.brevo.com/reference/createevent
 */
export async function trackBrevoEvent({ email, eventName, eventProps, contactProps }: BrevoEventProps) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    // Fail silently in development if no key, but log a warning
    if (process.env.NODE_ENV === 'development') console.warn('[Brevo] No API Key configured');
    return;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/events', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        event_name: eventName,
        identifiers: { email_id: email },
        event_properties: eventProps,
        contact_properties: contactProps,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Brevo] Failed to track event '${eventName}' for ${email}:`, res.status, err);
    } else {
      // Success (204 No Content)
      console.log(`[Brevo] ✅ SUCCESS! Tracked event '${eventName}' for ${email}`);
    }
  } catch (e: any) {
    console.error(`[Brevo] Error tracking event '${eventName}' for ${email}:`, e?.message || String(e));
  }
}

