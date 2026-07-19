// Small formatting helpers shared across pages.
export function shortAddress(address) {
  return (address || '').split(',')[0]
}

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : ''
}

export function statusLabel(status) {
  return (status || '').replace(/_/g, ' ')
}

export function tripBadgeClass(status) {
  if (['booked', 'active'].includes(status)) return 'badge-blue'
  if (['started', 'in_progress'].includes(status)) return 'badge-amber'
  if (['completed', 'payment_completed'].includes(status)) return 'badge-green'
  if (status === 'payment_pending') return 'badge-amber'
  return 'badge-red'
}

export function accountBadgeClass(status) {
  if (status === 'active') return 'badge-green'
  if (status === 'pending_approval') return 'badge-amber'
  return 'badge-red'
}
