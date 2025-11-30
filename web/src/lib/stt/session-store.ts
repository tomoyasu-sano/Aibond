/**
 * STTセッション管理
 *
 * Google Cloud Speech-to-Text V2のストリーミングセッションを管理
 */

import type { ReadableStreamDefaultController } from "stream/web";

export type STTSession = {
  sttStream: any; // Google Speech client stream
  controller: ReadableStreamDefaultController;
  talkId: string;
  createdAt: Date;
};

/**
 * セッションストア（インメモリ）
 */
class SessionStore {
  private sessions: Map<string, STTSession>;

  constructor() {
    this.sessions = new Map();
  }

  set(sessionId: string, session: STTSession): void {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): STTSession | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  size(): number {
    return this.sessions.size;
  }

  // 古いセッションをクリーンアップ
  cleanup(maxAgeMs: number = 3600000): number {
    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.createdAt.getTime();
      if (age > maxAgeMs) {
        this.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

export const sessionStore = new SessionStore();
