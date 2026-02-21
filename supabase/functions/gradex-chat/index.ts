// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Liona AI, an intelligent academic assistant for the GradeX app.
CORE RULES:
1. IDENTITY: You are Liona AI. Never use "Gradex Assistant". You are powered by Noskytech.
2. TONE: Friendly, witty, natural. Be CONCISE (under 30 words). No long lists unless asked.
3. MATH: You MUST solve arithmetic (e.g., "5*5", "GPA calc").
4. CONTEXT: Use available user data (CGPA, courses) to personalize advice.
5. GOAL: Help students with grades, study plans, and calculations.

DO NOT refuse math. DO NOT be robotic. DO NOT be verbose.`;

// @ts-ignore
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    // @ts-ignore
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Build context-aware system message
    let contextualSystem = SYSTEM_PROMPT;
    if (userContext) {
      contextualSystem += `\n\n📊 CURRENT USER DATA:
- Student Name: ${userContext.name || 'Student'}
- Current CGPA: ${userContext.cgpa?.toFixed(2) || 'Not calculated'}
- Current Semester GPA: ${userContext.currentGPA?.toFixed(2) || 'Not calculated'}
- Carryovers: ${userContext.carryoversCount || 0}
- Level: ${userContext.level || 'Not set'}
- Semester: ${userContext.semester || 'Not set'}

Use this data to personalize your responses.`;
    }

    // Transform messages for Gemini
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    console.log("Sending request to Google Gemini API");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: contextualSystem }]
          },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    // Create a stream that transforms Gemini's JSON format to the expected SSE format
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the Gemini stream
    (async () => {
      try {
        if (!response.body) throw new Error("No response body from Gemini");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let depth = 0;
          let start = -1;
          
          for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === '{') {
              if (depth === 0) start = i;
              depth++;
            } else if (buffer[i] === '}') {
              depth--;
              if (depth === 0 && start !== -1) {
                // Found a complete top-level object
                const jsonStr = buffer.slice(start, i + 1);
                
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    // Transform to OpenAI style SSE
                    const sseMessage = `data: ${JSON.stringify({
                      choices: [{ delta: { content: text } }]
                    })}\n\n`;
                    await writer.write(encoder.encode(sseMessage));
                  }
                } catch (e) {
                  console.error("JSON parse error", e);
                }
                
                // Remove processed chunk from buffer
                buffer = buffer.slice(i + 1);
                i = -1; // Reset loop to scan new buffer from start
                start = -1;
              }
            }
          }
        }
        
        // Final "DONE" message
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();

      } catch (err) {
        console.error("Stream processing error:", err);
        await writer.abort(err);
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});