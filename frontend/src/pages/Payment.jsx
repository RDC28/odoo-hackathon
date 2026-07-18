import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'

const METHODS = [
  { id: 'cash', icon: 'payments', label: 'Cash Payment', note: 'Pay the driver directly' },
  { id: 'card', icon: 'credit_card', label: 'Card Payment', note: 'Razorpay test mode (mock)' },
  { id: 'upi', icon: 'phone_iphone', label: 'UPI Payment', note: 'Razorpay test mode (mock)' },
  { id: 'wallet', icon: 'account_balance_wallet', label: 'Wallet Payment', note: 'Pay from your in-app wallet' },
]

export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [b, setB] = useState(null)
  const [method, setMethod] = useState('wallet')
  const [wallet, setWallet] = useState({ balance: 0 })
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)
  const [paying, setPaying] = useState(false)
  const [stars, setStars] = useState(0)

  useEffect(() => {
    api.getBooking(id).then(booking => {
      setB(booking)
      if (booking) api.walletFor(booking.rider_id).then(setWallet)
    })
  }, [id])

  if (!b) return <div className="page"><p className="muted">Loading…</p></div>

  async function pay() {
    if (paying) return
    setPaying(true)
    setError('')
    try {
      await api.payBooking(b._id, method)
      refresh()
      setPaid(true)
    } catch (err) { setError(err.message) }
    setPaying(false)
  }

  async function rateAndFinish(s) {
    setStars(s)
    await api.rateBooking(b._id, s)
    setTimeout(() => navigate('/app/history'), 600)
  }

  if (paid) {
    return (
      <div className="page reference-page">
        <a className="back-link" href={`/app/trips/${id}`}>← Trip Detail</a>
        <div className="card center-card">
          <h2> Payment successful</h2>
          <p>₹ {b.fare} paid via {method}. The trip has been added to your Ride History.</p>
          <h3>Rate your driver {b.driver ? b.driver.name : ''}</h3>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} className={'star-btn' + (s <= stars ? ' on' : '')} onClick={() => rateAndFinish(s)}></button>
            ))}
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/app/history')}>Skip</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page reference-page">
      <a className="back-link" href={`/app/trips/${id}`}>← Trip Detail</a>
      <h1>Payment</h1>
      <div className="card">
        <div className="fare-banner">
          <span>{b.pickup_point.address.split(',')[0]} → {b.drop_point.address.split(',')[0]}</span>
          <strong>₹ {b.fare}</strong>
        </div>
        <h3>Choose payment method</h3>
        {METHODS.map(m => (
          <label key={m.id} className={'method' + (method === m.id ? ' method-on' : '')}>
            <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />
            <div>
              <div><span className="material-symbols-rounded">{m.icon}</span> {m.label}</div>
              <div className="muted">{m.id === 'wallet' ? `${m.note} (balance: ₹ ${wallet.balance})` : m.note}</div>
            </div>
          </label>
        ))}
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary btn-block" onClick={pay} disabled={paying}>{paying ? 'Processing…' : `Pay ₹ ${b.fare}`}</button>
        <p className="muted">Prototype: card/UPI simulate a Razorpay Test Mode success instantly — no real money involved.</p>
      </div>
    </div>
  )
}

