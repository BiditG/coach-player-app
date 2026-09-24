import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f7f7f8] p-5">
      <div className="surface max-w-md p-9 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-neutral-100"><Compass className="size-5 text-neutral-500" /></span>
        <p className="mt-7 eyebrow">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.055em]">This page isn&apos;t here.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">It may have moved, or the link may no longer be available.</p>
        <Link href="/" className="primary-button mt-7"><ArrowLeft className="mr-1.5 size-3.5"/>Back to home</Link>
      </div>
    </div>
  );
}
