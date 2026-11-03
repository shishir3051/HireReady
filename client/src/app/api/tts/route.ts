import { NextRequest, NextResponse } from "next/server";

function splitText(text: string, maxLen = 150): string[] {
  const chunks: string[] = [];
  const parts = text.match(/[^।?!,;:.\n]+[।?!,;:.\n]*/g) || [text];
  let current = "";

  for (const part of parts) {
    if ((current + part).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const lang = (searchParams.get("lang") ?? "bn").toLowerCase().startsWith("en") ? "en" : "bn";

  if (!text) {
    return NextResponse.json({ error: { message: "Missing text parameter" } }, { status: 400 });
  }

  try {
    const chunks = splitText(text);
    const audioBuffers: Uint8Array[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        throw new Error(`Google TTS status: ${res.status}`);
      }

      const arrayBuf = await res.arrayBuffer();
      audioBuffers.push(new Uint8Array(arrayBuf));
    }

    // Merge audio chunks
    const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of audioBuffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    return new Response(merged, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json({ error: { message: "Failed to generate TTS audio" } }, { status: 502 });
  }
}
