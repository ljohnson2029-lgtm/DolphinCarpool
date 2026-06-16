import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Simple in-memory rate limiting (per IP, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const RATE_LIMIT_MAX = 10; // 10 emails per hour per key

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Try to get authenticated user (optional)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let senderEmail = 'anonymous';
    let senderFullName = 'Anonymous User';

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;

        const adminSupabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: userData } = await adminSupabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userData) {
          senderEmail = userData.email || 'unknown';
          senderFullName = `${userData.first_name} ${userData.last_name}`;
        }
      }
    }

    // Rate limit by user ID or IP
    const rateLimitKey = userId || req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(rateLimitKey)) {
      console.log('Rate limited:', rateLimitKey);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many email requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, message, senderName } = await req.json();

    // Use provided senderName if available (for unauthenticated users)
    if (senderName) {
      senderFullName = senderName;
    }

    // Validate inputs
    if (!subject || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject too long (max 200 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message too long (max 2000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Escape HTML to prevent injection
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      throw new Error('Resend API key not configured');
    }

    const SUPPORT_EMAIL = 'dolphincarpool@gmail.com';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dolphin Carpool <noreply@dolphincarpool.org>',
        to: [SUPPORT_EMAIL],
        subject: `[SchoolPool Support] ${escapeHtml(subject)}`,
        html: `
          <h2>New Support Message</h2>
          <p><strong>From:</strong> ${escapeHtml(senderFullName)} (${escapeHtml(senderEmail)})</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr />
          <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Email error:', emailError);
      throw new Error('Failed to send email');
    }

    const data = await emailResponse.json();
    console.log(`Email sent by ${rateLimitKey}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to send email at this time' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
