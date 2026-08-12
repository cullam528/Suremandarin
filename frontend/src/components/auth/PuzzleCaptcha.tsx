"use client";

import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export type CaptchaProof = {
  token: string;
  position: number;
  elapsedMs: number;
  moves: number;
};

type Challenge = {
  token: string;
  target: number;
  image: string;
};

export function PuzzleCaptcha({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (proof: CaptchaProof | null) => void;
}) {
  const zh = locale === "zh";
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [position, setPosition] = useState(0);
  const [moves, setMoves] = useState(0);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(0);

  const loadChallenge = useCallback(async () => {
    setChallenge(null);
    setPosition(0);
    setMoves(0);
    setVerified(false);
    setError("");
    startedAt.current = 0;
    onChange(null);
    try {
      const response = await fetch("/api/security/puzzle", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setChallenge(result);
    } catch {
      setError(zh ? "验证组件加载失败，请刷新重试。" : "Verification could not load. Please refresh it.");
    }
  }, [onChange, zh]);

  useEffect(() => {
    let active = true;
    fetch("/api/security/puzzle", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setChallenge(result);
      })
      .catch(() => {
        if (active) setError(zh ? "验证组件加载失败，请刷新重试。" : "Verification could not load. Please refresh it.");
      });
    return () => {
      active = false;
    };
  }, [zh]);

  function finish() {
    if (!challenge || verified || !startedAt.current) return;
    const elapsedMs = Date.now() - startedAt.current;
    const passed = Math.abs(position - challenge.target) <= 4 && moves >= 3 && elapsedMs >= 650;
    if (!passed) {
      setError(zh ? "没有对准缺口，请重新拖动。" : "The piece did not match. Please try again.");
      setPosition(0);
      setMoves(0);
      startedAt.current = 0;
      onChange(null);
      return;
    }
    const proof = { token: challenge.token, position, elapsedMs, moves };
    setVerified(true);
    setError("");
    onChange(proof);
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-slate-50 p-3" aria-label={zh ? "人机验证" : "Human verification"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-extrabold text-brand-navy">
          <ShieldCheck size={16} className="text-brand-blue" />
          {zh ? "安全验证：拖动拼图到缺口" : "Security check: slide the piece into place"}
        </p>
        <button type="button" onClick={() => void loadChallenge()} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-brand-blue" aria-label={zh ? "更换拼图" : "New puzzle"}>
          <RefreshCw size={15} />
        </button>
      </div>
      <div
        className="relative aspect-[572/96] w-full overflow-hidden rounded-xl bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${challenge?.image ?? "/images/captcha/captcha-lantern.png?v=20260813"})` }}
      >
        <div className="absolute inset-0 bg-brand-navy/10" />
        {challenge && (
          <>
            <span
              className="absolute top-1/2 size-[clamp(1.75rem,7vw,2.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-white/90 bg-brand-navy/25 shadow-inner"
              style={{ left: `${challenge.target}%` }}
              aria-hidden="true"
            />
            <span
              className={`absolute top-1/2 grid size-[clamp(1.75rem,7vw,2.5rem)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border-2 border-white bg-white/90 shadow-lg transition-colors ${verified ? "text-emerald-600" : "text-brand-blue"}`}
              style={{ left: `${position}%` }}
              aria-hidden="true"
            >
              {verified ? <CheckCircle2 size={23} /> : <span className="size-3 rounded-full bg-current" />}
            </span>
          </>
        )}
      </div>
      <input
        aria-label={zh ? "拖动拼图" : "Slide puzzle"}
        type="range"
        min="0"
        max="100"
        value={position}
        disabled={!challenge || verified}
        onPointerDown={() => {
          if (!startedAt.current) startedAt.current = Date.now();
        }}
        onChange={(event) => {
          if (!startedAt.current) startedAt.current = Date.now();
          setPosition(Number(event.target.value));
          setMoves((value) => value + 1);
          setError("");
        }}
        onPointerUp={finish}
        onKeyUp={finish}
        className="mt-3 w-full accent-brand-blue"
      />
      <p className={`mt-1 text-xs font-semibold ${verified ? "text-emerald-600" : error ? "text-red-600" : "text-slate-500"}`} aria-live="polite">
        {verified ? (zh ? "验证成功" : "Verified") : error || (zh ? "按住滑块并向右拖动" : "Hold the slider and drag it to the right")}
      </p>
    </section>
  );
}
