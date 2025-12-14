/**
 * Google Cloud Translation API クライアント
 *
 * テキストを指定言語に翻訳
 */

import { TranslationServiceClient } from "@google-cloud/translate";
import * as fs from "fs";

let translationClient: TranslationServiceClient | null = null;
let projectId: string | null = null;

/**
 * Translation クライアントを取得（シングルトン）
 */
function getClient(): { client: TranslationServiceClient; projectId: string } {
  if (translationClient && projectId) {
    return { client: translationClient, projectId };
  }

  const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    // ローカル開発: サービスアカウントキーファイルを使用
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    projectId = credentials.project_id;

    translationClient = new TranslationServiceClient({
      credentials,
    });
  } else {
    // Cloud Run: デフォルト認証を使用
    projectId = process.env.GOOGLE_CLOUD_PROJECT || "aibond-479715";

    translationClient = new TranslationServiceClient();
  }

  return { client: translationClient, projectId: projectId! };
}

/**
 * テキストを翻訳
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string | null> {
  // 同じ言語なら翻訳不要
  if (sourceLanguage === targetLanguage) {
    return null;
  }

  // 空テキストは翻訳不要
  if (!text.trim()) {
    return null;
  }

  try {
    const { client, projectId } = getClient();

    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      sourceLanguageCode: sourceLanguage,
      targetLanguageCode: targetLanguage,
      mimeType: "text/plain",
    });

    const translation = response.translations?.[0]?.translatedText;
    return translation || null;
  } catch (error) {
    console.error("[Translate] Error:", error);
    return null;
  }
}
