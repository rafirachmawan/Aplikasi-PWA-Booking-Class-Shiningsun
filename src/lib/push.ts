import webpush from "web-push";
import { supabase } from "./supabase";

// Initialize VAPID configuration
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@shiningsun.com";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error("Failed to initialize VAPID details:", err);
  }
}

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  branch_id?: string;
};

/**
  * Save device push subscription to Supabase
  */
export async function savePushSubscription(sub: PushSubscriptionPayload, branchId?: string) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        branch_id: branchId || "ALL",
      },
      { onConflict: "endpoint" }
    )
    .select();

  if (error) {
    console.error("Error saving push subscription:", error);
    throw error;
  }
  return data;
}

/**
  * Send web push notification to a specific subscription
  */
export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; badgeCount?: number; url?: string }
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    badgeCount: payload.badgeCount ?? 0,
    url: payload.url || "/dashboard",
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationPayload);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    // If subscription is expired or invalid (404/410), delete it from DB
    if (error.statusCode === 404 || error.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    }
    return { success: false, error };
  }
}
