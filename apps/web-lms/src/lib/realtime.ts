import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl, queryKeys, realtimeAvailable, type Presence, type RealtimeTopic } from "@zwf/api-client";
import { useEffect } from "react";

/** Стан потоку для індикатора «Синхронізовано щойно». */
export interface RealtimeStatus {
  connected: boolean;
  lastEventAt: string | null;
}

const STATUS_KEY = ["realtime", "status"] as const;

const TOPIC_KEYS: Record<RealtimeTopic, readonly unknown[][]> = {
  // Рецепти й «Врятовано» рахуються від холодильника — оновлюються разом із ним
  products: [queryKeys.products as unknown as unknown[], queryKeys.recipes as unknown as unknown[], queryKeys.savedStats as unknown as unknown[]],
  "shopping-list": [queryKeys.shoppingList as unknown as unknown[]],
  household: [queryKeys.household as unknown as unknown[], queryKeys.me as unknown as unknown[], queryKeys.activity as unknown as unknown[]],
};

/**
 * F-63: підписка на `/api/household/stream` (B-54). Подія `changed` інвалідує відповідні запити,
 * `presence` кладеться в кеш як є, `notifications` оновлює дзвіночок. EventSource сам перепідключається.
 * У мок-режимі сім'ї потоку немає — індикатор показує «недоступно».
 */
export function useHouseholdStream(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !realtimeAvailable() || typeof EventSource === "undefined") return;
    const source = new EventSource(apiUrl("/household/stream"), { withCredentials: true });
    const touch = (connected: boolean) =>
      qc.setQueryData<RealtimeStatus>(STATUS_KEY, { connected, lastEventAt: connected ? new Date().toISOString() : (qc.getQueryData<RealtimeStatus>(STATUS_KEY)?.lastEventAt ?? null) });

    source.onopen = () => touch(true);
    source.onerror = () => touch(false);
    source.addEventListener("changed", (event) => {
      touch(true);
      try {
        const { topic } = JSON.parse((event as MessageEvent<string>).data) as { topic: RealtimeTopic };
        for (const key of TOPIC_KEYS[topic] ?? []) void qc.invalidateQueries({ queryKey: key });
      } catch {
        /* пошкоджену подію ігноруємо */
      }
    });
    source.addEventListener("presence", (event) => {
      touch(true);
      try {
        qc.setQueryData<Presence>(queryKeys.presence, JSON.parse((event as MessageEvent<string>).data) as Presence);
      } catch {
        /* пошкоджену подію ігноруємо */
      }
    });
    source.addEventListener("notifications", () => {
      touch(true);
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
    });
    return () => {
      source.close();
      qc.setQueryData<RealtimeStatus>(STATUS_KEY, { connected: false, lastEventAt: null });
    };
  }, [enabled, qc]);
}

export function useRealtimeStatus(): RealtimeStatus {
  return useQuery({ queryKey: STATUS_KEY, queryFn: () => ({ connected: false, lastEventAt: null }), staleTime: Infinity, initialData: { connected: false, lastEventAt: null } }).data;
}
