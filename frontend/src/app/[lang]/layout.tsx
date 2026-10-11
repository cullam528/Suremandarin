import { notFound } from "next/navigation";
import DocumentLayout from "@/components/layout/DocumentLayout";
import { documentMetadata } from "@/lib/document-metadata";
import { isLocale } from "@/lib/i18n";

export const metadata = documentMetadata;

export default async function LocalizedLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <DocumentLayout locale={lang}>
      <div
        lang={lang === "zh" ? "zh-CN" : "en"}
        data-site-locale={lang === "zh" ? "zh-CN" : "en"}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </DocumentLayout>
  );
}
