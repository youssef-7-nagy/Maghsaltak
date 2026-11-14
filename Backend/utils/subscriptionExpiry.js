const PackageSubscription = require("../models/PackageSubscription");

/**
 * Finds all "active" subscriptions whose endDate is in the past
 * and sets their subscriptionStatus to "expired".
 * Run on app startup and periodically via setInterval.
 */
const checkAndExpireSubscriptions = async () => {
  try {
    const now = new Date();
    const result = await PackageSubscription.updateMany(
      {
        subscriptionStatus: "active",
        "subscriptionDetails.endDate": { $lt: now },
      },
      { $set: { subscriptionStatus: "expired" } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Expiry] Expired ${result.modifiedCount} subscription(s).`);
    }
  } catch (err) {
    console.error("[Expiry] Failed to run expiry check:", err.message);
  }
};

module.exports = { checkAndExpireSubscriptions };
