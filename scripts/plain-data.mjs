// Untrusted input is plain data, as JSON.parse produces it. A Proxy or an accessor (a getter or a
// setter) is refused instead of run, so no code from the input runs while it is checked: such code
// can do far more than return two different values, for example change the built-ins the check
// relies on. Only own data properties count, so an inherited property never fills a hole or a
// missing field. The process itself must be trusted: code that ran in it before or during a check
// can change built-ins (Array.prototype, crypto) and with them any result, which no check inside the
// process can detect, so run a verifier in a fresh process (see fair-epoch.mjs).
import { types } from 'node:util'

// The own property descriptor of holder[key], or undefined when there is none; an accessor throws.
function dataSlot(holder, key, name) {
  const slot = Object.getOwnPropertyDescriptor(holder, key)
  if (slot !== undefined && !Object.hasOwn(slot, 'value')) throw new TypeError(`${name} must be a data property, not a getter or setter`)
  return slot
}

// The items of a plain array, read by index without calling its methods or its iterator. A Proxy,
// a hole or an accessor index throws. A real array's length is its own data property, so reading
// it runs no code.
export function plainItems(value, name) {
  if (types.isProxy(value)) throw new TypeError(`${name} must be a plain array, not a Proxy`)
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`)
  const length = value.length
  const items = []
  for (let i = 0; i < length; i++) {
    const slot = dataSlot(value, i, `${name}[${i}]`)
    if (slot === undefined) throw new TypeError(`${name}[${i}] is missing`)
    items.push(slot.value)
  }
  return items
}

// A snapshot of the record's own data fields named in keys, on a null-prototype object, so an
// absent field stays absent ('key' in fields is false). A Proxy, an array or an accessor throws, and
// so does a record whose prototype is not Object.prototype or null: that refuses class instances,
// objects from another realm and host objects such as a vm context's global, whose field lookups
// can run the context's code.
export function plainRecord(value, name, keys) {
  if (types.isProxy(value)) throw new TypeError(`${name} must be a plain object, not a Proxy`)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${name} must be a plain object`)
  const fields = Object.create(null)
  for (const key of keys) {
    const slot = dataSlot(value, key, `${name}.${key}`)
    if (slot !== undefined) fields[key] = slot.value
  }
  return fields
}
