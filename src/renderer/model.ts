import Groq from "groq-sdk";
import type { ChatCompletionContentPart } from "groq-sdk/resources/chat/completions";

const groq = new Groq({
  apiKey: (import.meta as any).env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function streamGroqChatCompletion(
  userMessage: string,
  onToken: (token: string) => void,
  liveFrameUrl: string | null = null,
  snapshotUrls: string[] = [],
  history: { role: "user" | "assistant"; text: string }[] = [],
) {
  const messages: any[] = [];

  // Include prior conversation history (text only)
  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.text,
    });
  }

  // Build the current user message with optional images
  const content: ChatCompletionContentPart[] = [];

  [...snapshotUrls].forEach((url, i) => {
    const label = snapshotUrls.length === 1
      ? "[This is a screenshot the user captured and attached to this message. Analyze its contents and incorporate what you see when answering. If the user's question relates to something visible in the screenshot, reference specific details from it.]"
      : `[This is snapshot ${i + 1} of ${snapshotUrls.length} attached by the user.]`;
    content.push({ type: "text", text: label });
    content.push({
      type: "image_url",
      image_url: { url },
    });
  });

  if (liveFrameUrl) {
    content.push({ type: "text", text: "[This is a real-time capture of the user's screen. Analyze what's visible and reference specific on-screen details when answering. If the user asks about something on their screen, use this image as your primary source. Only respond if the user mentions anything relating to the ]" });
    content.push({
      type: "image_url",
      image_url: { url: liveFrameUrl },
    });
  }

  content.push({ type: "text", text: userMessage });
  messages.push({ role: "user", content });

  const stream = await groq.chat.completions.create({
    messages,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      full += delta;
      onToken(full);
    }
  }
  return full;
}

/**
 * Transcribe audio using Groq Whisper.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const file = new File([audioBlob], "recording.webm", { type: audioBlob.type });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    language: "en",
  });
  return transcription.text;
}

/**
 * Generate speech from text using Groq TTS. Returns a playable audio Blob.
 */
export async function textToSpeech(text: string): Promise<Blob> {
  if (!text.trim()) throw new Error("Empty text for TTS");
  const response = await groq.audio.speech.create({
    model: "playai-tts",
    input: text,
    voice: "Fritz-PlayAI",
    response_format: "mp3",
  });
  return await response.blob();
}