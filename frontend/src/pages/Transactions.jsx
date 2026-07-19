import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils'

export default function Transactions() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  useEffect(() => { api.walletFor(user._id).then(setWallet) }, [user._id])

  return (
    <div className="page transactions-page">
      <div className="page-heading-row"><div><p className="eyebrow">Account activity</p><h1>Transaction history</h1><p className="muted">Your wallet top-ups, ride payments, and ride earnings.</p></div><div className="transaction-balance"><span>Current balance</span><strong>₹ {wallet.balance}</strong></div></div>
      {wallet.transactions.length === 0 && <div className="card transactions-empty"><span className="material-symbols-rounded">receipt_long</span><h2>No transactions yet</h2><p className="muted">Your payment and wallet activity will appear here.</p></div>}
      {wallet.transactions.length > 0 && <div className="card transaction-list">
        <div className="transaction-list-head"><strong>All transactions</strong><span className="muted">{wallet.transactions.length} record{wallet.transactions.length === 1 ? '' : 's'}</span></div>
        {wallet.transactions.map(t => (
          <div key={t._id} className="transaction-row">
            <span className={'transaction-icon ' + (t.type === 'credit' ? 'credit' : 'debit')}><span className="material-symbols-rounded">{t.type === 'credit' ? 'south_west' : 'north_east'}</span></span>
            <div className="transaction-copy"><strong>{t.reference || (t.type === 'credit' ? 'Credit' : 'Debit')}</strong><span>{formatDateTime(t.created_at)}</span></div>
            <div className={'transaction-amount ' + (t.type === 'credit' ? 'credit' : 'debit')}>{t.type === 'credit' ? '+' : '−'} ₹ {t.amount}<small>Balance ₹ {t.balance_after}</small></div>
          </div>
        ))}
      </div>}
    </div>
  )
}
