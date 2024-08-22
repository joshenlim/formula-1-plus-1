"use client";

import { Input } from "@/components/ui/input";
import { useTimer } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { GameResults, OpMistakes, Question } from "@/lib/types";
import { cn, getOpSymbol } from "@/lib/utils";
import { useEffect, useState } from "react";

interface GameProps {
  questions: Question[];
  questionIdx: number;
  onSubmitAnswer: (isCorrect: boolean) => void;
  onComplete: (results: GameResults) => void;
}

export default function Game({
  questions,
  questionIdx,
  onSubmitAnswer,
  onComplete,
}: GameProps) {
  const store = useStoreSnapshot();
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
        "transition",
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
              As many as possible, within {store.duration / 1000} seconds
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
    </div>
  );
}
