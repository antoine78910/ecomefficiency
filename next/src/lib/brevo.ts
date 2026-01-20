import 'server-only';

type BrevoEventProps = {
  email: string;
  eventName: string;
  eventProps?: Record<string, any>;
  contactProps?: Record<string, any>;
};

type BrevoUpsertContactProps = {
  email: string;
  listId: number;
  attributes?: Record<string, any>;
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

/**
 * Upserts a contact and adds it to a specific list.
 * Docs: https://developers.brevo.com/reference/createcontact
 */
export async function upsertBrevoContactToList({ email, listId, attributes }: BrevoUpsertContactProps) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const payload: any = {
    email,
    updateEnabled: true,
    listIds: [listId],
  };
  if (attributes && Object.keys(attributes).length > 0) {
    payload.attributes = attributes;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // 201 Created / 204 No Content are ok; 400 can happen if attributes mismatch.
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[Brevo] Failed to upsert contact ${email} into list ${listId}:`, res.status, err);
    }
  } catch (e: any) {
    console.error(`[Brevo] Error upserting contact ${email} into list ${listId}:`, e?.message || String(e));
  }
}

