import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Rate limiting: 5 emails per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  record.count++;
  return record.count > RATE_LIMIT_MAX;
}

interface VerificationEmailRequest {
  parentEmail: string;
  studentName: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Per-user rate limiting
    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { parentEmail, studentName, code }: VerificationEmailRequest = await req.json();

    // Input validation
    if (!parentEmail || typeof parentEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!studentName || typeof studentName !== 'string' || studentName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid student name' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!code || typeof code !== 'string' || code.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the code actually belongs to a student_parent_links row owned by the caller (the student)
    const { data: linkRow, error: linkErr } = await supabase
      .from("student_parent_links")
      .select("id, verification_code")
      .eq("student_id", user.id)
      .eq("verification_code", code)
      .maybeSingle();

    if (linkErr || !linkRow) {
      return new Response(
        JSON.stringify({ error: "No matching link request found for this user/code" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }



    // Escape HTML to prevent injection in email
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const safeStudentName = escapeHtml(studentName);
    const safeCode = escapeHtml(code);

    console.log('Sending verification email to:', parentEmail);

    const emailResponse = await resend.emails.send({
      from: "SchoolPool <onboarding@resend.dev>",
      to: [parentEmail],
      subject: "Your child wants to connect on SchoolPool",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">SchoolPool Account Link Request</h1>
          <p>Your child <strong>${safeStudentName}</strong> wants to link their SchoolPool account to yours.</p>
          
          <p>They will be able to <strong>VIEW</strong> rides you schedule, but cannot create or modify rides.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
            <h2 style="margin: 10px 0; font-size: 32px; letter-spacing: 8px; color: #2563eb;">${safeCode}</h2>
          </div>
          
          <p><strong>To approve:</strong></p>
          <ol>
            <li>Log into SchoolPool</li>
            <li>Go to Parent Approvals</li>
            <li>Enter this code: <strong>${safeCode}</strong></li>
          </ol>
          
          <p style="color: #666; font-size: 14px;">Code expires in 7 days.</p>
          
          <p>If you didn't expect this request, you can safely ignore this email.</p>
          
          <p style="color: #666; margin-top: 40px;">
            Best regards,<br>
            The SchoolPool Team
          </p>
        </div>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
