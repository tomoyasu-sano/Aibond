/**
 * Google Cloud Storage クライアント
 */

import { Storage } from "@google-cloud/storage";
import * as fs from "fs";

// GCSバケット名
export const GCS_AUDIO_BUCKET = "aibond-audio";

let storageClient: Storage | null = null;

/**
 * GCS Storageクライアントを取得
 */
export function getStorageClient(): Storage {
  if (storageClient) {
    return storageClient;
  }

  const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    // ローカル開発: サービスアカウントキーファイルを使用
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    storageClient = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
  } else {
    // Cloud Run: デフォルト認証を使用
    storageClient = new Storage();
  }

  return storageClient;
}

/**
 * 音声ファイルをGCSにアップロード
 */
export async function uploadAudioToGCS(
  talkId: string,
  audioBuffer: Buffer,
  contentType: string = "audio/webm"
): Promise<string> {
  const storage = getStorageClient();
  const bucket = storage.bucket(GCS_AUDIO_BUCKET);
  const fileName = `${talkId}.webm`;
  const file = bucket.file(fileName);

  await file.save(audioBuffer, {
    contentType,
    metadata: {
      talkId,
      uploadedAt: new Date().toISOString(),
    },
  });

  const gcsUri = `gs://${GCS_AUDIO_BUCKET}/${fileName}`;
  console.log(`[GCS] Uploaded audio to ${gcsUri}`);

  return gcsUri;
}

/**
 * GCSの音声ファイルURIを取得
 */
export function getAudioGcsUri(talkId: string): string {
  return `gs://${GCS_AUDIO_BUCKET}/${talkId}.webm`;
}

/**
 * GCSから音声ファイルを削除
 */
export async function deleteAudioFromGCS(talkId: string): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(GCS_AUDIO_BUCKET);
  const fileName = `${talkId}.webm`;
  const file = bucket.file(fileName);

  try {
    await file.delete();
    console.log(`[GCS] Deleted audio: ${fileName}`);
  } catch (error) {
    console.error(`[GCS] Failed to delete audio: ${fileName}`, error);
  }
}
