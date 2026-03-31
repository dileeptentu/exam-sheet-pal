// Validation logic for exam sheet data — supports A3 and R23 regulations

export function validateSheet(ocrData) {
  const regulation = ocrData.regulation || "A3";
  const writtenTotal = ocrData.written_total;
  const bubbleTotal = ocrData.bubble_total;

  let calculatedTotal = 0;

  if (regulation === "R23") {
    // R23: Part A (short answers) + Part B (sub-parts i, ii, iii)
    const partA = ocrData.partA || [];
    const partB = ocrData.partB || [];

    const partATotal = partA.reduce((sum, q) => sum + (q.marks || 0), 0);
    const partBTotal = partB.reduce(
      (sum, q) => sum + (q.i || 0) + (q.ii || 0) + (q.iii || 0),
      0
    );
    calculatedTotal = partATotal + partBTotal;
  } else {
    // A3 (and any other regulation): sum of question totals
    const questions = ocrData.questions || [];
    calculatedTotal = questions.reduce((sum, q) => sum + (q.total || 0), 0);
  }

  const reasons = [];

  if (writtenTotal != null && calculatedTotal !== writtenTotal) {
    reasons.push(`Calculated total (${calculatedTotal}) ≠ Written total (${writtenTotal})`);
  }
  if (bubbleTotal != null && calculatedTotal !== bubbleTotal) {
    reasons.push(`Calculated total (${calculatedTotal}) ≠ Bubble total (${bubbleTotal})`);
  }
  if (writtenTotal != null && bubbleTotal != null && writtenTotal !== bubbleTotal) {
    reasons.push(`Written total (${writtenTotal}) ≠ Bubble total (${bubbleTotal})`);
  }
  if (writtenTotal == null) reasons.push("Written total not found");
  if (bubbleTotal == null) reasons.push("Bubble total not found");

  const bubbleWrittenMatch =
    writtenTotal != null && bubbleTotal != null ? writtenTotal === bubbleTotal : null;

  const status = reasons.length === 0 ? "PASSED" : "FAILED";

  return {
    regulation,
    calculatedTotal,
    writtenTotal,
    bubbleTotal,
    status,
    reasons,
    bubbleWrittenMatch,
  };
}
