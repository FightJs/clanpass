import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/app/store";
import {
  buildNotifyItems,
  scheduleLocalNotifications,
  type NotifyItem,
} from "@/domain/notify";

/** 快照/设置变化时重排本地通知；返回当前待发列表 */
export function useNotifyScheduler() {
  const snapshot = useAppStore((s) => s.snapshot);
  const settings = useAppStore((s) => s.settings);
  const [queue, setQueue] = useState<NotifyItem[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const jobs = snapshot?.jobs ?? [];
    const items = buildNotifyItems(jobs, settings);
    setQueue(items);
    cleanupRef.current?.();
    cleanupRef.current = scheduleLocalNotifications(items);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [snapshot, settings]);

  useEffect(() => () => cleanupRef.current?.(), []);

  return queue;
}
