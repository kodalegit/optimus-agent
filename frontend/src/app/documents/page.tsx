"use client";

import { useState, type FormEvent, type DragEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadRagDocument } from "@/lib/api";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (f: File) => uploadRagDocument(f),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setUploadStatus(null);
    setRagError(null);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (droppedFile) {
      setFile(droppedFile);
      setUploadStatus(null);
      setRagError(null);
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || uploadMutation.isPending) return;

    setUploadStatus(null);
    setRagError(null);

    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadStatus(
        `Uploaded document #${result.document_id} (${result.status})`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document";
      setRagError(message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Knowledge Base
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Upload documents to expand Optimus's knowledge. Uploaded files are
            indexed and used by the agent to answer questions about your
            internal policies, procedures, and data.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag and drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed transition-all ${
              isDragging
                ? "border-sky-500 bg-sky-500/5"
                : "border-slate-700 bg-slate-950/40"
            } p-8 text-center`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex cursor-pointer flex-col items-center gap-3"
            >
              <div
                className={`rounded-full p-3 transition-colors ${
                  isDragging
                    ? "bg-sky-500/20 text-sky-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  {isDragging
                    ? "Drop your file here"
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-slate-500">
                  Supports PDF and TXT files
                </p>
              </div>
            </label>
          </div>

          {/* Selected file preview */}
          {file && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                {!uploadMutation.isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setUploadStatus(null);
                      setRagError(null);
                    }}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Upload button */}
          {file && (
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Indexing document...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload & Index</span>
                </>
              )}
            </button>
          )}
        </form>

        {/* Status messages */}
        {uploadStatus && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-emerald-400">Success</p>
              <p className="text-xs text-emerald-300/80">{uploadStatus}</p>
            </div>
          </div>
        )}

        {ragError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-red-400">Upload failed</p>
              <p className="text-xs text-red-300/80">{ragError}</p>
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            How it works
          </h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              <span>
                Documents are split into chunks and embedded for semantic search
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              <span>
                The agent uses these documents to answer questions about your
                policies and procedures
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              <span>
                Supported formats: PDF (text-based) and plain text files
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
