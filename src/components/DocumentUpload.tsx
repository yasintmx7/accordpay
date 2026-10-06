'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, ShieldCheck, ShieldAlert, X, Download } from 'lucide-react';
import { computeFileHash, fileToDataUri, dataUriToFile, validateDocument, formatFileSize } from '@/lib/documents';
import type { DocumentRecord } from '@/lib/store';

interface Props {
  document: DocumentRecord | null;
  onUpload: (doc: DocumentRecord) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

/**
 * Document upload, preview, and verification component.
 * Handles file selection, SHA-256 hashing, and hash comparison verification.
 */
export default function DocumentUpload({ document: doc, onUpload, onRemove, readOnly = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'match' | 'mismatch'>('idle');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    setError(null);
    setVerifyStatus('idle');

    const validationError = validateDocument(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    try {
      const [hash, dataUri] = await Promise.all([
        computeFileHash(file),
        fileToDataUri(file),
      ]);

      onUpload({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        hash,
        uploadedAt: Date.now(),
        dataUri,
      });
    } catch {
      setError('Failed to process file. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerify() {
    if (!doc) return;
    setVerifying(true);
    setError(null);
    try {
      const file = dataUriToFile(doc.dataUri, doc.fileName);
      const currentHash = await computeFileHash(file);
      setVerifyStatus(currentHash === doc.hash ? 'match' : 'mismatch');
    } catch {
      setError('Failed to verify document.');
    } finally {
      setVerifying(false);
    }
  }

  function handleDownload() {
    if (!doc) return;
    const a = document.createElement('a');
    a.href = doc.dataUri;
    a.download = doc.fileName;
    a.click();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  }

  if (doc) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate dark:text-zinc-100">{doc.fileName}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {formatFileSize(doc.fileSize)} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400 truncate dark:text-zinc-500" title={doc.hash}>
                SHA-256: {doc.hash.slice(0, 16)}…{doc.hash.slice(-8)}
              </p>
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => { onRemove(); setVerifyStatus('idle'); }}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              aria-label="Remove document"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={handleDownload} className="button-secondary !min-h-9 !px-3 !py-1.5 !text-xs">
            <Download size={14} /> Download
          </button>
          <button type="button" onClick={() => void handleVerify()} disabled={verifying} className="button-secondary !min-h-9 !px-3 !py-1.5 !text-xs disabled:opacity-50">
            <ShieldCheck size={14} /> {verifying ? 'Verifying…' : 'Verify Document'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="button-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
            >
              <Upload size={14} /> Replace
            </button>
          )}
        </div>

        {verifyStatus === 'match' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
            <ShieldCheck size={16} />
            Document verified — hash matches
          </div>
        )}
        {verifyStatus === 'mismatch' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <ShieldAlert size={16} />
            Document changed — hash does not match
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); e.target.value = ''; }}
        />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
        <FileText size={20} className="mx-auto text-slate-400 dark:text-zinc-500" />
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">No document attached</p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
      >
        <Upload size={24} className="mx-auto text-slate-400 dark:text-zinc-500" />
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
          {uploading ? 'Processing…' : 'Drop a file here or click to upload'}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
          PDF, PNG, JPEG, or WebP · Max 10 MB
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); e.target.value = ''; }}
      />
    </div>
  );
}
