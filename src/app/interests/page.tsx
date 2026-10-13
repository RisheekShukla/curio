import type { Metadata } from "next";
import { InterestsView } from "@/components/views/interests-view";

export const metadata: Metadata = { title: "My Interests" };

export default function InterestsPage() {
  return <InterestsView />;
}
