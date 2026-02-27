// Validation logic for exam sheet data

export function validateSheet(ocrData) {
  const questions = ocrData.questions || [];
  const highestMarks = [];
  let calculatedTotal = 0;

  for (const q of questions) {
    // Collect all marks for this question
    const allMarks = [];

    // Part marks (a, b, c)
    if (q.parts) {
      if (q.parts.a != null) allMarks.push(q.parts.a);
      if (q.parts.b != null) allMarks.push(q.parts.b);
      if (q.parts.c != null) allMarks.push(q.parts.c);
    }

    // Sub parts (i, ii, iii)
    if (q.sub_parts) {
      if (q.sub_parts.i != null) allMarks.push(q.sub_parts.i);
      if (q.sub_parts.ii != null) allMarks.push(q.sub_parts.ii);
      if (q.sub_parts.iii != null) allMarks.push(q.sub_parts.iii);
    }

    // Part A / Part B marks
    if (q.part_a_mark != null) allMarks.push(q.part_a_mark);
    if (q.part_b_mark != null) allMarks.push(q.part_b_mark);

    // Total for question
    if (q.total != null) allMarks.push(q.total);

    // Take highest mark for this question
    const highest = allMarks.length > 0 ? Math.max(...allMarks) : 0;
    highestMarks.push({ q_no: q.q_no, highest, allMarks });
    calculatedTotal += highest;
  }

  const writtenTotal = ocrData.written_total;
  const bubbleTotal = ocrData.bubble_total;

  // Check bubble vs written match
  const bubbleWrittenMatch = writtenTotal != null && bubbleTotal != null
    ? writtenTotal === bubbleTotal
    : null;

  // Check calculated vs written match
  const calcWrittenMatch = writtenTotal != null
    ? calculatedTotal === writtenTotal
    : null;

  // Check calculated vs bubble match
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
