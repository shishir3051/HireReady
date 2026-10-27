import type { Metadata } from "next";
import { ContentCheck } from "./content-check";

export const metadata: Metadata = {
  title: "Content check (dev)",
  robots: { index: false, follow: false },
};

export default function DevContentCheckPage() {
  return <ContentCheck />;
}
