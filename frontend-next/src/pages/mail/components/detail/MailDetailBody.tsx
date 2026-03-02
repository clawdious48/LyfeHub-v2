import { useEffect, useRef } from 'react'

interface Props {
  body: string
}

export function MailDetailBody({ body }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument
        if (doc?.body) {
          iframe.style.height = doc.body.scrollHeight + 'px'
        }
      } catch {
        // cross-origin restriction, use fallback height
      }
    }

    iframe.addEventListener('load', adjustHeight)
    return () => iframe.removeEventListener('load', adjustHeight)
  }, [body])

  const styledBody = `
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #e0e0e0;
            background: transparent;
            margin: 0;
            padding: 0;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          a { color: #60a5fa; }
          img { max-width: 100%; height: auto; }
          blockquote {
            border-left: 3px solid #444;
            margin-left: 0;
            padding-left: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      srcDoc={styledBody}
      className="w-full min-h-[200px] border-0"
      title="Email content"
    />
  )
}
