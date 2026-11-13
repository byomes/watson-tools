import assert from 'node:assert/strict'
import test from 'node:test'
import { draftKey, readDraft, slashChoices, slashQuery, writeDraft } from '../src/app/watson/composerLogic.ts'

test('slash commands only open at the start and filter skills and actions', () => {
  const skills = [{ id: 'calendar', name: 'Calendar', description: 'Plan events' }, { id: 'notes', name: 'Notes', description: 'Save notes' }]
  assert.equal(slashQuery('/'), '')
  assert.equal(slashQuery('hello /'), null)
  assert.equal(slashQuery('/calendar\nother'), null)
  assert.equal(slashQuery('/bible_lookup John 3:16'), null)
  assert.deepEqual(slashChoices('/bible', [{ id: 'bible_lookup', name: 'Bible Lookup', description: '' }]).map(item => item.id), ['bible_lookup'])
  assert.deepEqual(slashChoices('/cal', skills).map(item => item.id), ['calendar'])
  assert.deepEqual(slashChoices('/web', skills).map(item => item.id), ['web'])
})

test('drafts are stored separately by chat and removed when sent', () => {
  const data = new Map()
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  writeDraft(storage, 'one', 'First')
  writeDraft(storage, 'two', 'Second')
  assert.equal(readDraft(storage, 'one'), 'First')
  assert.equal(readDraft(storage, 'two'), 'Second')
  writeDraft(storage, 'one', '')
  assert.equal(readDraft(storage, 'one'), '')
  assert.equal(readDraft(storage, 'two'), 'Second')
  assert.equal(draftKey('two'), 'watson-draft-two')
})
