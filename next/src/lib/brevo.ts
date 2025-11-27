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
    console.error('[Brevo] ❌ CRITICAL: No API Key configured in environment variables (BREVO_API_KEY is missing)');
    return;
  }

  try {
    // Revert: Brevo Events API expects 'email_id', not 'email'
    const payload: any = {
      event_name: eventName,
      identifiers: { email_id: email },
    };
    
    if (eventProps && Object.keys(eventProps).length > 0) {
      payload.event_properties = eventProps;
    }
    
    if (contactProps && Object.keys(contactProps).length > 0) {
      payload.contact_properties = contactProps;
    }

    const res = await fetch('https://api.brevo.com/v3/events', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Brevo] Failed to track event '${eventName}' for ${email}:`, res.status, err);
      // Log the payload for debugging
      console.error(`[Brevo] Payload was:`, JSON.stringify(payload, null, 2));
    } else {
      // Success (204 No Content or 201 Created)
      const responseText = await res.text().catch(() => '');
      console.log(`[Brevo] ✅ SUCCESS! Tracked event '${eventName}' for ${email} (status: ${res.status})`);
      if (responseText) {
        console.log(`[Brevo] Response:`, responseText);
      }
    }
  } catch (e: any) {
    console.error(`[Brevo] Error tracking event '${eventName}' for ${email}:`, e?.message || String(e));
  }
}

