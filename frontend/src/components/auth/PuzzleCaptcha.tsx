"use client";

import { ArrowRight, Check, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import styles from "./PuzzleCaptcha.module.css";

export type CaptchaProof = { token: string; position: number; elapsedMs: number; moves: number };
type Challenge = { token: string; target: number; image: string; expiresAt: number };
type Gesture = { startedAt: number; moves: number; position: number };
const emptyGesture = (): Gesture => ({ startedAt: 0, moves: 0, position: 0 });

// Match the centre of a 52px native range thumb, including at both edges.
function markerPosition(value: number) {
  return "calc(" + value + "% + " + (26 - value * 0.52) + "px)";
}

export function PuzzleCaptcha({ locale, onChange }: {
  locale: Locale;
  onChange: (proof: CaptchaProof | null) => void;
}) {
  const zh = locale === "zh";
  const id = useId();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [generation, setGeneration] = useState(0);
  const [position, setPosition] = useState(0);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyboard, setKeyboard] = useState(false);
  const gesture = useRef(emptyGesture());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSettleTimer() {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  }

  function resetPosition() {
    clearSettleTimer();
    gesture.current = emptyGesture();
    setPosition(0);
    setVerified(false);
    onChange(null);
  }

  function refresh() {
    resetPosition();
    setChallenge(null);
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
          || !result.image.startsWith("/images/captcha/")) throw new Error("Invalid challenge");
        if (controller.signal.aborted) return;
        setChallenge({ ...result, expiresAt: Date.now() + Math.min(result.expiresIn, 300) * 1000 - 5_000 });
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(zh ? "暂时无法加载验证，请点击右上角重试。" : "Verification could not load. Use the refresh button to retry.");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
      clearSettleTimer();
    };
  }, [generation, zh]);

  useEffect(() => {
    if (!challenge) return;
    const timeout = setTimeout(() => {
      clearSettleTimer();
      gesture.current = emptyGesture();
      setChallenge(null);
      setPosition(0);
      setVerified(false);
      setError(zh ? "验证已过期，请点击右上角重新加载。" : "Verification expired. Refresh to try again.");
      onChange(null);
    }, Math.max(0, challenge.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [challenge, onChange, zh]);

  function finish() {
    clearSettleTimer();
    if (!challenge || verified || !gesture.current.startedAt || Date.now() >= challenge.expiresAt) return;
    const current = gesture.current;
    if (Math.abs(current.position - challenge.target) > 4 || current.moves < 3) {
      setError(current.moves < 3
        ? (zh ? "请按住蓝色滑块拖动，不要直接点击轨道。" : "Hold and drag the blue handle instead of tapping the track.")
        : (zh ? "再试一次：让图片中的方块与虚线框重合。" : "Try again: line up the square with the dashed outline."));
      resetPosition();
      return;
    }
    const elapsedMs = Date.now() - current.startedAt;
    // Let a quick genuine drag settle rather than incorrectly calling it a mismatch.
    if (elapsedMs < 650) {
      settleTimer.current = setTimeout(finish, 651 - elapsedMs);
      return;
    }
    setVerified(true);
    setError("");
    onChange({ token: challenge.token, position: current.position, elapsedMs, moves: current.moves });
  }

  const ready = Boolean(challenge) && !verified && !loading;
  const hint = verified
    ? (zh ? "验证完成，可以继续。" : "Verified. You’re ready to continue.")
    : error || (loading
      ? (zh ? "正在准备验证…" : "Preparing verification…")
      : (zh ? "拖动下方滑块，让图片中的方块与虚线框重合。" : "Drag the handle to match the square to the dashed outline."));

  return (
    <section className={styles.panel} aria-labelledby={id + "-title"} aria-busy={loading}>
      <div className={styles.heading}>
        <p id={id + "-title"}><ShieldCheck size={18} aria-hidden="true" />{zh ? "安全验证" : "Security check"}</p>
        <button type="button" onClick={refresh} disabled={loading} className={styles.refresh}
          aria-label={zh ? "重新加载验证" : "Refresh verification"} title={zh ? "换一张" : "New image"}>
          {loading ? <LoaderCircle size={18} className={styles.spinner} /> : <RefreshCw size={18} />}
        </button>
      </div>
      <div className={styles.scene} aria-hidden="true"
        style={challenge ? { backgroundImage: "url(" + challenge.image + ")" } : undefined}>
        {challenge ? <>
          <span className={styles.target} style={{ left: markerPosition(challenge.target) }} />
          <span className={styles.piece + (verified ? " " + styles.completePiece : "")} style={{ left: markerPosition(position) }}>
            {verified ? <Check size={20} /> : <span />}
          </span>
        </> : <span className={styles.scenePlaceholder}><ShieldCheck size={24} /></span>}
      </div>
      <div className={styles.track + (verified ? " " + styles.complete : "")} style={{ "--marker": markerPosition(position) } as CSSProperties}>
        <span className={styles.fill} aria-hidden="true" />
        {position === 0 && <span className={styles.trackLabel} aria-hidden="true">{zh ? "按住滑块向右拖动" : "Slide to match"}</span>}
        <input className={styles.slider} type="range" min="0" max="100" step="1" value={position} disabled={!ready}
          aria-label={zh ? "拖动安全验证滑块" : "Drag the verification slider"}
          aria-describedby={id + "-status " + id + "-keyboard"}
          onPointerDown={(event) => {
            clearSettleTimer();
            if (!gesture.current.startedAt) gesture.current.startedAt = Date.now();
            event.currentTarget.setPointerCapture(event.pointerId);
            setKeyboard(false);
          }}
          onChange={(event) => {
            clearSettleTimer();
            const value = Number(event.currentTarget.value);
            if (!gesture.current.startedAt) gesture.current.startedAt = Date.now();
            if (value !== gesture.current.position) gesture.current.moves += 1;
            gesture.current.position = value;
            setPosition(value);
            setError("");
          }}
          onPointerUp={finish}
          onPointerCancel={resetPosition}
          onKeyDown={(event) => {
            setKeyboard(true);
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              finish();
            }
          }} />
        <span className={styles.handleIcon} aria-hidden="true">{verified ? <Check size={23} /> : <ArrowRight size={23} />}</span>
      </div>
      <p id={id + "-status"} className={styles.status + (error ? " " + styles.error : verified ? " " + styles.success : "")} aria-live="polite">{hint}</p>
      <p id={id + "-keyboard"} className={keyboard && ready ? styles.keyboardHint : "sr-only"}>
        {zh ? "键盘：左右方向键调整位置，按 Enter 确认。" : "Keyboard: use arrow keys to adjust, then press Enter to confirm."}
      </p>
    </section>
  );
}
