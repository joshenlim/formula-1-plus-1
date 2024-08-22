import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import GroupGame from "@/components/group-game/GroupGame";
import SettingsBar from "@/components/SettingsBar";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function Room() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
        <div className="w-full max-w-4xl flex justify-between items-center px-3 text-sm">
          <Link href="/">Formula 1+1 🏎️ 🧮</Link>
          <AuthButton />
        </div>
      </nav>
      <div className="relative w-[600px] flex-1 flex flex-col gap-20 max-w-4xl px-3">
        <SettingsBar />
        {user && <GroupGame user={user} />}
      </div>
      <Footer />
    </div>
  );
}
