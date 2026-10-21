import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AppState } from "react-native";

import { LEVEL_DATA } from "@/engine/levels/data";
import { msUntilNextDay } from "@/engine/meta/calendar";
import { LevelDefSchema } from "@/engine/puzzle/types";
import { CHAPTER_ASSETS } from "@/scene/chapterAssets";

import { scheduleReminders } from "@/notifications/schedule";

import { GameSession, type Play, type Snapshot } from "./session";
import { appStore } from "./storage";

// Commands the UI may call. The session itself stays private to this module.
export type GameCommands = Pick<
  GameSession,
  | "getSnapshot"
  | "startLevel"
  | "restart"
  | "quit"
  | "tapAt"
  | "useBooster"
  | "levelCount"
  | "levelIndexOf"
  | "levelAt"
  | "isUnlocked"
  | "clock"
  | "claim"
  | "claimable"
  | "achievementContext"
  | "nextLessonStep"
  | "skipLesson"
  | "resetLessons"
  | "finishOnboarding"
  | "updateSettings"
  | "resetProgress"
>;

const SessionContext = createContext<GameSession | null>(null);

// One session for the app's lifetime, created on first use.
let appSession: GameSession | null = null;
function getAppSession(): GameSession {
  appSession ??= new GameSession({
    store: appStore,
    now: () => Date.now(),
    tzOffset: () => -new Date().getTimezoneOffset(),
    levels: LEVEL_DATA.map((data) => LevelDefSchema.parse(data)),
    masksFor: (chapterId) => CHAPTER_ASSETS[chapterId]!.masks,
  });
  return appSession;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [session] = useState(getAppSession);

  useEffect(() => {
    // While the app is open, the new day starts at local midnight (a second late, so every
    // clock reading is already in it).
    let midnight: ReturnType<typeof setTimeout> | undefined;
    const armMidnight = () => {
      clearTimeout(midnight);
      const { now, tzOffsetMinutes } = session.clock();
      midnight = setTimeout(() => {
        session.visit();
        armMidnight();
      }, msUntilNextDay(now, tzOffsetMinutes) + 1000);
    };
    armMidnight();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "background") {
        clearTimeout(midnight);
        session.touch();
        void scheduleReminders(session);
      } else if (status === "active") {
        session.visit();
        armMidnight();
      }
    });
    return () => {
      clearTimeout(midnight);
      subscription.remove();
    };
  }, [session]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

function useSession(): GameSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useGame must be used inside GameProvider");
  return session;
}

// The current save and level in play, re-rendering only when a command changes them.
export function useGame(): { snapshot: Snapshot; commands: GameCommands } {
  const session = useSession();
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return { snapshot, commands: session };
}

// The commands alone, without re-rendering on game changes: for reading the current settings at
// the moment of a press.
export function useCommands(): GameCommands {
  return useSession();
}

// The last state of each level whose play screen is still mounted, kept so a screen leaving
// (going back to the map, or replaced by the next level) keeps drawing its level during the
// transition instead of an empty screen.
const heldPlays = new Map<number, Play>();

function heldPlay(session: GameSession, levelIndex: number): Play | null {
  const play = session.getSnapshot().play;
  if (play && play.levelIndex === levelIndex) heldPlays.set(levelIndex, play);
  return heldPlays.get(levelIndex) ?? null;
}

// The level in play for a play screen: the live one while it is this level, otherwise the last
// state this level had. Null before the level first starts.
export function useHeldPlay(levelIndex: number): Play | null {
  const session = useSession();
  return useSyncExternalStore(session.subscribe, () => heldPlay(session, levelIndex));
}

// Called when a play screen unmounts, so a later visit to the level does not show the old run.
export function releaseHeldPlay(levelIndex: number): void {
  heldPlays.delete(levelIndex);
}
