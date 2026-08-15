'use client';

import { useEffect } from 'react';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: next }) => {
      onChange(next.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[8rem] px-3 py-2 text-sm leading-relaxed outline-none [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_a]:text-primary [&_a]:underline',
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const applyLink = () => {
    if (!editor) {
      return;
    }
    const previous = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt(t('schemeOfWork.linkUrl'), previous ?? 'https://');
    if (next === null) {
      return;
    }
    const href = next.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap gap-0.5 border-b border-border p-1">
        <Toggle
          size="sm"
          pressed={editor?.isActive('bold') ?? false}
          disabled={!editor || disabled}
          onPressedChange={() => editor?.chain().focus().toggleBold().run()}
          aria-label={t('schemeOfWork.toolbar.bold')}
        >
          <Bold />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('italic') ?? false}
          disabled={!editor || disabled}
          onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
          aria-label={t('schemeOfWork.toolbar.italic')}
        >
          <Italic />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('heading', { level: 2 }) ?? false}
          disabled={!editor || disabled}
          onPressedChange={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          aria-label={t('schemeOfWork.toolbar.heading')}
        >
          <Heading2 />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('heading', { level: 3 }) ?? false}
          disabled={!editor || disabled}
          onPressedChange={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          aria-label={t('schemeOfWork.toolbar.subheading')}
        >
          <Heading3 />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('bulletList') ?? false}
          disabled={!editor || disabled}
          onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label={t('schemeOfWork.toolbar.bulletList')}
        >
          <List />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('orderedList') ?? false}
          disabled={!editor || disabled}
          onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label={t('schemeOfWork.toolbar.orderedList')}
        >
          <ListOrdered />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor?.isActive('link') ?? false}
          disabled={!editor || disabled}
          onPressedChange={applyLink}
          aria-label={t('schemeOfWork.toolbar.link')}
        >
          <LinkIcon />
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
