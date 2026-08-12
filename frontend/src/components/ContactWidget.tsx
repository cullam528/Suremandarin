"use client";
import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import type { GlobalData } from "@/lib/strapi";

const contactAssetVersion = "20260811";

export function ContactWidget({ settings }: { settings: GlobalData }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const imageSizing =
    "h-[min(72vh,560px)] w-auto max-w-[calc(100vw-1rem)] object-contain object-right";
  const collapsedImageSizing =
    "h-[calc(min(72vh,560px)*.8)] w-auto max-w-[calc(100vw-1rem)] object-contain object-right";

  if (dismissed) return null;

  return (
    <aside
      className="sm-contact-widget fixed bottom-4 right-0 z-50 lg:bottom-auto lg:top-1/4"
      aria-label="Contact SureMandarin"
    >
      {!open ? (
        <div className="relative">
          <button
            onClick={() => setOpen(true)}
            aria-expanded="false"
            className="block leading-none transition-transform hover:-translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <Image
              src="/images/cebian1.webp"
              alt={settings.contactTitle || "Contact us"}
              width={280}
              height={745}
              className={`sm-contact-collapsed ${collapsedImageSizing}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="隐藏悬浮联系方式 / Hide contact widget"
            title="隐藏悬浮联系方式 / Hide contact widget"
            className="absolute bottom-1 right-1 grid size-11 place-items-center rounded-full border border-white/60 bg-slate-900/45 text-white opacity-80 shadow-sm backdrop-blur-md transition hover:bg-slate-900/70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue motion-reduce:transition-none lg:bottom-auto lg:top-1"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.25} />
          </button>
        </div>
      ) : (
        <section className="relative leading-none drop-shadow-2xl">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close contact panel"
            aria-expanded="true"
            className="block cursor-pointer"
          >
            <Image
              src={`/images/cebian2.webp?v=${contactAssetVersion}`}
              alt={settings.contactTitle || "Contact details"}
              width={685}
              height={924}
              className={`sm-contact-expanded ${imageSizing}`}
            />
          </button>
          <a
            href="mailto:qingniaobird@163.com"
            aria-label="Send an email to SureMandarin"
            title="Send an email"
            className="absolute left-[44%] top-[31%] z-10 h-[10%] w-[55%] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
          <a
            href="https://xhslink.cn/m/5k2RxYiaMts"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit SureMandarin on Xiaohongshu"
            title="Xiaohongshu"
            className="absolute left-[44%] top-[51%] z-10 h-[9%] w-[55%] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
          <a
            href="https://linkedin.com/in/jessica-li-889b483b"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Jessica Li on LinkedIn"
            title="LinkedIn"
            className="absolute left-[44%] top-[60%] z-10 h-[9%] w-[55%] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
          <a
            href="https://www.youtube.com/@Suremandarin"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit SureMandarin on YouTube"
            title="YouTube"
            className="absolute left-[44%] top-[69%] z-10 h-[9%] w-[55%] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
          <a
            href="https://x.com/JessSuremanda"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit JessSuremanda on X"
            title="X"
            className="absolute left-[44%] top-[78%] z-10 h-[9%] w-[55%] rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
        </section>
      )}
    </aside>
  );
}
