"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

/** Only the accordion needs client state; the course content stays on the server. */
export function CourseFaq({ items }: { items: Array<[string, string]> }) {
  const [openFaq, setOpenFaq] = useState(0);
  return (
    <div className="mt-10 grid gap-3 md:grid-cols-2">
      {items.map(([question, answer], index) => (
        <article key={question} className="rounded-2xl bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
            className="flex w-full items-center justify-between gap-5 p-5 text-left font-extrabold text-brand-navy"
            aria-expanded={openFaq === index}
          >
            {question}
            <ChevronDown className={"shrink-0 transition " + (openFaq === index ? "rotate-180" : "")} />
          </button>
          {openFaq === index && (
            <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{answer}</p>
          )}
        </article>
      ))}
    </div>
  );
}
