import { useState, useEffect, useCallback } from 'react';

export interface OfflineEvaluationItem {
  key: string; // `${round_id}_${team_id}_${judge_id}`
  team_id: string;
  round_id: string;
  judge_id: string;
  scores: Record<string, number>;
  remarks: string;
  is_locked?: boolean;
  timestamp: number;
}

const DB_NAME = 'NexHackDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_evaluations';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToOfflineQueue(item: OfflineEvaluationItem): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // LocalStorage fallback if IndexedDB is blocked in private browsing
    try {
      const existing = JSON.parse(localStorage.getItem('nexhack_offline_queue') || '{}');
      existing[item.key] = item;
      localStorage.setItem('nexhack_offline_queue', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
    } catch {}
  }
}

export async function getOfflineQueue(): Promise<OfflineEvaluationItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem('nexhack_offline_queue') || '{}');
      return Object.values(existing);
    } catch {
      return [];
    }
  }
}

export async function removeFromOfflineQueue(key: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem('nexhack_offline_queue') || '{}');
      delete existing[key];
      localStorage.setItem('nexhack_offline_queue', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
    } catch {}
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.removeItem('nexhack_offline_queue');
      window.dispatchEvent(new CustomEvent('nexhack:offline-queue-changed'));
    } catch {}
  }
}

export async function flushOfflineQueue(backendUrl: string = ''): Promise<{ synced: number; failed: number }> {
  const items = await getOfflineQueue();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const endpoint = item.is_locked ? '/api/v1/evaluations/submit' : '/api/v1/evaluations/draft';
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: item.round_id,
          team_id: item.team_id,
          judge_id: item.judge_id,
          scores: item.scores,
          remarks: item.remarks,
        }),
      });

      if (res.ok) {
        await removeFromOfflineQueue(item.key);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export function useOfflineSync(backendUrl: string = '') {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshCount = useCallback(async () => {
    try {
      const items = await getOfflineQueue();
      setPendingCount(items.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineQueue(backendUrl);
      await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [backendUrl, isSyncing, refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      refreshCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nexhack:offline-queue-changed', handleQueueChange);

    // Initial flush if online
    if (navigator.onLine) {
      triggerSync();
    }

    // Periodic sync check every 15s
    const interval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nexhack:offline-queue-changed', handleQueueChange);
      clearInterval(interval);
    };
  }, [refreshCount, triggerSync]);

  const syncStatus: 'saved' | 'syncing' | 'offline' = !isOnline
    ? 'offline'
    : isSyncing
    ? 'syncing'
    : pendingCount > 0
    ? 'syncing'
    : 'saved';

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncStatus,
    triggerSync,
    saveEvaluationOffline: saveToOfflineQueue,
  };
}
