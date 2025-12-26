/**
 * OpenAI Client Service
 * Handles all communication with OpenAI API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AI_CONFIG,
  AiModel,
  AiOperationType,
} from '../constants/ai-config.constants';

export interface OpenAiCompletionRequest {
  model: AiModel;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface OpenAiCompletionResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  model: AiModel;
  responseTime: number;
}

export interface OpenAiEmbeddingRequest {
  text: string;
  model?: string;
}

export interface OpenAiEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  tokensUsed: number;
  cost: number;
  model: string;
  responseTime: number;
}

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured. AI features will not be available.',
      );
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key', // Use dummy key if not configured
    });
  }

  /**
   * Check if OpenAI is configured and available
   */
  isAvailable(): boolean {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    return !!apiKey && apiKey !== 'dummy-key';
  }

  /**
   * Create a chat completion
   */
  async createCompletion(
    request: OpenAiCompletionRequest,
  ): Promise<OpenAiCompletionResponse> {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI API is not configured');
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: request.systemPrompt,
        },
        {
          role: 'user',
          content: request.userPrompt,
        },
      ];

      const completionParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: request.model,
        messages,
        temperature: request.temperature ?? AI_CONFIG.OPENAI.TEMPERATURE.BALANCED,
        max_tokens: request.maxTokens ?? AI_CONFIG.OPENAI.MAX_TOKENS[request.model],
      };

      // Add response_format for JSON output
      if (request.responseFormat === 'json_object') {
        completionParams.response_format = { type: 'json_object' };
      }

      this.logger.debug(
        `Creating OpenAI completion: model=${request.model}, temp=${completionParams.temperature}, maxTokens=${completionParams.max_tokens}`,
      );

      const completion = await this.openai.chat.completions.create(completionParams);

      const responseTime = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!usage) {
        throw new Error('OpenAI response missing usage data');
      }

      const tokensUsed = {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        total: usage.total_tokens,
      };

      const cost = this.calculateCost(request.model, tokensUsed);

      this.logger.debug(
        `OpenAI completion successful: tokens=${tokensUsed.total}, cost=$${cost.toFixed(4)}, time=${responseTime}ms`,
      );

      return {
        content,
        tokensUsed,
        cost,
        model: request.model,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `OpenAI completion failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(
    request: OpenAiEmbeddingRequest,
  ): Promise<OpenAiEmbeddingResponse> {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI API is not configured');
      }

      const model = request.model || AI_CONFIG.OPENAI.EMBEDDING_MODEL;

      this.logger.debug(
        `Generating embedding: model=${model}, textLength=${request.text.length}`,
      );

      // Truncate text if it exceeds token limit
      const maxTokens = AI_CONFIG.OPENAI.MAX_TOKENS[model as keyof typeof AI_CONFIG.OPENAI.MAX_TOKENS] || 8191;
      const estimatedTokens = this.estimateTokenCount(request.text);

      let textToEmbed = request.text;
      if (estimatedTokens > maxTokens) {
        this.logger.warn(
          `Text exceeds token limit (${estimatedTokens} > ${maxTokens}). Truncating...`,
        );
        // Rough truncation: keep 4 chars per token
        textToEmbed = request.text.substring(0, maxTokens * 4);
      }

      const embeddingResponse = await this.openai.embeddings.create({
        model,
        input: textToEmbed,
      });

      const responseTime = Date.now() - startTime;
      const embedding = embeddingResponse.data[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('OpenAI embedding response missing vector data');
      }

      const tokensUsed = embeddingResponse.usage?.total_tokens || 0;
      const cost = this.calculateCost(model as AiModel, {
        input: tokensUsed,
        output: 0,
      });

      this.logger.debug(
        `Embedding generated: dimensions=${embedding.length}, tokens=${tokensUsed}, cost=$${cost.toFixed(6)}, time=${responseTime}ms`,
      );

      return {
        embedding,
        dimensions: embedding.length,
        tokensUsed,
        cost,
        model,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Embedding generation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(
    model: AiModel,
    tokens: { input: number; output: number },
  ): number {
    const pricing = AI_CONFIG.COSTS[model];
    if (!pricing) {
      this.logger.warn(`No pricing configured for model: ${model}`);
      return 0;
    }

    const inputCost = (tokens.input / 1000) * pricing.input;
    const outputCost = (tokens.output / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Parse JSON response safely
   */
  parseJsonResponse<T = any>(content: string): T {
    try {
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse OpenAI JSON response', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Extract structured data from text response
   * Uses regex patterns to extract specific data formats
   */
  extractStructuredData(content: string): Record<string, any> {
    const result: Record<string, any> = {};

    // Extract JSON blocks (```json ... ```)
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
    const jsonMatches = content.matchAll(jsonBlockRegex);

    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        Object.assign(result, jsonData);
      } catch (e) {
        this.logger.warn('Failed to parse JSON block in response');
      }
    }

    // Extract markdown lists
    const listRegex = /^[-*]\s+(.+)$/gm;
    const listMatches = [...content.matchAll(listRegex)];
    if (listMatches.length > 0) {
      result.list = listMatches.map((m) => m[1].trim());
    }

    // Extract numbered items
    const numberedRegex = /^\d+\.\s+(.+)$/gm;
    const numberedMatches = [...content.matchAll(numberedRegex)];
    if (numberedMatches.length > 0) {
      result.numberedList = numberedMatches.map((m) => m[1].trim());
    }

    // If no structured data found, return the raw content
    if (Object.keys(result).length === 0) {
      result.rawContent = content;
    }

    return result;
  }

  /**
   * Split long text into chunks for processing
   */
  splitTextIntoChunks(text: string, maxChunkSize: number = 3000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If a single paragraph is too long, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += ' ' + sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Estimate token count (approximate)
   * Real tokenization requires tiktoken library
   */
  estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if request would exceed token limits
   */
  wouldExceedTokenLimit(
    systemPrompt: string,
    userPrompt: string,
    model: AiModel,
  ): boolean {
    const estimatedTokens = this.estimateTokenCount(systemPrompt + userPrompt);
    const maxTokens = AI_CONFIG.OPENAI.MAX_TOKENS[model];

    // Leave room for response (estimate 50% of max tokens for response)
    const maxInputTokens = maxTokens * 0.5;

    return estimatedTokens > maxInputTokens;
  }
}
