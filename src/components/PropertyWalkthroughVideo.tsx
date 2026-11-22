import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { ListingKind, ProjectStage } from '../types';
import {
  formatIndianPrice,
  getProjectStageLabel,
  isLandProperty,
} from '../utils/realEstateLogic';

interface PropertyWalkthroughVideoProps {
  images: string[];
  title: string;
  locality: string;
  city: string;
  price: number;
  kind: ListingKind;
  propertyType: string;
  projectStage?: ProjectStage;
  phaseName?: string;
  landArea?: string;
  sqft?: number;
  beds?: number;
  reraApproved?: boolean;
  reraNumber?: string;
  builderName?: string;
  compact?: boolean;
}

const SCENE_DURATION_MS = 3400;
const FADE_DURATION_MS = 550;

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  zoom: number,
  panX: number,
  panY: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const canvasRatio = cw / ch;
  let drawW = cw;
  let drawH = ch;

  if (imgRatio > canvasRatio) {
    drawH = ch * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = cw * zoom;
    drawH = drawW / imgRatio;
  }

  const maxOffsetX = Math.max(0, (drawW - cw) / 2);
  const maxOffsetY = Math.max(0, (drawH - ch) / 2);
  const x = (cw - drawW) / 2 + panX * maxOffsetX;
  const y = (ch - drawH) / 2 + panY * maxOffsetY;

  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

