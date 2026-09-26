import { describe, it, expect } from 'vitest'
import { cardLayout, entityHeight, estimateLines, filledFields, CARD_MIN_HEIGHT, CARD_WIDTH } from './cardLayout'

describe('estimateLines', () => {
  it('counts one line for short text and wraps on words', () => {
    expect(estimateLines('hello', 20)).toBe(1)
    expect(estimateLines('one two three four five', 10)).toBe(3) // "one two" / "three four" / "five"
  })
  it('respects explicit newlines and wraps very long words', () => {
    expect(estimateLines('a\nb\nc', 20)).toBe(3)
    expect(estimateLines('x'.repeat(45), 20)).toBe(3)
  })
})

describe('cardLayout', () => {
  it('a bare sticky is title only at the minimum height', () => {
    const l = cardLayout({ title: 'Buy milk', type: 'note', data: {} })
    expect(l.width).toBe(CARD_WIDTH)
    expect(l.height).toBe(CARD_MIN_HEIGHT)
    expect(l.title.lines).toBe(1)
    expect(l.description).toBeNull()
    expect(l.fields).toEqual([])
    expect(l.tags).toBeNull()
  })

  it('shows a description below the title', () => {
    const l = cardLayout({ title: 'T', description: 'Some detail', type: 'note' })
    expect(l.description).not.toBeNull()
    expect(l.description!.y).toBeGreaterThan(l.title.y + l.title.height)
    expect(l.height).toBe(CARD_MIN_HEIGHT)
  })

  it('unfilled type fields are not shown; filled ones are, in type order', () => {
    expect(filledFields({ type: 'user_job', data: {} })).toEqual([])
    expect(filledFields({ type: 'user_job', data: { priority: '', painPoints: [] } })).toEqual([])
    const l = cardLayout({
      title: 'Find a plumber',
      type: 'user_job',
      data: { priority: 'high', jobStatement: 'When a pipe bursts, I want help fast', painPoints: ['slow', 'pricey'] },
    })
    expect(l.fields.map(f => f.key)).toEqual(['jobStatement', 'priority', 'painPoints'])
    expect(l.fields[2].value).toBe('slow, pricey')
    for (let i = 1; i < l.fields.length; i++) expect(l.fields[i].y).toBeGreaterThan(l.fields[i - 1].y)
  })

  it('grows past the minimum height as content is added, and never shrinks below it', () => {
    const base = entityHeight({ title: 'T', type: 'user_job', data: {} })
    expect(base).toBe(CARD_MIN_HEIGHT)
    const withFields = entityHeight({
      title: 'A fairly long title that will wrap onto a second line',
      description: 'A description that is long enough to need a couple of lines of text on the card.',
      type: 'user_job',
      data: { jobStatement: 'When I am late, I want a taxi now, so I can make the meeting', priority: 'high', frequency: 'daily', userSegment: 'Commuters' },
      tags: ['a', 'b'],
    })
    expect(withFields).toBeGreaterThan(CARD_MIN_HEIGHT)
  })

  it('caps long text with a maximum number of lines', () => {
    const l = cardLayout({ title: 'word '.repeat(80), description: 'word '.repeat(200), type: 'note' })
    expect(l.title.lines).toBe(3)
    expect(l.description!.lines).toBe(4)
  })

  it('tags render on one trailing line, at most three shown', () => {
    const l = cardLayout({ title: 'T', type: 'note', tags: JSON.stringify(['a', 'b', 'c', 'd']) })
    expect(l.tags!.text).toBe('#a #b #c…')
    expect(cardLayout({ title: 'T', tags: 'not json' }).tags).toBeNull()
  })

  it('an unknown type has no fields', () => {
    expect(cardLayout({ title: 'T', type: 'mystery', data: { foo: 'bar' } }).fields).toEqual([])
  })
})
