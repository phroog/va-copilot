"use client";

// Web Push: permission + subscription helpers.
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64url);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushResult = { ok: boolean; status?: NotificationPermission; error?: string };

export async function getPushStatus(): Promise<{ supported: boolean; permission: NotificationPermission | "unsupported"; subscribed: boolean }> {
  if (!pushSupported()) return { supported: false, permission: "unsupported", subscribed: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return { supported: true, permission: Notification.permission, subscribed: !!sub };
  } catch {
    return { supported: true, permission: Notification.permission, subscribed: false };
  }
}

export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, error: "Push isn't supported on this device." };
  if (Notification.permission === "denied") {
    return { ok: false, error: "Notifications are blocked in your browser settings." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, status: permission, error: "Permission not granted." };

  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  if (!publicKey) return { ok: false, status: permission, error: "Push isn't configured yet." };

  const keyBytes = urlBase64ToUint8Array(publicKey);
  if (keyBytes.byteLength !== 65 || keyBytes[0] !== 0x04) {
    return { ok: false, status: permission, error: "Push key is invalid — check your VAPID configuration." };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes as unknown as BufferSource,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) return { ok: false, status: permission, error: "Couldn't save your subscription." };
    return { ok: true, status: permission };
  } catch (e: any) {
    return { ok: false, status: permission, error: e?.message || "Subscription failed." };
  }
}