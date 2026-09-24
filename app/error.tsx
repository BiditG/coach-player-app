'use client';


export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60dvh] place-items-center p-5">
      <div className="surface max-w-md p-8 text-center">
        <p className="eyebrow">A small interruption</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-.045em]">Something went wrong.</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-500">{error.message || 'An unexpected error occurred.'}</p>
        <button onClick={reset} className="primary-button mt-6">Try again</button>
      </div>
    </div>
  );
}
