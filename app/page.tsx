import Image from "next/image";
import LoginForm from "@/components/login-form";
import { glofters } from "@/app/fonts/glofters";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-xl flex-col items-center gap-[20px] px-6 py-32 text-center">
        <Image
          src="/bicolline.svg"
          alt="Logo"
          width={180}
          height={180}
          priority
          className="h-[180px] w-[180px]"
        />
        <h1
          className={`${glofters.className} text-[40px] leading-[0.8] font-semibold tracking-[2px] text-foreground`}
        >
          Coordination Combat
        </h1>
        <LoginForm />
      </main>
    </div>
  );
}
