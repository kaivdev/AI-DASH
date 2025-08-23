import React from 'react'
import {Drawer} from 'antd'
import {useMarkdownEditor, MarkdownEditorView} from '@gravity-ui/markdown-editor'
import MarkdownIt from 'markdown-it'
// Подсветка синтаксиса в превью
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
import tsLang from 'highlight.js/lib/languages/typescript'
import jsLang from 'highlight.js/lib/languages/javascript'
import pyLang from 'highlight.js/lib/languages/python'
import cLang from 'highlight.js/lib/languages/c'
import cppLang from 'highlight.js/lib/languages/cpp'
import jsonLang from 'highlight.js/lib/languages/json'
import bashLang from 'highlight.js/lib/languages/bash'
import goLang from 'highlight.js/lib/languages/go'
import javaLang from 'highlight.js/lib/languages/java'
import xmlLang from 'highlight.js/lib/languages/xml' // html/xml
import cssLang from 'highlight.js/lib/languages/css'
import type { Note } from '@/types/core'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

type Mode = 'view' | 'edit' | 'create'

export interface NotesDrawerProps {
  open: boolean
  onClose: () => void
  note?: Note | null
  mode: Mode
  onCreate: (payload: { title?: string; content: string; date: string; tags: string[]; shared?: boolean }) => Promise<void> | void
  onUpdate: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'shared' | 'tags'>>) => Promise<void> | void
}

export function NotesDrawer({ open, onClose, note, mode, onCreate, onUpdate }: NotesDrawerProps) {
  const isCreate = mode === 'create'
  const initialEditing = true
  const [isEditing, setIsEditing] = React.useState<boolean>(true)
  const [title, setTitle] = React.useState<string>(note?.title || '')
  const [shared, setShared] = React.useState<boolean>(!!note?.shared)
  // Регистрация языков для highlight.js (однократно)
  React.useEffect(() => {
    try {
  // Игнорировать предупреждения про неэкранированный HTML внутри <code>
  hljs.configure({ ignoreUnescapedHTML: true as any })
      hljs.registerLanguage('typescript', tsLang)
      hljs.registerLanguage('tsx', tsLang)
      hljs.registerLanguage('javascript', jsLang)
      hljs.registerLanguage('js', jsLang)
      hljs.registerLanguage('python', pyLang)
      hljs.registerLanguage('py', pyLang)
      hljs.registerLanguage('c', cLang)
      hljs.registerLanguage('cpp', cppLang)
      hljs.registerLanguage('json', jsonLang)
      hljs.registerLanguage('bash', bashLang)
      hljs.registerLanguage('sh', bashLang)
      hljs.registerLanguage('go', goLang)
      hljs.registerLanguage('java', javaLang)
      hljs.registerLanguage('html', xmlLang)
      hljs.registerLanguage('xml', xmlLang)
      hljs.registerLanguage('css', cssLang)
    } catch {}
    // empty deps -> регистрация один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // MarkdownIt c подсветкой для превью
  const mdPreview = React.useMemo<MarkdownIt>(() => {
    const md: MarkdownIt = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: true,
      highlight: (str: string, lang?: string): string => {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return `<pre><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
          }
        } catch {}
        // Fallback — безопасный вывод
        return `<pre><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`
      },
    })
    return md
  }, [])

  // Создаем/переинициализируем экземпляр редактора с нужным контентом при смене заметки/открытии
  const editor = useMarkdownEditor(
    {
      md: { html: false, linkify: true, breaks: true },
      initial: {
        markup: note?.content || '',
        mode: 'wysiwyg',
        toolbarVisible: true,
      },
      // Превью с подсветкой синтаксиса; доступно из настроек редактора или по хоткею
      markupConfig: {
        renderPreview: ({ getValue }) => (
          <div className="prose max-w-none">
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: mdPreview.render(getValue()) }} />
          </div>
        ),
      },
      experimental: {
        preserveEmptyRows: true,
        preserveMarkupFormatting: true,
      },
    },
    [note?.id, open]
  )
  const md = React.useMemo(() => new MarkdownIt({ html: false, linkify: true, breaks: true }), [])
  const [localContent, setLocalContent] = React.useState<string>(note?.content || '')

  React.useEffect(() => {
    if (!open) return
    const value = note?.content || ''
    setTitle(note?.title || '')
    setShared(!!note?.shared)
    setLocalContent(value)
    setIsEditing(true)
    // На всякий случай синхронизируем текущее содержимое (если id тот же)
    try {
      editor.replace(value)
    } catch (err) {
      // ignore: editor будет создан заново по deps
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {}
  }, [open, note?.id, note?.content])
  // Внимание: не применяем highlight.js внутри WYSIWYG, чтобы не ломать редактирование

  const handleSubmit = async () => {
    const content = (editor.getValue?.() || '').toString()
    if (isCreate) {
      const date = new Date().toISOString().slice(0,10)
      await onCreate({ title: title || undefined, content, date, tags: [], shared })
      onClose()
      return
    }
    if (note) {
      await onUpdate(note.id, { title: title || undefined, content, shared })
      setLocalContent(content)
    }
  }

  const header = isCreate ? 'Новая заметка' : 'Заметка'

  return (
    <Drawer open={open} onClose={onClose} placement="right" width="50vw" title={header} destroyOnClose>
      <div className="flex flex-col h-full gap-3">
        <div className="space-y-2">
          <input
            className="w-full h-9 px-3 rounded border bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Заголовок (необязательно)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={false}
          />
        </div>
        <div className="flex-1 min-h-0 border rounded overflow-hidden" dir="ltr">
          <MarkdownEditorView
            key={`${note?.id || 'new'}-edit-${open ? 'open' : 'closed'}`}
            stickyToolbar
            autofocus
            editor={editor}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={shared} onCheckedChange={setShared} />
            <span>Поделиться со всеми</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
            {isCreate ? (
              <Button onClick={handleSubmit}>Добавить</Button>
            ) : (
              <Button onClick={handleSubmit}>Сохранить</Button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
