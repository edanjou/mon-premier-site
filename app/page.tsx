import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 px-6 py-32 text-center">
        <Image src="/bicolline.svg" alt="Logo" width={180} height={180} priority />
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Mon Premier Site
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Un projet simple pour apprendre à construire des applications web
          modernes avec Next.js et Tailwind CSS.
        </p>
        <button className="mt-2 h-12 rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
          Commencer
        </button>
      </main>
    </div>
  );
}
