/**
 * AI Prompt Service
 * Manages prompt templates and rendering
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AI_PROMPTS,
  renderPrompt,
  PromptTemplate,
} from '../constants/ai-prompts.constants';
import { AiOperationType } from '../constants/ai-config.constants';

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);

  /**
   * Get prompt template for an operation type
   */
  getPromptTemplate(operationType: AiOperationType): PromptTemplate {
    const template = AI_PROMPTS[operationType];

    if (!template) {
      this.logger.error(`No prompt template found for: ${operationType}`);
      throw new Error(`No prompt template configured for ${operationType}`);
    }

    return template;
  }

  /**
   * Render a prompt with variables
   */
  renderPrompt(
    operationType: AiOperationType,
    variables: Record<string, any>,
  ): { systemPrompt: string; userPrompt: string; outputFormat?: string } {
    const template = this.getPromptTemplate(operationType);

    try {
      const systemPrompt = template.systemPrompt;
      const userPrompt = renderPrompt(template.userPromptTemplate, variables);

      this.logger.debug(
        `Rendered prompt for ${operationType}: ${userPrompt.length} chars`,
      );

      return {
        systemPrompt,
        userPrompt,
        outputFormat: template.outputFormat,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to render prompt for ${operationType}: ${error.message}`,
      );
      throw new Error(`Prompt rendering failed: ${error.message}`);
    }
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(
    template: string,
    variables: Record<string, any>,
  ): { valid: boolean; missingVars: string[] } {
    const requiredVars = this.extractVariableNames(template);
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!(varName in variables)) {
        missingVars.push(varName);
      }
    }

    return {
      valid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * Extract variable names from a template
   */
  private extractVariableNames(template: string): string[] {
    const regex = /{{(\w+(?:\.\w+)?)}}/g;
    const matches = [...template.matchAll(regex)];
    return [...new Set(matches.map((m) => m[1].split('.')[0]))];
  }

  /**
   * Sanitize input to prevent prompt injection
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters/patterns
    let sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers

    // Limit length to prevent token overflow
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      this.logger.warn(`Input truncated from ${sanitized.length} to ${maxLength} chars`);
      sanitized = sanitized.substring(0, maxLength) + '... [truncated]';
    }

    return sanitized;
  }

  /**
   * Create a truncated preview of content
   */
  createContentPreview(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '... [truncated]';
  }

  /**
   * Format output based on template output format
   */
  formatOutput(content: string, outputFormat?: string): any {
    switch (outputFormat) {
      case 'json':
        try {
          return JSON.parse(content);
        } catch (e) {
          this.logger.error('Failed to parse JSON output', content);
          throw new Error('AI returned invalid JSON format');
        }

      case 'markdown_bullets':
        // Extract bullet points from markdown
        const bullets = content
          .split('\n')
          .filter((line) => line.trim().match(/^[-*]\s+/))
          .map((line) => line.replace(/^[-*]\s+/, '').trim());
        return bullets.length > 0 ? bullets : [content];

      case 'structured_comparison':
      case 'structured_conflicts':
      case 'structured_health_report':
      case 'risk_matrix':
      case 'pattern_analysis':
      case 'anomaly_report':
      case 'rfi_suggestion':
      case 'formatted_rfi':
      case 'safety_observation':
      case 'cost_code_suggestions':
      case 'document_categorization':
      case 'fac_forecast':
      case 'schedule_impact':
      case 'subcontractor_scorecard':
      case 'cost_trend_analysis':
      case 'rfi_velocity_forecast':
      case 'ranked_list':
        // Try to extract JSON from markdown code blocks or parse directly
        return this.extractStructuredOutput(content);

      case 'text':
      default:
        return content;
    }
  }

  /**
   * Extract structured output from AI response
   * Handles JSON blocks, markdown tables, and other formats
   */
  private extractStructuredOutput(content: string): any {
    // Try to find JSON block first
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/;
    const jsonMatch = content.match(jsonBlockRegex);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        this.logger.warn('Failed to parse JSON block, falling back to full content parse');
      }
    }

    // Try to parse the entire content as JSON
    try {
      return JSON.parse(content);
    } catch (e) {
      // If not valid JSON, return as structured text
      return {
        rawContent: content,
        sections: this.extractSections(content),
      };
    }
  }

  /**
   * Extract sections from markdown content
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const sectionRegex = /^#+\s+(.+)$/gm;
    const matches = [...content.matchAll(sectionRegex)];

    if (matches.length === 0) {
      return { main: content };
    }

    for (let i = 0; i < matches.length; i++) {
      const sectionTitle = matches[i][1];
      const startIndex = matches[i].index! + matches[i][0].length;
      const endIndex = matches[i + 1]?.index ?? content.length;
      const sectionContent = content.substring(startIndex, endIndex).trim();

      sections[sectionTitle.toLowerCase().replace(/\s+/g, '_')] = sectionContent;
    }

    return sections;
  }

  /**
   * Build context summary for logging
   */
  buildContextSummary(variables: Record<string, any>): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        summary[key] = this.createContentPreview(value, 100);
      } else if (Array.isArray(value)) {
        summary[key] = `[Array: ${value.length} items]`;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = '[Object]';
      } else {
        summary[key] = value;
      }
    }

    return summary;
  }
}
