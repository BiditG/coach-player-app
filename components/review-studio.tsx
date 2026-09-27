'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { ChevronLeft, Circle, Eraser, Minus, MousePointer2, Pause, Pencil, Play, Plus, Save, Send, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { acceptProfessionalReview, addReviewFeedback, saveReviewAnnotation } from '@/lib/reviews/actions';
import { formatTime } from '@/lib/reviews/rubrics';
import type { AnnotationObject, Review, ReviewAnnotation, TimestampFeedback } from '@/lib/reviews/types';

type Tool = 'arrow' | 'line' | 'circle' | 'rectangle' | 'freehand';

type Props = {
  review: Review;
  filename: string;
  videoUrl: string;
  feedback: TimestampFeedback[];
  annotations: ReviewAnnotation[];
  conversationId: string | null;
};

const toolNames: Record<Tool, string> = {
  arrow: 'Arrow',
  line: 'Line',
  circle: 'Circle',
  rectangle: 'Box',
  freehand: 'Draw',
};

export function ReviewStudio({ review, filename, videoUrl, feedback: initialFeedback, annotations: initialAnnotations, conversationId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('arrow');
  const [objects, setObjects] = useState<AnnotationObject[]>([]);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [stroke, setStroke] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [feedback, setFeedback] = useState(initialFeedback);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [message, setMessage] = useState('');
  const [started, setStarted] = useState(review.status !== 'REQUESTED');
  const [isPending, startTransition] = useTransition();

  const savedForFrame = useMemo(
    () => annotations.filter(annotation => annotation.timestamp_seconds !== null && Math.abs(Number(annotation.timestamp_seconds) - currentTime) < 0.5),
    [annotations, currentTime],
  );

  const seek = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value;
    videoRef.current.pause();
    setCurrentTime(value);
    setPlaying(false);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play(); else video.pause();
  };

  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const beginDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = point(event);
    setStart(next);
    if (tool === 'freehand') setStroke([next.x, next.y]);
  };

  const continueDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!start || tool !== 'freehand') return;
    const next = point(event);
    setStroke(previous => [...previous, next.x, next.y]);
  };

  const finishDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!start) return;
    const end = point(event);
    if (tool === 'freehand') {
      if (stroke.length >= 4) setObjects(previous => [...previous, { type: 'freehand', x1: start.x, y1: start.y, x2: end.x, y2: end.y, points: stroke }]);
      setStroke([]);
    } else {
      setObjects(previous => [...previous, { type: tool, x1: start.x, y1: start.y, x2: end.x, y2: end.y }]);
    }
    setStart(null);
  };

  const saveMoment = () => startTransition(async () => {
    if (!note.trim() && objects.length === 0) {
      setMessage('Write a short note or draw on the frame first.');
      return;
    }
    try {
      let feedbackId: string | null = null;
      if (note.trim()) {
        const entry = await addReviewFeedback({
          reviewId: review.id,
          timestamp: Number(currentTime.toFixed(2)),
          title: noteTitle.trim() || `Coach note · ${formatTime(currentTime)}`,
          feedback: note.trim(),
          type: 'IMPROVEMENT',
          category: '',
          explanation: '',
          correction: '',
          drill: '',
        });
        feedbackId = entry.id;
        setFeedback(previous => [...previous, entry as TimestampFeedback].sort((left, right) => left.timestamp_seconds - right.timestamp_seconds));
      }
      if (objects.length) {
        const annotation = await saveReviewAnnotation({
          reviewId: review.id,
          feedbackId,
          timestamp: Number(currentTime.toFixed(2)),
          objects,
        });
        setAnnotations(previous => [...previous, annotation as ReviewAnnotation]);
      }
      setObjects([]);
      setNote('');
      setNoteTitle('');
      setMessage('Moment saved to this review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this moment.');
    }
  });

  const startReview = () => startTransition(async () => {
    try {
      await acceptProfessionalReview(review.id);
      setStarted(true);
      setMessage('Review started. Your player has been notified.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start this review.');
    }
  });

  return <div className="mx-auto max-w-6xl pb-20">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/professional/reviews" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"><ChevronLeft className="size-3.5" />All reviews</Link>
        <p className="eyebrow mt-5">Review studio</p>
        <h1 className="page-title mt-2">{filename}</h1>
        <p className="page-copy">Move through the video, stop at a moment, then draw and leave a clear note.</p>
      </div>
      <div className="flex gap-2">{!started && <button type="button" onClick={startReview} disabled={isPending} className="primary-button">Start review</button>}{conversationId && <Link href={`/messages/${conversationId}`} className="quiet-button">Message player</Link>}</div>
    </header>

    <main className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-[28px] border border-black/[.08] bg-[#151515] shadow-[0_24px_80px_rgba(0,0,0,.14)]">
        <div className="relative aspect-video overflow-hidden bg-black">
          <div className="absolute inset-0 transition-transform duration-200 motion-reduce:transition-none" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <video ref={videoRef} src={videoUrl} playsInline preload="metadata" className="h-full w-full object-contain" onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
            <svg viewBox="0 0 1000 562" preserveAspectRatio="none" className="absolute inset-0 h-full w-full touch-none cursor-crosshair" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} aria-label="Draw on the video frame">
              {savedForFrame.flatMap(item => item.annotation_json.objects).map(drawObject)}
              {objects.map(drawObject)}
              {tool === 'freehand' && stroke.length >= 4 && drawObject({ type: 'freehand', x1: stroke[0], y1: stroke[1], x2: stroke.at(-2) || 0, y2: stroke.at(-1) || 0, points: stroke }, 'active')}
            </svg>
          </div>
          <div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">{formatTime(currentTime)}</div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/45 px-3 py-2.5 text-white backdrop-blur-xl">
            <button type="button" onClick={togglePlayback} className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black active:scale-95" aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button>
            <input aria-label="Video timeline" type="range" min="0" max={duration || 0} step="0.05" value={currentTime} onChange={event => seek(Number(event.target.value))} className="h-1 w-full cursor-pointer accent-white" />
            <span className="shrink-0 text-xs tabular-nums text-white/80">{formatTime(duration || 0)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-4">
          <div className="flex items-center gap-2"><button type="button" className="quiet-button" onClick={() => setZoom(value => Math.max(1, Number((value - 0.25).toFixed(2))))} disabled={zoom === 1} aria-label="Zoom out"><ZoomOut className="size-4" /></button><span className="w-11 text-center text-xs font-medium tabular-nums text-neutral-500">{Math.round(zoom * 100)}%</span><button type="button" className="quiet-button" onClick={() => setZoom(value => Math.min(2, Number((value + 0.25).toFixed(2))))} disabled={zoom === 2} aria-label="Zoom in"><ZoomIn className="size-4" /></button></div>
          <p className="text-xs text-neutral-500">Pause, draw, then save this moment.</p>
        </div>
      </section>

      <aside className="rounded-[28px] border border-black/[.08] bg-white p-5 shadow-[0_12px_36px_rgba(0,0,0,.05)]">
        <p className="text-sm font-semibold">Explain this moment</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">The player will see the drawing and your note together at {formatTime(currentTime)}.</p>
        <div className="mt-5 flex flex-wrap gap-2">{(['arrow', 'line', 'circle', 'rectangle', 'freehand'] as Tool[]).map(item => <button key={item} type="button" onClick={() => setTool(item)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition active:scale-95 ${tool === item ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{toolIcon(item)}{toolNames[item]}</button>)}</div>
        <div className="mt-3 flex gap-2"><button type="button" className="quiet-button" onClick={() => setObjects(previous => previous.slice(0, -1))} disabled={!objects.length}><Undo2 className="mr-1 inline size-3.5" />Undo</button><button type="button" className="quiet-button" onClick={() => { setObjects([]); setStroke([]); }} disabled={!objects.length && !stroke.length}><Eraser className="mr-1 inline size-3.5" />Clear</button></div>
        <label className="mt-6 block text-xs font-medium text-neutral-700">Short title<input value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Front foot alignment" className="mt-2 w-full rounded-xl border border-black/[.1] bg-[#fafafa] px-3 py-2.5 text-sm outline-none focus:border-neutral-500" /></label>
        <label className="mt-4 block text-xs font-medium text-neutral-700">Coach note<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Tell the player what you see and what to try next." className="mt-2 min-h-32 w-full resize-none rounded-xl border border-black/[.1] bg-[#fafafa] p-3 text-sm leading-6 outline-none focus:border-neutral-500" /></label>
        <button type="button" disabled={isPending || (!note.trim() && !objects.length)} onClick={saveMoment} className="primary-button mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"><Save className="mr-1.5 size-3.5" />Save this moment</button>
        {message && <p className="mt-3 text-xs leading-5 text-neutral-500" role="status">{message}</p>}
      </aside>
    </main>

    <section className="mt-6 rounded-[28px] border border-black/[.08] bg-white p-5 shadow-[0_12px_36px_rgba(0,0,0,.04)]">
      <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold">Saved moments</p><p className="mt-1 text-xs text-neutral-500">Jump back to any point you have explained.</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">{feedback.length} notes</span></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{feedback.length ? feedback.map(item => <button key={item.id} type="button" onClick={() => seek(item.timestamp_seconds)} className="rounded-2xl bg-[#f7f7f7] p-4 text-left transition hover:bg-neutral-100 active:scale-[.99]"><span className="text-xs font-semibold tabular-nums text-neutral-500">{formatTime(item.timestamp_seconds)}</span><span className="mt-2 block text-sm font-semibold">{item.title}</span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-neutral-500">{item.feedback}</span></button>) : <p className="py-4 text-sm text-neutral-500">Your saved moments will appear here.</p>}</div>
    </section>
  </div>;
}

function toolIcon(tool: Tool) {
  if (tool === 'circle') return <Circle className="size-3.5" />;
  if (tool === 'freehand') return <Pencil className="size-3.5" />;
  if (tool === 'arrow') return <MousePointer2 className="size-3.5" />;
  if (tool === 'line') return <Minus className="size-3.5" />;
  return <Plus className="size-3.5" />;
}

function drawObject(object: AnnotationObject, key: string | number) {
  const x1 = object.x1 * 1000;
  const y1 = object.y1 * 562;
  const x2 = object.x2 * 1000;
  const y2 = object.y2 * 562;
  const common = { stroke: '#fbbf24', strokeWidth: 5, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (object.type === 'circle') return <ellipse key={key} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} {...common} />;
  if (object.type === 'rectangle') return <rect key={key} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} {...common} />;
  if (object.type === 'freehand' && object.points?.length) return <polyline key={key} points={toPoints(object.points)} {...common} />;
  return <g key={key}><line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />{object.type === 'arrow' && <circle cx={x2} cy={y2} r="8" fill="#fbbf24" />}</g>;
}

function toPoints(points: number[]) {
  return points.reduce<string[]>((all, value, index) => {
    if (index % 2 === 0) all.push(`${value * 1000},${(points[index + 1] || 0) * 562}`);
    return all;
  }, []).join(' ');
}
