'use client'

import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useStoreSnapshot } from "./store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useTimer = (initialState = 0) => {
  const countRef = useRef<any>(null);
  const [elapsedTime, setElapsedTime] = useState(initialState);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = () => {
    const startTime = Date.now() - elapsedTime;
    countRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 10);
    setIsRunning(true);
  }

  const handlePause = () => {
    clearInterval(countRef.current);
    setIsRunning(false);
  }

  const handleResetStop = () => {
    clearInterval(countRef.current);
    setIsRunning(false);
    setElapsedTime(0);
  }

  const handleReset = () => {
    clearInterval(countRef.current);
    setElapsedTime(0)

    const startTime = Date.now() - 0;
    countRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 10);
  }

  return { elapsedTime, isRunning, handleStart, handlePause, handleResetStop, handleReset };
}

export const useUser = () => {
  const supabase = createClient();
  const [user, setUser] = useState<any>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data) setUser(data.user)
    })
  }, [])

  return user
}

export const useUserProfile = () => {
  const user = useUser()
  const supabase = createClient();

  const { data, isLoading, isSuccess, refetch } = useQuery({
    queryKey: ["profile", user?.id].filter(Boolean),
    queryFn: () => supabase.from('profiles').select('*').eq('id', user.id).single(),
    enabled: user !== null
  })
  const profile = (data as any)?.data

  return { profile, isLoading, isSuccess, refetch }
}

export const useRoomInformation = (id: string) => {
  const user = useUser()
  const router = useRouter()
  const store = useStoreSnapshot()
  const supabase = createClient();
  const [initialized, setInitialized] = useState(false)

  const { data, isLoading, refetch, isSuccess } = useQuery({
    queryKey: ["room", id],
    queryFn: () =>
      supabase
        .from("rooms")
        .select("*, room_players(player_id, is_owner, is_ready, profiles(username))")
        .eq("id", id)
        .single(),
    enabled: id !== undefined,
  });

  const roomInformation = (data as any)?.data;
  const players = roomInformation?.room_players ?? [];
  const isRoomOwner = user
    ? players.find((player: any) => player.player_id === user.id)?.is_owner === true
    : false;
  const isReady = user 
    ? players.find((player: any) => player.player_id === user.id)?.is_ready === true
    : false;
  const isEveryoneReady = players.every(
    (player: any) => player.is_owner || player.is_ready
  );

  useEffect(() => {
    if (isSuccess && !initialized) {
      if (roomInformation === null) {
        toast("This room does not exist")
        router.push("/")
      } else {
        const { configuration, mode } = roomInformation
        setInitialized(true)
  
        setTimeout(() => {
          store.setMode(mode)
          store.setDigits(configuration.digits)
          store.setOperators(configuration.operators)
        }, 10)
      }
    }
  }, [isSuccess])

  return { room: roomInformation, players, isRoomOwner, isReady, isEveryoneReady, isLoading, isSuccess, refetch }
}