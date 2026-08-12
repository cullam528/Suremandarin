export function SectionHeading({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <header className="mx-auto mb-12 max-w-2xl text-center">
      {kicker && <p className="section-kicker">{kicker}</p>}
      <h2 className={`section-title ${kicker ? "mt-3" : ""}`}>{title}</h2>
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </header>
  );
}
