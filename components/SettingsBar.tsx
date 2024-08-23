"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BROADCAST_EVENTS } from "@/lib/constants";
import { useRoomInformation, useUser } from "@/lib/hooks";
import { Operator, useStoreSnapshot } from "@/lib/store";
import { cn, uuidv4 } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { DialogDescription } from "@radix-ui/react-dialog";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ChevronDown, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const modes = [
  { symbol: "⏱️", key: "Time based", value: "time-based" },
  { symbol: "🚗", key: "Fastest first", value: "fastest-first" },
];

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
  const [roomId, setRoomId] = useState("");
  const [creating, setCreating] = useState(false);

  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);

  const { room, players, isRoomOwner, isLoading } = useRoomInformation(
    id as string
  );

  const onUpdateMode = async (value: string) => {
    if (value && room !== undefined && isRoomOwner) {
      await supabase.from("rooms").update({ mode: value }).eq("id", id);
    }
  };

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

  const onJoinRoom = async (id?: string) => {
    if (id === undefined) {
      const { data } = await supabase.rpc("get_rooms_available_to_join");
      if (data) {
        if (data.length === 0) {
          toast.info("There are no rooms available to join!");
        } else {
          const randomRoom = data[Math.floor(Math.random() * data.length)];
          if (randomRoom) router.push(`/${randomRoom.room}`);
        }
      }
    } else {
      const { data } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", id)
        .single();
      if (data) {
        router.push(`/${id}`);
      } else {
        toast.error("The room does not exist");
      }
    }
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

    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", id)
      .eq("player_id", user.id);

    router.push("/");
  };

  const onKickPlayer = async (player: any) => {
    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", id)
      .eq("player_id", player.player_id);
    if (roomChannel) {
      roomChannel.send({
        type: "broadcast",
        event: BROADCAST_EVENTS.KICK_PLAYER,
        payload: { id: player.player_id },
      });
    }
  };

  useEffect(() => {
    if (id && user) {
      const channel = supabase.channel(`room-${id}`, {
        config: { presence: { key: user.id } },
      });
      setRoomChannel(channel);
    }
  }, [user, id]);

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
          <div
            className={cn(
              "rounded-full bg-zinc-900 w-full py-2 px-2 grid divide-x grid-cols-3"
            )}
          >
            <div
              className={cn(
                "grid divide-x col-span-2",
                id !== undefined ? "grid-cols-8" : "grid-cols-2"
              )}
            >
              {id !== undefined && (
                <ToggleGroup
                  type="single"
                  disabled={!isRoomOwner}
                  className="flex items-center justify-center gap-x-4 col-span-2"
                  value={store.mode}
                  onValueChange={onUpdateMode}
                >
                  {modes.map((mode) => {
                    return (
                      <Tooltip key={mode.key} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <ToggleGroupItem
                            size="sm"
                            key={mode.key}
                            aria-label={mode.key}
                            value={String(mode.value)}
                            className={cn(
                              "w-6 h-6 text-xs text-zinc-500 transition",
                              "hover:opacity-80 hover:bg-transparent opacity-30",
                              "aria-[checked=true]:bg-transparent aria-[checked=true]:opacity-100"
                            )}
                          >
                            {mode.symbol}
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="bg-zinc-800 text-zinc-200"
                        >
                          <p>{mode.key}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </ToggleGroup>
              )}
              <ToggleGroup
                type="single"
                disabled={!isRoomOwner}
                className={cn(
                  "flex items-center justify-center gap-x-4",
                  id !== undefined ? "col-span-3" : ""
                )}
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
                disabled={!isRoomOwner}
                className={cn(
                  "flex items-center justify-center gap-x-3",
                  id !== undefined ? "col-span-3" : ""
                )}
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
            </div>

            <div className="flex items-center justify-center gap-x-2">
              {!user ? (
                <Badge variant="outline">Login to play online</Badge>
              ) : id === undefined ? (
                <>
                  <Dialog>
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
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onJoinRoom()}
                        >
                          Quick join
                        </DropdownMenuItem>
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Join room
                          </DropdownMenuItem>
                        </DialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enter the Room ID</DialogTitle>
                        <DialogDescription>
                          Enjoy Formula 1+1 with some friends
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                          <Label htmlFor="room-id" className="sr-only">
                            Room ID
                          </Label>
                          <Input
                            id="room-id"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="e.g c41a4da1-f70b-468b-b3a0-89f6f3e37ca5"
                          />
                        </div>
                      </div>
                      <DialogFooter className="sm:justify-end">
                        <DialogClose asChild>
                          <Button size="sm" type="button" variant="secondary">
                            Close
                          </Button>
                        </DialogClose>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => onJoinRoom(roomId)}
                        >
                          Enter room
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                                if (!isOwnself && isRoomOwner) {
                                  onKickPlayer(player);
                                }
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
          {id !== undefined && !isRoomOwner && (
            <p className="text-center text-xs text-zinc-500">
              Only the room owner can adjust the game settings
            </p>
          )}
        </>
      )}
    </div>
  );
}
