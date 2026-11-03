import { NextRequest, NextResponse } from "next/server";
import { EdgeTTS } from "@andresaya/edge-tts";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const lang = (searchParams.get("lang") ?? "bn").toLowerCase().startsWith("en") ? "en" : "bn";

  if (!text) {
    return NextResponse.json({ error: { message: "Missing text parameter" } }, { status: 400 });
  }

  // Use natural Male voices: bn-BD-PradeepNeural for Bangla, en-US-ChristopherNeural for English
  const voice = lang === "en" ? "en-US-ChristopherNeural" : "bn-BD-PradeepNeural";

  try {
    const tts = new EdgeTTS();
    await tts.synthesize(text, voice);
    const audioBuffer = tts.toBuffer();

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.warn("EdgeTTS error, falling back to Google TTS:", error);
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 150))}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return new Response(new Uint8Array(arrayBuf), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch {}
    return NextResponse.json({ error: { message: "Failed to generate TTS audio" } }, { status: 502 });
  }
}
