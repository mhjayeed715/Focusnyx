import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Resend API key is not configured." },
        { status: 500 }
      );
    }

    const emailSubject = `[Focusnyx Contact] ${subject || "General Inquiry"} from ${name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #1E293B; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #8B5CF6; margin-top: 0;">New Contact Message — Focusnyx</h2>
        <hr style="border: 1px solid #E2E8F0; margin-bottom: 20px;" />
        <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
        <p><strong>Subject:</strong> ${subject || "N/A"}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <div style="background-color: #FFF7D6; border: 2px solid #1E293B; padding: 15px; border-radius: 12px; margin-top: 15px;">
          <h4 style="margin-top: 0; color: #1E293B;">Message:</h4>
          <p style="white-space: pre-wrap; color: #0F172A; line-height: 1.6;">${message}</p>
        </div>
        <footer style="margin-top: 25px; font-size: 12px; color: #64748B; text-align: center;">
          Sent automatically via Focusnyx Contact Us Help Center.
        </footer>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "Focusnyx Help Center <onboarding@resend.dev>",
        to: ["mehrabjayeed715@gmail.com"],
        reply_to: email,
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[Resend API Error]", resendData);
      return NextResponse.json(
        { error: resendData.message || "Failed to send email via Resend." },
        { status: resendResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully!",
      id: resendData.id,
    });
  } catch (err: unknown) {
    console.error("[Contact API Error]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
