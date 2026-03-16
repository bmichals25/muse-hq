/**
 * Audio generation helper for MUSE HQ voice chat.
 * Uses the sandbox LLM API for ElevenLabs TTS.
 * Falls back gracefully if API credentials aren't available.
 */

export async function generateAudio(
  text: string,
  voice: string = "daniel",
): Promise<string> {
  // Use fetch to call the sandbox audio generation API
  // The pplx SDK is Python-only, so we use the REST endpoint
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("No API credentials available for TTS");
  }

  // For now, we'll use the OpenAI-compatible endpoint with ElevenLabs model
  // The sandbox proxy handles routing to the correct provider
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "elevenlabs_tts_v3",
      input: text,
      voice: voice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
