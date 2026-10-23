"use client";

import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import styles from "./PuzzleCaptcha.module.css";

export type CaptchaProof = { token: string };
type CaptchaAction = "login" | "register" | "forgot-password";
type Turnstile = {
  ready: (callback: () => void) => void;
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: CaptchaAction;
    language: "zh-CN" | "en";
    theme: "light";
    size: "flexible" | "compact";
    retry: "never";
    "refresh-expired": "never";
    "refresh-timeout": "never";
    "response-field": false;
    callback: (token: string) => void;
    "error-callback": () => boolean;
    "expired-callback": () => void;
    "timeout-callback": () => void;
    "unsupported-callback": () => void;
  }) => string | undefined;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window { turnstile?: Turnstile }
}

let scriptPromise: Promise<Turnstile> | undefined;

// Share the official script across form mounts. Failed loads may be retried;
// there is deliberately no local or development verification fallback.
function loadTurnstile(): Promise<Turnstile> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    let script: HTMLScriptElement | undefined;
    let finished = false;
    const cleanup = () => {
      clearTimeout(timeout);
      script?.removeEventListener("load", ready);
      script?.removeEventListener("error", fail);
    };
    const fail = () => {
      if (finished) return;
      finished = true;
      cleanup();
      script?.remove();
      reject(new Error("Security check could not load"));
    };
    const ready = () => {
      if (finished) return;
      const api = window.turnstile;
      if (!api) { fail(); return; }
      try {
        api.ready(() => {
          if (finished) return;
          finished = true;
          cleanup();
          resolve(api);
        });
      } catch { fail(); }
    };
    const timeout = setTimeout(fail, 15_000);
    if (window.turnstile) {
      ready();
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", ready);
      script.addEventListener("error", fail);
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    scriptPromise = undefined;
    throw error;
  });
  return scriptPromise;
}

export function PuzzleCaptcha({ locale, action, onChange }: {
  locale: Locale;
  action: CaptchaAction;
  onChange: (proof: CaptchaProof | null) => void;
}) {
  const zh = locale === "zh";
  const id = useId();
  const container = useRef<HTMLDivElement | null>(null);
  const revision = useRef(0);
  const [generation, setGeneration] = useState(0);
  const [phase, setPhase] = useState<"loading" | "pending" | "verified" | "error">("loading");
  const [error, setError] = useState("");

  function refresh() {
    revision.current += 1;
    onChange(null);
    setError("");
    setPhase("loading");
    setGeneration(revision.current);
  }

  useEffect(() => {
    let mounted = true;
    let failed = false;
    let api: Turnstile | undefined;
    let widgetId: string | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const active = () => mounted && revision.current === generation;
    const fail = (message: string) => {
      if (!active()) return;
      failed = true;
      clearTimeout(expiryTimer);
      onChange(null);
      setPhase("error");
      setError(message);
    };
    const expired = () => fail(zh ? "验证已过期，请点击右上角重新验证。" : "Verification expired. Use the refresh button to try again.");
    onChange(null);
    void Promise.resolve().then(async () => {
      if (!active()) return;
      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
      if (!sitekey) throw new Error("Security check is not configured");
      api = await loadTurnstile();
      if (!active() || !container.current) return;
      setPhase("pending");
      setError("");
      widgetId = api.render(container.current, {
        sitekey, action, language: zh ? "zh-CN" : "en", theme: "light",
        size: container.current.clientWidth < 300 ? "compact" : "flexible",
        retry: "never", "refresh-expired": "never", "refresh-timeout": "never", "response-field": false,
        callback: (token) => {
          if (!active() || failed) return;
          if (typeof token !== "string" || !token || token.length > 2048) {
            fail(zh ? "验证未能完成，请重新验证。" : "Verification failed. Please try again.");
            return;
          }
          clearTimeout(expiryTimer);
          // Also clear locally if the provider's expiry callback is interrupted.
          expiryTimer = setTimeout(expired, 295_000);
          setPhase("verified");
          setError("");
          onChange({ token });
        },
        "error-callback": () => {
          fail(zh ? "验证暂时不可用，请检查网络后重新验证。" : "Verification is unavailable. Check your connection and retry.");
          return true;
        },
        "expired-callback": expired,
        "timeout-callback": () => fail(zh ? "验证已超时，请重新验证。" : "Verification timed out. Please try again."),
        "unsupported-callback": () => fail(zh ? "当前浏览器无法完成验证，请更新浏览器后重试。" : "This browser cannot complete verification. Update your browser and retry."),
      });
      if (!widgetId) throw new Error("Security check could not render");
    }).catch(() => fail(zh
      ? "暂时无法加载安全验证。请检查网络或浏览器拦截设置，然后点击右上角重试。"
      : "Security check could not load. Check your connection or browser blocking settings, then use the refresh button to retry."));
    return () => {
      mounted = false;
      clearTimeout(expiryTimer);
      if (api && widgetId) api.remove(widgetId);
    };
  }, [action, generation, onChange, zh]);

  const loading = phase === "loading";
  const verified = phase === "verified";
  const hint = error || (verified
    ? (zh ? "验证完成，可以继续。" : "Verified. You’re ready to continue.")
    : loading ? (zh ? "正在加载安全验证…" : "Loading security check…")
      : (zh ? "请完成下方安全验证。" : "Complete the security check below."));

  return (
    <section className={styles.panel} aria-labelledby={id + "-title"} aria-busy={loading}>
      <div className={styles.heading}>
        <p id={id + "-title"}><ShieldCheck size={18} aria-hidden="true" />{zh ? "安全验证" : "Security check"}</p>
        <button type="button" onClick={refresh} disabled={loading} className={styles.refresh}
          aria-label={zh ? "重新加载验证" : "Refresh verification"} title={zh ? "重新验证" : "Retry verification"}>
          {loading ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
        </button>
      </div>
      <p id={id + "-status"} className={styles.status + (error ? " " + styles.error : verified ? " " + styles.success : "")} role="status" aria-live="polite">{hint}</p>
      <div ref={container} className={styles.widget} aria-describedby={id + "-status"} />
    </section>
  );
}
