import type { Metadata } from "next";
import { VisualGallery } from "./gallery";

export const metadata: Metadata = {
  title: "Visualizer gallery (dev)",
  robots: { index: false, follow: false },
};

export default function DevVisualsPage() {
  return <VisualGallery />;
}
