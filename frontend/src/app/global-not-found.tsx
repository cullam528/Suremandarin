import DocumentLayout from "@/components/layout/DocumentLayout";
import NotFoundPage from "@/components/layout/NotFoundPage";
import { documentMetadata, notFoundMetadata } from "@/lib/document-metadata";

export const metadata = { ...documentMetadata, ...notFoundMetadata };

export default function GlobalNotFound() {
  return <DocumentLayout locale="en"><NotFoundPage /></DocumentLayout>;
}
