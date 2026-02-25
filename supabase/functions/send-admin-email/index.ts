import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header from frontend');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Direct token validation to prevent client-header leakage bugs
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error(`Unauthorized (Auth Context): ${authError?.message || 'Invalid user token'}`);
    }

    const payload = await req.json();
    const emails = payload.emails;
    const message = payload.message;
    const subject = payload.subject;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new Error('No recipient emails provided');
    }

    if (!message) {
      throw new Error('No message content provided');
    }
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing from environment');
    }

    const htmlMessage = message.replace(/\n/g, '<br/>');

    const BATCH_SIZE = 49;
    const emailChunks = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      emailChunks.push(emails.slice(i, i + BATCH_SIZE));
    }

    let lastData = null;
    for (const chunk of emailChunks) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'GradeX Admin <onboarding@resend.dev>',
          to: 'GradeX Community <onboarding@resend.dev>', // Hidden primary recipient
          bcc: chunk, // Users placed in BCC for privacy and hitting Resend's 50 recipient limit per batch
          subject: subject || 'Notice from GradeX Administrator',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
               ${htmlMessage}
               <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
               <p style="text-align: center; color: #888; font-size: 12px;">GradeX Administration</p>
            </div>
          `,
        }),
      });

      const resendData = await res.json();
      lastData = resendData;
      
      if (!res.ok) {
          return new Response(JSON.stringify({ success: false, error: resendData.message || res.statusText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
      }
    }

    return new Response(JSON.stringify({ success: true, data: lastData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Execution Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'An unexpected error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Return 400 so the UI can safely read the error text instead of failing blindly on a 500
      }
    );
  }
});
