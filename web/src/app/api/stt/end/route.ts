/**
 * STTストリーム終了API
 *
 * クライアントが録音を停止した時に呼び出され、
 * サーバー側のSTTストリームを適切に終了する
 */

import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/stt/session-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // セッション取得
    const session = sessionStore.get(sessionId);
    if (!session) {
      console.log("[STT End] Session not found (may have already ended)", { sessionId });
      return NextResponse.json({
        success: true,
        message: "Session already ended or not found",
      });
    }

    console.log("[STT End] Ending STT stream", { sessionId });

    try {
      // STTストリームを graceful に終了
      session.sttStream.end();
      console.log("[STT End] STT stream ended successfully", { sessionId });
    } catch (streamError) {
      console.error("[STT End] Error ending stream", {
        sessionId,
        error: streamError,
      });
    }

    // セッションを削除
    sessionStore.delete(sessionId);

    return NextResponse.json({
      success: true,
      message: "STT stream ended",
    });
  } catch (error) {
    console.error("[STT End] Request processing error", error);

    return NextResponse.json(
      {
        error: "Failed to end STT stream",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
