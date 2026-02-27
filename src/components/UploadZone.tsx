import { useCallback, useState } from "react";
import { Upload, FolderOpen, X, Image } from "lucide-react";

export default function UploadZone({ onFilesSelected, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files: File[] = Array.from(fileList).filter((f: File) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      const newPreviews = files.map((f: File) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        size: (f.size / 1024 / 1024).toFixed(2),
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);
      onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;

      const items = e.dataTransfer.items;
      const allFiles = [];

      const readEntry = (entry: any): Promise<void> => {
        return new Promise<void>((resolve) => {
          if (entry.isFile) {
            entry.file((file: File) => {
              allFiles.push(file);
              resolve();
            });
          } else if (entry.isDirectory) {
            const reader = entry.createReader();
            reader.readEntries(async (entries: any[]) => {
              for (const e of entries) {
                await readEntry(e);
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      };

      const promises = [];
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          promises.push(readEntry(entry));
        }
      }

      Promise.all(promises).then(() => {
        if (allFiles.length > 0) processFiles(allFiles);
      });
    },
    [disabled, processFiles]
  );

  const handleFileInput = (e) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const removePreview = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setPreviews([]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          disabled
            ? "opacity-50 cursor-not-allowed border-muted"
            : dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer"
          id="file-upload"
        />
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              Drop exam sheets here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports multiple files, folders • Images up to 20MB each
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition cursor-pointer"
            >
              <Image className="w-4 h-4" />
              Browse Files
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition cursor-pointer">
              <FolderOpen className="w-4 h-4" />
              Open Folder
              <input
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                accept="image/*"
                onChange={handleFileInput}
                disabled={disabled}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {previews.length} file{previews.length > 1 ? "s" : ""} selected
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-destructive transition"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto">
            {previews.map((p, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden border border-border bg-card"
              >
                <img
                  src={p.url}
                  alt={p.name}
                  className="w-full h-20 object-cover"
                />
                <button
                  onClick={() => removePreview(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-[10px] text-muted-foreground truncate px-1 py-0.5">
                  {p.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
