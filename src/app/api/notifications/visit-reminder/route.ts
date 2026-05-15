import { NextResponse } from "next/server";

// This is a mock API route for sending visit reminders
// In a real app, this would be triggered by a Cron job (e.g. Vercel Cron)
// and would use an email service like Resend or SendGrid.

export async function POST(request: Request) {
  try {
    const { planId, agentEmail } = await request.json();
    
    // 1. Fetch plan and client data (mocked here)
    // 2. Generate HTML content using the template
    // 3. Send email via provider
    
    console.log(`Sending 15-minute preview to ${agentEmail} for plan ${planId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Reminder email sent successfully",
      previewUrl: `http://localhost:3000/pre-visit/${planId}` // Link to the dashboard
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }
}
