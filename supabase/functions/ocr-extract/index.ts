import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert OCR system for university exam valuation sheets (MVGR College format). 
Analyze the exam sheet image and extract ALL data into a structured JSON format.

IMPORTANT RULES:
1. Extract EVERY question's marks including all sub-parts (a, b, c OR i, ii, iii).
2. The sheet may have Part A and Part B sections, or just columns a, b, c with totals.
3. Look for handwritten marks in each cell carefully.
4. Extract the "Total Marks (in figures)" - the written total at the bottom.
5. Extract the bubble/OMR total from the filled circles on the right side (Total Marks column with bubbles 0-9).
6. Extract "Marks in Words" (Tens Place and Units Place).
7. Extract metadata: Exam name, Branch, Subject Code, Subject Name, Examiner Name, Scrutinizer Name.
8. Extract Bundle Number / Control Bundle No.
9. Extract Valuation number (1 or 2) from the right side.
10. If a field is not visible or not present, use null.
11. For marks, use numbers. If a cell is empty or has a dash, use null.
12. Student/Script number if visible.

Return ONLY valid JSON with this exact structure:
{
  "bundle_no": "string or null",
  "valuation": 1 or 2 or null,
  "student_no": "string or null",
  "metadata": {
    "exam": "string or null",
    "branch": "string or null",
    "subject_code": "string or null",
    "subject_name": "string or null",
    "examiner_name": "string or null",
    "scrutinizer_name": "string or null",
    "month_year": "string or null"
  },
  "questions": [
    {
      "q_no": 1,
      "parts": {
        "a": number or null,
        "b": number or null,
        "c": number or null
      },
      "sub_parts": {
        "i": number or null,
        "ii": number or null,
        "iii": number or null
      },
      "part_a_mark": number or null,
      "part_b_mark": number or null,
      "total": number or null
    }
  ],
  "written_total": number or null,
  "bubble_total": number or null,
  "marks_in_words": {
    "tens_place": "string or null",
    "units_place": "string or null"
  }
}

CRITICAL: Return ONLY the JSON object, no markdown, no code blocks, no explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, mime_type } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime_type || "image/png"};base64,${image_base64}`,
                },
              },
              {
                type: "text",
                text: "Extract all marks and metadata from this exam valuation sheet. Return ONLY valid JSON.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean potential markdown wrapping
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
