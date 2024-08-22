"use client";

import { useStoreSnapshot } from "@/lib/store";
import { useCallback, useEffect, useState } from "react";
import Entry from "../Entry";
import Game from "./Game";
import Results from "./Results";
import { GameResults } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/lib/hooks";

export default function SoloGame() {
  const user = useUser();
  const supabase = createClient();
  const store = useStoreSnapshot();

  const [results, setResults] = useState<GameResults>();
  const [view, setView] = useState<"entry" | "game" | "results">("entry");

  const handleUserKeyPress = useCallback((event: KeyboardEvent) => {
    const { code } = event;
    if (code === "Space") {
      setResults(undefined);
      store.setStatus("start");
      setTimeout(() => setView("game"), 100);
    }
    if (code === "Escape") {
      setResults(undefined);
      store.setStatus("idle");
      setTimeout(() => setView("entry"), 100);
    }
  }, []);

  const onCompleteGame = async (results: GameResults) => {
    setResults(results);
    store.setStatus("end");
    setTimeout(() => setView("results"), 100);

    if (user) {
      await supabase.from("games").insert({
        player: user.id,
        type: "private",
        mode: "time-based",
        configuration: {
          digits: store.digits,
          operators: store.operators,
        },
        ...results,
      });
    }
  };

  useEffect(() => {
    store.setStatus("idle");
    window.addEventListener("keydown", handleUserKeyPress);
    return () => {
      window.removeEventListener("keydown", handleUserKeyPress);
    };
  }, []);

  return (
    <main className="flex-1 flex flex-col gap-y-10 items-center justify-center">
      {view === "entry" ? (
        <Entry />
      ) : view === "game" ? (
        <Game onComplete={onCompleteGame} />
      ) : results !== undefined ? (
        <Results results={results} />
      ) : null}
    </main>
  );
}
