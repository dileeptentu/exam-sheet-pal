// Validation logic for exam sheet data

export function validateSheet(ocrData) {
  const questions = ocrData.questions || [];
  const highestMarks = [];
  let calculatedTotal = 0;

  for (const q of questions) {
    // Prefer the question's own total if available (most reliable from OCR)
    if (q.total != null && q.total > 0) {
      highestMarks.push({ q_no: q.q_no, highest: q.total, allMarks: [q.total] });
      calculatedTotal += q.total;
      continue;
    }

    // Fallback: collect all marks for this question and take highest
    const allMarks = [];

    if (q.parts) {
      if (q.parts.a != null) allMarks.push(q.parts.a);
      if (q.parts.b != null) allMarks.push(q.parts.b);
      if (q.parts.c != null) allMarks.push(q.parts.c);
    }

    if (q.sub_parts) {
      if (q.sub_parts.i != null) allMarks.push(q.sub_parts.i);
      if (q.sub_parts.ii != null) allMarks.push(q.sub_parts.ii);
      if (q.sub_parts.iii != null) allMarks.push(q.sub_parts.iii);
    }

    if (q.part_a_mark != null) allMarks.push(q.part_a_mark);
    if (q.part_b_mark != null) allMarks.push(q.part_b_mark);

    const highest = allMarks.length > 0 ? Math.max(...allMarks) : 0;
    highestMarks.push({ q_no: q.q_no, highest, allMarks });
    calculatedTotal += highest;
  }

  const writtenTotal = ocrData.written_total;
  const bubbleTotal = ocrData.bubble_total;

  const bubbleWrittenMatch = writtenTotal != null && bubbleTotal != null
    ? writtenTotal === bubbleTotal
    : null;

  const calcWrittenMatch = writtenTotal != null
    ? calculatedTotal === writtenTotal
    : null;

  const calcBubbleMatch = bubbleTotal != null
    ? calculatedTotal === bubbleTotal
    : null;

  const allMatch = bubbleWrittenMatch === true && calcWrittenMatch === true;

  const reasons = [];
  if (bubbleWrittenMatch === false) {
    reasons.push(`Written total (${writtenTotal}) ≠ Bubble total (${bubbleTotal})`);
  }
  if (calcWrittenMatch === false) {
    reasons.push(`Calculated total (${calculatedTotal}) ≠ Written total (${writtenTotal})`);
  }
  if (calcBubbleMatch === false) {
    reasons.push(`Calculated total (${calculatedTotal}) ≠ Bubble total (${bubbleTotal})`);
  }
  if (writtenTotal == null) reasons.push("Written total not found");
  if (bubbleTotal == null) reasons.push("Bubble total not found");

  const status = allMatch ? "PASSED" : "FAILED";

  return {
    calculatedTotal,
    writtenTotal,
    bubbleTotal,
    highestMarks,
    status,
    reasons,
    bubbleWrittenMatch,
  };
}
