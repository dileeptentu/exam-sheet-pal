import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert OCR system for university exam valuation sheets (MVGR College format).
Analyze the exam sheet image with EXTREME precision and extract ALL data into structured JSON.

STEP 1: DETECT THE REGULATION
- Look for regulation text like "R23", "A3", "R20", etc. in the exam title or header.
- If the exam title contains "R23" → regulation is "R23"
- If the exam title contains "A3" → regulation is "A3"
- Otherwise, use whatever regulation code is visible, or null.

STEP 2: EXTRACT DATA BASED ON REGULATION

FOR A3 REGULATION:
- Questions are numbered sequentially (1, 2, 3, ...).
- Each question has sub-columns "a", "b", "c" and a "Total" column.
- Extract each question with its total from the Total column.
- Return questions in the "questions" array with q_no and total.

FOR R23 REGULATION:
- Sheet has TWO sections: Part A and Part B.
- Part A: Short-answer questions (typically 2 marks each). Usually 5 questions (Q1-Q5 or Q1a, Q2a, etc.). Each has a single mark value.
- Part B: Long-answer questions with sub-parts i, ii, iii. Usually 5 questions (Q6-Q10 or paired). Each sub-part has its own mark.
- Return Part A questions in "partA" array with q_no and marks.
- Return Part B questions in "partB" array with q_no and sub-parts i, ii, iii.

CRITICAL EXTRACTION RULES:
1. Read EVERY handwritten digit carefully. Distinguish 0,1,2,3,4,5,6,7,8,9.
2. For "Total Marks (in figures)" - the handwritten grand total at the bottom.
3. For OMR/bubble total: read which circles (0-9) are filled for tens and units place.
4. If a cell is empty, has a dash, or is not applicable, use null.
5. All marks must be integers, never strings.
6. Cross-verify: sum of question marks should approximately match written_total and bubble_total.

RETURN FORMAT:

For A3 regulation:
{
  "regulation": "A3",
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
    { "q_no": 1, "total": 8 },
    { "q_no": 2, "total": 6 }
  ],
  "written_total": number or null,
  "bubble_total": number or null,
  "marks_in_words": { "tens_place": "string or null", "units_place": "string or null" }
}

For R23 regulation:
{
  "regulation": "R23",
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
  "partA": [
    { "q_no": 1, "marks": 2 },
    { "q_no": 2, "marks": 2 }
  ],
  "partB": [
    { "q_no": 6, "i": 3, "ii": 4, "iii": 3 },
    { "q_no": 7, "i": 5, "ii": 3, "iii": 2 }
  ],
  "written_total": number or null,
  "bubble_total": number or null,
  "marks_in_words": { "tens_place": "string or null", "units_place": "string or null" }
}

CRITICAL: Return ONLY the JSON object, no markdown, no code blocks, no explanation.
CRITICAL: Use actual number values for all mark fields.`;

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
        model: "google/gemini-2.5-pro",
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
                text: "Extract all marks and metadata from this exam valuation sheet. First identify the regulation (R23, A3, etc.) from the header. Then extract marks according to that regulation's format. Return ONLY valid JSON.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
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
