import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OpenAI service — real client when OPENAI_API_KEY is set, deterministic simulation otherwise.
 *
 * Required env to enable real mode:
 *   OPENAI_API_KEY
 *   OPENAI_MODEL          (default "gpt-4o-mini")
 *   OPENAI_TTS_VOICE      (default "alloy")
 */
@Injectable()
export class OpenAiService {
  private readonly log = new Logger(OpenAiService.name);
  private client: any;
  private model: string;
  readonly simulated: boolean;

  constructor(private config: ConfigService) {
    const key = config.get<string>('OPENAI_API_KEY');
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    this.simulated = !key;

    if (!this.simulated) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const OpenAI = require('openai').default ?? require('openai');
        this.client = new OpenAI({ apiKey: key });
        this.log.log(`OpenAI configured · model=${this.model}`);
      } catch (e: any) {
        this.log.warn(`openai SDK not installed (${e.message}) — simulation mode`);
        (this as any).simulated = true;
      }
    } else {
      this.log.log('OpenAI simulation mode (OPENAI_API_KEY not set)');
    }
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, opts: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
    if (this.simulated || !this.client) {
      return this.simulateChat(messages);
    }
    try {
      const resp = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 800,
      });
      return resp.choices?.[0]?.message?.content ?? '';
    } catch (e: any) {
      this.log.error(`OpenAI chat failed: ${e.message} — falling back to simulation`);
      return this.simulateChat(messages);
    }
  }

  async embed(text: string): Promise<number[]> {
    if (this.simulated || !this.client) {
      // Deterministic fake embedding from string hash
      return Array.from({ length: 32 }, (_, i) => (text.charCodeAt(i % text.length) % 100) / 100);
    }
    const resp = await this.client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return resp.data?.[0]?.embedding ?? [];
  }

  async transcribe(audioBuffer: Buffer, mimeType = 'audio/mpeg'): Promise<string> {
    if (this.simulated || !this.client) {
      return `[Simulated transcript — audio length: ${audioBuffer.length} bytes]`;
    }
    const file = new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: mimeType });
    const resp = await this.client.audio.transcriptions.create({ file, model: 'whisper-1' });
    return resp.text;
  }

  // ─── Simulation fallback for chat ──────────────────────────────
  private simulateChat(messages: Array<{ role: string; content: string }>): string {
    const last = messages[messages.length - 1]?.content ?? '';
    const sys = messages.find((m) => m.role === 'system')?.content ?? '';

    // Crude intent detection for demo purposes
    if (/screen|aecb|wps|background/i.test(sys + last)) {
      return JSON.stringify({
        riskScore: 3,
        decision: 'APPROVE',
        rationale: 'AECB score 712 (Good), salary verified via WPS at AED 18,500/mo, EID valid through 2028, no AML matches.',
        flags: [],
      });
    }
    if (/review|response|reply/i.test(sys + last)) {
      return 'Thank you for the feedback! Our team will review and follow up to make this right.';
    }
    if (/call|conversation|transcript/i.test(sys + last)) {
      return `Hello, this is the AI assistant from your property manager. I'm calling to confirm your appointment for tomorrow at 2 PM. Could you let me know if that time still works?`;
    }
    if (/suggest|recommend/i.test(sys + last)) {
      return JSON.stringify({
        suggestions: [
          { severity: 'high', title: 'Rent renewal due in 14 days', action: 'Send renewal proposal' },
          { severity: 'medium', title: 'AC service overdue on Unit DP-1202', action: 'Schedule service' },
        ],
      });
    }
    return 'I understand. How can I help you with that?';
  }
}
