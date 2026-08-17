"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  LockKeyhole,
  Mic,
  Share2,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { dailyCopy, dailyProgressKey, type DailyChallengeDay } from "@/lib/daily";

type DailyChallengeAppProps = {
  locale: Locale;
  days: DailyChallengeDay[];
  isLoggedIn?: boolean;
};

type SavedProgress = {
  completed: number[];
  streak: number;
  lastCompletedAt?: string;
  reward?: DailyReward | null;
};

type DailyReward = {
  status: string;
  hours: number;
  grantedAt?: string | null;
};

type SpeechRecognitionResultEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

const emptyProgress: SavedProgress = { completed: [], streak: 0 };

const systemRecorderMimeTypes = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function supportsMicrophoneRecording() {
  return Boolean(
    typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined",
  );
}

function shouldPreferRecorderFallback() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && window.navigator.maxTouchPoints > 1);
  const isStandalone =
    navigatorWithStandalone.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  const isEmbeddedBrowser =
    /MicroMessenger|FBAN|FBAV|Instagram|Line\//i.test(userAgent) ||
    (isIOS && !/Version\/\d+(?:\.\d+)*.*Safari\//i.test(userAgent));

  return isStandalone || isEmbeddedBrowser;
}

function readLocalProgress(): SavedProgress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const saved = window.localStorage.getItem(dailyProgressKey);
    return saved ? { ...emptyProgress, ...JSON.parse(saved) } : emptyProgress;
  } catch {
    return emptyProgress;
  }
}

