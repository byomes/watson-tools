import assert from 'node:assert/strict'
import test from 'node:test'
import { isUnknownNumber, selectThreads } from '../src/app/sms/(gated)/threadListLogic.ts'

const threads = [
  { id: 1, phone: '111', contact_name: 'Ada', member_id: null, is_group: false, unread: 0, draft_text: null, last_message_preview: 'hello' },
  { id: 2, phone: '222', contact_name: null, member_id: null, is_group: false, unread: 1, draft_text: null, last_message_preview: 'new' },
  { id: 3, phone: '333', contact_name: null, member_id: null, is_group: true, unread: 0, draft_text: 'draft', last_message_preview: null },
  { id: 4, phone: '444', contact_name: null, member_id: 8, is_group: false, unread: 0, draft_text: null, last_message_preview: 'known member' },
]
const name = (thread) => thread.contact_name || thread.phone
const ids = (filter, query = '', pins = []) => selectThreads(threads, filter, query, pins, name).map((thread) => thread.id)

test('filters unread, groups, and unknown numbers', () => {
  assert.deepEqual(ids('unread'), [2])
  assert.deepEqual(ids('groups'), [3])
  assert.deepEqual(ids('unknown'), [2])
  assert.equal(isUnknownNumber(threads[3]), false)
})

test('pins sort first while keeping unread and draft priority within each group', () => {
  assert.deepEqual(ids('all'), [2, 3, 1, 4])
  assert.deepEqual(ids('all', '', [4, 1]), [1, 4, 2, 3])
  assert.deepEqual(ids('all', 'hello', [4]), [1])
})