export function PropertyWalkthroughVideo({
  images,
  title,
  locality,
  city,
  price,
  kind,
  propertyType,
  projectStage,
  phaseName,
  landArea,
  sqft,
  beds,
  reraApproved = true,
  reraNumber,
  builderName,
  compact = false,
}: PropertyWalkthroughVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const [readyCount, setReadyCount] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const totalSlides = Math.max(1, images.length);
  const totalDurationMs = totalSlides * SCENE_DURATION_MS;

  // Preload every uploaded photo into HTMLImageElements
  useEffect(() => {
    let cancelled = false;
    loadedImagesRef.current = [];
    setReadyCount(0);

    if (images.length === 0) return;

    const loaded: HTMLImageElement[] = [];
    let count = 0;

    images.forEach((src, index) => {
      const img = new Image();
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (cancelled) return;
        loaded[index] = img;
        count += 1;
        loadedImagesRef.current = loaded.filter(Boolean);
        setReadyCount(count);
      };
      img.onerror = () => {
        if (cancelled) return;
        count += 1;
        setReadyCount(count);
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, [images]);

  // Draw one frame at `timeMs`
  const renderFrame = (timeMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const imgs = loadedImagesRef.current;

    ctx.fillStyle = '#17120F';
    ctx.fillRect(0, 0, cw, ch);

    if (imgs.length > 0) {
      const looped = timeMs % (imgs.length * SCENE_DURATION_MS);
      const slideIdx = Math.floor(looped / SCENE_DURATION_MS) % imgs.length;
      const slideElapsed = looped - slideIdx * SCENE_DURATION_MS;
      const t = Math.min(1, Math.max(0, slideElapsed / SCENE_DURATION_MS));

      const currentImg = imgs[slideIdx];
      const nextImg = imgs[(slideIdx + 1) % imgs.length];

      // Alternating slow Ken Burns zoom & pan vectors per slide
      const dirX = slideIdx % 2 === 0 ? 1 : -1;
      const dirY = slideIdx % 3 === 0 ? -0.6 : 0.5;
      const zoom = 1.05 + t * 0.13;
      const panX = dirX * (t - 0.5) * 0.85;
      const panY = dirY * (t - 0.5) * 0.65;

      drawCoverImage(ctx, currentImg, cw, ch, zoom, panX, panY, 1);

      // Silky crossfade into next photo at the end of each scene
      if (imgs.length > 1 && slideElapsed > SCENE_DURATION_MS - FADE_DURATION_MS) {
        const fadeT =
          (slideElapsed - (SCENE_DURATION_MS - FADE_DURATION_MS)) / FADE_DURATION_MS;
        drawCoverImage(ctx, nextImg, cw, ch, 1.05, -dirX * 0.4, 0, Math.min(1, fadeT));
      }
    }

    // Editorial cinematic dark vignette (top + bottom)
    const topGrad = ctx.createLinearGradient(0, 0, 0, ch * 0.28);
    topGrad.addColorStop(0, 'rgba(23, 18, 15, 0.72)');
    topGrad.addColorStop(1, 'rgba(23, 18, 15, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, cw, ch * 0.28);

    const botGrad = ctx.createLinearGradient(0, ch * 0.48, 0, ch);
    botGrad.addColorStop(0, 'rgba(23, 18, 15, 0)');
    botGrad.addColorStop(0.55, 'rgba(23, 18, 15, 0.76)');
    botGrad.addColorStop(1, 'rgba(23, 18, 15, 0.94)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, ch * 0.48, cw, ch * 0.52);

    // Top-left status badges (Phase + RERA status)
    const padX = Math.round(cw * 0.045);
    const topY = Math.round(ch * 0.065);
    const stageText = `${getProjectStageLabel(projectStage).toUpperCase()}${
      phaseName ? ` · ${phaseName.toUpperCase()}` : ''
    }`;

    ctx.font = `700 ${Math.round(ch * 0.024)}px "Plus Jakarta Sans", sans-serif`;
    const badgeMetrics = ctx.measureText(stageText);
    const pillW = Math.min(cw * 0.52, badgeMetrics.width + 32);
    const pillH = Math.round(ch * 0.052);

    ctx.fillStyle = 'rgba(23, 18, 15, 0.82)';
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(padX, topY, pillW, pillH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C9A96E';
    ctx.fillText(stageText.slice(0, 44), padX + 16, topY + pillH * 0.65);

    // Top-right RERA verified indicator
    const reraBadge = reraApproved ? '✓ RERA APPROVED' : 'RERA IN PROGRESS';
    const reraW = ctx.measureText(reraBadge).width + 30;
    ctx.fillStyle = reraApproved ? 'rgba(61, 191, 99, 0.22)' : 'rgba(239, 230, 214, 0.16)';
    ctx.strokeStyle = reraApproved ? 'rgba(61, 191, 99, 0.75)' : 'rgba(201, 169, 110, 0.55)';
    ctx.beginPath();
    ctx.roundRect(cw - padX - reraW, topY, reraW, pillH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = reraApproved ? '#8BF0A8' : '#EFE6D6';
    ctx.fillText(reraBadge, cw - padX - reraW + 15, topY + pillH * 0.65);

    // Lower-third editorial architectural card
    const baseBottom = ch - Math.round(ch * 0.075);

    // Gold eyebrow: Builder + Locality
    ctx.font = `600 ${Math.round(ch * 0.025)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#C9A96E';
    const eyebrow = `${builderName ? `${builderName.toUpperCase()} · ` : ''}${locality.toUpperCase()}, ${city.toUpperCase()}`;
    ctx.fillText(eyebrow.slice(0, 68), padX, baseBottom - Math.round(ch * 0.145));

    // Main title
    ctx.font = `800 ${Math.round(ch * 0.052)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FAF7F2';
    const displayTitle = title.length > 46 ? `${title.slice(0, 45)}…` : title;
    ctx.fillText(displayTitle || 'Architectural Walkthrough', padX, baseBottom - Math.round(ch * 0.075));

    // Specs row
    const specParts: string[] = [propertyType];
    if (!isLandProperty(propertyType) && beds && beds > 0) {
      specParts.push(`${beds} BHK`);
    }
    if (sqft && sqft > 0) {
      specParts.push(`${sqft.toLocaleString('en-IN')} sq ft`);
    }
    if (landArea) {
      specParts.push(landArea);
    }
    if (reraNumber) {
      specParts.push(`RERA: ${reraNumber.slice(0, 26)}`);
    }

    ctx.font = `500 ${Math.round(ch * 0.024)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(250, 247, 242, 0.78)';
    ctx.fillText(specParts.join('  ·  '), padX, baseBottom - Math.round(ch * 0.02));

    // Right-aligned Price callout
    const priceLabel = formatIndianPrice(price, kind);
    ctx.font = `800 ${Math.round(ch * 0.056)}px "Plus Jakarta Sans", sans-serif`;
    const priceW = ctx.measureText(priceLabel).width;
    ctx.fillStyle = '#FAF7F2';
    ctx.fillText(priceLabel, cw - padX - priceW, baseBottom - Math.round(ch * 0.055));

    // Subtle thin progress bar along bottom edge
    const pct = totalDurationMs > 0 ? (timeMs % totalDurationMs) / totalDurationMs : 0;
    ctx.fillStyle = 'rgba(250, 247, 242, 0.2)';
    ctx.fillRect(0, ch - 5, cw, 5);
    ctx.fillStyle = '#C9A96E';
    ctx.fillRect(0, ch - 5, cw * pct, 5);
  };

  // Animation loop
  useEffect(() => {
    if (images.length === 0) return;

    if (!playing) {
      renderFrame(elapsedRef.current);
      return;
    }

    startTimeRef.current = performance.now() - elapsedRef.current;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      elapsedRef.current = elapsed % totalDurationMs;
      renderFrame(elapsedRef.current);

      const slideIdx = Math.floor(elapsedRef.current / SCENE_DURATION_MS) % totalSlides;
      setActiveSlide(slideIdx);
      setProgressPct((elapsedRef.current / totalDurationMs) * 100);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, readyCount, title, locality, city, price, kind, propertyType, projectStage, phaseName, landArea, sqft, beds, reraApproved, reraNumber, builderName, totalDurationMs, totalSlides]);

  const jumpToSlide = (idx: number) => {
    elapsedRef.current = idx * SCENE_DURATION_MS + 10;
    startTimeRef.current = performance.now() - elapsedRef.current;
    setActiveSlide(idx);
    setProgressPct((elapsedRef.current / totalDurationMs) * 100);
    renderFrame(elapsedRef.current);
  };

  const handleRestart = () => {
    jumpToSlide(0);
    setPlaying(true);
  };

  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || exporting || loadedImagesRef.current.length === 0) return;

    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setExportMessage('Video export is not supported in this browser; live playback is active.');
      return;
    }

    setExporting(true);
    setExportMessage('Rendering HD walkthrough reel from your photos…');

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      // Reset to slide 0 and record one complete cycle (capped at 12s for snappy export)
      elapsedRef.current = 0;
      startTimeRef.current = performance.now();
      setPlaying(true);
      recorder.start();

      const recordMs = Math.min(totalDurationMs, 11_000);
      await new Promise((r) => window.setTimeout(r, recordMs));
      recorder.stop();

      const blob = await done;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'estatedirect-walkthrough')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-walkthrough.webm`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setExportMessage('Walkthrough video downloaded (.webm).');
    } catch {
      setExportMessage('Could not record video in this environment; interactive player remains active.');
    } finally {
      setExporting(false);
    }
  };

  if (images.length === 0) {
    return (
      <div className="rounded-[24px] bg-[#17120F] text-[#FAF7F2]/75 p-8 text-center">
        <Film className="w-8 h-8 text-[#C9A96E] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#FAF7F2]">
          Upload 1 or more photos to auto-generate a walkthrough video
        </p>
        <p className="text-xs text-[#FAF7F2]/55 mt-1">
          Photos automatically animate with Ken Burns pans, RERA badge overlays, and downloadable .webm export.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="walkthrough-video-player"
      className={`rounded-[28px] overflow-hidden bg-[#17120F] border border-[#17120F]/15 shadow-editorial ${
        compact ? '' : ''
      }`}
    >
      <div className="relative aspect-video bg-[#17120F]">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full block object-cover"
        />
      </div>

      {/* Controls Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#17120F] text-[#FAF7F2] flex flex-wrap items-center justify-between gap-3 border-t border-[#FAF7F2]/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause walkthrough video' : 'Play walkthrough video'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C9A96E] text-[#17120F] text-xs font-bold hover:bg-[#D8BA82] transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Restart walkthrough video"
            className="w-8 h-8 rounded-full bg-[#261E19] text-[#FAF7F2]/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Scene Jump Dots */}
          <div className="flex items-center gap-1.5 ml-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToSlide(idx)}
                aria-label={`Jump to scene ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === activeSlide ? 'w-6 bg-[#C9A96E]' : 'w-2 bg-[#FAF7F2]/30 hover:bg-[#FAF7F2]/60'
                }`}
              />
            ))}
          </div>

          <span className="ml-1 text-[11px] font-mono-code text-[#FAF7F2]/65">
            Scene {activeSlide + 1}/{totalSlides}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#FAF7F2]/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3DBF63]" />
            Auto-generated from {images.length} {images.length === 1 ? 'photo' : 'photos'} (
            {Math.round(progressPct)}%)
          </span>

          <button
            type="button"
            onClick={() => void handleExportVideo()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#FAF7F2]/25 text-[#FAF7F2] text-xs font-semibold hover:bg-[#FAF7F2]/10 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A96E]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#C9A96E]" />
            )}
            {exporting ? 'Recording…' : 'Download Video'}
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="px-5 py-2 bg-[#231B16] text-[11px] text-[#EFE6D6] border-t border-[#FAF7F2]/10">
          {exportMessage}
        </div>
      )}
    </div>
  );
}
