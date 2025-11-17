"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadRagDocument } from "@/lib/api";

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (f: File) => uploadRagDocument(f),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setUploadStatus(null);
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
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-1 border-b border-slate-800/80 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Documents
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Upload documents to be indexed for retrieval-augmented responses.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4 text-sm">
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Upload document (PDF or text)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploadMutation.isPending}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </button>
        </form>
        {ragError && <p className="text-xs text-red-400">{ragError}</p>}
        {uploadStatus && (
          <p className="text-xs text-emerald-400">{uploadStatus}</p>
        )}
      </section>
    </div>
  );
}
