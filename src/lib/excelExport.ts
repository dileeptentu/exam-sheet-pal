import * as XLSX from "xlsx";

export function exportToExcel(results) {
  // Sheet 1: Full data
  const fullData = results.map((r, i) => {
    const row = {
      "S.No": i + 1,
      "Bundle No": r.ocrData?.bundle_no || "N/A",
      "Valuation": r.ocrData?.valuation || "N/A",
      "Student No": r.ocrData?.student_no || "N/A",
      "Exam": r.ocrData?.metadata?.exam || "",
      "Branch": r.ocrData?.metadata?.branch || "",
      "Subject Code": r.ocrData?.metadata?.subject_code || "",
      "Subject Name": r.ocrData?.metadata?.subject_name || "",
      "Examiner": r.ocrData?.metadata?.examiner_name || "",
      "Scrutinizer": r.ocrData?.metadata?.scrutinizer_name || "",
    };

    // Add question marks
    const questions = r.ocrData?.questions || [];
    for (const q of questions) {
      const prefix = `Q${q.q_no}`;
      if (q.parts) {
        if (q.parts.a != null) row[`${prefix}_a`] = q.parts.a;
        if (q.parts.b != null) row[`${prefix}_b`] = q.parts.b;
        if (q.parts.c != null) row[`${prefix}_c`] = q.parts.c;
      }
      if (q.sub_parts) {
        if (q.sub_parts.i != null) row[`${prefix}_i`] = q.sub_parts.i;
        if (q.sub_parts.ii != null) row[`${prefix}_ii`] = q.sub_parts.ii;
        if (q.sub_parts.iii != null) row[`${prefix}_iii`] = q.sub_parts.iii;
      }
      if (q.part_a_mark != null) row[`${prefix}_PartA`] = q.part_a_mark;
      if (q.part_b_mark != null) row[`${prefix}_PartB`] = q.part_b_mark;
      if (q.total != null) row[`${prefix}_Total`] = q.total;
    }

    // Highest marks
    if (r.validation?.highestMarks) {
      for (const h of r.validation.highestMarks) {
        row[`Q${h.q_no}_Highest`] = h.highest;
      }
    }

    row["Calculated Total"] = r.validation?.calculatedTotal ?? "";
    row["Written Total"] = r.validation?.writtenTotal ?? "";
    row["Bubble Total"] = r.validation?.bubbleTotal ?? "";
    row["Bubble = Written"] = r.validation?.bubbleWrittenMatch != null
      ? (r.validation.bubbleWrittenMatch ? "YES" : "NO")
      : "N/A";
    row["Status"] = r.validation?.status || "ERROR";
    row["Remarks"] = r.validation?.reasons?.join("; ") || (r.error ? r.error : "All totals match");
    row["Marks in Words (Tens)"] = r.ocrData?.marks_in_words?.tens_place || "";
    row["Marks in Words (Units)"] = r.ocrData?.marks_in_words?.units_place || "";

    return row;
  });

  // Sheet 2: Summary
  const total = results.length;
  const passed = results.filter((r) => r.validation?.status === "PASSED").length;
  const failed = results.filter((r) => r.validation?.status === "FAILED").length;
  const errors = results.filter((r) => r.error).length;

  const summaryData = [
    { Metric: "Total Sheets Processed", Value: total },
    { Metric: "Passed", Value: passed },
    { Metric: "Failed", Value: failed },
    { Metric: "Errors", Value: errors },
    { Metric: "Pass Rate", Value: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : "0%" },
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(fullData);
  const ws2 = XLSX.utils.json_to_sheet(summaryData);

  XLSX.utils.book_append_sheet(wb, ws1, "Full Data");
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  XLSX.writeFile(wb, `exam_validation_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
