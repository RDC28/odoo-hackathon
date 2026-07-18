import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

// Discord-style chat: one company-wide #general channel, 1:1 DMs between
// colleagues, and per-trip ride chats — all on one message engine.
// Cross-tab "realtime": localStorage 'storage' events refresh open chats,
// so two logged-in tabs see each other's messages live.
export default function Chat() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(params.get('c') || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [showDirectory, setShowDirectory] = useState(false)
  const [colleagues, setColleagues] = useState([])
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loadConvs = () => api.getConversations(user).then(cs => {
    setConvs(cs)
    if (!activeId && cs.length) {
      setActiveId(cs[0]._id)
      setParams({ c: cs[0]._id })
    }
  })

  useEffect(() => { loadConvs() }, [user._id])

  useEffect(() => {
    if (!activeId) return
    api.getMessages(activeId, user._id).then(setMessages)
  }, [activeId])

  // pseudo-realtime: another tab writing to localStorage fires this
  useEffect(() => {
    const onStorage = () => {
      if (activeId) api.getMessages(activeId, user._id).then(setMessages)
      loadConvs()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [activeId])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const active = convs.find(c => c._id === activeId)

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || !activeId) return
    setError('')
    try {
      await api.sendMessage(activeId, user._id, text.trim())
      setText('')
      setMessages(await api.getMessages(activeId, user._id))
      loadConvs()
    } catch (err) { setError(err.message) }
  }

  async function openDirectory() {
    setColleagues(await api.listColleagues(user))
    setShowDirectory(true)
  }

  async function startDm(other) {
    const conv = await api.startDm(user, other._id)
    setShowDirectory(false)
    await loadConvs()
    setActiveId(conv._id)
    setParams({ c: conv._id })
  }

  const channels = convs.filter(c => c.type === 'global')
  const dms = convs.filter(c => c.type === 'dm')
  const rideChats = convs.filter(c => c.type === 'ride')

  return (
    <div className="chat-wrap">
      <aside className="conv-list">
        <div className="conv-group-title">Channels</div>
        {channels.map(c => (
          <ConvItem key={c._id} c={c} active={activeId === c._id} onClick={() => { setActiveId(c._id); setParams({ c: c._id }) }} />
        ))}

        <div className="conv-group-title">
          Direct Messages
          <button className="btn btn-outline btn-xs" onClick={openDirectory}>+ New</button>
        </div>
        {dms.length === 0 && <div className="muted conv-empty">No DMs yet</div>}
        {dms.map(c => (
          <ConvItem key={c._id} c={c} active={activeId === c._id} onClick={() => { setActiveId(c._id); setParams({ c: c._id }) }} />
        ))}

        <div className="conv-group-title">Ride Chats</div>
        {rideChats.length === 0 && <div className="muted conv-empty">No ride chats</div>}
        {rideChats.map(c => (
          <ConvItem key={c._id} c={c} active={activeId === c._id} onClick={() => { setActiveId(c._id); setParams({ c: c._id }) }} />
        ))}
      </aside>

      <section className="chat-main">
        {showDirectory ? (
          <div className="directory">
            <div className="chat-header">
              <strong>Start a DM</strong>
              <button className="btn btn-outline btn-sm" onClick={() => setShowDirectory(false)}>Close</button>
            </div>
            {colleagues.length === 0 && <p className="muted pad">No other colleagues in your company yet.</p>}
            {colleagues.map(c => (
              <button key={c._id} className="directory-item" onClick={() => startDm(c)}>
                <span className="avatar">{c.name[0]}</span>
                <span><strong>{c.name}</strong><br /><span className="muted">{c.department} · {c.email}</span></span>
              </button>
            ))}
          </div>
        ) : active ? (
          <>
            <div className="chat-header">
              <div>
                <strong>{active.title}</strong>
                <div className="muted">{active.subtitle}</div>
              </div>
              {active.closed && <span className="badge badge-red">closed</span>}
            </div>
            <div className="messages">
              {messages.length === 0 && <p className="muted center">No messages yet — say hi </p>}
              {messages.map(m => (
                <div key={m._id} className={'msg' + (m.sender_id === user._id ? ' mine' : '')}>
                  {m.sender_id !== user._id && <div className="msg-sender">{m.sender ? m.sender.name : '—'}</div>}
                  <div className="msg-bubble">{m.content}</div>
                  <div className="msg-meta">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {error && <div className="error pad">{error}</div>}
            <form className="chat-input" onSubmit={send}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={active.closed ? 'This chat is closed' : `Message ${active.title}`}
                disabled={active.closed}
              />
              <button className="btn btn-primary" disabled={active.closed} type="submit">Send</button>
            </form>
          </>
        ) : (
          <p className="muted center pad">Select a conversation</p>
        )}
      </section>
    </div>
  )
}

function ConvItem({ c, active, onClick }) {
  return (
    <button className={'conv-item' + (active ? ' active' : '')} onClick={onClick}>
      <div className="conv-title">{c.title}</div>
      <div className="conv-sub muted">{c.subtitle}</div>
    </button>
  )
}

