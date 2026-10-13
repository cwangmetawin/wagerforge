import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { plainItems, plainRecord } from './plain-data.mjs'

// A handler that counts every trap the engine looks up: 0 means no trap ran.
function spy() {
  const calls = { count: 0 }
  return { calls, handler: new Proxy({}, { get: () => { calls.count++; return undefined } }) }
}

test('plainItems copies a plain array by index, ignoring its own methods and iterator', () => {
  const list = [1, 'a', null]
  list[Symbol.iterator] = function* () {}
  list.map = () => []
  Object.defineProperty(list, 1, { enumerable: false, value: 'a' })
  assert.deepEqual(plainItems(list, 'list'), [1, 'a', null])
  assert.deepEqual(plainItems([], 'list'), [])
})

test('plainItems refuses a non-array, a Proxy (even a revoked one), a hole and an accessor, running none of them', () => {
  assert.throws(() => plainItems({ length: 1, 0: 1 }, 'list'), /list must be an array/)
  const { calls, handler } = spy()
  assert.throws(() => plainItems(new Proxy([1], handler), 'list'), /list must be a plain array, not a Proxy/)
  const { proxy, revoke } = Proxy.revocable([1], {})
  revoke()
  assert.throws(() => plainItems(proxy, 'list'), /not a Proxy/)
  const had = Object.hasOwn(Array.prototype, 0)
  Array.prototype[0] = 'inherited'
  try {
    assert.throws(() => plainItems(new Array(1), 'list'), /list\[0\] is missing/)
  } finally {
    if (!had) delete Array.prototype[0]
  }
  let reads = 0
  const getter = [0]
  Object.defineProperty(getter, 0, { enumerable: true, get: () => ++reads })
  assert.throws(() => plainItems(getter, 'list'), /list\[0\] must be a data property, not a getter or setter/)
  assert.deepEqual([calls.count, reads], [0, 0])
})

test('plainRecord snapshots own data fields only: an absent field stays absent and an inherited one never counts', () => {
  const record = { present: 2, blank: undefined }
  Object.defineProperty(record, 'hidden', { enumerable: false, value: 3 })
  // Object.prototype gets a field as a merge of untrusted JSON could add it; finally removes it.
  let fields
  try {
    Object.prototype.inherited = 1
    fields = plainRecord(record, 'r', ['present', 'blank', 'hidden', 'inherited', 'absent'])
  } finally {
    delete Object.prototype.inherited
  }
  assert.equal(Object.hasOwn(Object.prototype, 'inherited'), false)
  assert.equal(Object.getPrototypeOf(fields), null)
  assert.deepEqual(Object.keys(fields), ['present', 'blank', 'hidden'])
  assert.deepEqual([fields.present, fields.blank, fields.hidden], [2, undefined, 3])
  assert.equal('inherited' in fields, false)
})

test('plainRecord refuses a non-object, an array, a Proxy and an accessor, running none of them', () => {
  for (const bad of [null, undefined, 1, 'x', () => {}, [1]]) assert.throws(() => plainRecord(bad, 'r', ['a']), /r must be an object/)
  const { calls, handler } = spy()
  assert.throws(() => plainRecord(new Proxy({ a: 1 }, handler), 'r', ['a']), /r must be a plain object, not a Proxy/)
  let reads = 0
  const record = {}
  Object.defineProperty(record, 'a', { enumerable: true, get: () => ++reads })
  assert.throws(() => plainRecord(record, 'r', ['a']), /r\.a must be a data property, not a getter or setter/)
  const setterOnly = {}
  Object.defineProperty(setterOnly, 'a', { set() {} })
  assert.throws(() => plainRecord(setterOnly, 'r', ['a']), /getter or setter/)
  assert.deepEqual([calls.count, reads], [0, 0])
})

// A vm context's global object is neither a Proxy nor an array, but reading its fields asks the
// context's sandbox, so a Proxy sandbox would run code in the middle of the check.
test('plainRecord refuses a record whose prototype is not Object.prototype or null, without running it', () => {
  let traps = 0
  const sandbox = new Proxy({ a: 1 }, { getOwnPropertyDescriptor: (target, key) => { traps++; return Reflect.getOwnPropertyDescriptor(target, key) } })
  const contextGlobal = vm.runInContext('this', vm.createContext(sandbox))
  assert.throws(() => plainRecord(contextGlobal, 'r', ['a']), /r must be a plain object/)
  assert.throws(() => plainRecord(vm.runInNewContext('({ a: 1 })'), 'r', ['a']), /r must be a plain object/)
  assert.throws(() => plainRecord(new (class Row { constructor() { this.a = 1 } })(), 'r', ['a']), /r must be a plain object/)
  assert.equal(traps, 0)
  assert.equal(plainRecord(JSON.parse('{"a":1}'), 'r', ['a']).a, 1)
  assert.equal(plainRecord(Object.assign(Object.create(null), { a: 1 }), 'r', ['a']).a, 1)
})

