// utils/agenda.js
const Agenda = require("agenda");
const mongoose = require("mongoose");

let agenda;

async function initAgenda() {
  try {
    console.log("🔍 Checking MongoDB connection state...");
    
    // Wait until Mongoose has connected (max 2 seconds)
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("MongoDB connection timeout")),
          2000
        );
        
        mongoose.connection.once("open", () => {
          clearTimeout(timeout);
          resolve();
        });
        
        mongoose.connection.once("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    console.log("✅ MongoDB ready, initializing Agenda...");
    
    // Initialize Agenda using the connection string directly for better compatibility
    agenda = new Agenda({
      mongo: mongoose.connection,
      collection: "agendaJobs",
      processEvery: "10 seconds",

    });

    console.log("⏳ Starting Agenda...");
    // Set a timeout for agenda.start() in case it hangs
    const startPromise = agenda.start();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Agenda start timeout")), 5000)
    );
    
    await Promise.race([startPromise, timeoutPromise]);

    console.log("✅ Agenda connected and started successfully");
    return agenda;
  } catch (err) {
    console.error("❌ Error initializing Agenda:", err.message);
    throw err;
  }
}

module.exports = { initAgenda, getAgenda: () => agenda };
