import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <main
      className="flex-1 min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <Image
        src="/pegasuslogo.png"
        alt="pegasus lab."
        width={80}
        height={67}
        className="-mb-1"
      />
      <h1 className="serif text-6xl mt-6 mb-3">404</h1>
      <p className="text-[15px] mb-8" style={{ color: "var(--ink-muted)" }}>
        This page flew away. Let&apos;s get you back on the board.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 bg-black text-white text-[14px] font-medium rounded-full px-6 py-3 hover:bg-neutral-800"
      >
        Go to dashboard
        <Icon name="arrow-right" size={13} strokeWidth={2.2} />
      </Link>
    </main>
  );
}
