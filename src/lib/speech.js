// Web Speech API wrapper for voice input in mock interviews
// Returns transcript or error; degrades gracefully when unsupported

export function isVoiceSupported() {
  return typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

export function listenOnce(timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!isVoiceSupported()) {
      return resolve({ error: "unsupported" });
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { rec.stop(); } catch { /* ignore */ }
      resolve(payload);
    };

    const timer = setTimeout(() => finish({ error: "timeout" }), timeoutMs);

    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) finish({ transcript });
      else finish({ error: "no-speech" });
    };

    rec.onerror = () => finish({ error: "mic-error" });
    rec.onend = () => { if (!settled) finish({ error: "no-speech" }); };

    try { rec.start(); }
    catch { finish({ error: "mic-error" }); }
  });
}
