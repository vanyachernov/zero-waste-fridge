import { api } from "@zwf/api-client";

/**
 * F-72: Web Push у браузері. Service Worker живе в `/lms/sw.js` (scope `/lms/`), підписка — з публічним
 * ключем VAPID із сервера. Кидає `PushError` з причиною, яку сторінка налаштувань показує людині.
 */
export class PushError extends Error {
  constructor(readonly reason: "unsupported" | "denied" | "unavailable") {
    super(reason);
  }
}

/** Те саме, що `base` у vite.config.ts: SW і його scope — під кабінетом. */
const BASE = "/lms/";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** base64url → Uint8Array для `applicationServerKey`. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new PushError("unsupported");
  const { publicKey } = await api.notifications.pushPublicKey();
  if (!publicKey) throw new PushError("unavailable");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new PushError("denied");
  const reg = await registration();
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource }));
  const json = subscription.toJSON();
  await api.notifications.subscribePush({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! } });
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(BASE);
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  await api.notifications.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
