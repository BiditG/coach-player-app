'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { ChevronLeft, Circle, Eraser, Minus, MousePointer2, Pause, Pencil, Play, Plus, Save, Send, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { saveReviewAnnotation, submitStudioReview } from '@/lib/reviews/actions';
import { formatTime } from '@/lib/reviews/rubrics';
import type { AnnotationObject, Review, ReviewAnnotation } from '@/lib/reviews/types';

type Tool = 'arrow' | 'line' | 'circle' | 'rectangle' | 'freehand' | 'text';

type Props = {
  review: Review;
  filename: string;
  videoUrl: string;
  annotations: ReviewAnnotation[];
  conversationId: string | null;
};

const toolNames: Record<Tool, string> = {
  arrow: 'Arrow',
  line: 'Line',
  circle: 'Circle',
  rectangle: 'Box',
  freehand: 'Draw',
  text: 'Text',
};

export function ReviewStudio({ review, filename, videoUrl, annotations: initialAnnotations, conversationId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('arrow');
  const [objects, setObjects] = useState<AnnotationObject[]>([]);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [stroke, setStroke] = useState<number[]>([]);
  const [overlayText, setOverlayText] = useState('');
  const [finalNote, setFinalNote] = useState('');
  const [overallScore, setOverallScore] = useState(7);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [message, setMessage] = useState('');
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
    if (tool === 'text') {
      if (!overlayText.trim()) { setMessage('Write the text first, then click where it belongs.'); return; }
      setObjects(previous => [...previous, { type: 'text', x1: next.x, y1: next.y, x2: next.x, y2: next.y, label: overlayText.trim() }]);
      return;
    }
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
    if (objects.length === 0) {
      setMessage('Draw or add text to the video first.');
      return;
    }
    try {
      if (objects.length) {
        const annotation = await saveReviewAnnotation({
          reviewId: review.id,
          feedbackId: null,
          timestamp: Number(currentTime.toFixed(2)),
          objects,
        });
        setAnnotations(previous => [...previous, annotation as ReviewAnnotation]);
      }
      setObjects([]);
      setMessage('Annotations saved to the player video.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this moment.');
    }
  });

  const sendReview = () => startTransition(async () => {
    if (objects.length) { setMessage('Apply the current frame before sending the video response.'); return; }
    try { await submitStudioReview({ reviewId: review.id, summary: finalNote, overallScore }); setMessage('Review sent to the player.'); window.location.assign(`/professional/reviews`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send this review.'); }
  });

  const hasSavedAnnotation = annotations.length > 0;

  return <div className="mx-auto max-w-6xl pb-20">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/professional/reviews" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 active:scale-95"><ChevronLeft className="size-3.5" />Review queue</Link>
        <p className="eyebrow mt-5">Player video</p>
        <h1 className="page-title mt-2">{filename}</h1>
        <p className="page-copy">Play, pause and explain the moment directly on the video.</p>
      </div>
      {conversationId && <Link href={`/messages/${conversationId}`} className="quiet-button">Message player</Link>}
    </header>

    <main className="mt-8">
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
      </section>

      <section className="relative z-10 mx-3 -mt-4 rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,.10)] backdrop-blur-xl sm:mx-6 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold">Annotate this moment</p><p className="mt-1 text-xs text-neutral-500">Overlays are shown to the player at {formatTime(currentTime)}.</p></div><div className="flex items-center gap-2"><button type="button" className="quiet-button" onClick={() => setZoom(value => Math.max(1, Number((value - 0.25).toFixed(2))))} disabled={zoom === 1} aria-label="Zoom out"><ZoomOut className="size-4" /></button><span className="w-10 text-center text-xs font-medium tabular-nums text-neutral-500">{Math.round(zoom * 100)}%</span><button type="button" className="quiet-button" onClick={() => setZoom(value => Math.min(2, Number((value + 0.25).toFixed(2))))} disabled={zoom === 2} aria-label="Zoom in"><ZoomIn className="size-4" /></button></div></div>
        <div className="mt-4 flex flex-wrap items-center gap-2">{(['arrow', 'line', 'circle', 'rectangle', 'freehand', 'text'] as Tool[]).map(item => <button key={item} type="button" onClick={() => setTool(item)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition active:scale-95 ${tool === item ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{toolIcon(item)}{toolNames[item]}</button>)}<span className="mx-1 hidden h-6 w-px bg-black/[.08] sm:block"/><button type="button" className="quiet-button" onClick={() => setObjects(previous => previous.slice(0, -1))} disabled={!objects.length}><Undo2 className="mr-1 inline size-3.5" />Undo</button><button type="button" className="quiet-button" onClick={() => { setObjects([]); setStroke([]); }} disabled={!objects.length && !stroke.length}><Eraser className="mr-1 inline size-3.5" />Clear</button></div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="Text on video" value={overlayText} onChange={event => setOverlayText(event.target.value)} placeholder="Text to place on the video" className="min-w-0 flex-1 rounded-2xl border border-black/[.1] bg-[#f7f7f8] px-4 py-3 text-sm outline-none transition focus:border-neutral-500 focus:bg-white" /><button type="button" disabled={isPending || !objects.length} onClick={saveMoment} className="primary-button shrink-0 disabled:cursor-not-allowed disabled:opacity-40"><Save className="mr-1.5 size-3.5" />{isPending ? 'Saving…' : 'Apply to video'}</button></div>
        {message && <p className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${message.includes('saved') || message.includes('sent') ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-600'}`} role="status">{message}</p>}
      </section>
    </main>

    <section className="mt-6 overflow-hidden rounded-[28px] border border-black/[.08] bg-neutral-900 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,.12)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold">Ready to send</p><p className="mt-1 text-xs text-white/65">{hasSavedAnnotation ? `${annotations.length} overlay${annotations.length === 1 ? '' : 's'} will be included.` : 'You can send the video without annotations.'}</p></div><button type="button" onClick={sendReview} disabled={isPending || !!objects.length} className="inline-flex items-center rounded-full bg-white px-5 py-3 text-xs font-semibold text-black shadow-sm transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40"><Send className="mr-1.5 size-3.5"/>{isPending ? 'Sending video…' : 'Submit video response'}</button></div><div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]"><label className="rounded-2xl border border-white/10 bg-white/10 p-4 text-xs font-medium text-white/80">Overall score<span className="mt-2 flex items-end gap-1"><input aria-label="Overall score" type="number" min="1" max="10" value={overallScore} onChange={event => setOverallScore(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} className="w-12 bg-transparent text-3xl font-semibold tracking-[-.06em] text-white outline-none"/><span className="pb-1 text-sm text-white/50">/ 10</span></span></label><label className="block text-xs font-medium text-white/80">Optional final note<textarea value={finalNote} onChange={event => setFinalNote(event.target.value)} placeholder="One next step for the player." className="mt-2 min-h-20 w-full rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-normal outline-none placeholder:text-white/40 focus:border-white/40"/></label></div></section>
  </div>;
}

function toolIcon(tool: Tool) {
  if (tool === 'circle') return <Circle className="size-3.5" />;
  if (tool === 'freehand') return <Pencil className="size-3.5" />;
  if (tool === 'arrow') return <MousePointer2 className="size-3.5" />;
  if (tool === 'line') return <Minus className="size-3.5" />;
  if (tool === 'text') return <span className="text-xs font-bold">T</span>;
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
  if (object.type === 'text') return <text key={key} x={x1} y={y1} fill="#fbbf24" fontSize="28" fontWeight="700" stroke="#111" strokeWidth="1">{object.label}</text>;
  return <g key={key}><line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />{object.type === 'arrow' && <circle cx={x2} cy={y2} r="8" fill="#fbbf24" />}</g>;
}

function toPoints(points: number[]) {
  return points.reduce<string[]>((all, value, index) => {
    if (index % 2 === 0) all.push(`${value * 1000},${(points[index + 1] || 0) * 562}`);
    return all;
  }, []).join(' ');
}
