import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function ProcessingView({ queue, currentIndex, results }) {
  const total = queue.length;
  const processed = results.length;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <h3 className="font-semibold text-foreground">
            Processing Sheets
          </h3>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {processed} / {total}
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="max-h-40 overflow-y-auto space-y-1.5">
        {queue.map((file, i) => {
          const result = results[i];
          const isCurrent = i === currentIndex;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition ${
                isCurrent
                  ? "bg-primary/10 text-primary font-medium"
                  : result
                  ? result.error
                    ? "text-destructive"
                    : "text-success"
                  : "text-muted-foreground"
              }`}
            >
              {isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : result ? (
                result.error ? (
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )
              ) : (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{file.name}</span>
              {result && !result.error && result.validation && (
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    result.validation.status === "PASSED"
                      ? "status-passed"
                      : "status-failed"
                  }`}
                >
                  {result.validation.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
