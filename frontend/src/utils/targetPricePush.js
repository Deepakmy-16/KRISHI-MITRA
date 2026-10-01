// =========================================================
// targetPricePush.js — Web Push & Target Price Watcher
// =========================================================

const ALERT_STORAGE_KEY = "krishi_target_price_alerts";
const SENT_ALERTS_KEY   = "krishi_sent_price_alerts";

/**
 * Request browser notification permission
 */
export async function requestPushPermission() {
  if (!("Notification" in window)) {
    return { supported: false, status: "unsupported" };
  }

  if (Notification.permission === "granted") {
    return { supported: true, status: "granted" };
  }

  try {
    const perm = await Notification.requestPermission();
    return { supported: true, status: perm };
  } catch (err) {
    console.error("Push permission request error:", err);
    return { supported: true, status: "denied" };
  }
}

/**
 * Check if push notifications are enabled
 */
export function isPushEnabled() {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Get all active target price alerts
 */
export function getTargetAlerts() {
  try {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new target price alert
 */
export function saveTargetAlert(crop, targetPrice, market = "", condition = "greater_equal") {
  const alerts = getTargetAlerts();
  const newAlert = {
    id: "alert_" + Date.now(),
    crop: crop.trim(),
    targetPrice: Number(targetPrice),
    market: market.trim(),
    condition, // "greater_equal" | "less_equal"
    createdAt: new Date().toISOString(),
    active: true,
  };

  alerts.unshift(newAlert);
  localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  return newAlert;
}

/**
 * Remove a target alert
 */
export function removeTargetAlert(alertId) {
  const alerts = getTargetAlerts().filter((a) => a.id !== alertId);
  localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  return alerts;
}

/**
 * Trigger browser notification
 */
export function triggerBrowserPush({ title, body, icon = "/icon-192.png", data = {} }) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon,
          badge: "/icon-192.png",
          vibrate: [200, 100, 200, 100, 200],
          tag: "target-price-" + (data.crop || "alert"),
          renotify: true,
          data: { url: "/price-list" },
        });
      });
      return true;
    } else {
      new Notification(title, {
        body,
        icon,
        tag: "target-price-" + (data.crop || "alert"),
      });
      return true;
    }
  } catch (err) {
    console.warn("Failed to trigger Notification:", err);
    return false;
  }
}

/**
 * Send a quick test notification so the farmer knows push alerts are working!
 */
export async function sendTestNotification() {
  const perm = await requestPushPermission();
  if (perm.status !== "granted") {
    alert("Please enable notifications in your browser permissions to receive price alerts.");
    return false;
  }

  return triggerBrowserPush({
    title: "🌾 Krishi Mitra Price Alert (Test)",
    body: "Notifications are working! You will be alerted the moment any crop reaches your target price.",
    icon: "/icon-192.png",
  });
}

/**
 * Compare live market items against saved target prices
 * Fires push notification when target price is met!
 */
export function evaluateTargetPrices(mandiData) {
  if (!Array.isArray(mandiData) || !mandiData.length) return [];
  if (!isPushEnabled()) return [];

  const alerts = getTargetAlerts().filter((a) => a.active);
  if (!alerts.length) return [];

  let sentRecord = {};
  try {
    sentRecord = JSON.parse(localStorage.getItem(SENT_ALERTS_KEY) || "{}");
  } catch {
    sentRecord = {};
  }

  const triggered = [];
  const now = Date.now();
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  for (const alert of alerts) {
    const alertCropLower = alert.crop.toLowerCase();

    // Find matching items in live data
    const matches = mandiData.filter((item) => {
      const itemCrop = (item.Commodity || item.commodity || item.Crop || item.crop_name || "").toLowerCase();
      const matchesCrop = itemCrop.includes(alertCropLower) || alertCropLower.includes(itemCrop);
      if (!matchesCrop) return false;

      if (alert.market) {
        const itemMarket = (item.Market || item.market || "").toLowerCase();
        return itemMarket.includes(alert.market.toLowerCase());
      }
      return true;
    });

    for (const match of matches) {
      const price = Number(match.Modal_x0020_Price || match.modal_price || 0);
      if (!price) continue;

      const isTargetMet =
        alert.condition === "less_equal"
          ? price <= alert.targetPrice
          : price >= alert.targetPrice;

      if (isTargetMet) {
        // Prevent spamming — check if notified in the last 6 hours
        const lastSent = sentRecord[alert.id];
        if (!lastSent || now - lastSent > SIX_HOURS) {
          const cropName = match.Commodity || match.Crop || alert.crop;
          const marketName = match.Market || "your nearest mandi";
          const stateName = match.State ? ` (${match.State})` : "";

          const title = `🚨 Target Price Hit: ${cropName} ₹${price.toLocaleString()}/qtl`;
          const body = `🎯 Target was ₹${alert.targetPrice.toLocaleString()} | Live at ${marketName}${stateName}!`;

          triggerBrowserPush({
            title,
            body,
            icon: "/icon-192.png",
            data: { crop: cropName, market: marketName },
          });

          sentRecord[alert.id] = now;
          triggered.push({ alert, match, price });
        }
      }
    }
  }

  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sentRecord));
  return triggered;
}
