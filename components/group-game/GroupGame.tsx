"use client";

import { BROADCAST_EVENTS, FASTEST_FIRST_MAX_QUESTIONS } from "@/lib/constants";
import { usePrevious, useRoomInformation, useUserProfile } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { GameResults } from "@/lib/types";
import { generateQuestionSet, randomInRange } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, User } from "@supabase/supabase-js";
import confetti from "canvas-confetti";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Entry from "../Entry";
import Game from "./Game";
import Results from "./Results";

interface GroupGameProps {
  user: User;
}

export default function GroupGame({ user }: GroupGameProps) {
  const { id } = useParams();
  const supabase = createClient();
  const store = useStoreSnapshot();

  const router = useRouter();
  const { profile } = useUserProfile();

  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);
  const [results, setResults] = useState<GameResults>();
  const [view, setView] = useState<"entry" | "game" | "results">("entry");

  // For fastest first game mode
  const [playerPositions, setPlayerPositions] = useState<{
    [key: string]: number;
  }>({});
  const [incomingUpdate, setIncomingUpdate] = useState<any>();

  const [questionIdx, setQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<
    { number1: number; number2: number; operator: string }[]
  >([]);

  const { players, refetch, isRoomOwner, isReady, isEveryoneReady } =
    useRoomInformation(id as string);
  const prevPlayers = usePrevious(players);

  const startNewGameSession = () => {
    setResults(undefined);
    setQuestionIdx(0);
    store.setStatus("start");
    setTimeout(() => setView("game"), 100);
  };

  const onCompleteGame = async (results: GameResults) => {
    setResults(results);
    setTimeout(() => setView("results"), 100);

    if (user !== undefined) {
      await supabase.from("games").insert({
        player: user.id,
        type: "public",
        mode: store.mode,
        configuration: {
          digits: store.digits,
          operators: store.operators,
        },
        ...results,
      });
    }
  };

  const handleUserKeyPress = useCallback(
    async (event: KeyboardEvent) => {
      const { code } = event;
      if (code === "Space") {
        if (isRoomOwner && isEveryoneReady) {
          const questions = generateQuestionSet({
            qty: store.mode === "time-based" ? 50 : FASTEST_FIRST_MAX_QUESTIONS,
            digits: store.digits,
            operators: store.operators as Operator[],
          });
          roomChannel?.send({
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
            roomChannel?.send({
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
      store.status,
      store.mode,
      store.digits,
      store.operators,
      roomChannel,
    ]
  );

  const onSubmitAnswer = async (isCorrect: boolean) => {
    if (!roomChannel) return;

    if (store.mode === "time-based") {
      if (isCorrect) {
        roomChannel.send({
          type: "broadcast",
          event: BROADCAST_EVENTS.CORRECT_ANSWER,
          payload: {
            id: profile.id,
            user: profile.username,
          },
        });
        const updatedPlayerPositions = {
          ...playerPositions,
          [profile.id]: playerPositions[profile.id] + 1,
        };
        setPlayerPositions(updatedPlayerPositions);
        setQuestionIdx((prev) => prev + 1);
      } else {
        roomChannel.send({
          type: "broadcast",
          event: BROADCAST_EVENTS.WRONG_ANSWER,
          payload: {
            id: profile.id,
            user: profile.username,
          },
        });
      }
    } else {
      if (isCorrect) {
        roomChannel.send({
          type: "broadcast",
          event: BROADCAST_EVENTS.NEXT_QUESTION,
          payload: {
            id: profile.id,
            user: profile.username,
            questionIdx: questionIdx + 1,
          },
        });
        const updatedPlayerPositions = {
          ...playerPositions,
          [profile.id]: questionIdx + 1,
        };
        setPlayerPositions(updatedPlayerPositions);

        if (questionIdx === FASTEST_FIRST_MAX_QUESTIONS - 1) {
          await supabase.from("rooms").update({ status: "ended" }).eq("id", id);
        } else {
          setQuestionIdx((prev) => prev + 1);
        }
      }
    }
  };

  useEffect(() => {
    if (store.status === "start") {
      const initialPlayerPositions = players.reduce((a: any, b: any) => {
        return { ...a, [b.player_id]: 0 };
      }, {});
      setPlayerPositions(initialPlayerPositions);
    }
  }, [store.status, store.mode]);

  useEffect(() => {
    if (id && user) {
      const channel = supabase.channel(`room-${id}`, {
        config: { presence: { key: user.id } },
      });
      setRoomChannel(channel);
    }
  }, [user, id]);

  useEffect(() => {
    if (roomChannel) {
      roomChannel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_players" },
          (payload) => {
            if (
              payload.eventType === "DELETE" &&
              payload.old.player_id === user.id
            ) {
              router.push("/");
            } else if (
              payload.eventType === "UPDATE" &&
              payload.new.player_id === user.id
            ) {
              if (payload.new.is_owner) {
                toast.success("You've been assigned as the new room owner!");
              }
            }
            refetch();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms" },
          async (payload) => {
            const { configuration, status, mode } = payload.new;
            if (status === "open") {
              store.setDigits(configuration.digits);
              store.setOperators(configuration.operators);
              store.setMode(mode);
            } else if (status === "progress") {
              startNewGameSession();
            } else if (status === "ended") {
              store.setStatus("end");
              var defaults = {
                spread: 360,
                ticks: 50,
                gravity: 0,
                decay: 0.94,
                startVelocity: 30,
                colors: ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
              };
              confetti({
                ...defaults,
                particleCount: 40,
                scalar: 1.2,
                shapes: ["star"],
              });
              confetti({
                ...defaults,
                particleCount: 10,
                scalar: 0.75,
                shapes: ["circle"],
              });
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
            setIncomingUpdate(payload);
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
        .on(
          "broadcast",
          { event: BROADCAST_EVENTS.NEXT_QUESTION },
          ({ payload }) => {
            if (payload.questionIdx === FASTEST_FIRST_MAX_QUESTIONS / 2 - 1) {
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
              toast.message(`${payload.user} has reached the midpoint!`, {
                description:
                  payload.questionIdx > questionIdx
                    ? "Keep it up! You can still make it!"
                    : "Keep pushing and leave them behind!",
              });
            }
            setIncomingUpdate(payload);
          }
        )
        .subscribe();
    }
  }, [roomChannel]);

  useEffect(() => {
    if (user !== undefined && roomChannel) {
      window.addEventListener("keydown", handleUserKeyPress);
      return () => {
        window.removeEventListener("keydown", handleUserKeyPress);
      };
    }
  }, [
    user,
    isEveryoneReady,
    isReady,
    store.status,
    store.mode,
    store.digits,
    store.operators,
    roomChannel,
  ]);

  useEffect(() => {
    store.setStatus("idle");
  }, []);

  useEffect(() => {
    if (players.length > 0) {
      const addNewPlayer = async () => {
        await supabase
          .from("room_players")
          .insert({ room_id: id, player_id: user.id });
      };

      if (players.length > 0) {
        const userPlayer = players.find((p: any) => user?.id === p.player_id);
        if (
          user &&
          userPlayer === undefined &&
          (prevPlayers === undefined || prevPlayers.length === 0)
        ) {
          addNewPlayer();
        }
      }
    }
  }, [players.length]);

  // [Joshen] This isn't the best way to do it, but just doing like this for now as it works
  useEffect(() => {
    if (incomingUpdate !== undefined) {
      if (store.mode === "fastest-first") {
        const updatedPlayerPositions = {
          ...playerPositions,
          [incomingUpdate.id]: incomingUpdate.questionIdx,
        };
        setPlayerPositions(updatedPlayerPositions);
      } else {
        const updatedPlayerPositions = {
          ...playerPositions,
          [incomingUpdate.id]: playerPositions[incomingUpdate.id] + 1,
        };
        setPlayerPositions(updatedPlayerPositions);
      }
    }
  }, [store.mode, incomingUpdate]);

  return (
    <main className="flex-1 flex flex-col gap-y-10 items-center justify-center">
      {view === "entry" ? (
        <Entry />
      ) : view === "game" ? (
        <Game
          questions={questions}
          questionIdx={questionIdx}
          playerPositions={playerPositions}
          onSubmitAnswer={onSubmitAnswer}
          onComplete={onCompleteGame}
        />
      ) : results !== undefined ? (
        <Results results={results} playerPositions={playerPositions} />
      ) : null}
    </main>
  );
}
