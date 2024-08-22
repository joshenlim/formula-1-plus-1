"use client";

import { useUserProfile } from "@/lib/hooks";
import { Edit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

interface ProfileProps {
  numSortedGames: number;
  numQuestionsAnswered: number;
}

export default function Profile({
  numSortedGames,
  numQuestionsAnswered,
}: ProfileProps) {
  const supabase = createClient();
  const { profile, isLoading, isSuccess, refetch } = useUserProfile();
  const [username, setUsername] = useState(profile?.username);
  const [isEditing, setIsEditing] = useState(false);

  const onSaveUsername = async () => {
    setIsEditing(false);
    if (profile) {
      await supabase.from("profiles").update({ username }).eq("id", profile.id);
      refetch();
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setUsername(profile.username);
    }
  }, [isSuccess]);

  return (
    <div className="bg-zinc-900 grid grid-cols-3 divide-x rounded-lg">
      <div className="flex items-center gap-x-4 px-4 py-4">
        <div className="min-w-10 min-h-10 rounded-full bg-zinc-800 border flex items-center justify-center uppercase text-xl">
          {profile?.username[0]}
        </div>
        <div className="flex flex-col gap-y-1">
          {isEditing ? (
            <Input
              autoFocus
              disabled={isLoading}
              className="h-6 px-1 text-base w-[200px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.code === "Enter") onSaveUsername();
              }}
            />
          ) : (
            <div
              className="flex items-center gap-x-2 group cursor-pointer"
              onClick={() => setIsEditing(true)}
            >
              <p className="truncate">{profile?.username}</p>
              <Edit2
                size={12}
                className="transition opacity-0 group-hover:opacity-100"
              />
            </div>
          )}
          <p className="text-xs text-zinc-500 font-mono">
            Joined: {new Date(profile?.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-y-0.5">
        <p className="text-zinc-500 text-xs font-mono">Games played</p>
        <p className="text-xl">{numSortedGames.toLocaleString()}</p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-y-0.5">
        <p className="text-zinc-500 text-xs font-mono">Questions answered</p>
        <p className="text-xl">{numQuestionsAnswered.toLocaleString()}</p>
      </div>
    </div>
  );
}
