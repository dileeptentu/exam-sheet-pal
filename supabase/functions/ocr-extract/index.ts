import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert OCR system for MVGR College university exam valuation sheets.
Extract ALL data with EXTREME precision into structured JSON.

STEP 1: DETECT REGULATION
Look for "R23", "A3", "R20" etc. in the Examination header line (e.g. "B.Tech. IV SEMESTER REGULAR (R23)").

STEP 2: UNDERSTAND THE R23 SHEET LAYOUT

The R23 sheet has ONE table with these columns (left to right):
  PART A | PART B | i | ii | iii | Total

The table has exactly 10 rows numbered 1 through 10.

PART A column (leftmost):
- Contains 10 individual short-answer marks, one per row (rows 1-10).
- Each mark is typically 0, 1, or 2.
- Read ALL 10 marks carefully from top to bottom.

PART B column:
- Contains 5 long-answer questions: Q1, Q2, Q3, Q4, Q5.
- Each question spans TWO rows: option A (odd row) and option B (even row).
  - Q1: rows 1 (A) and 2 (B)
  - Q2: rows 3 (A) and 4 (B)
  - Q3: rows 5 (A) and 6 (B)
  - Q4: rows 7 (A) and 8 (B)
  - Q5: rows 9 (A) and 10 (B)
- Only ONE option (A or B) is answered per question. The other row is empty/blank.
- The answered option has marks in columns i, ii, iii.

i, ii, iii columns:
- Sub-part marks for the answered Part B option.
- Empty/blank cells = 0 (the student did not answer that sub-part).

Total column (rightmost in the marks area):
- Shows the total for each Part B row (sum of i + ii + iii for that row).
- Empty rows have no total.

ALSO EXTRACT:
- "Total Marks (PART A & B)" — the handwritten grand total at the bottom of the table.
- OMR bubble total: two columns of filled circles (0-9) for tens place and units place. Read which circle is filled/darkened in each column.
- "Sl No of Answer Book in the Bundle" — the student/script number.
- Control Bundle No — large printed number at bottom left.
- Valuation — 1 or 2, shown on the right side.
- Marks in Words — tens place and units place words at the bottom.
- Metadata: exam title, subject code, subject name, examiner name, scrutinizer name.

CRITICAL RULES:
1. Read EVERY handwritten digit carefully. Pay attention to 0 vs empty, 1 vs 7, 3 vs 8, 5 vs 6.
2. For Part A, read ALL 10 rows. Do NOT skip any.
3. For Part B, identify which option (A or B) was answered for each question.
4. If a cell is genuinely empty or has a dash, use 0 for marks or null for metadata.
5. All marks MUST be integers.
6. Cross-verify: sum of 10 Part A marks + sum of 5 Part B totals should equal the written total and bubble total.

STEP 3: FOR A3 REGULATION
- Questions numbered sequentially (1, 2, 3, ...).
- Each question has sub-columns a, b, c and a Total column.
- Extract each question with q_no and total.

RETURN FORMAT FOR R23:
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
    { "q_no": 2, "marks": 2 },
    { "q_no": 3, "marks": 2 },
    { "q_no": 4, "marks": 1 },
    { "q_no": 5, "marks": 0 },
    { "q_no": 6, "marks": 2 },
    { "q_no": 7, "marks": 2 },
    { "q_no": 8, "marks": 0 },
    { "q_no": 9, "marks": 2 },
    { "q_no": 10, "marks": 1 }
  ],
  "partB": [
    { "q_no": 1, "option": "B", "i": 3, "ii": 0, "iii": 0, "total": 3 },
    { "q_no": 2, "option": "B", "i": 3, "ii": 0, "iii": 0, "total": 3 },
    { "q_no": 3, "option": "A", "i": 3, "ii": 0, "iii": 0, "total": 3 },
    { "q_no": 4, "option": "A", "i": 4, "ii": 0, "iii": 0, "total": 4 },
    { "q_no": 5, "option": "B", "i": 5, "ii": 1, "iii": 0, "total": 4 }
  ],
  "written_total": 31,
  "bubble_total": 31,
  "marks_in_words": { "tens_place": "three", "units_place": "one" }
}

RETURN FORMAT FOR A3:
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
  "written_total": 42,
  "bubble_total": 42,
  "marks_in_words": { "tens_place": "four", "units_place": "two" }
}

CRITICAL: Return ONLY the JSON object. No markdown, no code blocks, no explanation.`;

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
                text: "Extract all marks and metadata from this exam valuation sheet. First identify the regulation from the header. For R23: read all 10 Part A marks and all 5 Part B questions with their i, ii, iii sub-marks and totals. Return ONLY valid JSON.",
              },
            ],
          },
        ],
        temperature: 0.05,
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
