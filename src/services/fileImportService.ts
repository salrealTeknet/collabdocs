/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JSONContent } from '@tiptap/react';
import { FileImportResult } from '../types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Megabytes
const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.txt'];

export const fileImportService = {
  /**
   * Validates file format, size, and readiness
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file provided for upload.' };
    }

    const fileName = file.name.toLowerCase();
    const hasValidExt = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      return {
        isValid: false,
        error: `Unsupported file format "${file.name}". Only .md and .txt files are supported.`,
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: 'The uploaded file is empty.',
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        isValid: false,
        error: `File size exceeds the 2 MB limit (Current: ${sizeMB} MB). Please choose a smaller document.`,
      };
    }

    return { isValid: true };
  },

  /**
   * Reads and parses file contents into structured Tiptap JSON
   */
  async parseFile(file: File): Promise<FileImportResult> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const text = await file.text();
    const rawClean = text.trim();
    if (!rawClean) {
      throw new Error('The uploaded file contains no readable text.');
    }

    const fileName = file.name;
    const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown');

    // Extract default document title from file name without extension
    const baseTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const title = baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1);

    const content = isMarkdown
      ? this.markdownToTiptap(text)
      : this.plainTextToTiptap(text);

    return {
      title,
      content,
      rawText: text,
      fileType: isMarkdown ? 'markdown' : 'text',
    };
  },

  /**
   * Converts plain text paragraphs separated by double newlines into Tiptap JSON
   */
  plainTextToTiptap(text: string): JSONContent {
    const paragraphs = text
      .split(/\r?\n\r?\n/)
      .map(p => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      };
    }

    const docContent: JSONContent[] = paragraphs.map(p => {
      // Split single line breaks within a paragraph
      const lines = p.split(/\r?\n/);
      const textNodes: JSONContent[] = [];

      lines.forEach((line, idx) => {
        if (line) {
          textNodes.push({ type: 'text', text: line });
        }
        if (idx < lines.length - 1) {
          textNodes.push({ type: 'hardBreak' });
        }
      });

      return {
        type: 'paragraph',
        content: textNodes.length > 0 ? textNodes : [{ type: 'text', text: p }],
      };
    });

    return {
      type: 'doc',
      content: docContent,
    };
  },

  /**
   * Lightweight, robust parser that transforms Markdown into Tiptap JSONB
   */
  markdownToTiptap(markdown: string): JSONContent {
    const lines = markdown.split(/\r?\n/);
    const nodes: JSONContent[] = [];

    let currentBulletList: JSONContent[] | null = null;
    let currentOrderedList: JSONContent[] | null = null;

    const flushLists = () => {
      if (currentBulletList) {
        nodes.push({
          type: 'bulletList',
          content: currentBulletList,
        });
        currentBulletList = null;
      }
      if (currentOrderedList) {
        nodes.push({
          type: 'orderedList',
          content: currentOrderedList,
        });
        currentOrderedList = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushLists();
        continue;
      }

      // Check Heading 1: # Title
      if (trimmed.startsWith('# ')) {
        flushLists();
        const text = trimmed.substring(2).trim();
        nodes.push({
          type: 'heading',
          attrs: { level: 1 },
          content: this.parseInlineMarks(text),
        });
        continue;
      }

      // Check Heading 2: ## Subtitle
      if (trimmed.startsWith('## ')) {
        flushLists();
        const text = trimmed.substring(3).trim();
        nodes.push({
          type: 'heading',
          attrs: { level: 2 },
          content: this.parseInlineMarks(text),
        });
        continue;
      }

      // Check Heading 3: ### Section
      if (trimmed.startsWith('### ')) {
        flushLists();
        const text = trimmed.substring(4).trim();
        nodes.push({
          type: 'heading',
          attrs: { level: 3 },
          content: this.parseInlineMarks(text),
        });
        continue;
      }

      // Check Bullet list item: - item or * item
      const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
      if (bulletMatch) {
        if (currentOrderedList) {
          nodes.push({ type: 'orderedList', content: currentOrderedList });
          currentOrderedList = null;
        }
        if (!currentBulletList) {
          currentBulletList = [];
        }
        currentBulletList.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: this.parseInlineMarks(bulletMatch[1]),
            },
          ],
        });
        continue;
      }

      // Check Ordered list item: 1. item
      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        if (currentBulletList) {
          nodes.push({ type: 'bulletList', content: currentBulletList });
          currentBulletList = null;
        }
        if (!currentOrderedList) {
          currentOrderedList = [];
        }
        currentOrderedList.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: this.parseInlineMarks(orderedMatch[1]),
            },
          ],
        });
        continue;
      }

      // Standard paragraph
      flushLists();
      nodes.push({
        type: 'paragraph',
        content: this.parseInlineMarks(trimmed),
      });
    }

    flushLists();

    if (nodes.length === 0) {
      nodes.push({ type: 'paragraph' });
    }

    return {
      type: 'doc',
      content: nodes,
    };
  },

  /**
   * Helper that parses inline bold (**bold**), italic (*italic*), underline, and plain text
   */
  parseInlineMarks(text: string): JSONContent[] {
    if (!text) return [];

    // Simple regex-based inline tokenizer for bold, italic
    // We match tokens in sequence
    const tokens: JSONContent[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        tokens.push({
          type: 'text',
          marks: [{ type: 'bold' }],
          text: boldMatch[2],
        });
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        tokens.push({
          type: 'text',
          marks: [{ type: 'italic' }],
          text: italicMatch[2],
        });
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // Plain text up to next special char (* or _)
      const nextSpecial = remaining.search(/[*_]/);
      if (nextSpecial === -1) {
        tokens.push({ type: 'text', text: remaining });
        remaining = '';
      } else if (nextSpecial === 0) {
        // Stray asterisk/underscore
        tokens.push({ type: 'text', text: remaining[0] });
        remaining = remaining.substring(1);
      } else {
        tokens.push({ type: 'text', text: remaining.substring(0, nextSpecial) });
        remaining = remaining.substring(nextSpecial);
      }
    }

    return tokens.length > 0 ? tokens : [{ type: 'text', text }];
  },
};
