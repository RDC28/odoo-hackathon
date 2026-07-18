import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

// Chat is intentionally ride-scoped: it is created by a booking and expires
// when the ride reaches drop-off.
export default function Chat() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [convs, setConvs] = useState([])
  const [activeId, setActiveId] = useState(params.get('c') || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loadConvs = () => api.getConversations(user).then(cs => {
    setConvs(cs)
    if (activeId && !cs.some(c => c._id === activeId)) setActiveId(null)
    if (!activeId && cs.length) {
      setActiveId(cs[0]._id)
      setParams({ c: cs[0]._id })
    }
  })

  useEffect(() => { loadConvs() }, [user._id])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    api.getMessages(activeId, user._id).then(setMessages).catch(err => setError(err.message))
  }, [activeId, user._id])

  useEffect(() => {
    const onStorage = () => {
      loadConvs()
      if (activeId) api.getMessages(activeId, user._id).then(setMessages).catch(() => {})
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [activeId, user._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <div className="chat-wrap">
      <aside className="conv-list">
        <div className="conv-group-title">Active ride chats</div>
        {convs.length === 0 && (
          <div className="muted conv-empty">Chat becomes available after you book a ride and closes at drop-off.</div>
        )}
        {convs.map(c => (
          <ConvItem
            key={c._id}
            c={c}
            active={activeId === c._id}
            onClick={() => { setActiveId(c._id); setParams({ c: c._id }) }}
          />
        ))}
      </aside>

      <section className="chat-main">
        {active ? (
          <>
            <div className="chat-header">
              <div>
                <strong>{active.title}</strong>
                <div className="muted">{active.subtitle}</div>
              </div>
              <span className="badge badge-blue">Active booking</span>
            </div>
            <div className="messages">
              {messages.length === 0 && <p className="muted center">No messages yet</p>}
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
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Message driver" />
              <button className="btn btn-primary" type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <span className="material-symbols-rounded">chat</span>
            <strong>No active ride chat</strong>
            <p className="muted">Book a ride to message the driver. The conversation ends automatically at drop-off.</p>
          </div>
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
