function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export async function transcribeWithGroq(
  audioBlob: Blob,
  groqKey: string,
  language: "en" | "bn" = "en"
): Promise<string> {
  const cleanMime = (audioBlob.type || "audio/webm").split(";")[0];
  const ext = extFromMime(cleanMime);
  const form = new FormData();
  form.append("file", new File([audioBlob], `note.${ext}`, { type: cleanMime }));
  form.append("model", "whisper-large-v3");
  form.append("response_format", "json");
  form.append("language", language);
  if (language === "bn") form.append("prompt", "বাংলা ভাষায় কথা বলা হচ্ছে। শুদ্ধ বাংলা বানানে লিখুন।");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq Whisper error ${res.status}`);
  }

  const data = await res.json() as { text: string };
  const raw = data.text?.trim() ?? "";

  // Filter out known Whisper silence hallucination artifacts (e.g. "you", "Thank you.")
  const hallucinations = ["you", "you.", "you!", "you?", "thank you", "thank you.", "subtitles by", "amara.org", "subscribe"];
  if (hallucinations.includes(raw.toLowerCase())) {
    return "";
  }

  if (!raw || language !== "bn") return raw;

  // Post-correct Bangla: Whisper often outputs romanized or mixed text for Bengali audio.
  const fixRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "তুমি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটটি বাংলা কথ্য ভাষার ট্রান্সক্রিপশন। এটি সঠিক বাংলা লিপিতে রূপান্তর করো। শুধু সংশোধিত বাংলা টেক্সট দাও, অন্য কিছু লিখবে না।",
        },
        { role: "user", content: raw },
      ],
    }),
  });

  if (!fixRes.ok) return raw;
  const fixData = await fixRes.json() as { choices?: { message?: { content?: string } }[] };
  return fixData.choices?.[0]?.message?.content?.trim() || raw;
}
