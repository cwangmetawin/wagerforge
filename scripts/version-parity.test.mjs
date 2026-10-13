import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('plugin.json, marketplace.json and the newest CHANGELOG entry carry the same semver', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'))
  const market = JSON.parse(read('.claude-plugin/marketplace.json'))
  const entry = market.plugins.find((p) => p.name === plugin.name)
  assert.ok(entry, 'marketplace lists the plugin')
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/)
  assert.equal(entry.version, plugin.version)
  const newest = read('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+)\b/m)
  assert.ok(newest, 'CHANGELOG has a "## x.y.z" entry')
  assert.equal(newest[1], plugin.version)
})
