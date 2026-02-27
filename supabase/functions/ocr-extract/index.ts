import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert OCR system for university exam valuation sheets (MVGR College format).
You must analyze the exam sheet image with EXTREME precision and extract ALL data into structured JSON.

SHEET LAYOUT UNDERSTANDING:
- These sheets have a grid/table structure with question numbers in rows.
- There are TWO common formats:
  FORMAT 1 (A3 regulation): Columns are typically "Q.No", then sub-columns "a", "b", "c", and a "Total" column per question.
  FORMAT 2 (R23 regulation): Columns may include "Q.No", sub-columns like "a"/"b" for choice questions, sub-sub-parts "i", "ii", "iii", and section-wise Part A / Part B marks.
- R23 sheets often have 10 questions with paired questions (1&2, 3&4, 5&6, 7&8, 9&10) where students answer one from each pair.
- In R23, questions may have Part A (short answer, 2 marks) and Part B (long answer, up to 8 marks) with sub-parts.

CRITICAL EXTRACTION RULES:
1. Read EVERY handwritten digit VERY carefully. Pay close attention to distinguish between 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.
2. For each question row, extract ALL marks visible in every column/sub-column.
3. The "total" for each question should be the value written in that question's total column - do NOT calculate it yourself.
4. Extract "Total Marks (in figures)" - this is the handwritten grand total at the bottom of the marks area.
5. Extract the bubble/OMR total: look at the filled/darkened circles in the OMR grid (columns of digits 0-9). Read the tens digit and units digit from which circles are filled.
6. Extract "Marks in Words" from the tens place and units place fields.
7. Metadata: Exam name, Branch, Subject Code, Subject Name, Examiner Name, Scrutinizer Name, Month/Year.
8. Bundle Number / Control Bundle No - usually printed or stamped at top.
9. Valuation number (1 or 2) - usually marked/circled on the right side.
10. Student/Script number if visible (often handwritten at top).
11. If a cell is genuinely empty, has a dash "-", or is not applicable, use null.
12. For marks, always use integer numbers. Never use strings for marks.
13. When reading the OMR bubbles: identify which bubble (0-9) is filled for tens place and units place separately, then combine to get bubble_total.
14. IMPORTANT: Cross-verify your reading. The sum of all question totals should approximately match the written_total and bubble_total. If they don't match, re-examine the marks more carefully.

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
        "a": "number or null - marks in column a",
        "b": "number or null - marks in column b",
        "c": "number or null - marks in column c"
      },
      "sub_parts": {
        "i": "number or null",
        "ii": "number or null",
        "iii": "number or null"
      },
      "part_a_mark": "number or null - Part A section mark if separate",
      "part_b_mark": "number or null - Part B section mark if separate",
      "total": "number or null - the value in the Total column for this question"
    }
  ],
  "written_total": "number or null - the handwritten grand total in figures",
  "bubble_total": "number or null - the total from OMR filled bubbles",
  "marks_in_words": {
    "tens_place": "string or null",
    "units_place": "string or null"
  }
}

CRITICAL: Return ONLY the JSON object, no markdown, no code blocks, no explanation.
CRITICAL: Use actual number values (not strings) for all mark fields. Example: "a": 5, not "a": "5".`;

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
                text: "Extract all marks and metadata from this exam valuation sheet. Read every handwritten digit carefully. Pay special attention to the OMR bubble section - identify which circles are filled. Cross-verify that question totals sum to match the written total. Return ONLY valid JSON.",
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
