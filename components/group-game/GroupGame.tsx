"use client";

import { BROADCAST_EVENTS } from "@/lib/constants";
import { useRoomInformation, useUser, useUserProfile } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { GameResults } from "@/lib/types";
import { generateQuestionSet, randomInRange } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import confetti from "canvas-confetti";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Entry from "../Entry";
import Game from "./Game";
import Results from "./Results";

export default function GroupGame() {
  const { id } = useParams();
  const supabase = createClient();
  const store = useStoreSnapshot();

  const user = useUser();
  const { profile } = useUserProfile();

  const [results, setResults] = useState<GameResults>();
  const [view, setView] = useState<"entry" | "game" | "results">("entry");

  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<
    { number1: number; number2: number; operator: string }[]
  >([]);

  const { players, refetch, isRoomOwner, isReady, isEveryoneReady } =
    useRoomInformation(id as string);
  const playerIds = players.map((p: any) => p.player_id).join(" ");

  const roomChannel = supabase
    .channel(`room-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "room_players" },
      () => refetch()
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms" },
      async (payload) => {
        const { configuration, status } = payload.new;
        if (status === "open") {
          store.setDigits(configuration.digits);
          store.setOperators(configuration.operators);
        } else if (status === "progress") {
          startNewGameSession();
        } else if (status === "ended") {
          store.setStatus("end");
        }
        refetch();
      }
    )
    .on(
      "broadcast",
      { event: BROADCAST_EVENTS.INIT_QUESTIONS },
      ({ payload }) => {
        console.log(`Received question set: ${payload.questions.length}`);
        setQuestions(payload.questions);
      }
    )
    .on(
      "broadcast",
      { event: BROADCAST_EVENTS.CORRECT_ANSWER },
      ({ payload }) => {
        toast.message(`${payload.user} stole the question!`, {
          description: "You gotta catch up! Think faster!",
        });
        confetti({
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 70),
          particleCount: randomInRange(50, 100),
          origin: { y: 0.95 },
        });
        setQuestionIdx((prev) => prev + 1);
      }
    )
    .on(
      "broadcast",
      { event: BROADCAST_EVENTS.WRONG_ANSWER },
      ({ payload }) => {
        toast.message(`${payload.user} answered it wrongly LOL!`, {
          description: "This is your chance! Keep at it!",
        });
        confetti({
          spread: 360,
          ticks: 50,
          gravity: 0,
          decay: 0.94,
          startVelocity: 30,
          origin: { y: 0.95 },
          particleCount: randomInRange(50, 100),
          scalar: 1.2,
          shapes: ["star"],
        });
      }
    )
    .on("broadcast", { event: BROADCAST_EVENTS.RESET_GAME }, () => {
      setResults(undefined);
      store.setStatus("idle");
      setTimeout(() => setView("entry"), 100);
      toast.info("The room owner has reset the game for everyone");
    })
    .subscribe();

  const startNewGameSession = () => {
    setResults(undefined);
    setQuestionIdx(0);
    store.setStatus("start");
    setTimeout(() => setView("game"), 100);
  };

  const handleUserKeyPress = useCallback(
    async (event: KeyboardEvent) => {
      const { code } = event;
      if (code === "Space") {
        if (isRoomOwner && isEveryoneReady) {
          const questions = generateQuestionSet({
            qty: 50,
            digits: store.digits,
            operators: store.operators as Operator[],
          });
          roomChannel.send({
            type: "broadcast",
            event: BROADCAST_EVENTS.INIT_QUESTIONS,
            payload: { questions },
          });
          console.log("Broadcasted question set");
          setQuestions(questions);
          await supabase
            .from("rooms")
            .update({ status: "progress" })
            .eq("id", id)
            .eq("owner", user.id);
        } else if (!isRoomOwner) {
          await supabase
            .from("room_players")
            .update({ is_ready: !isReady })
            .eq("player_id", user.id);
        }
      }
      if (code === "Escape") {
        if (
          (store.status === "start" && isRoomOwner) ||
          store.status === "end"
        ) {
          if (store.status === "start" && isRoomOwner) {
            roomChannel.send({
              type: "broadcast",
              event: BROADCAST_EVENTS.RESET_GAME,
              payload: {},
            });
          }
          await supabase
            .from("rooms")
            .update({ status: "open" })
            .eq("id", id)
            .eq("owner", user.id);
          setResults(undefined);
          store.setStatus("idle");
          setTimeout(() => setView("entry"), 100);
        }
      }
    },
    [
      user,
      isRoomOwner,
      isEveryoneReady,
      isReady,
      store.digits,
      store.operators,
      roomChannel,
    ]
  );

  const onSubmitAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      roomChannel.send({
        type: "broadcast",
        event: BROADCAST_EVENTS.CORRECT_ANSWER,
        payload: {
          user: profile.username,
        },
      });
      setQuestionIdx((prev) => prev + 1);
    } else {
      roomChannel.send({
        type: "broadcast",
        event: BROADCAST_EVENTS.WRONG_ANSWER,
        payload: {
          user: profile.username,
        },
      });
    }
  };

  const onCompleteGame = async (results: GameResults) => {
    setResults(results);
    setTimeout(() => setView("results"), 100);

    if (user !== undefined) {
      await supabase.from("games").insert({
        player: user.id,
        type: "public",
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
    if (user !== undefined) {
      window.addEventListener("keydown", handleUserKeyPress);
      return () => {
        window.removeEventListener("keydown", handleUserKeyPress);
      };
    }
  }, [
    user,
    isEveryoneReady,
    isReady,
    store.digits,
    store.operators,
    roomChannel,
  ]);

  useEffect(() => {
    const addNewPlayer = async () => {
      await supabase
        .from("room_players")
        .upsert({ room_id: id, player_id: user.id });
    };

    if (playerIds.length > 0) {
      const userPlayer = players.find((p: any) => user?.id === p.player_id);
      if (user && userPlayer === undefined) addNewPlayer();
    }
  }, [playerIds]);

  useEffect(() => {
    store.setStatus("idle");
  }, []);

  return (
    <main className="flex-1 flex flex-col gap-y-10 items-center justify-center">
      {view === "entry" ? (
        <Entry />
      ) : view === "game" ? (
        <Game
          questions={questions}
          questionIdx={questionIdx}
          onSubmitAnswer={onSubmitAnswer}
          onComplete={onCompleteGame}
        />
      ) : results !== undefined ? (
        <Results results={results} />
      ) : null}
    </main>
  );
}
