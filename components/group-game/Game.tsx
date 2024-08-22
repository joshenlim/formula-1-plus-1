"use client";

import { Input } from "@/components/ui/input";
import { FASTEST_FIRST_MAX_QUESTIONS } from "@/lib/constants";
import { useRoomInformation, useTimer } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { GameResults, OpMistakes, Question } from "@/lib/types";
import { cn, getOpSymbol } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface GameProps {
  questions: Question[];
  questionIdx: number;
  playerPositions: { [key: string]: number };
  onSubmitAnswer: (isCorrect: boolean) => void;
  onComplete: (results: GameResults) => void;
}

export default function Game({
  questions,
  questionIdx,
  playerPositions,
  onSubmitAnswer,
  onComplete,
}: GameProps) {
  const { id } = useParams();
  const store = useStoreSnapshot();
  const { players } = useRoomInformation(id as string);
  const { elapsedTime, handleStart, handleReset } = useTimer();
  const { elapsedTime: elapsedTimeGame, handleStart: handleStartGame } =
    useTimer();
  const [countdown, setCountdown] = useState(3);

  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [mistakes, setMistakes] = useState<OpMistakes>({
    add: 0,
    subtract: 0,
    multiply: 0,
    divide: 0,
  });
  const [times, setTimes] = useState<number[]>([]);

  const [number1, setNumber1] = useState(0);
  const [number2, setNumber2] = useState(0);
  const [operator, setOperator] = useState<Operator>();

  const operatorSymbol = getOpSymbol(operator ?? "add");

  const setNewCombination = () => {
    const { number1, number2, operator } = questions[questionIdx];
    setNumber1(number1);
    setNumber2(number2);
    setOperator(operator as Operator);
  };

  const onKeyDown = (e: any) => {
    if (e.code === "Enter") {
      const answer = Number(input);
      const isCorrect =
        operator === "add"
          ? number1 + number2 === answer
          : operator === "subtract"
          ? number1 - number2 === answer
          : operator === "multiply"
          ? number1 * number2 === answer
          : (number1 / number2).toFixed(2) === input;

      onSubmitAnswer(isCorrect);

      if (isCorrect) {
        setCorrect((prev) => prev + 1);
        setTimes((prev) => [...prev, elapsedTime]);
        handleReset();
      } else {
        setWrong((prev) => prev + 1);
        setMistakes((prev) => ({
          ...prev,
          [operator as string]: prev[operator as keyof typeof prev] + 1,
        }));
        setError(true);
      }
    }
  };

  useEffect(() => {
    if (countdown === 0) {
      setNewCombination();
      handleStart();
      handleStartGame();
      return;
    }
    const id = setInterval(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  useEffect(() => {
    if (questionIdx > 0) {
      setError(false);
      setInput("");
      setNewCombination();
    }
  }, [questionIdx]);

  useEffect(() => {
    if (store.status === "end") {
      onComplete({ correct, wrong, times, mistakes });
    }
  }, [store.status]);

  return (
    <div
      className={cn(
        "transition relative",
        store.status === "idle" ? "opacity-0" : "opacity-100"
      )}
    >
      {countdown !== 0 ? (
        <div className="flex flex-col items-center gap-y-4">
          <code
            className={cn(
              "text-3xl transition",
              countdown === 3
                ? "text-green-500"
                : countdown === 2
                ? "text-yellow-500"
                : countdown === 1
                ? "text-red-500"
                : "text-red-500"
            )}
          >
            {countdown}
          </code>
          <div className="flex flex-col items-center">
            <p className="text-sm text-zinc-600">
              {store.mode === "time-based"
                ? `As many as possible, within ${store.duration / 1000} seconds`
                : `Complete ${FASTEST_FIRST_MAX_QUESTIONS} questions as fast as you can, only the first one wins`}
            </p>
            {store.operators.includes("divide") && (
              <p className="text-sm text-zinc-600">
                Results for division to be in 2 decimal places
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-y-6">
          <div className="flex items-center justify-center gap-x-4 text-8xl tracking-widest">
            <code>{number1}</code>
            <code>{operatorSymbol}</code>
            <code>{number2}</code>
          </div>
          <p className="text-zinc-500 font-mono text-xs">
            Elapsed time: {(elapsedTimeGame / 1000).toFixed(3)}s
          </p>
          <div className="flex flex-col items-center gap-y-4">
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your answer"
              onKeyDown={onKeyDown}
              className={cn(
                "transition",
                error
                  ? "border-red-700 !outline-none !ring-0 !shadow-none !ring-offset-0"
                  : ""
              )}
            />
            <div className="flex items-center justify-center gap-x-2 text-xs">
              <code className="text-green-500">{correct}</code>
              <div
                className={cn(
                  "flex items-center w-64 h-2 rounded-full overflow-hidden",
                  correct === 0 && wrong === 0 ? "border" : ""
                )}
              >
                <div
                  className="transition-all bg-green-700 h-full"
                  style={{
                    width:
                      correct === 0 && wrong === 0
                        ? "0%"
                        : wrong === 0
                        ? `100%`
                        : `${(correct / (correct + wrong)) * 100}%`,
                  }}
                />
                <div
                  className={cn(
                    "transition-all bg-red-800 h-full",
                    correct !== 0 || wrong !== 0 ? "flex-1" : ""
                  )}
                />
              </div>
              <code className="text-red-500">{wrong}</code>
            </div>
          </div>
        </div>
      )}

      {store.mode === "fastest-first" && countdown === 0 && (
        <div className="absolute -left-[12rem] -bottom-20 flex flex-col gap-y-2">
          {Object.entries(playerPositions).map(([id, pos]) => {
            const player = players.find((p: any) => p.player_id === id);
            return (
              <div
                key={`pos-${id}`}
                className="min-w-[600px] grid grid-cols-4 flex items-center gap-x-2"
              >
                <p className="text-right text-sm">{player.profiles.username}</p>
                <div className="relative col-span-3 h-1 rounded-full border">
                  <p
                    className="absolute text-3xl -top-[24px] transition"
                    style={{
                      transform: `scaleX(-1) translateX(-${
                        pos * (415 / FASTEST_FIRST_MAX_QUESTIONS)
                      }px)`,
                    }}
                  >
                    🏎️
                  </p>
                  <p className="absolute -right-5 -top-[11px]">{pos}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
