import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SpeechClient } from "@google-cloud/speech";
import * as fs from "fs";

// Lazy initialization of Speech client
let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    // Use Aibond-specific env var to avoid conflict with system GOOGLE_APPLICATION_CREDENTIALS
    const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;
    console.log("Initializing SpeechClient with credentials from:", credentialsPath);

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      // ローカル開発: サービスアカウントキーファイルを使用
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      console.log("Using credentials for project:", credentials.project_id);
      speechClient = new SpeechClient({ credentials });
    } else {
      // Cloud Run: デフォルト認証を使用
      console.log("Using default credentials");
      speechClient = new SpeechClient();
    }
  }
  return speechClient;
}

// POST - Transcribe audio
export async function POST(request: Request) {
  console.log("Transcribe API called");
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("Transcribe API: Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { audio, language = "ja-JP" } = body;
    console.log("Transcribe API: audio length:", audio?.length, "language:", language);

    if (!audio) {
      return NextResponse.json({ error: "Audio data required" }, { status: 400 });
    }

    // Configure the request - optimized for short audio clips
    const config = {
      encoding: "WEBM_OPUS" as const,
      sampleRateHertz: 48000,
      languageCode: language,
      enableAutomaticPunctuation: true,
      // Note: Speaker diarization requires longer audio (minimum ~15 seconds)
      // Disabled for now to improve recognition accuracy
      model: "default", // Better for short audio clips
    };

    const audioData = {
      content: audio, // Base64 encoded audio
    };

    // Perform the transcription
    console.log("Calling Google Speech-to-Text API...");
    const client = getSpeechClient();
    const [response] = await client.recognize({
      config,
      audio: audioData,
    });
    console.log("Speech-to-Text response received, results:", response.results?.length);

    const transcription = response.results
      ?.map((result) => {
        const alternative = result.alternatives?.[0];
        return {
          transcript: alternative?.transcript || "",
          confidence: alternative?.confidence || 0,
          speakerTag: alternative?.words?.[0]?.speakerTag || 1,
        };
      })
      .filter((r) => r.transcript);

    console.log("Transcription results:", transcription);

    return NextResponse.json({
      transcription: transcription || [],
      languageCode: language,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed", details: String(error) },
      { status: 500 }
    );
  }
}
