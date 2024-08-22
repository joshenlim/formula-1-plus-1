"use client";

import { OPERATORS } from "@/lib/constants";
import { useRoomInformation } from "@/lib/hooks";
import { useStoreSnapshot } from "@/lib/store";
import { cn, generateRandomNumber, randomInRange } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedCounter } from "react-animated-counter";

const fontSize = "80px";
const digitStyles = {
  fontVariantNumeric: "tabular-nums",
  fontFamily: "var(--font-reddit-mono)",
  letterSpacing: "0.6rem",
};

export default function Entry() {
  const { id } = useParams();
  const store = useStoreSnapshot();

  const [counter1, setCounter1] = useState(0);
  const [counter2, setCounter2] = useState(0);
  const [operator, setOperator] = useState(0);

  const { players, isRoomOwner, isReady, isEveryoneReady, isLoading } =
    useRoomInformation(id as string);

  const getOperatorIndex = () => {
    const op = store.operators[operator];
    switch (op) {
      case "add":
        return 0;
      case "subtract":
        return 1;
      case "multiply":
        return 2;
      case "divide":
        return 3;
      default:
        return 0;
    }
  };

  useEffect(() => {
    let timeout: any;

    if (store.status === "idle") {
      const updateNumbers = () => {
        setCounter1(generateRandomNumber(store.digits));
        setCounter2(generateRandomNumber(store.digits));
        setOperator(Math.floor(Math.random() * store.operators.length));
        timeout = setTimeout(() => updateNumbers(), 4000);
      };
      updateNumbers();
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [store.digits, store.operators.join("-"), store.status]);

  return (
    <div
      className={cn(
        "relative flex-1 flex flex-col gap-y-10 items-center justify-center transition",
        store.status === "idle" ? "opacity-100" : "opacity-0"
      )}
    >
      <p className="flex flex-col gap-y-1 items-center">
        <span>Formula 1+1 🏎️ 🧮</span>
        {id !== undefined && (
          <span className="text-xs text-zinc-500 font-mono">Room ID: {id}</span>
        )}
      </p>
      <code
        className="absolute text-zinc-900 pointer-events-none"
        style={{
          zIndex: -1,
          letterSpacing: "4rem",
          fontSize: "4rem",
          filter: "blur(3px)",
        }}
      >
        1234567890
      </code>
      <div className="flex items-center justify-center gap-x-4">
        <AnimatedCounter
          value={counter1}
          includeDecimals={false}
          color="rgba(255, 255, 255, 0.9)"
          incrementColor="rgba(255, 255, 255, 0.3)"
          decrementColor="rgba(255, 255, 255, 0.3)"
          fontSize={fontSize}
          digitStyles={digitStyles}
        />
        <code className="text-5xl">{OPERATORS[getOperatorIndex()]}</code>
        <AnimatedCounter
          value={counter2}
          includeDecimals={false}
          color="rgba(255, 255, 255, 0.9)"
          incrementColor="rgba(255, 255, 255, 0.3)"
          decrementColor="rgba(255, 255, 255, 0.3)"
          fontSize={fontSize}
          digitStyles={digitStyles}
        />
      </div>
      {id !== undefined && isRoomOwner ? (
        <>
          {players.length === 1 ? (
            <p className="text-zinc-200">
              Waiting for at least one other player to join
            </p>
          ) : isEveryoneReady ? (
            <p className="text-zinc-200 flex items-center justify-center gap-x-1.5">
              Press{" "}
              <code
                className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 text-sm"
                onClick={() => {
                  // For debugging LOL
                  confetti({
                    // angle: randomInRange(55, 125),
                    // spread: randomInRange(50, 70),
                    // particleCount: randomInRange(50, 100),
                    // shapes: [confetti.shapeFromText({ text: "🔥", scalar: 2 })],
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
                }}
              >
                space
              </code>{" "}
              to start the game for everyone
            </p>
          ) : (
            <p className="text-zinc-200">Waiting for everyone to be ready</p>
          )}
        </>
      ) : id !== undefined && isLoading ? (
        <p className="opacity-0">Loading</p>
      ) : isReady ? (
        <p className="relative text-zinc-200 flex flex-col items-center justify-center">
          <span>Waiting for room owner to start game</span>
          <span className="absolute top-8 text-xs text-zinc-500">
            Press{" "}
            <code className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 text-xs">
              space
            </code>{" "}
            to unready
          </span>
        </p>
      ) : (
        <p className="text-zinc-200 flex items-center justify-center gap-x-1.5">
          Press{" "}
          <code className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 text-sm">
            space
          </code>{" "}
          to {id === undefined ? "start solo" : "be ready"}
        </p>
      )}
    </div>
  );
}
