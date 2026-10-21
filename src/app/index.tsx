import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";

import { MapScreen, type MetaPage } from "@/hud/MapScreen";
import { useGame } from "@/store/GameContext";

export default function MapRoute() {
  const router = useRouter();
  const welcomed = useGame().snapshot.save.profile.welcomed;
  // One screen at a time: a double tap must not stack two play (or meta) screens.
  const opening = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, []),
  );
  const onPlay = useCallback(
    (levelId: string) => {
      if (opening.current) return;
      opening.current = true;
      router.push(`/play/${levelId}`);
    },
    [router],
  );
  const onOpen = useCallback(
    (page: MetaPage) => {
      if (opening.current) return;
      opening.current = true;
      router.push(`/${page}`);
    },
    [router],
  );
  // A new player is greeted first.
  if (!welcomed) return <Redirect href="/onboarding" />;
  return <MapScreen onPlay={onPlay} onOpen={onOpen} />;
}
