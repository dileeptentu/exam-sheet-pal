import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";

export default function ResultsTable({ results }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const passed = results.filter((r) => r.validation?.status === "PASSED").length;
  const failed = results.filter((r) => r.validation?.status === "FAILED").length;
  const errors = results.filter((r) => r.error).length;

  const handleExport = () => setShowExportDialog(true);

  const confirmExport = () => {
    exportToExcel(results);
    setShowExportDialog(false);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="font-semibold font-mono">{results.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Passed:</span>
          <span className="font-semibold font-mono text-success">{passed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Failed:</span>
          <span className="font-semibold font-mono text-destructive">{failed}</span>
        </div>
        {errors > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-accent" />
            <span className="text-sm text-muted-foreground">Errors:</span>
            <span className="font-semibold font-mono text-accent">{errors}</span>
          </div>
        )}
        <button
          onClick={handleExport}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  #
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Image
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Bundle No
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Val.
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Calculated
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Written
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Bubble
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  Bubble=Written
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Remarks
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <>
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/30 transition"
                  >
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.fileName}
                          className="w-12 h-8 object-cover rounded border border-border"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {r.fileName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">
                      {r.ocrData?.bundle_no || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.ocrData?.valuation || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {r.validation?.calculatedTotal ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.validation?.writtenTotal ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.validation?.bubbleTotal ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.validation?.bubbleWrittenMatch != null ? (
                        r.validation.bubbleWrittenMatch ? (
                          <span className="text-xs px-2 py-0.5 rounded-full status-passed">YES</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full status-failed">NO</span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.error ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          <AlertTriangle className="w-3 h-3" />
                          ERROR
                        </span>
                      ) : r.validation?.status === "PASSED" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full status-passed">
                          <CheckCircle2 className="w-3 h-3" />
                          PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full status-failed">
                          <XCircle className="w-3 h-3" />
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.error
                        ? r.error
                        : r.validation?.reasons?.join("; ") || "All totals match"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === i ? null : i)
                        }
                        className="p-1 rounded hover:bg-muted transition"
                      >
                        {expandedRow === i ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr key={`detail-${i}`} className="bg-muted/20">
                      <td colSpan={11} className="px-6 py-4">
                        <DetailView result={r} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-card p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-lg">Export Results</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Download Excel file with full data and summary?
              <br />
              <span className="font-mono text-xs">
                {results.length} sheets • {passed} passed • {failed} failed
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailView({ result }) {
  const ocr = result.ocrData;
  if (!ocr) return <p className="text-sm text-muted-foreground">No data extracted</p>;

  const regulation = ocr.regulation || "A3";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      {/* Metadata */}
      <div className="space-y-2">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4" /> Metadata
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{regulation}</span>
        </h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(ocr.metadata || {}).map(([k, v]) => (
            <div key={k}>
              <span className="text-muted-foreground capitalize">
                {k.replace(/_/g, " ")}:
              </span>{" "}
              <span className="font-medium">{String(v) || "—"}</span>
            </div>
          ))}
        </div>
        <div className="text-xs mt-2">
          <span className="text-muted-foreground">Marks in Words:</span>{" "}
          <span className="font-medium">
            {ocr.marks_in_words?.tens_place || "—"} / {ocr.marks_in_words?.units_place || "—"}
          </span>
        </div>
      </div>

      {/* Question marks — regulation-specific */}
      <div className="space-y-2">
        <h4 className="font-semibold text-foreground">Question Marks</h4>
        <div className="overflow-x-auto">
          {regulation === "R23" ? (
            <div className="space-y-3">
              {/* Part A */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Part A</p>
                <table className="w-full text-xs border border-border rounded">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-1 text-left">Q</th>
                      <th className="px-2 py-1 text-center">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ocr.partA || []).map((q, qi) => (
                      <tr key={qi} className="border-t border-border/50">
                        <td className="px-2 py-1 font-mono font-medium">{q.q_no}</td>
                        <td className="px-2 py-1 text-center font-mono">{q.marks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Part B */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Part B</p>
                <table className="w-full text-xs border border-border rounded">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-1 text-left">Q</th>
                      <th className="px-2 py-1 text-center">i</th>
                      <th className="px-2 py-1 text-center">ii</th>
                      <th className="px-2 py-1 text-center">iii</th>
                      <th className="px-2 py-1 text-center font-bold">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ocr.partB || []).map((q, qi) => (
                      <tr key={qi} className="border-t border-border/50">
                        <td className="px-2 py-1 font-mono font-medium">{q.q_no}</td>
                        <td className="px-2 py-1 text-center font-mono">{q.i ?? "—"}</td>
                        <td className="px-2 py-1 text-center font-mono">{q.ii ?? "—"}</td>
                        <td className="px-2 py-1 text-center font-mono">{q.iii ?? "—"}</td>
                        <td className="px-2 py-1 text-center font-mono font-bold text-primary">
                          {(q.i || 0) + (q.ii || 0) + (q.iii || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* A3 and other regulations */
            <table className="w-full text-xs border border-border rounded">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-2 py-1 text-left">Q</th>
                  <th className="px-2 py-1 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {(ocr.questions || []).map((q, qi) => (
                  <tr key={qi} className="border-t border-border/50">
                    <td className="px-2 py-1 font-mono font-medium">{q.q_no}</td>
                    <td className="px-2 py-1 text-center font-mono font-bold text-primary">
                      {q.total ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
