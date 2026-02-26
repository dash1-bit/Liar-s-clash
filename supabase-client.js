import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const rawConfig = window.LIARS_CLASH_SUPABASE_CONFIG || {};
const supabaseUrl = typeof rawConfig.url === "string" ? rawConfig.url.trim() : "";
const supabaseAnonKey = typeof rawConfig.anonKey === "string" ? rawConfig.anonKey.trim() : "";

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing URL or anon key in supabase-config.js.");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    window.liarsClashSupabase = supabase;
    console.log("[Supabase] Client initialized.");
  } catch (error) {
    console.error("[Supabase] Client initialization failed:", error);
  }
}

window.liarsClashTestSupabase = async function liarsClashTestSupabase() {
  if (!supabase) {
    console.error("[Supabase Test] Client is not initialized. Set url and anonKey in supabase-config.js first.");
    return;
  }

  const channelName = "test";
  const eventName = "liars-clash-test";
  const payload = {
    message: "hello-from-liars-clash",
    sentAt: new Date().toISOString()
  };

  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: true } }
  });

  try {
    const receipt = await new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = null;

      const settle = (handler, value) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        handler(value);
      };

      channel.on("broadcast", { event: eventName }, (message) => {
        console.log("[Supabase Test] Broadcast received:", message);
        settle(resolve, message);
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Supabase Test] Subscribed to channel "${channelName}". Sending broadcast...`);
          try {
            const sendResult = await channel.send({
              type: "broadcast",
              event: eventName,
              payload
            });
            console.log("[Supabase Test] Broadcast send result:", sendResult);
          } catch (error) {
            settle(reject, new Error(`Broadcast send failed: ${error?.message || String(error)}`));
            return;
          }

          timeoutId = setTimeout(() => {
            settle(reject, new Error("No broadcast receipt within 10s. Check Realtime config/network."));
          }, 10000);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          settle(reject, new Error(`Realtime channel failed with status "${status}".`));
        }
      });
    });

    console.log("[Supabase Test] Success:", receipt);
  } catch (error) {
    console.error("[Supabase Test] Failed:", error);
  } finally {
    try {
      const unsubscribeResult = await channel.unsubscribe();
      if (unsubscribeResult !== "ok") {
        console.warn("[Supabase Test] Channel unsubscribe result:", unsubscribeResult);
      }
    } catch (error) {
      console.error("[Supabase Test] Unsubscribe error:", error);
    }
  }
};