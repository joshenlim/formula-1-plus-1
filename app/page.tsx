import Footer from "@/components/Footer";
import SettingsBar from "@/components/SettingsBar";
import SoloGame from "@/components/solo-game/SoloGame";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AuthButton from "../components/AuthButton";

export default async function Index() {
  const canInitSupabaseClient = () => {
    try {
      createClient();
      return true;
    } catch (e) {
      return false;
    }
  };

  const isSupabaseConnected = canInitSupabaseClient();

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
        <div className="w-full max-w-4xl flex justify-between items-center px-3 text-sm">
          <Link href="/">Formula 1+1 🏎️ 🧮</Link>
          {isSupabaseConnected && <AuthButton />}
        </div>
      </nav>

      <div className="relative w-[600px] flex-1 flex flex-col gap-20 max-w-4xl px-3">
        <SettingsBar />
        <SoloGame />
      </div>

      <Footer />
    </div>
  );
}
