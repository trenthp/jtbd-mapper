// Pure layout for an entity card on the canvas. No React, no Konva — easy to
// test. A card shows its title and description by default and grows only when
// the user has added optional fields (see `EntityTypeDef.fields`) or tags.
import { typeDef } from '@/lib/entityTypes'

export const CARD_WIDTH = 200
/** Height of a card with nothing but a short title and description. */
export const CARD_MIN_HEIGHT = 120

export const CARD_PADDING = 10
const INNER_WIDTH = CARD_WIDTH - CARD_PADDING * 2

export const TITLE_FONT = { size: 13, lineHeight: 1.3, maxLines: 3 }
export const BODY_FONT = { size: 10, lineHeight: 1.4, maxLines: 4 }
export const FIELD_FONT = { size: 10, lineHeight: 1.4 }
export const TAG_FONT = { size: 9, lineHeight: 1.3 }

const GAP_TITLE_BODY = 4
const GAP_BODY_FIELDS = 8
const GAP_FIELD = 2
const GAP_TAGS = 8

/** The subset of an entity the card layout reads. */
export interface CardEntity {
  title?: string | null
  description?: string | null
  type?: string
  data?: unknown
  tags?: unknown
}

export interface CardField {
  key: string
  label: string
  value: string
  /** Lines the field occupies on the card (after truncation). */
  lines: number
  y: number
}

export interface CardLayout {
  width: number
  height: number
  title: { y: number; lines: number; height: number }
  description: { y: number; lines: number; height: number } | null
  fields: CardField[]
  tags: { y: number; text: string } | null
}

/** Estimated average glyph width as a fraction of the font size (Arial). */
function charsPerLine(fontSize: number, bold = false): number {
  return Math.max(1, Math.floor(INNER_WIDTH / (fontSize * (bold ? 0.56 : 0.52))))
}

/** Greedy word-wrap estimate of how many lines `text` needs at `perLine` chars. */
export function estimateLines(text: string, perLine: number): number {
  let lines = 0
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) { lines += 1; continue }
    let current = 0
    let n = 1
    for (const w of words) {
      const len = w.length
      if (current === 0) current = len
      else if (current + 1 + len <= perLine) current += 1 + len
      else { n += 1; current = len }
      // Very long words wrap by character
      while (current > perLine) { n += 1; current -= perLine }
    }
    lines += n
  }
  return Math.max(1, lines)
}

/** Stringify a `data` value for a one-line card field. */
export function formatFieldValue(v: unknown): string {
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string' && x.trim()).join(', ')
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function tagsText(tags: unknown): string {
  let list: string[] = []
  try {
    if (typeof tags === 'string') list = JSON.parse(tags) || []
    else if (Array.isArray(tags)) list = tags
  } catch { list = [] }
  list = list.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
  if (list.length === 0) return ''
  return `#${list.slice(0, 3).join(' #')}${list.length > 3 ? '…' : ''}`
}

/** Fields of the entity's type that the user has filled in, in display order. */
export function filledFields(entity: CardEntity): Array<{ key: string; label: string; kind: string; value: string }> {
  const data = entity.data && typeof entity.data === 'object' && !Array.isArray(entity.data)
    ? entity.data as Record<string, unknown>
    : {}
  const def = typeDef(entity.type ?? '')
  return def.fields
    .map(f => ({ key: f.key, label: f.label, kind: f.kind, value: formatFieldValue(data[f.key]) }))
    .filter(f => f.value !== '')
}

export function cardLayout(entity: CardEntity): CardLayout {
  const titleLineH = TITLE_FONT.size * TITLE_FONT.lineHeight
  const bodyLineH = BODY_FONT.size * BODY_FONT.lineHeight
  const fieldLineH = FIELD_FONT.size * FIELD_FONT.lineHeight

  let y = CARD_PADDING

  const titleLines = Math.min(TITLE_FONT.maxLines, estimateLines(entity.title?.trim() || ' ', charsPerLine(TITLE_FONT.size, true)))
  const title = { y, lines: titleLines, height: titleLines * titleLineH }
  y += title.height

  let description: CardLayout['description'] = null
  const desc = entity.description?.trim() ?? ''
  if (desc) {
    y += GAP_TITLE_BODY
    const lines = Math.min(BODY_FONT.maxLines, estimateLines(desc, charsPerLine(BODY_FONT.size)))
    description = { y, lines, height: lines * bodyLineH }
    y += description.height
  }

  const fields: CardField[] = []
  const filled = filledFields(entity)
  if (filled.length > 0) {
    y += GAP_BODY_FIELDS
    filled.forEach((f, i) => {
      if (i > 0) y += GAP_FIELD
      const maxLines = f.kind === 'textarea' ? 3 : f.kind === 'list' ? 2 : 1
      const lines = Math.min(maxLines, estimateLines(`${f.label}: ${f.value}`, charsPerLine(FIELD_FONT.size)))
      fields.push({ key: f.key, label: f.label, value: f.value, lines, y })
      y += lines * fieldLineH
    })
  }

  let tags: CardLayout['tags'] = null
  const text = tagsText(entity.tags)
  if (text) {
    y += GAP_TAGS
    tags = { y, text }
    y += TAG_FONT.size * TAG_FONT.lineHeight
  }

  y += CARD_PADDING
  return { width: CARD_WIDTH, height: Math.max(CARD_MIN_HEIGHT, Math.ceil(y)), title, description, fields, tags }
}

/** Card height for geometry (anchors, snapping, selection). */
export function entityHeight(entity: CardEntity): number {
  return cardLayout(entity).height
}
