import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils'

export default function Wallet() {
  const { user, refresh } = useAuth()
  const [w, setW] = useState({ balance: 0, transactions: [] })
  const [amount, setAmount] = useState(500)
  const [method, setMethod] = useState('upi')

  const load = () => api.walletFor(user._id).then(setW)
  useEffect(() => { load() }, [user._id])

  async function recharge(e) {
    e.preventDefault()
    await api.rechargeWallet(user._id, amount, method)
    refresh()
    load()
  }

  return (
    <div className="page">
      <h1>Wallet</h1>
      <div className="card wallet-balance">
        <div className="stat-label">Current balance</div>
        <div className="wallet-amount">₹ {w.balance}</div>
      </div>

      <form className="card form" onSubmit={recharge}>
        <h3>Recharge Wallet</h3>
        <div className="form-row">
          <div className="field"><label>Amount (₹)</label><input type="number" min={1} value={amount} onChange={e => setAmount(+e.target.value)} /></div>
          <div className="field">
            <label>Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              <option value="upi">UPI (Razorpay test)</option>
              <option value="card">Card (Razorpay test)</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Add ₹ {amount}</button>
        <p className="muted">Prototype: recharge simulates a Razorpay Test Mode success — no real money.</p>
      </form>

      <h2>Transactions</h2>
      {w.transactions.length === 0 && <div className="card"><p className="muted">No transactions yet.</p></div>}
      {w.transactions.map(t => (
        <div key={t._id} className="card ride-card">
          <div>
            <strong>{t.type === 'credit' ? '↓ Credit' : '↑ Debit'}</strong>
            <div className="muted">{t.reference} · {formatDateTime(t.created_at)}</div>
          </div>
          <div className={'fare ' + (t.type === 'credit' ? 'green' : 'red')}>
            {t.type === 'credit' ? '+' : '−'} ₹ {t.amount}
          </div>
        </div>
      ))}
    </div>
  )
}
