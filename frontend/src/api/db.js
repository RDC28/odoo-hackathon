// Local "database" — a stand-in for MongoDB while the Flask backend doesn't exist yet.
// Documents are shaped exactly like docs/data-model.md so the later swap is mechanical:
// each api.js function becomes a fetch() to the matching Flask endpoint.

const KEY = 'carpool_db_v1'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function col(name) {
  return {
    all() { return load()[name] || [] },
    find(pred) { return this.all().filter(pred) },
    findOne(pred) { return this.all().find(pred) || null },
    get(id) { return this.all().find(d => d._id === id) || null },
    insert(doc) {
      const db = load()
      const d = { _id: crypto.randomUUID(), created_at: new Date().toISOString(), ...doc }
      db[name] = [...(db[name] || []), d]
      save(db)
      return d
    },
    update(id, patch) {
      const db = load()
      db[name] = (db[name] || []).map(d => (d._id === id ? { ...d, ...patch } : d))
      save(db)
      return this.get(id)
    },
    remove(id) {
      const db = load()
      db[name] = (db[name] || []).filter(d => d._id !== id)
      save(db)
    },
  }
}

export function resetDb() {
  localStorage.removeItem(KEY)
}
