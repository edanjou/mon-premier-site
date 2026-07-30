import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 px-6 py-32 text-center">
        <Image src="/bicolline.svg" alt="Logo" width={180} height={180} priority />
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Mon Premier Site
        </h1>
        <p className="text-lg leading-8 text-foreground/70">
          Un projet simple pour apprendre à construire des applications web
          modernes avec Next.js et Tailwind CSS.
        </p>
        <button className="mt-2 h-12 rounded-full bg-primary px-8 text-base font-medium text-white transition-colors hover:bg-[#0c4390]">
          Commencer
        </button>
      </main>
    </div>
  );
}
