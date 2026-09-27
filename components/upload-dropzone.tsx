'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Upload, X } from 'lucide-react';

interface UploadResponse {
  error?: string;
  video?: { original_filename: string };
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadDropzone() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pickFile = (next: File | null) => {
    setFile(next);
    setMessage('');
    setIsError(false);
  };

  async function submit() {
    if (!file) return;

    setIsLoading(true);
    setIsError(false);
    setMessage('Saving video…');

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/uploads/presign', { method: 'POST', body: form });
      const body = (await response.json()) as UploadResponse;

      if (body.error || !body.video) {
        setIsError(true);
        setMessage(body.error ?? 'That file could not be saved.');
      } else {
        setMessage(`${body.video.original_filename} is ready in your library.`);
        setFile(null);
      }
    } catch {
      setIsError(true);
      setMessage('Could not reach the upload endpoint.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="surface mt-8 overflow-hidden">
      <div
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          pickFile(event.dataTransfer.files[0] ?? null);
        }}
        className="grid min-h-72 cursor-pointer place-items-center border-b border-dashed border-black/10 bg-canvas p-8 text-center transition hover:bg-black/[0.015]"
      >
        <input
          ref={input}
          type="file"
          aria-label="Choose a video"
          className="hidden"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />

        {file ? (
          <div>
            <p className="type-headline text-ink">{file.name}</p>
            <p className="type-caption mt-1 text-ink-secondary">{formatSize(file.size)} · ready to save</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                pickFile(null);
              }}
              className="press mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
            >
              <X className="inline size-3.5" strokeWidth={2} />
              Remove
            </button>
          </div>
        ) : (
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white elevation-1">
              <Upload className="size-5 text-ink-secondary" strokeWidth={1.8} />
            </span>
            <p className="type-headline mt-5 text-ink">Drop a video here</p>
            <p className="type-caption mt-1.5 text-ink-secondary">
              or choose a file · MP4, MOV, WebM
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center justify-between gap-4 p-4">
          <p className="text-[11px] text-ink-tertiary">Local development storage</p>
          <button
            type="button"
            disabled={isLoading}
            onClick={submit}
            className="primary-button disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save video'}
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-center gap-2 border-t border-hairline-soft px-5 py-4 text-[13px] text-ink-secondary"
        >
          <CheckCircle2
            className={`size-4 ${isError ? 'text-red-600' : 'text-emerald-600'}`}
            strokeWidth={1.9}
          />
          {message}
        </div>
      )}
    </div>
  );
}
