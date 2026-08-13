export default async function LocalizedLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  return (
    <div
      lang={lang === "zh" ? "zh-CN" : "en"}
      data-site-locale={lang === "zh" ? "zh-CN" : "en"}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
}
