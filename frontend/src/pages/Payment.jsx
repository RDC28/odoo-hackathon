import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { shortAddress } from '../utils'

const METHODS = [
  { id: 'razorpay', icon: 'payments', label: 'Razorpay', note: 'Test mode · Card, UPI, and more' },
  { id: 'cash', icon: 'payments', label: 'Cash Payment', note: 'Pay the driver directly' },
  { id: 'wallet', icon: 'account_balance_wallet', label: 'Wallet Payment', note: 'Pay from your in-app wallet' },
]

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TEvb2eePAYtJuU'

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded'))
    document.body.appendChild(script)
  })
}

export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const [b, setB] = useState(null)
  const [method, setMethod] = useState('razorpay')
  const [wallet, setWallet] = useState({ balance: 0 })
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)
  const [paying, setPaying] = useState(false)
  const [stars, setStars] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [reviewing, setReviewing] = useState(false)

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
    if (method === 'razorpay') {
      try {
        await loadRazorpayScript()
        const order = await api.createRazorpayOrder({ booking_id: b._id, amount: b.fare })
        const checkout = new window.Razorpay({
          key: order.key_id || RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Ascend',
          description: 'Ride fare',
          order_id: order.id,
          prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
          theme: { color: '#232323' },
          handler: async response => {
            try {
              await api.verifyRazorpayPayment(response)
              await api.payBooking(b._id, 'razorpay')
              refresh()
              setPaid(true)
            } catch (err) { setError(err.message) }
            setPaying(false)
          },
        })
        checkout.on('payment.failed', response => {
          setError(response.error?.description || 'Razorpay payment failed')
          setPaying(false)
        })
        checkout.open()
      } catch (err) {
        setError(err.message)
        setPaying(false)
      }
      return
    }
    try {
      await api.payBooking(b._id, method)
      refresh()
      setPaid(true)
    } catch (err) { setError(err.message) }
    setPaying(false)
  }

  async function submitReview() {
    if (!stars || reviewing) return
    setReviewing(true)
    try {
      await api.rateBooking(b._id, stars, feedback)
      navigate('/app/history')
    } catch (err) {
      setError(err.message)
      setReviewing(false)
    }
  }

  if (paid) {
    return (
      <div className="page reference-page">
        <a className="back-link" href={`/app/trips/${id}`}>← Trip Detail</a>
        <div className="card center-card">
          <h2> Payment successful</h2>
          <p>₹ {b.fare} paid via {method}. The trip has been added to your Ride History.</p>
          <h3>Rate your driver {b.driver ? b.driver.name : ''}</h3>
          <p className="muted">Choose a rating from 1 to 5 stars.</p>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map(s => (
              <button type="button" key={s} className={'star-btn' + (s <= stars ? ' on' : '')} aria-label={`${s} star${s === 1 ? '' : 's'}`} onClick={() => setStars(s)}><span className="material-symbols-rounded">{s <= stars ? 'star' : 'star_outline'}</span></button>
            ))}
          </div>
          <div className="field review-feedback-field"><label>Optional feedback</label><textarea value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={500} placeholder="What went well?" /></div>
          {error && <div className="error review-error">{error}</div>}
          <div className="review-actions"><button className="btn btn-primary" disabled={!stars || reviewing} onClick={submitReview}>{reviewing ? 'Submitting…' : 'Submit feedback'}</button><button className="btn btn-outline" onClick={() => navigate('/app/history')}>Skip</button></div>
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
          <span>{shortAddress(b.pickup_point.address)} → {shortAddress(b.drop_point.address)}</span>
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
          <p className="muted">Razorpay is running in Test Mode. No real money is charged.</p>
      </div>
    </div>
  )
}

