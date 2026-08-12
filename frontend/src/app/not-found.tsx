import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="soft-gradient grid min-h-[calc(100vh-5rem)] place-items-center px-6 py-20">
      <section className="page-shell max-w-2xl text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-blue-50 text-brand-blue">
          <SearchX size={36} />
        </span>
        <p className="section-kicker mt-8">404 · Page not found</p>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
          This page took a wrong turn.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-slate-600">
          The page may have moved, expired, or the link may be incomplete.
          Let&apos;s get you back to your Chinese learning journey.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/en"
            className="brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 font-extrabold text-white"
          >
            <Home size={17} /> Go to homepage
          </Link>
          <Link
            href="/en/#courses"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-blue bg-white px-6 py-3 font-extrabold text-brand-blue"
          >
            <ArrowLeft size={17} /> Explore courses
          </Link>
        </div>
      </section>
    </main>
  );
}
