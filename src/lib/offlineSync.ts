import { supabase } from "@/integrations/supabase/client";
import { Course } from "@/lib/grading";
import { UserProfile } from "@/contexts/AuthContext";

export type SyncAction =
  | { type: "ADD_COURSE"; payload: any }
  | { type: "UPDATE_COURSE"; payload: { id: string; updates: Partial<Course> } }
  | { type: "DELETE_COURSE"; payload: { id: string } }
  | { type: "UPDATE_PROFILE"; payload: Partial<UserProfile> };

const SYNC_QUEUE_KEY = "gradex_offline_sync_queue";

export function getSyncQueue(): SyncAction[] {
  const data = localStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSyncQueue(queue: SyncAction[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueSyncAction(action: SyncAction) {
  const queue = getSyncQueue();
  queue.push(action);
  saveSyncQueue(queue);
}

export async function processOfflineQueue(userId: string) {
  if (!navigator.onLine) return; // double check

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} offline actions...`);

  const remainingQueue: SyncAction[] = [];

  for (const action of queue) {
    try {
      switch (action.type) {
        case "ADD_COURSE": {
          const { error } = await supabase
            .from("courses")
            .insert({ ...action.payload, user_id: userId });
          if (error) throw error;
          break;
        }
        case "UPDATE_COURSE": {
          const { error } = await supabase
            .from("courses")
            .update(action.payload.updates)
            .eq("id", action.payload.id)
            .eq("user_id", userId);
          if (error) throw error;
          break;
        }
        case "DELETE_COURSE": {
          const { error } = await supabase
            .from("courses")
            .delete()
            .eq("id", action.payload.id)
            .eq("user_id", userId);
          if (error) throw error;
          break;
        }
        case "UPDATE_PROFILE": {
          const { error } = await supabase
            .from("profiles")
            .update(action.payload)
            .eq("id", userId);
          if (error) throw error;
          break;
        }
      }
    } catch (err) {
      console.error("Failed to sync action:", action, err);
      // If it fails (e.g., server error distinct from offline), keep it in the queue to try later
      remainingQueue.push(action);
    }
  }

  saveSyncQueue(remainingQueue);
  if (remainingQueue.length === 0) {
    console.log("Offline queue processed successfully.");
  } else {
    console.warn(
      `Finished processing, but ${remainingQueue.length} items failed and remain in queue.`,
    );
  }
}
