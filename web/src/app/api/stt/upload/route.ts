/**
 * 音声アップロードAPI
 *
 * クライアントから500ms間隔でアップロードされる音声チャンクを
 * Google STT V2のストリームに送信する
 */

import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/stt/session-store";

export const runtime = "nodejs";

// V2 API: 25KB制限（余裕を持たせて20KBに設定）
const MAX_CHUNK_SIZE = 20 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const audioBlob = formData.get("audio") as Blob;
    const sequence = parseInt(formData.get("sequence") as string);

    if (!sessionId || !audioBlob) {
      return NextResponse.json(
        { error: "Missing sessionId or audio data" },
        { status: 400 }
      );
    }

    // セッション取得
    const session = sessionStore.get(sessionId);
    if (!session) {
      console.error("[STT Upload] Session not found", { sessionId });
      return NextResponse.json(
        { error: "Session not found. Please start streaming first." },
        { status: 404 }
      );
    }

    // 音声データをBuffer化
    const audioBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    // STTストリームに送信
    try {
      if (buffer.length <= MAX_CHUNK_SIZE) {
        session.sttStream.write({ audio: buffer });
      } else {
        // 25KBを超える場合は分割して送信
        let offset = 0;
        while (offset < buffer.length) {
          const chunk = buffer.slice(offset, offset + MAX_CHUNK_SIZE);
          session.sttStream.write({ audio: chunk });
          offset += MAX_CHUNK_SIZE;
        }
      }

      return NextResponse.json({
        success: true,
        sequence,
        size: buffer.length,
      });
    } catch (streamError) {
      console.error("[STT Upload] Error writing to stream", {
        sessionId,
        error: streamError,
      });

      return NextResponse.json(
        {
          error: "Failed to write to STT stream",
          details: streamError instanceof Error ? streamError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[STT Upload] Request processing error", error);

    return NextResponse.json(
      {
        error: "Failed to process audio upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
