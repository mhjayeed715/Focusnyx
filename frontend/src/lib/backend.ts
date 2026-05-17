import { createClient } from "@/lib/supabase/client";

const defaultBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function backendRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No authenticated session was found.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${defaultBackendUrl}${path}`, {
    ...init,
    headers,
  });
}

export async function getDashboardBootstrap() {
  const response = await backendRequest("/auth/me");

  if (!response.ok) {
    throw new Error("Unable to load the dashboard.");
  }

  return response.json() as Promise<{
    profile: {
      id: string;
      email: string;
      fullName: string;
      level: number;
      totalXp: number;
      todayXp: number;
      streak: number;
      focusScore: number;
      completedTasksToday: number;
      totalFocusTime: number;
      sessionsCompleted: number;
      xpIntoLevel: number;
      xpNeededForNextLevel: number;
      xpProgressPercent: number;
    };
    tasks: Array<{
      id: string;
      title: string;
      subject: string;
      estimate: number;
      xp: number;
      completed: boolean;
      subtasks: Array<{ id: string; title: string; completed: boolean }>;
    }>;
  }>;
}

export async function syncDashboardProfile() {
  const response = await backendRequest("/auth/sync", { method: "POST" });

  if (!response.ok) {
    throw new Error("Unable to sync profile.");
  }

  return response.json() as Promise<{ profile: { fullName: string } }>;
}

export async function updateTask(taskId: string, body: Record<string, unknown>) {
  const response = await backendRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Unable to update task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function createTask(body: Record<string, unknown>) {
  const response = await backendRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Unable to create task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function deleteTask(taskId: string) {
  const response = await backendRequest(`/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to delete task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function completePomodoro(minutes = 25) {
  const response = await backendRequest("/focus/pomodoro/complete", {
    method: "POST",
    body: JSON.stringify({ minutes, xpReward: 25 }),
  });

  if (!response.ok) {
    throw new Error("Unable to record the focus session.");
  }

  return response.json() as Promise<{ profile: unknown; reward: unknown }>;
}