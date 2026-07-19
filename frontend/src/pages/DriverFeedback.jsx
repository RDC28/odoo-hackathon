import { useEffect, useState } from 'react'
import * as api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils'

export default function DriverFeedback() {
  const { user } = useAuth()
  const [data, setData] = useState({ average: user.rating_avg || 0, count: user.rating_count || 0, reviews: [] })

  useEffect(() => { api.driverFeedback(user._id).then(setData) }, [user._id])

  return (
    <div className="page driver-feedback-page">
      <div className="page-heading-row"><div><p className="eyebrow">Driver profile</p><h1>Driver feedback</h1><p className="muted">See how passengers rate the rides you offer.</p></div></div>
      <div className="feedback-summary card"><div className="feedback-score"><strong>{data.average ? data.average.toFixed(1) : '—'}</strong><div className="feedback-stars">{[1, 2, 3, 4, 5].map(star => <span key={star} className="material-symbols-rounded">{star <= Math.round(data.average) ? 'star' : 'star_outline'}</span>)}</div><span className="muted">Average rating</span></div><div className="feedback-count"><strong>{data.count}</strong><span className="muted">Passenger rating{data.count === 1 ? '' : 's'}</span></div></div>
      <section className="feedback-list card"><div className="transaction-list-head"><strong>Recent feedback</strong><span className="muted">Written reviews from passengers</span></div>{data.reviews.length === 0 && <div className="feedback-empty"><span className="material-symbols-rounded">rate_review</span><p>No written feedback yet.</p><span className="muted">Complete more rides to collect passenger reviews.</span></div>}{data.reviews.map(review => <article className="feedback-item" key={review._id}><div className="feedback-item-head"><strong>{review.rater?.name || 'Passenger'}</strong><span className="muted">{formatDateTime(review.created_at)}</span></div><div className="feedback-item-stars">{[1, 2, 3, 4, 5].map(star => <span key={star} className="material-symbols-rounded">{star <= review.stars ? 'star' : 'star_outline'}</span>)}</div>{review.comment && <p>{review.comment}</p>}</article>)}</section>
    </div>
  )
}
