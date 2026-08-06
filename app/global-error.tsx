'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '28rem', padding: '1rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              {error.message || 'A critical error occurred.'}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