export function DailyChallengeApp({ locale, days, isLoggedIn = false }: DailyChallengeAppProps) {
  const copy = dailyCopy[locale];
  const [progress, setProgress] = useState<SavedProgress>(() => readLocalProgress());
  const [selectedDay, setSelectedDay] = useState(1);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructorLike; webkitSpeechRecognition?: SpeechRecognitionConstructorLike };
    return Boolean(
      browserWindow.SpeechRecognition ||
        browserWindow.webkitSpeechRecognition ||
        supportsMicrophoneRecording(),
    );
  });
  const [speechError, setSpeechError] = useState("");
  const [recordingNotice, setRecordingNotice] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [usingRecorderFallback, setUsingRecorderFallback] = useState(false);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [reward, setReward] = useState<DailyReward | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderStartedAtRef = useRef(0);
  const recorderFallbackRef = useRef(false);
  const recorderTimeoutRef = useRef<number | null>(null);
  const recordedAudioUrlRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const day = days[selectedDay - 1] ?? days[0];
  const nextDay = Math.min(selectedDay + 1, days.length);
  const completionCount = progress.completed.length;
  const progressPercent = Math.round((completionCount / days.length) * 100);
  const completed = progress.completed.includes(selectedDay);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.update()).catch(() => undefined);
    }
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
      recognitionRef.current?.stop();
      if (recorderTimeoutRef.current) {
        window.clearTimeout(recorderTimeoutRef.current);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstart = null;
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordedAudioUrlRef.current) {
        URL.revokeObjectURL(recordedAudioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const syncProgress = async () => {
      const local = readLocalProgress();
      try {
        const response = await fetch("/api/daily/progress", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        const remote = payload?.progress as SavedProgress | null;
        if (!remote) return;

        // Carry local-only completions into the account once after sign-in.
        const remoteDays = new Set(remote.completed ?? []);
        const localOnlyDays = (local.completed ?? []).filter((dayNumber) => !remoteDays.has(dayNumber));
        await Promise.all(localOnlyDays.map((dayNumber) => fetch("/api/daily/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day: dayNumber,
            completedAt: local.lastCompletedAt || new Date().toISOString(),
            streak: local.streak || 1,
          }),
        }).catch(() => undefined)));

        const refreshed = localOnlyDays.length
          ? await fetch("/api/daily/progress", { cache: "no-store" }).then((item) => item.json()).catch(() => payload)
          : payload;
        const canonical = (refreshed?.progress ?? remote) as SavedProgress;
        const next: SavedProgress = {
          completed: Array.from(new Set([...(canonical.completed ?? []), ...(local.completed ?? [])])).sort((a, b) => a - b),
          streak: Math.max(Number(canonical.streak ?? 0), Number(local.streak ?? 0)),
          lastCompletedAt: canonical.lastCompletedAt || local.lastCompletedAt,
          reward: canonical.reward ?? local.reward ?? null,
        };
        if (cancelled) return;
        setProgress(next);
        setReward(next.reward ?? null);
        window.localStorage.setItem(dailyProgressKey, JSON.stringify(next));
      } catch {
        // Keep the local progress if the account sync is temporarily unavailable.
      }
    };

    void syncProgress();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const updateProgress = async (next: SavedProgress) => {
    setProgress(next);
    window.localStorage.setItem(dailyProgressKey, JSON.stringify(next));
    try {
      const response = await fetch("/api/daily/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: selectedDay, completedAt: new Date().toISOString(), streak: next.streak }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload?.reward) setReward(payload.reward as DailyReward);
      return payload;
    } catch {
      return null;
    }
  };

  const listen = () => {
    if (typeof window === "undefined") return;
    if (day.audioUrl) {
      const audio = audioRef.current ?? new Audio(day.audioUrl);
      audioRef.current = audio;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Keep a browser speech fallback for browsers that block local audio.
        speakWithBrowserVoice();
      });
      return;
    }
    speakWithBrowserVoice();
  };

  const speakWithBrowserVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(day.phraseZh);
    utterance.lang = "zh-CN";
    utterance.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const completePractice = async () => {
    if (completed) return;
    setRecording(false);
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = "";
      setRecordedAudioUrl("");
    }
    setRecordingNotice("");
    const alreadyCompleted = progress.completed.includes(selectedDay);
    const next = alreadyCompleted
      ? progress
      : {
          completed: [...progress.completed, selectedDay].sort((a, b) => a - b),
          streak: progress.streak + 1,
          lastCompletedAt: new Date().toISOString(),
        };
    const payload = await updateProgress(next);
    if (payload?.reward) setReward(payload.reward as DailyReward);
    setInstallVisible(true);
  };

  const normalizeSpeech = (value: string) => value.toLowerCase().replace(/[\s，。！？、,.!?;；:："“”‘’]/g, "");

  const speechSimilarity = (heard: string, target: string) => {
    const source = normalizeSpeech(heard);
    const expected = normalizeSpeech(target);
    if (!source || !expected) return 0;
    if (source === expected) return 1;
    const previous = Array.from({ length: expected.length + 1 }, (_, index) => index);
    for (let row = 1; row <= source.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= expected.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (source[row - 1] === expected[column - 1] ? 0 : 1),
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return Math.max(0, 1 - previous[expected.length] / Math.max(source.length, expected.length));
  };

  const clearRecorderTimeout = () => {
    if (!recorderTimeoutRef.current) return;
    window.clearTimeout(recorderTimeoutRef.current);
    recorderTimeoutRef.current = null;
  };

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const clearRecordedAudio = () => {
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = "";
    }
    setRecordedAudioUrl("");
    setRecordingNotice("");
  };

  const microphoneErrorMessage = (error: unknown) => {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      return copy.microphoneDenied;
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return copy.microphoneMissing;
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return copy.microphoneBusy;
    }
    return copy.microphoneFailed;
  };

  const requestMicrophone = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new DOMException("Microphone requires HTTPS", "SecurityError");
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  };

  const startRecorderFallback = (stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") {
      stream.getTracks().forEach((track) => track.stop());
      setSpeechSupported(false);
      setSpeechError(copy.speechUnsupported);
      return;
    }

    clearRecordedAudio();
    setSpeechError("");
    setTranscript("");
    setRecordingNotice(copy.recorderMode);
    setUsingRecorderFallback(true);
    recorderChunksRef.current = [];
    recorderStartedAtRef.current = 0;
    mediaStreamRef.current = stream;

    const preferredMimeType = systemRecorderMimeTypes.find((mimeType) => {
      try {
        return MediaRecorder.isTypeSupported(mimeType);
      } catch {
        return false;
      }
    });
    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    recorder.onstart = () => {
      recorderStartedAtRef.current = Date.now();
    };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recorderChunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      clearRecorderTimeout();
      setRecording(false);
      setRecordingNotice("");
      setSpeechError(copy.microphoneFailed);
      stopMediaStream();
      mediaRecorderRef.current = null;
    };
    recorder.onstop = () => {
      clearRecorderTimeout();
      const duration = Date.now() - recorderStartedAtRef.current;
      const mimeType = recorder.mimeType || preferredMimeType || "audio/mp4";
      const recordingBlob = new Blob(recorderChunksRef.current, {
        type: mimeType,
      });
      setRecording(false);
      stopMediaStream();
      mediaRecorderRef.current = null;

      if (duration < 700 || recordingBlob.size < 600) {
        setRecordingNotice("");
        setSpeechError(copy.recordingTooShort);
        return;
      }

      const nextAudioUrl = URL.createObjectURL(recordingBlob);
      if (recordedAudioUrlRef.current) {
        URL.revokeObjectURL(recordedAudioUrlRef.current);
      }
      recordedAudioUrlRef.current = nextAudioUrl;
      setRecordedAudioUrl(nextAudioUrl);
      setRecordingNotice(copy.recordingCaptured);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    const maximumRecordingTime = day.dayNumber === days.length ? 65_000 : 20_000;
    recorderTimeoutRef.current = window.setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }, maximumRecordingTime);
  };

  const startPractice = async () => {
    if (completed || recording) return;
    setSpeechError("");
    setRecordingNotice("");
    setTranscript("");

    let microphoneStream: MediaStream;
    try {
      microphoneStream = await requestMicrophone();
      setSpeechSupported(true);
    } catch (error) {
      setRecording(false);
      setSpeechError(microphoneErrorMessage(error));
      return;
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructorLike;
      webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    };
    const Recognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    const useRecorder =
      recorderFallbackRef.current ||
      shouldPreferRecorderFallback() ||
      !Recognition;

    if (useRecorder) {
      startRecorderFallback(microphoneStream);
      return;
    }

    microphoneStream.getTracks().forEach((track) => track.stop());
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript?.trim() ?? "";
      const score = speechSimilarity(heard, day.phraseZh);
      setTranscript(heard);
      setRecording(false);
      recognitionRef.current = null;
      if (score >= 0.62) {
        void completePractice();
      } else {
        setSpeechError(copy.speechRetry);
      }
    };
    recognition.onerror = (event) => {
      setRecording(false);
      recognitionRef.current = null;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechError(copy.microphoneDenied);
        return;
      }
      if (event.error === "no-speech") {
        setSpeechError(copy.noSpeechDetected);
        return;
      }
      recorderFallbackRef.current = true;
      setUsingRecorderFallback(true);
      setSpeechError(copy.switchToRecorder);
    };
    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setUsingRecorderFallback(false);
    setRecording(true);
    try {
      recognition.start();
    } catch {
      setRecording(false);
      recognitionRef.current = null;
      recorderFallbackRef.current = true;
      setUsingRecorderFallback(true);
      setSpeechError(copy.switchToRecorder);
    }
  };

  const stopPractice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    setRecording(false);
  };

  const isSameLocalDay = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  };

  const isDayUnlocked = (dayNumber: number) => {
    if (dayNumber === 1 || progress.completed.includes(dayNumber)) return true;
    const latestCompletedDay = Math.max(...progress.completed, 0);
    return dayNumber === latestCompletedDay + 1 && Boolean(progress.lastCompletedAt) && !isSameLocalDay(progress.lastCompletedAt);
  };

  const selectDay = (dayNumber: number) => {
    if (!isDayUnlocked(dayNumber)) {
      setNotice(copy.unlockTomorrow);
      return;
    }
    setNotice("");
    setSelectedDay(dayNumber);
    setSpeechError("");
    setTranscript("");
    clearRecordedAudio();
  };

  const share = async () => {
    const shareText = locale === "zh"
      ? `我在 SureMandarin Daily 完成了 ${Math.max(progress.streak, 1)} 天中文口语挑战！`
      : `I’m on a ${Math.max(progress.streak, 1)}-day Chinese speaking streak with SureMandarin Daily!`;
    const shareData = { title: "SureMandarin Daily", text: shareText, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        setShareMessage(locale === "zh" ? "链接已复制" : "Link copied");
        window.setTimeout(() => setShareMessage(""), 1800);
      }
    } catch {
      // Sharing was cancelled; keep the user on the challenge.
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
    setInstallVisible(false);
  };

  const consultationHref = useMemo(() => {
    const params = new URLSearchParams({
      leadSource: "daily-challenge",
      campaign: `daily-day-${days.length}`,
      defaultCourse: "online-course",
    });
    return `/${locale}/courses/online-course?${params.toString()}#consultation`;
  }, [days.length, locale]);

  if (!day) return null;

  return (
    <div className="daily-app-shell">
      <main className="daily-main">
        <section className="daily-intro">
          <div>
            <p className="daily-eyebrow"><Sparkles size={15} /> {copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="daily-description">{copy.description}</p>
          </div>
          <div className="daily-streak-card">
            <span className="daily-streak-icon"><Flame size={21} fill="currentColor" /></span>
            <strong>{Math.max(progress.streak, 0)}</strong>
            <span>{copy.streak}</span>
          </div>
          {installVisible && installPrompt ? (
            <button type="button" className="daily-install-button" onClick={install}>{copy.install}</button>
          ) : null}
        </section>

        <section className="daily-progress-panel" aria-label="7 day progress">
          <div className="daily-progress-head">
            <span>{locale === "zh" ? "你的挑战进度" : "Your challenge progress"}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="daily-day-row">
            {days.map((item) => {
              const done = progress.completed.includes(item.dayNumber);
              const active = item.dayNumber === selectedDay;
              const locked = !isDayUnlocked(item.dayNumber);
              return (
                <button
                  key={item.dayNumber}
                  type="button"
                  className={`daily-day-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
                  onClick={() => selectDay(item.dayNumber)}
                  aria-label={`${copy.day} ${item.dayNumber}`}
                  aria-disabled={locked}
                >
                  <span className="daily-day-circle">
                    {done ? <Check size={15} strokeWidth={3} /> : locked ? <LockKeyhole size={13} /> : item.dayNumber}
                  </span>
                  <small>{copy.day} {item.dayNumber}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="daily-lesson-grid">
          <article className="daily-lesson-card">
            <div className="daily-lesson-meta">
              <span>{day.category}</span>
              <span>{day.estimatedMinutes} {copy.minutes}</span>
            </div>
            <div className="daily-lesson-title-row">
              <div>
                <p className="daily-kicker">{copy.day} {day.dayNumber} {locale === "zh" ? "的练习" : `of ${days.length}`}</p>
                <h2>{day.title}</h2>
              </div>
              <div className="daily-day-badge">{day.dayNumber}</div>
            </div>
            <div className="daily-image-frame">
              <Image src={day.image} alt={day.title} fill sizes="(max-width: 820px) 100vw, 680px" className="object-cover" priority={day.dayNumber === 2} unoptimized={day.image.startsWith("http")} />
              <div className="daily-image-wash" />
            </div>
            <p className="daily-prompt">{day.prompt}</p>
            <div className="daily-phrase-box">
              <div>
                <span className="daily-phrase-label">中文</span>
                <strong>{day.phraseZh}</strong>
                <span className="daily-translation">{day.phraseEn}</span>
              </div>
              <button type="button" className="daily-listen" onClick={listen} aria-label={copy.listen}>
                <Volume2 size={19} />
                <span>{copy.listen}</span>
              </button>
            </div>
            <audio ref={audioRef} src={day.audioUrl} preload="metadata" className="sr-only" aria-label={copy.listen} />
          </article>

          <aside className={`daily-speaking-card ${completed ? "is-complete" : ""}`}>
            <div className="daily-speaking-icon"><Mic size={24} /></div>
            <p className="daily-kicker">{copy.speaking}</p>
            {!completed ? (
              <>
                <h2>{copy.ready}</h2>
                <p>{locale === "zh" ? "先听一遍，再用自己的声音说出来。无需完美，敢开口就算完成。" : "Listen once, then say it in your own voice. No perfection needed — showing up counts."}</p>
                <button type="button" className={`daily-speak-button ${recording ? "is-recording" : ""}`} onClick={recording ? stopPractice : startPractice} disabled={speechSupported === false}>
                  <span className="daily-mic-pulse"><Mic size={22} /></span>
                  <span>{recording ? copy.stop : copy.start}</span>
                  {!recording && <ArrowRight size={19} />}
                </button>
                {speechError && <p className="daily-speech-error" role="alert">{speechError}</p>}
                {recordingNotice && <p className="daily-recording-notice" role="status">{recordingNotice}</p>}
                {transcript && <p className="daily-transcript"><span>{copy.recognized}</span> {transcript}</p>}
                {recordedAudioUrl && usingRecorderFallback ? (
                  <div className="daily-recording-review">
                    <audio controls preload="metadata" src={recordedAudioUrl} aria-label={copy.recordingCaptured} />
                    <div>
                      <button type="button" onClick={() => void completePractice()}>{copy.confirmRecording}</button>
                      <button type="button" onClick={clearRecordedAudio}>{copy.recordAgain}</button>
                    </div>
                  </div>
                ) : null}
                <div className="daily-waveform" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ height: `${12 + ((index * 17) % 21)}px` }} />)}</div>
              </>
            ) : (
              <>
                <div className="daily-complete-mark"><Check size={26} strokeWidth={3} /></div>
                <h2>{copy.completed}</h2>
                <p>{day.dayNumber === days.length ? copy.rewardDescription : (locale === "zh" ? "连续保持，明天会解锁下一句更实用的中文。" : "Keep the streak going — tomorrow unlocks another phrase you can use in real life.")}</p>
                {day.dayNumber === days.length && (
                  <p className="daily-reward-status" role="status">
                    {isLoggedIn && reward?.status === "available"
                      ? copy.rewardGranted
                      : isLoggedIn
                        ? copy.rewardDescription
                        : <>{copy.rewardLogin} <a href={`/${locale}/login?redirect=/${locale}/daily`}>{locale === "zh" ? "登录 / 注册" : "Sign in / Register"}</a></>}
                  </p>
                )}
                <div className="daily-complete-actions">
                  {day.dayNumber < days.length && <button type="button" className="daily-secondary-button" onClick={() => selectDay(nextDay)}><span>{copy.next}</span><ArrowRight size={17} /></button>}
                  <button type="button" className="daily-secondary-button" onClick={share}><Share2 size={17} /><span>{shareMessage || copy.share}</span></button>
                </div>
              </>
            )}
            {!isLoggedIn && <p className="daily-guest-note">{copy.guestNote} <a href={`/${locale}/login?redirect=/${locale}/daily`}>{locale === "zh" ? "登录后同步 →" : "Sign in to sync →"}</a></p>}
          </aside>
        </section>

        <section className="daily-bottom-cta">
          <div className="daily-reward-icon"><Trophy size={25} /></div>
          <div>
            <p className="daily-kicker">{copy.reward}</p>
            <h2>{locale === "zh" ? "完成挑战，把练习变成真实对话" : "Turn your practice into real conversations"}</h2>
            <p>{copy.rewardDescription}</p>
          </div>
          <div className="daily-bottom-actions">
            <a href={consultationHref} className="daily-primary-link">{copy.consult}<ArrowRight size={17} /></a>
            <a href={`/${locale}/daily#daily-progress`} className="daily-back-link"><ArrowLeft size={16} /> {copy.back}</a>
          </div>
        </section>

        {notice && <p className="daily-unlock-notice" role="status">{notice}</p>}

        <div className="daily-trust-row"><span>{copy.free}</span><span>{copy.reply}</span><span>{locale === "zh" ? "每天约 5 分钟" : "About 5 minutes a day"}</span></div>
      </main>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
