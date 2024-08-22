import AuthButton from "@/components/AuthButton";
import DeployButton from "@/components/DeployButton";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { cn, getOpSymbol } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: games } = await supabase
    .from("games")
    .select(
      "id, type, mode, correct, wrong, times, mistakes, configuration, created_at"
    )
    .order("created_at", { ascending: false });

  const sortedGames = games ?? [];
  const totalQuestions = (games ?? []).reduce((a, b) => a + b.correct, 0);

  if (!user) {
    return redirect("/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center relative">
      <div className="w-full">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
          <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
            <Link href="/">Formula 1+1 🏎️ 🧮</Link>
            <DeployButton />
            <AuthButton />
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col gap-20 max-w-5xl px-3">
        <main className="flex-1 flex flex-col gap-y-6">
          <div className="bg-zinc-900 grid grid-cols-3 divide-x rounded-lg">
            <div className="flex items-center gap-x-4 px-4 py-4">
              <div className="min-w-10 min-h-10 rounded-full bg-zinc-800 border flex items-center justify-center uppercase text-xl">
                {user.email?.[0]}
              </div>
              <div className="flex flex-col gap-y-1">
                <p className="truncate">{user.email}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  Joined: {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="px-4 py-4 flex flex-col gap-y-0.5">
              <p className="text-zinc-500 text-xs font-mono">Games played</p>
              <p className="text-xl">{sortedGames.length.toLocaleString()}</p>
            </div>
            <div className="px-4 py-4 flex flex-col gap-y-0.5">
              <p className="text-zinc-500 text-xs font-mono">
                Questions answered
              </p>
              <p className="text-xl">{totalQuestions.toLocaleString()}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-y-4">
            <p className="flex items-center gap-x-2">
              <span>🏎️</span>
              <span>Leaderboard</span>
            </p>
            <div className="flex flex-col gap-y-1 bg-zinc-900 rounded-lg px-4 py-3">
              <p className="text-zinc-300">Coming soon!</p>
              <p className="text-zinc-500 text-sm">
                Compete with others to see who is the true math wizard
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-y-4">
            <p className="flex items-center gap-x-2">
              <span>🕰️</span>
              <span>History</span>
              <span className="text-xs text-zinc-500">
                Up to the last 10 games
              </span>
            </p>
            <div className="bg-zinc-900 rounded-lg overflow-hidden divide-y">
              {sortedGames.length === 0 && (
                <div className="flex flex-col gap-y-1 bg-zinc-900 rounded-lg px-4 py-3">
                  <p className="text-zinc-300">No games played yet!</p>
                  <p className="text-zinc-500 text-sm">
                    Historical data from previous games will be stored and shown
                    here
                  </p>
                </div>
              )}
              {sortedGames.slice(0, 10).map((game) => {
                const { correct, wrong, times, mistakes, configuration } = game;
                const accuracy =
                  wrong === 0 ? 100 : (correct / (correct + wrong)) * 100;
                const averageTime =
                  times.reduce((a: number, b: number) => a + b, 0) /
                  times.length;
                const highestMistake = Object.values(mistakes).reduce(
                  (a: any, b: any) => {
                    if (b > a) return b;
                    else return a;
                  },
                  0
                );
                const mostStruggledOp = Object.keys(mistakes)
                  .filter((op) => {
                    if ((mistakes as any)[op] === highestMistake) return op;
                  })
                  .map((op) => getOpSymbol(op));

                return (
                  <div
                    key={game.id}
                    className="grid grid-cols-3 px-4 py-2 divide-x"
                  >
                    <div className="flex flex-col gap-y-1">
                      <p className="font-mono text-xs text-zinc-500 capitalize">
                        {game.type} game ({game.mode})
                      </p>
                      <p className="font-mono text-xs">
                        Played on: {new Date(game.created_at).toLocaleString()}
                      </p>
                      <p className="font-mono text-xs">
                        {configuration.digits} digit
                        {configuration.digit > 1 ? "s" : ""},{" "}
                        {configuration.operators.length} operator
                        {configuration.digit > 1 ? "s" : ""} (
                        {configuration.operators
                          .map((op: string) => getOpSymbol(op))
                          .join(", ")}
                        )
                      </p>
                    </div>

                    <div className="col-span-2 grid grid-cols-4 divide-x">
                      <div className="px-2 flex flex-col gap-y-1">
                        <p className="text-xs text-zinc-500 font-mono">
                          Accuracy
                        </p>
                        <p className="text-2xl">
                          {times.length === 0 ? "-" : `${accuracy.toFixed(1)}%`}
                        </p>
                      </div>
                      <div className="px-2 flex flex-col gap-y-1">
                        <p className="text-xs text-zinc-500 font-mono">
                          Est time/question
                        </p>
                        <p className="text-2xl">
                          {times.length === 0
                            ? "-"
                            : `${(averageTime / 1000).toFixed(2)}s`}
                        </p>
                      </div>
                      <div className="px-2 flex flex-col gap-y-1">
                        <p className="text-xs text-zinc-500 font-mono">
                          Total Mistakes
                        </p>
                        <p className="text-2xl">
                          {game.wrong.toLocaleString()}
                        </p>
                      </div>
                      <div className="px-2 flex flex-col gap-y-1">
                        <p className="text-xs text-zinc-500 font-mono">
                          Most mistakes in
                        </p>
                        <p
                          className={cn(
                            "text-2xl",
                            game.wrong === 0 ? "text-zinc-500" : ""
                          )}
                        >
                          {game.wrong === 0
                            ? "None"
                            : mostStruggledOp.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
