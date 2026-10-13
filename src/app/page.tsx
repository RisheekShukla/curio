import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Curio — for the endlessly curious" },
  description:
    "A beautiful daily feed of discoveries from science, history, nature and culture, with an AI companion that helps you go deeper.",
  openGraph: {
    title: "Curio — for the endlessly curious",
    description: "Discover something worth wondering about, then explore it with an AI companion.",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Curio" }],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
