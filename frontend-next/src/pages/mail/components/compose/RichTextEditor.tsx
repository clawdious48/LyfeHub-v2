import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code, Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import { useImperativeHandle, forwardRef } from 'react'

export interface RichTextEditorRef {
  getHTML: () => string
}

interface Props {
  initialContent?: string
}

export const RichTextEditor = forwardRef<RichTextEditorRef, Props>(
  function RichTextEditor({ initialContent = '' }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: 'prose prose-sm prose-invert max-w-none p-3 min-h-[200px] focus:outline-none text-text-primary',
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? '',
    }))

    if (!editor) return null

    const toolbarButtons = [
      { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
      { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
      { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), title: 'Strikethrough' },
      { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), title: 'Code' },
      { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Bullet list' },
      { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Numbered list' },
      { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: 'Quote' },
      {
        icon: LinkIcon,
        action: () => {
          const url = window.prompt('Enter URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        },
        active: editor.isActive('link'),
        title: 'Link',
      },
    ]

    return (
      <div className="border border-border rounded-md overflow-hidden">
        <div className="flex items-center gap-0.5 p-1 border-b border-border bg-bg-surface">
          {toolbarButtons.map(({ icon: Icon, action, active, title }) => (
            <Button
              key={title}
              variant="ghost"
              size="icon"
              className={`size-7 ${active ? 'bg-bg-hover text-accent' : ''}`}
              onClick={action}
              title={title}
              type="button"
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    )
  }
)
