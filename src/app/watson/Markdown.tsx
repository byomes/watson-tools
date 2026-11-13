import type { ReactNode } from 'react'

function inline(source: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(`[^`]+`|\[([^\]]+)\]\(([^)]+)\)|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g
  let start = 0
  for (const match of source.matchAll(pattern)) {
    const index = match.index
    if (index > start) parts.push(source.slice(start, index))
    const value = match[0]
    const key = `${index}-${value}`
    if (value.startsWith('`')) parts.push(<code key={key} className="rounded bg-slate-200 px-1 dark:bg-slate-700">{value.slice(1, -1)}</code>)
    else if (value.startsWith('[')) {
      const href = match[3].trim()
      if (/^(https?:\/\/|mailto:)/i.test(href)) parts.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline dark:text-blue-300">{match[2]}</a>)
      else parts.push(value)
    } else if (value.startsWith('**')) parts.push(<strong key={key}>{value.slice(2, -2)}</strong>)
    else parts.push(<em key={key}>{value.slice(1, -1)}</em>)
    start = index + value.length
  }
  if (start < source.length) parts.push(source.slice(start))
  return parts
}

type ListLine = { indent: number; ordered: boolean; content: string }

function listLine(line: string): ListLine | null {
  const match = /^(\s*)([-*+] |\d+\. )(.*)$/.exec(line)
  if (!match) return null
  return { indent: match[1].length, ordered: /\d/.test(match[2][0]), content: match[3] }
}

function list(lines: string[], from: number, indent: number, ordered: boolean): [ReactNode, number] {
  const children: ReactNode[] = []
  let index = from
  while (index < lines.length) {
    const item = listLine(lines[index])
    if (!item || item.indent < indent || item.indent === indent && item.ordered !== ordered) break
    if (item.indent > indent) break
    index++
    const nested: ReactNode[] = []
    while (index < lines.length) {
      const next = listLine(lines[index])
      if (!next || next.indent <= indent) break
      const [child, end] = list(lines, index, next.indent, next.ordered)
      nested.push(child)
      index = end
    }
    children.push(<li key={index}>{inline(item.content)}{nested}</li>)
  }
  const className = 'ml-5 my-1 list-outside space-y-1'
  return ordered ? [<ol key={from} className={`${className} list-decimal`}>{children}</ol>, index]
    : [<ul key={from} className={`${className} list-disc`}>{children}</ul>, index]
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }
    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3).trim()
      const code: string[] = []
      const start = index++
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(<pre key={start} className="my-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800"><code data-language={language}>{code.join('\n')}</code></pre>)
      continue
    }
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { blocks.push(<hr key={index++} className="my-4 border-slate-300 dark:border-slate-700" />); continue }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const size = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-base', 'text-base'][heading[1].length - 1]
      blocks.push(<div key={index++} role="heading" aria-level={heading[1].length} className={`mb-2 mt-4 font-semibold ${size}`}>{inline(heading[2])}</div>)
      continue
    }
    const item = listLine(line)
    if (item) {
      const [node, end] = list(lines, index, item.indent, item.ordered)
      blocks.push(node)
      index = end
      continue
    }
    const paragraph: string[] = [line]
    const start = index++
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s|^\s*```|^\s*(?:---+|\*\*\*+|___+)\s*$/.test(lines[index]) && !listLine(lines[index])) paragraph.push(lines[index++])
    blocks.push(<p key={start} className="my-2 whitespace-pre-wrap leading-7">{inline(paragraph.join('\n'))}</p>)
  }
  return <div className="min-w-0 break-words">{blocks}</div>
}
