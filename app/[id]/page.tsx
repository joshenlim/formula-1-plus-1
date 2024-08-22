import AuthButton from "@/components/AuthButton";
import DeployButton from "@/components/DeployButton";
import Footer from "@/components/Footer";
import GroupGame from "@/components/group-game/GroupGame";
import SettingsBar from "@/components/SettingsBar";
import { createClient } from "@/utils/supabase/server";

export default function Room() {
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
          <DeployButton />
          {isSupabaseConnected && <AuthButton />}
        </div>
      </nav>

      <div className="relative w-[600px] flex-1 flex flex-col gap-20 max-w-4xl px-3">
        <SettingsBar />
        <GroupGame />
      </div>

      <Footer />
    </div>
  );
}
