// utils/scheduleOldOrders.js
const Order = require("../models/Order");

async function scheduleOldReadyOrders() {
  try {
    console.log("📋 Checking for old ready orders to notify riders...");

    const oldReadyOrders = await Order.find({
      status: "ready",
      riderId: { $exists: false },
    }).lean(); // Use lean() for faster queries

    if (!oldReadyOrders.length) {
      console.log("✅ No old ready orders found.");
      return;
    }

    // Get Agenda instance with a timeout check
    const { getAgenda } = require("./agenda");
    const agenda = getAgenda();
    
    if (!agenda) {
      console.warn("⚠️  Agenda not yet initialized, skipping schedule");
      return;
    }

    console.log(`📅 Found ${oldReadyOrders.length} old ready orders. Scheduling notifications...`);
    
    for (const order of oldReadyOrders) {
      try {
        // Schedule the Agenda job immediately with timeout
        await Promise.race([
          agenda.now("notify-riders", { orderId: order._id, attempt: 0 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Job schedule timeout")), 3000)
          )
        ]);
        console.log(`✅ Scheduled rider notification for order ${order._id}`);
      } catch (jobErr) {
        console.error(`❌ Failed to schedule order ${order._id}:`, jobErr.message);
        // Continue with next order even if one fails
      }
    }

    console.log(`✅ Completed scheduling for ${oldReadyOrders.length} old ready orders.`);
  } catch (err) {
    console.error("⚠️  Error scheduling old ready orders:", err.message);
    // Don't throw - allow server to continue even if scheduling fails
  }
}

module.exports = scheduleOldReadyOrders;
