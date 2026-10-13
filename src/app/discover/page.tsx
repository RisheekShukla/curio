import type { Metadata } from "next";
import { FeedView } from "@/components/views/feed-view";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return <FeedView />;
}
