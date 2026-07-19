import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/api'
import { formatDateTime } from '../utils'

export default function NotificationCenter({ userId }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  const load = () => api.myNotifications(userId).then(setItems)

  useEffect(() => {
    load()
    const refresh = () => load()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [userId])

  useEffect(() => {
    if (!open) return undefined
    const close = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const unread = items.filter(item => !item.read).length

  async function openNotification(item) {
    if (!item.read) await api.markNotificationRead(item._id)
    setOpen(false)
    await load()
    if (item.link) navigate(item.link)
  }

  async function markAllRead() {
    await api.markAllNotificationsRead(userId)
    load()
  }

  return (
    <div className="notification-center">
      <button className="notification-trigger" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className="material-symbols-rounded">notifications</span>
        {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-head"><div><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All caught up'}</span></div><button className="notification-read-all" onClick={markAllRead} disabled={!unread}>Mark all read</button></div>
          <div className="notification-list">
            {items.length === 0 && <div className="notification-empty"><span className="material-symbols-rounded">notifications_none</span><p>No notifications yet.</p></div>}
            {items.map(item => (
              <button key={item._id} className={'notification-item' + (!item.read ? ' unread' : '')} onClick={() => openNotification(item)}>
                <span className="notification-item-icon"><span className="material-symbols-rounded">{item.icon || 'notifications'}</span></span>
                <span className="notification-item-copy"><strong>{item.title}</strong><span>{item.body}</span><small>{formatDateTime(item.created_at)}</small></span>
                {!item.read && <span className="notification-dot" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
