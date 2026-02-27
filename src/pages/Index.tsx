import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validateSheet } from "@/lib/validation";
import UploadZone from "@/components/UploadZone";
import ProcessingView from "@/components/ProcessingView";
import ResultsTable from "@/components/ResultsTable";
import { ScanLine, Shield, FileSpreadsheet } from "lucide-react";

const Index = () => {
  const [queue, setQueue] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const queueRef = useRef([]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file) => {
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: { image_base64: base64, mime_type: file.type },
      });

      if (error) throw new Error(error.message || "OCR failed");
      if (data?.error) throw new Error(data.error);

      const ocrData = data.result;
      const validation = validateSheet(ocrData);

      return {
        fileName: file.name,
        imageUrl: URL.createObjectURL(file),
        ocrData,
        validation,
        error: null,
      };
    } catch (err) {
      return {
        fileName: file.name,
        imageUrl: URL.createObjectURL(file),
        ocrData: null,
        validation: null,
        error: err.message || "Processing failed",
      };
    }
  };

  const startProcessing = useCallback(async () => {
    setProcessing(true);
    const files = queueRef.current;
    const allResults = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      const result = await processFile(files[i]);
      allResults.push(result);
      setResults([...allResults]);
    }

    setProcessing(false);
    setCurrentIndex(-1);
  }, []);

  const handleFilesSelected = useCallback(
    (files) => {
      const newFiles = [...queueRef.current, ...files];
      queueRef.current = newFiles;
      setQueue([...newFiles]);
    },
    []
  );

  const handleStartProcess = () => {
    if (queue.length === 0) return;
    setResults([]);
    startProcessing();
  };

  const handleReset = () => {
    setQueue([]);
    setResults([]);
    setProcessing(false);
    setCurrentIndex(-1);
    queueRef.current = [];
  };

  const isComplete = !processing && results.length > 0 && results.length === queue.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">
                ExamValidator
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                OCR-powered exam sheet validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Powered by Gemini AI</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Upload Section */}
        <section className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Upload Exam Sheets
            </h2>
            {queue.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono">
                  {queue.length} files queued
                </span>
                {!processing && results.length === 0 && (
                  <button
                    onClick={handleStartProcess}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                  >
                    Start Processing
                  </button>
                )}
                {isComplete && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
                  >
                    New Batch
                  </button>
                )}
              </div>
            )}
          </div>
          <UploadZone
            onFilesSelected={handleFilesSelected}
            disabled={processing}
          />
        </section>

        {/* Processing View */}
        {(processing || (results.length > 0 && results.length < queue.length)) && (
          <ProcessingView
            queue={queue}
            currentIndex={currentIndex}
            results={results}
          />
        )}

        {/* Results */}
        {results.length > 0 && (
          <section>
            <ResultsTable results={results} />
          </section>
        )}

        {/* Empty state */}
        {queue.length === 0 && results.length === 0 && (
          <div className="glass-card p-12 text-center space-y-4">
            <div className="flex justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                How It Works
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                Upload exam valuation sheets → AI extracts all marks & metadata
                → Smart validation compares totals → Export results to Excel
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
              <div className="p-4 rounded-xl bg-muted/50 text-left">
                <p className="text-sm font-semibold text-foreground">1. Upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop or browse. Supports bulk + folder upload.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-left">
                <p className="text-sm font-semibold text-foreground">2. Validate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI reads marks, calculates highest per question, validates totals.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 text-left">
                <p className="text-sm font-semibold text-foreground">3. Export</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Download full results with summary in Excel format.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
