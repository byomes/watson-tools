import assert from 'node:assert/strict'
import test from 'node:test'
import { smsSegments, templateQuery, schedulePreset } from '../src/app/sms/(gated)/composerExtras.ts'

test('GSM-7 single and concatenated limits count extended characters twice', () => {
  assert.deepEqual(smsSegments('A'.repeat(160)), { encoding: 'GSM-7', characters: 160, segments: 1 })
  assert.equal(smsSegments('A'.repeat(161)).segments, 2)
  assert.equal(smsSegments('A'.repeat(306)).segments, 2)
  assert.equal(smsSegments('A'.repeat(307)).segments, 3)
  assert.deepEqual(smsSegments('^'), { encoding: 'GSM-7', characters: 2, segments: 1 })
})

test('UCS-2 limits use UTF-16 code units', () => {
  assert.deepEqual(smsSegments('😀'), { encoding: 'UCS-2', characters: 2, segments: 1 })
  assert.equal(smsSegments('é'.repeat(69) + '😀').segments, 2)
  assert.equal(smsSegments('漢'.repeat(70)).segments, 1)
  assert.equal(smsSegments('漢'.repeat(135)).segments, 3)
})

test('template picker triggers only for a leading slash and filters by text after it', () => {
  assert.equal(templateQuery('/'), '')
  assert.equal(templateQuery('/Follow Up'), 'follow up')
  assert.equal(templateQuery('hello /'), null)
  assert.equal(templateQuery(' /'), null)
  assert.equal(templateQuery('/hello\nworld'), null)
})

test('schedule presets keep approval as a separate action and roll past tonight', () => {
  assert.equal(schedulePreset('tonight', new Date(2026, 10, 11, 18)), '2026-11-11T19:00')
  assert.equal(schedulePreset('tonight', new Date(2026, 10, 11, 20)), '2026-11-12T19:00')
  assert.equal(schedulePreset('tomorrow', new Date(2026, 10, 11, 20)), '2026-11-12T08:00')
})
