"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRoomInformation, useUser } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { cn, uuidv4 } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const digits = [
  { symbol: "1", key: "1 digit", value: 1 },
  { symbol: "10", key: "2 digits", value: 2 },
  { symbol: "100", key: "3 digits", value: 3 },
];

const operators = [
  { symbol: "+", key: "addition", value: "add" },
  { symbol: "-", key: "subtraction", value: "subtract" },
  { symbol: "×", key: "multiplication", value: "multiply" },
  { symbol: "÷", key: "division", value: "divide" },
];

export default function SettingsBar() {
  const user = useUser();
  const supabase = createClient();
  const router = useRouter();
  const store = useStoreSnapshot();

  const { id } = useParams();
  const [creating, setCreating] = useState(false);

  const { room, players, isRoomOwner, isLoading } = useRoomInformation(
    id as string
  );

  const onUpdateDigits = async (value: string) => {
    if (value) {
      if (room !== undefined && isRoomOwner) {
        await supabase
          .from("rooms")
          .update({
            configuration: { ...room.configuration, digits: Number(value) },
          })
          .eq("id", id);
      } else if (room === undefined) {
        store.setDigits(Number(value));
      }
    }
  };

  const onUpdateOperators = async (value: string[]) => {
    if (value.length > 0) {
      if (room !== undefined && isRoomOwner) {
        await supabase
          .from("rooms")
          .update({
            configuration: { ...room.configuration, operators: value },
          })
          .eq("id", id);
      } else if (room === undefined) {
        store.setOperators(value as Operator[]);
      }
    }
  };

  const onJoinRoom = (id?: string) => {
    console.log("To implement");
  };

  const onCreateRoom = async () => {
    if (user === undefined) return;

    setCreating(true);
    const id = uuidv4();
    const { error: roomError } = await supabase.from("rooms").insert({
      id,
      owner: user.id,
      mode: "time-based",
      configuration: { digits: store.digits, operators: store.operators },
    });
    const { error: roomPlayerError } = await supabase
      .from("room_players")
      .insert({
        room_id: id,
        player_id: user.id,
        is_owner: true,
      });

    if (!roomError && !roomPlayerError) router.push(`/${id}`);
    setCreating(false);
  };

  const onLeaveRoom = async () => {
    if (user === undefined || id === undefined) return;

    // Make someone else the room owner (might make sense for this to be a DB trigger instead)
    if (players.length > 1 && isRoomOwner) {
      const otherPlayers = players.filter(
        (player: any) => player.player_id !== user.id
      );
      await supabase
        .from("room_players")
        .update({ is_owner: true })
        .eq("room_id", id)
        .eq("player_id", otherPlayers[0].player_id);
    }

    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", id)
      .eq("player_id", user.id);

    router.push("/");
  };

  return (
    <div
      className={cn(
        "absolute z-10 top-0 w-full transition",
        store.status === "idle" ? "opacity-100" : "opacity-0"
      )}
    >
      {id !== undefined && isLoading ? (
        <div className="rounded-full bg-zinc-900 w-full h-[40px] flex items-center justify-center">
          <Loader2 className="animate-spin" size={14} />
        </div>
      ) : (
        <>
          <div className="rounded-full bg-zinc-900 w-full py-2 px-2 grid grid-cols-3 divide-x">
            <ToggleGroup
              type="single"
              className="flex items-center justify-center gap-x-4"
              value={String(store.digits)}
              onValueChange={onUpdateDigits}
            >
              {digits.map((digit) => {
                return (
                  <Tooltip key={digit.key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        size="sm"
                        key={digit.key}
                        aria-label={digit.key}
                        value={String(digit.value)}
                        className={cn(
                          "w-6 h-6 text-xs text-zinc-500",
                          "hover:text-zinc-200 hover:bg-transparent",
                          "aria-[checked=true]:bg-transparent aria-[checked=true]:text-green-500"
                        )}
                      >
                        {digit.symbol}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-zinc-800 text-zinc-200"
                    >
                      <p>{digit.key}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>

            <ToggleGroup
              type="multiple"
              className="flex items-center justify-center gap-x-3"
              value={store.operators as string[]}
              onValueChange={onUpdateOperators}
            >
              {operators.map((op) => {
                return (
                  <Tooltip key={op.key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        size="sm"
                        key={op.key}
                        aria-label={op.key}
                        value={op.value}
                        className={cn(
                          "w-6 h-6 text-lg text-zinc-500",
                          "hover:text-zinc-200 hover:bg-transparent",
                          "aria-[pressed=true]:bg-transparent aria-[pressed=true]:text-green-500"
                        )}
                      >
                        {op.symbol}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-zinc-800 text-zinc-200"
                    >
                      <p>Toggle {op.key}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>

            <div className="flex items-center justify-center gap-x-2">
              {!user ? (
                <Badge variant="outline">Login to play online</Badge>
              ) : id === undefined ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        className="h-auto py-1 px-2 text-xs gap-x-1"
                      >
                        Join
                        <ChevronDown size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem className="text-xs">
                        Quick join
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">
                        Join room
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    disabled={creating}
                    className="h-auto py-1 px-2 text-xs gap-x-2"
                    onClick={() => onCreateRoom()}
                  >
                    {creating && <Loader2 className="animate-spin" size={14} />}
                    Create room
                  </Button>
                </>
              ) : (
                <div className="w-full flex items-center justify-between pl-4 pr-2">
                  <div className="flex items-center">
                    {players.map((player: any, idx: number) => {
                      const isOwnself = player.player_id === user.id;
                      return (
                        <Tooltip key={player.player_id} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "transition-all w-6 h-6 rounded-full border flex items-center justify-center uppercase text-sm",
                                isRoomOwner && !isOwnself && "cursor-pointer",
                                player.is_owner || player.is_ready
                                  ? "border-green-500 bg-green-700"
                                  : "bg-zinc-700"
                              )}
                              style={{ transform: `translateX(-${idx * 8}px)` }}
                              onClick={() => {
                                if (!isOwnself)
                                  console.log(
                                    `Kick: ${player.profiles.username}`
                                  );
                              }}
                            >
                              {player.profiles.username[0]}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-center">
                            {player.profiles.username}
                            {isRoomOwner && !isOwnself && (
                              <>
                                <br />
                                (Click to kick)
                              </>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6"
                    onClick={onLeaveRoom}
                  >
                    Leave
                  </Button>
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-zinc-500 mt-2">
            Difficulty:{" "}
            <span
              className={cn(
                store.difficulty > 0.8
                  ? "text-red-500"
                  : store.difficulty > 0.5
                  ? "text-amber-500"
                  : store.difficulty > 0.3
                  ? "text-yellow-500"
                  : "text-green-600"
              )}
            >
              {store.difficulty > 0.8
                ? "Christ Almighty"
                : store.difficulty > 0.5
                ? "Orangey Zesty"
                : store.difficulty > 0.3
                ? "Lemon Squeezy"
                : "Easy Peasy"}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
