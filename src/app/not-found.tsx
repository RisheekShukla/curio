import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">404</p>
      <h1 className="mt-2 font-serif text-4xl">Nothing here — yet</h1>
      <p className="mt-3 text-muted-foreground">This page doesn’t exist. There’s plenty else to discover.</p>
      <Link href="/discover" className={`${buttonClasses("primary")} mt-6`}>
        Back to Discover
      </Link>
    </div>
  );
}
