import DocumentLayout from "@/components/layout/DocumentLayout";
import { documentMetadata } from "@/lib/document-metadata";

export const metadata = documentMetadata;

export default function LegacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DocumentLayout locale="en">{children}</DocumentLayout>;
}
