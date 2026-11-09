/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Quote,
  Code,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  isReadOnly: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, isReadOnly }) => {
  if (!editor) return null;

  const btnClass = (isActive: boolean, isDisabled?: boolean) => `
    p-1.5 rounded-md text-xs transition-colors flex items-center justify-center
    ${isDisabled ? 'opacity-30 cursor-not-allowed text-neutral-400' : ''}
    ${
      isActive
        ? 'bg-neutral-900 text-white font-medium shadow-xs'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
    }
  `;

  return (
    <div className="bg-white border-b border-neutral-200 px-4 py-1.5 flex flex-wrap items-center gap-1 sticky top-14 z-30 shadow-xs">
      {/* History Group */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={isReadOnly || !editor.can().undo()}
          className={btnClass(false, isReadOnly || !editor.can().undo())}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={isReadOnly || !editor.can().redo()}
          className={btnClass(false, isReadOnly || !editor.can().redo())}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Heading / Hierarchy Group */}
      <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('paragraph'), isReadOnly)}
          title="Normal Paragraph"
        >
          <Pilcrow className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('heading', { level: 1 }), isReadOnly)}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('heading', { level: 2 }), isReadOnly)}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
      </div>

      {/* Formatting Marks Group */}
      <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('bold'), isReadOnly)}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('italic'), isReadOnly)}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('underline'), isReadOnly)}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Lists Group */}
      <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('bulletList'), isReadOnly)}
          title="Bulleted List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('orderedList'), isReadOnly)}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('blockquote'), isReadOnly)}
          title="Quote Block"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive('codeBlock'), isReadOnly)}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Alignment Group */}
      <div className="flex items-center gap-0.5 px-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive({ textAlign: 'left' }), isReadOnly)}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive({ textAlign: 'center' }), isReadOnly)}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          disabled={isReadOnly}
          className={btnClass(editor.isActive({ textAlign: 'right' }), isReadOnly)}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
