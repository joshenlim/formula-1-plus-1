"use client";

import { usePrevious, useUser } from "@/lib/hooks";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function RouteChangeHandler() {
  const user = useUser();
  const { id } = useParams();
  const supabase = createClient();
  const pathname = usePathname();
  const prevPathname = usePrevious(pathname);

  useEffect(() => {
    const onLeaveRoom = async () => {
      await supabase
        .from("room_players")
        .delete()
        .eq("room_id", prevPathname?.slice(1))
        .eq("player_id", user.id);
    };
    if (
      user &&
      (prevPathname ?? "").length > 10 &&
      (pathname === "/" || pathname === "/profile")
    ) {
      onLeaveRoom();
    }
  }, [prevPathname, pathname]);

  return null;
}
