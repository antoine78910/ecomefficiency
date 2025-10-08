import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, name, plan, tier, invoiceUrl } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      console.error('[send-welcome-email] Resend API key not configured');
      return NextResponse.json({ success: false, error: "resend_not_configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const planName = tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Premium';
    const firstName = name || 'there';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ecom Efficiency!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; overflow: hidden;">
          
          <!-- Header with logo -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(149, 65, 224, 0.1) 0%, transparent 100%);">
              <img src="https://ecomefficiency.com/ecomefficiency.png" alt="Ecom Efficiency" style="height: 48px; width: auto; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; text-shadow: 0 0 20px rgba(149, 65, 224, 0.3);">
                Welcome to Ecom Efficiency! 🚀
              </h1>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                Thank you for subscribing to the <strong style="color: #ab63ff;">${planName} Plan</strong>! 🎉
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
                You now have access to <strong>${tier === 'starter' ? '40+' : '50+'} premium tools</strong> including ChatGPT, Midjourney, Helium10, ${tier === 'pro' ? 'Pipiads, Runway, ElevenLabs, ' : ''}and many more!
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 32px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="https://app.ecomefficiency.com/" style="display: inline-block; padding: 16px 32px; background: linear-gradient(to bottom, #9541e0, #7c30c7); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; border: 1px solid #9541e0; box-shadow: 0 4px 24px rgba(149, 65, 224, 0.45);">
                      Access Your Tools Now →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Next section -->
              <div style="margin: 32px 0; padding: 24px; background: rgba(149, 65, 224, 0.08); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px;">
                <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #ab63ff;">
                  🎯 What's Next?
                </h2>
                <ol style="margin: 0; padding-left: 20px; color: #d0d0d0; font-size: 14px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">Download AdsPower from your dashboard</li>
                  <li style="margin-bottom: 8px;">Use the credentials provided in your app to sign in</li>
                  <li style="margin-bottom: 8px;">Access all ${tier === 'starter' ? '40+' : '50+'} tools from a single browser profile</li>
                  <li>Start saving thousands on your monthly subscriptions! 💰</li>
                </ol>
              </div>

              <!-- Support section -->
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Need help? Join our <a href="https://discord.gg/your-discord" style="color: #ab63ff; text-decoration: none;">Discord community</a> or reply to this email.
              </p>

              ${invoiceUrl ? `
              <!-- Invoice Button -->
              <table role="presentation" style="margin: 24px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${invoiceUrl}" style="display: inline-block; padding: 12px 24px; background: rgba(139, 92, 246, 0.15); color: #ab63ff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
                      📄 View Your Invoice
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.3);">
              <p style="margin: 0 0 8px; font-size: 12px; color: #888888;">
                Ecom Efficiency - Save thousands on your Ecom tools
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                <a href="https://app.ecomefficiency.com/subscription" style="color: #8b5cf6; text-decoration: none;">Manage subscription</a> · 
                <a href="https://ecomefficiency.com" style="color: #8b5cf6; text-decoration: none;">Website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Welcome to Ecom Efficiency!

Hi ${firstName},

Thank you for subscribing to the ${planName} Plan!

You now have access to ${tier === 'starter' ? '40+' : '50+'} premium tools including ChatGPT, Midjourney, Helium10, ${tier === 'pro' ? 'Pipiads, Runway, ElevenLabs, ' : ''}and many more!

What's Next?
1. Download AdsPower from your dashboard
2. Use the credentials provided in your app to sign in
3. Access all ${tier === 'starter' ? '40+' : '50+'} tools from a single browser profile
4. Start saving thousands on your monthly subscriptions!

Access your tools: https://app.ecomefficiency.com/

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Need help? Join our Discord community or reply to this email.

---
Ecom Efficiency - Save thousands on your Ecom tools
Manage subscription: https://app.ecomefficiency.com/subscription
    `;

    const result = await resend.emails.send({
      from: 'Ecom Efficiency <onboarding@ecomefficiency.com>',
      to: email,
      subject: `🎉 Welcome to Ecom Efficiency ${planName} Plan!`,
      html: htmlContent,
      text: textContent,
    });

    console.log('[send-welcome-email] ✅ Email sent:', { 
      email, 
      plan: planName,
      emailId: result.data?.id 
    });

    return NextResponse.json({ 
      success: true, 
      emailId: result.data?.id 
    });

  } catch (e: any) {
    console.error('[send-welcome-email] Error:', e);
    return NextResponse.json({ 
      success: false, 
      error: e.message || 'unknown_error' 
    }, { status: 500 });
  }
}

