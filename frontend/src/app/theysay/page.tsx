import { permanentRedirect } from "next/navigation";

export default function TheySayDefaultPage() {
  permanentRedirect("/en/theysay");
}
