import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../api/api'

export default function AdminSettings() {
  const { company, setCompany } = useOutletContext()
  const [f, setF] = useState({
    name: company.name, industry: company.industry || '', registered_address: company.registered_address || '',
    admin_contact: company.admin_contact || '',
    fuel: company.carpool_config.fuel_cost_per_liter,
    perkm: company.carpool_config.cost_per_km,
    opkm: company.carpool_config.travel_cost_operational_per_km,
  })
  const [saved, setSaved] = useState(false)
  const [branches, setBranches] = useState([])
  const [newBranch, setNewBranch] = useState({ name: '', address: '' })

  const loadBranches = () => api.getCompanyBranches(company._id).then(setBranches)
  useEffect(() => { loadBranches() }, [company._id])

  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    const updated = await api.adminUpdateCompany(company._id, {
      name: f.name, industry: f.industry, registered_address: f.registered_address, admin_contact: f.admin_contact,
      carpool_config: { fuel_cost_per_liter: +f.fuel, cost_per_km: +f.perkm, travel_cost_operational_per_km: +f.opkm },
    })
    setCompany(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div>
    <form className="card form" onSubmit={save} style={{ maxWidth: 640 }}>
      <h2>Company Details</h2>
      <div className="form-row">
        <div className="field"><label>Company name</label><input value={f.name} onChange={set('name')} /></div>
        <div className="field"><label>Industry</label><input value={f.industry} onChange={set('industry')} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Registered address</label><input value={f.registered_address} onChange={set('registered_address')} /></div>
        <div className="field"><label>Admin contact</label><input value={f.admin_contact} onChange={set('admin_contact')} /></div>
      </div>
      <h2>Carpooling Configuration</h2>
      <div className="form-row">
        <div className="field"><label>Fuel cost / liter (₹)</label><input type="number" step="0.5" value={f.fuel} onChange={set('fuel')} /></div>
        <div className="field"><label>Cost per km (₹)</label><input type="number" step="0.5" value={f.perkm} onChange={set('perkm')} /></div>
        <div className="field"><label>Operational cost / km (₹)</label><input type="number" step="0.5" value={f.opkm} onChange={set('opkm')} /></div>
      </div>
      <div className="field">
        <label>Employee join code</label>
        <div className="join-code small">{company.join_code}</div>
      </div>
      <button className="btn btn-primary" type="submit">{saved ? ' Saved' : 'Save Settings'}</button>
    </form>
    
    <div className="card form" style={{ maxWidth: 640, marginTop: '2rem' }}>
      <h2>Office Branches</h2>
      <p className="muted" style={{ marginBottom: '1rem' }}>Manage physical office locations for employees to choose from.</p>
      
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem' }}>
        {branches.map(b => (
          <li key={b._id} style={{ padding: '0.75rem', background: 'var(--surface)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{b.name}</strong><br/>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{b.address}</span>
            </div>
            <button className="btn btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)', padding: '0.25rem 0.5rem' }} 
              onClick={async () => {
                await api.deleteCompanyBranch(b._id)
                loadBranches()
              }}>Remove</button>
          </li>
        ))}
      </ul>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: 1 }}><label>Branch Name</label><input placeholder="e.g. Downtown Office" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} /></div>
        <div className="field" style={{ flex: 2 }}><label>Address</label><input placeholder="123 Corporate Blvd" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} /></div>
        <button className="btn btn-primary" style={{ height: '42px', marginBottom: '1rem' }} onClick={async () => {
          if (!newBranch.name || !newBranch.address) return
          await api.addCompanyBranch(company._id, newBranch)
          setNewBranch({ name: '', address: '' })
          loadBranches()
        }}>Add Branch</button>
      </div>
    </div>
    </div>
  )
}

