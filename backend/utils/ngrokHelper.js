const ngrok = require('ngrok');

let currentNgrokUrl = null;
let ngrokPort = 5000;
let refreshInterval = 60 * 60 * 1000; // 1 hour
let refreshTimeout = null;

// Internal: start ngrok with retries
async function startNgrok(port, retries = 3, delay = 2000) {
   try {
    await ngrok.disconnect();
    await ngrok.kill(); // kill any old tunnels first
  } catch {}
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = await ngrok.connect({
        addr: port,
        proto: 'http',
        authtoken: process.env.NGROK_AUTHTOKEN,
      });
      console.log(`🟢 Ngrok connected at ${url}`);
      return url;
    } catch (err) {
      console.error(`❌ Ngrok start failed (attempt ${attempt}):`, err.message);
      if (attempt < retries) await new Promise(r => setTimeout(r, delay));
      else throw err;
    }
  }
}

async function scheduleRefresh() {
  if (refreshTimeout) clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    console.log('🔄 Refreshing Ngrok URL...');
    await stopNgrok();
    currentNgrokUrl = await startNgrok(ngrokPort);
    scheduleRefresh();
  }, refreshInterval);
}

async function getNgrokUrl(port) {
  ngrokPort = port;
  if (currentNgrokUrl) return currentNgrokUrl;
  currentNgrokUrl = await startNgrok(port);
  scheduleRefresh();
  return currentNgrokUrl;
}

async function stopNgrok() {
  try {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (currentNgrokUrl) {
      await ngrok.disconnect();
      await ngrok.kill();
      console.log('🛑 Ngrok stopped');
      currentNgrokUrl = null;
    }
  } catch (err) {
    console.error('❌ Failed to stop ngrok:', err.message);
  }
}

process.on('SIGINT', stopNgrok);
process.on('SIGTERM', stopNgrok);
process.on('exit', stopNgrok);

module.exports = { getNgrokUrl, stopNgrok };
