"use client";

import Image from "next/image";
import { ArrowRight, Check, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Locale } from "@/lib/i18n";
import styles from "./PuzzleCaptcha.module.css";

export type CaptchaProof = { token: string; position: number; elapsedMs: number; moves: number };
type Challenge = { token: string; target: number; image: string; expiresAt: number };
type Phase = "ready" | "dragging" | "checking" | "verified";
type Gesture = {
  startedAt: number; moves: number; position: number; pointerId: number | null;
  originX: number; originPosition: number; travel: number;
};
const emptyGesture = (position = 0): Gesture => ({
  startedAt: 0, moves: 0, position, pointerId: null, originX: 0, originPosition: position, travel: 0,
});
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function PuzzleCaptcha({ locale, onChange }: {
  locale: Locale;
  onChange: (proof: CaptchaProof | null) => void;
}) {
  const zh = locale === "zh";
  const id = useId();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [generation, setGeneration] = useState(0);
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [loading, setLoading] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState("");
  const [keyboard, setKeyboard] = useState(false);
  const panel = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const handle = useRef<HTMLButtonElement | null>(null);
  const geometry = useRef({ width: 0, thumb: 52 });
  const gesture = useRef(emptyGesture());
  const activeToken = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paint at most once per frame. A drag never rerenders the form or changes layout.
  const paint = useCallback((value: number) => {
    const { width, thumb } = geometry.current;
    const shift = Math.max(0, width - thumb) * value / 100;
    panel.current?.style.setProperty("--shift", `${shift}px`);
    panel.current?.style.setProperty("--fill-scale", String(width ? (shift + thumb / 2) / width : 0));
    handle.current?.setAttribute("aria-valuenow", String(Math.round(value)));
  }, []);

  function clearFrame() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }
  function clearSettleTimer() {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  }
  function resetPosition() {
    clearSettleTimer();
    clearFrame();
    gesture.current = emptyGesture();
    paint(0);
    setPosition(0);
    setPhase("ready");
    onChange(null);
  }
  function refresh() {
    activeToken.current = null;
    resetPosition();
    setChallenge(null);
    setImageReady(false);
    setError("");
    setLoading(true);
    setGeneration((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLoading(false);
      setError(zh ? "验证加载超时，请点击右上角重试。" : "Verification timed out. Use the refresh button to retry.");
    }, 15_000);
    void fetch("/api/security/puzzle", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || typeof result.token !== "string" || !Number.isFinite(result.target)
          || result.target < 0 || result.target > 100 || !Number.isFinite(result.expiresIn)
          || result.expiresIn <= 0 || typeof result.image !== "string"
          || !/^\/images\/captcha\/[a-zA-Z0-9_-]+\.(png|webp)(\?v=\d+)?$/.test(result.image)) {
          throw new Error("Invalid challenge");
        }
        if (controller.signal.aborted) return;
        activeToken.current = result.token;
        setChallenge({ ...result, expiresAt: Date.now() + Math.min(result.expiresIn, 300) * 1000 - 5_000 });
        // Image onLoad, not the JSON response, unlocks the drag handle.
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(zh ? "暂时无法加载验证，请点击右上角重试。" : "Verification could not load. Use the refresh button to retry.");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      activeToken.current = null;
      clearTimeout(timeout);
      clearSettleTimer();
      clearFrame();
    };
  }, [generation, zh]);

  useEffect(() => {
    if (!challenge || imageReady || !loading) return;
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(zh ? "图片加载超时，请点击右上角换一张。" : "The image timed out. Refresh to load another image.");
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [challenge, imageReady, loading, zh]);

  useEffect(() => {
    if (!challenge) return;
    const timeout = setTimeout(() => {
      activeToken.current = null;
      clearSettleTimer();
      clearFrame();
      gesture.current = emptyGesture();
      paint(0);
      setChallenge(null);
      setImageReady(false);
      setLoading(false);
      setPosition(0);
      setPhase("ready");
      setError(zh ? "验证已过期，请点击右上角重新加载。" : "Verification expired. Refresh to try again.");
      onChange(null);
    }, Math.max(0, challenge.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [challenge, onChange, paint, zh]);

  useEffect(() => {
    const measure = () => {
      geometry.current = { width: track.current?.clientWidth ?? 0, thumb: handle.current?.offsetWidth ?? 52 };
      paint(gesture.current.position);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (track.current) observer.observe(track.current);
    return () => observer.disconnect();
  }, [paint]);

  function finish() {
    clearSettleTimer();
    if (!challenge || activeToken.current !== challenge.token || !gesture.current.startedAt
      || Date.now() >= challenge.expiresAt) return;
    const current = gesture.current;
    if (Math.abs(current.position - challenge.target) > 4 || current.moves < 3) {
      setError(current.moves < 3
        ? (zh ? "请按住蓝色手柄慢慢拖动，再松开。" : "Hold the blue handle, drag a little more slowly, then release.")
        : (zh ? "还差一点，请继续拖动，让方块与虚线框重合。" : "Almost there. Drag again to line up the square with the outline."));
      // Keep the user's position so small corrections do not mean starting over.
      gesture.current = emptyGesture(current.position);
      setPhase("ready");
      onChange(null);
      return;
    }
    const elapsedMs = Date.now() - current.startedAt;
    if (elapsedMs < 650) {
      settleTimer.current = setTimeout(finish, 651 - elapsedMs);
      return;
    }
    const proof = { token: challenge.token, position: current.position, elapsedMs, moves: current.moves };
    gesture.current = emptyGesture(challenge.target);
    paint(challenge.target);
    setPosition(challenge.target);
    setPhase("verified");
    setError("");
    onChange(proof);
  }

  const verified = phase === "verified";
  const checking = phase === "checking";
  const ready = Boolean(challenge) && imageReady && !loading && !verified && !checking;

  function movePointer(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!ready || current.pointerId !== event.pointerId || current.travel <= 0) return;
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    // Count real coalesced samples and the release coordinate; never invent moves.
    for (const sample of [...samples, event]) {
      const value = clamp(current.originPosition + (sample.clientX - current.originX) / current.travel * 100);
      if (!Number.isFinite(value) || value === current.position) continue;
      current.moves += 1;
      current.position = value;
    }
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        paint(gesture.current.position);
      });
    }
  }
  function cancelPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    if (gesture.current.pointerId !== event.pointerId) return;
    resetPosition();
    setError(zh ? "拖动已中断，请重新按住蓝色手柄。" : "Drag interrupted. Hold the blue handle to try again.");
  }

  const hint = verified
    ? (zh ? "验证完成，可以继续。" : "Verified. You’re ready to continue.")
    : checking ? (zh ? "正在确认，请稍候…" : "Confirming your move…")
      : error || (loading ? (zh ? "正在准备验证图片…" : "Preparing the verification image…")
        : (zh ? "按住蓝色手柄，拖到方块与虚线框重合后松开。" : "Hold the blue handle. Match the square to the outline, then release."));

  return (
    <section ref={panel} className={styles.panel} aria-labelledby={id + "-title"} aria-busy={loading || checking}>
      <div className={styles.heading}>
        <p id={id + "-title"}><ShieldCheck size={18} aria-hidden="true" />{zh ? "安全验证" : "Security check"}</p>
        <button type="button" onClick={refresh} disabled={loading} className={styles.refresh}
          aria-label={zh ? "重新加载验证" : "Refresh verification"} title={zh ? "换一张" : "New image"}>
          {loading ? <LoaderCircle size={18} className={styles.spinner} /> : <RefreshCw size={18} />}
        </button>
      </div>
      <div className={styles.scene} aria-hidden="true">
        {challenge && <Image key={challenge.token} src={challenge.image} alt="" width={600} height={240}
          sizes="(max-width: 639px) calc(100vw - 88px), 520px" className={styles.image} loading="eager"
          onLoad={() => {
            if (activeToken.current !== challenge.token) return;
            setImageReady(true);
            setLoading(false);
            setError("");
          }}
          onError={() => {
            if (activeToken.current !== challenge.token) return;
            setImageReady(false);
            setLoading(false);
            setError(zh ? "图片未能加载，请点击右上角换一张。" : "The image could not load. Refresh to try another image.");
          }} />}
        {!imageReady && <span className={styles.scenePlaceholder}><ShieldCheck size={28} /></span>}
        {challenge && imageReady && <>
          <span className={styles.targetRail}><span className={styles.target} style={{ left: `${challenge.target}%` }} /></span>
          <span className={styles.piece + (verified ? " " + styles.completePiece : "")}>
            {verified ? <Check size={20} /> : <span />}
          </span>
        </>}
      </div>
      <div ref={track} className={styles.track + (verified ? " " + styles.complete : "")} data-dragging={phase === "dragging" || undefined}>
        <span className={styles.fill} aria-hidden="true" />
        <span className={styles.trackLabel} aria-hidden="true">{phase === "ready" && position === 0
          ? (zh ? "按住手柄，向右拖动" : "Hold and slide right") : ""}</span>
        <button ref={handle} className={styles.slider} type="button" role="slider" disabled={!ready}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position)} aria-orientation="horizontal"
          aria-label={zh ? "拖动安全验证滑块" : "Drag the verification slider"}
          aria-describedby={id + "-status " + id + "-keyboard"}
          onPointerDown={(event) => {
            if (!ready || !event.isPrimary || event.button !== 0 || gesture.current.pointerId !== null) return;
            event.preventDefault();
            clearSettleTimer();
            const width = track.current?.clientWidth ?? 0;
            const thumb = event.currentTarget.offsetWidth;
            geometry.current = { width, thumb };
            if (width <= thumb) return;
            gesture.current = { ...emptyGesture(gesture.current.position), startedAt: Date.now(),
              pointerId: event.pointerId, originX: event.clientX, travel: width - thumb };
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            setKeyboard(false);
            setError("");
            setPhase("dragging");
          }}
          onPointerMove={movePointer}
          onPointerUp={(event) => {
            if (gesture.current.pointerId !== event.pointerId) return;
            movePointer(event);
            gesture.current.pointerId = null;
            clearFrame();
            paint(gesture.current.position);
            setPosition(gesture.current.position);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setPhase("checking");
            finish();
          }}
          onPointerCancel={cancelPointer}
          onLostPointerCapture={cancelPointer}
          onKeyDown={(event) => {
            if (!ready || gesture.current.pointerId !== null) return;
            const offsets: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!gesture.current.startedAt) return;
              setPhase("checking");
              finish();
              return;
            }
            if (!(event.key in offsets) && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            clearSettleTimer();
            setKeyboard(true);
            setError("");
            if (!gesture.current.startedAt) gesture.current.startedAt = Date.now();
            const value = event.key === "Home" ? 0 : event.key === "End" ? 100 : clamp(gesture.current.position + offsets[event.key]);
            if (value !== gesture.current.position) gesture.current.moves += 1;
            gesture.current.position = value;
            paint(value);
            setPosition(value);
          }}>
          {verified ? <Check size={23} aria-hidden="true" /> : checking
            ? <LoaderCircle size={22} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={23} aria-hidden="true" />}
        </button>
      </div>
      <p id={id + "-status"} className={styles.status + (error ? " " + styles.error : verified ? " " + styles.success : "")} aria-live="polite">{hint}</p>
      <p id={id + "-keyboard"} className={keyboard && ready ? styles.keyboardHint : "sr-only"}>
        {zh ? "键盘：左右方向键调整位置，按 Enter 确认。" : "Keyboard: use arrow keys to adjust, then press Enter to confirm."}
      </p>
    </section>
  );
}
