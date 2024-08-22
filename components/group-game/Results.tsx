import { useUser } from "@/lib/hooks";
import { GameResults } from "@/lib/types";
import { cn, getOpSymbol } from "@/lib/utils";
import { Tooltip } from "@radix-ui/react-tooltip";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Text,
  XAxis,
  YAxis,
} from "recharts";

export interface ResultsProps {
  results: GameResults;
}

export default function Results({ results }: ResultsProps) {
  const user = useUser();
  const { correct, wrong, times, mistakes } = results;

  const accuracy = wrong === 0 ? 100 : (correct / (correct + wrong)) * 100;
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const totalMistakes = Object.values(mistakes).reduce((a, b) => a + b, 0);
  const highestMistake = Object.values(mistakes).reduce((a, b) => {
    if (b > a) return b;
    else return a;
  }, 0);
  const mostStruggledOp = Object.keys(mistakes)
    .filter((op) => {
      if ((mistakes as any)[op] === highestMistake) return op;
    })
    .map((op) => getOpSymbol(op));

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between gap-y-8">
      <p className="text-2xl">
        {times.length > 0
          ? `Great job completing ${times.length} questions!`
          : "Uh oh - you didn't get any questions!"}
      </p>
      {times.length > 0 && (
        <div className="w-[900px] h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={results.times.map((time, idx) => {
                return { name: idx + 1, time };
              })}
              margin={{ left: 50, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="5 5" strokeOpacity={0.2} />
              <XAxis
                dataKey="name"
                className="text-xs"
                label={
                  <Text x={0} y={-30} dx={420} dy={330} offset={0} angle={0}>
                    Questions
                  </Text>
                }
              />
              <YAxis
                className="text-xs"
                label={
                  <Text x={0} y={-15} dx={50} dy={150} offset={0} angle={-90}>
                    Time (ms)
                  </Text>
                }
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="time"
                stroke="#008000"
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-y-3">
        <div className="w-full grid grid-cols-4 divide-x bg-zinc-900 rounded-lg py-4 shadow-lg">
          <div className="flex flex-col items-center justify-center gap-y-2">
            <p className="text-xs text-zinc-500">Accuracy</p>
            <p className="text-3xl">
              {times.length === 0 ? "-" : `${accuracy.toFixed(1)}%`}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-y-2">
            <p className="text-xs text-zinc-500">Est time/question</p>
            <p className="text-3xl">
              {times.length === 0 ? "-" : `${(averageTime / 1000).toFixed(2)}s`}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-y-2">
            <p className="text-xs text-zinc-500">Total mistakes</p>
            <p className="text-3xl">{totalMistakes}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-y-2">
            <p className="text-xs text-zinc-500">Most mistakes in</p>
            <p
              className={cn(
                "text-3xl",
                totalMistakes === 0 ? "text-zinc-500" : ""
              )}
            >
              {totalMistakes === 0 ? "None" : mostStruggledOp.join(", ")}
            </p>
          </div>
        </div>
        {user === undefined ? (
          <p className="text-zinc-500 text-xs">
            Login to save your results for each round!
          </p>
        ) : (
          <p className="text-green-700 text-xs">
            Results have been saved to your profile!
          </p>
        )}
      </div>

      <div className="flex flex-col items-center">
        <p>
          <code className="px-1 py-0.5 bg-zinc-800 text-zinc-200 rounded text-xs">
            Esc
          </code>
          <span className="text-sm ml-1 text-zinc-500">- Return to home</span>
        </p>
        <p>
          <code className="px-1 py-0.5 bg-zinc-800 text-zinc-200 rounded text-xs">
            Space
          </code>
          <span className="text-sm ml-1 text-zinc-500">- Start a new game</span>
        </p>
      </div>
    </div>
  );
}
