import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8001';

/* ===== Inline SVG Icons ===== */
const Icons = {
  Package: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
  Brain: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>,
  BarChart: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Trophy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Zap: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Play: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Factory: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V9l4 2 4-2 4 2 4-2 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>,
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [backendOnline, setBackendOnline] = useState(true);

  // Activity Feed (Mock)
  const [activityFeed] = useState([
    { id: 1, type: 'info', text: 'AI Agent initialized for Medium difficulty', time: '2 mins ago' },
    { id: 2, type: 'warning', text: 'Low stock alert: Biodegradable Straws', time: '1 hour ago' },
    { id: 3, type: 'success', text: 'Simulation completed with 94% efficiency', time: '3 hours ago' },
    { id: 4, type: 'info', text: 'Database synchronized with central warehouse', time: '5 hours ago' },
  ]);

  // Simulator State
  const [simConfig, setSimConfig] = useState({ difficulty: 'medium', agent: 'math' });
  const [simResults, setSimResults] = useState(null);

  // Advisor State
  const [advState, setAdvState] = useState(null);
  const [advPredictions, setAdvPredictions] = useState(null);

  // Chatbot State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [explaining, setExplaining] = useState(false);

  // Grading State
  const [grading, setGrading] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [liveRollout, setLiveRollout] = useState([]);

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState([
    { id: 1, name: 'Premium Coffee Beans', central: 120, regional: 45, inTransit: 200 },
    { id: 2, name: 'Eco-Friendly Paper Cups', central: 40, regional: 5, inTransit: 0 },
    { id: 3, name: 'Organic Soy Milk', central: 300, regional: 150, inTransit: 50 },
    { id: 4, name: 'Biodegradable Straws', central: 15, regional: 20, inTransit: 100 },
  ]);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', central: 0, regional: 0, inTransit: 0 });
  const [intel, setIntel] = useState(null);

  const fetchModelStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/model/status`);
      if (res.ok) {
        setModelStatus(await res.json());
        setBackendOnline(true);
      }
    } catch (err) { 
      console.error(err); 
      setBackendOnline(false);
    }
  }, []);

  const fetchCurrentState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/state`);
      if (res.ok) {
        const data = await res.json();
        setAdvState(data);
        setBackendOnline(true);
        return data;
      }
    } catch (err) { 
      console.error(err); 
      setBackendOnline(false);
    }
    return null;
  }, []);

  const fetchIntel = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/intel/current`);
      if (res.ok) setIntel(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchTrainingHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/training-curve`);
      if (res.ok) setTrainingHistory(await res.json());
      
      const res2 = await fetch(`${API_BASE}/analytics/live-rollout`);
      if (res2.ok) setLiveRollout(await res2.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { 
    fetchModelStatus();
    fetchCurrentState();
    fetchIntel();
    fetchTrainingHistory();
    const interval = setInterval(() => {
      fetchModelStatus();
      fetchIntel();
      fetchTrainingHistory();
    }, 3000); 
    return () => clearInterval(interval);
  }, [fetchModelStatus, fetchCurrentState, fetchIntel, fetchTrainingHistory]);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simConfig)
      });
      if (res.ok) {
        setSimResults(await res.json());
      } else {
        const errorData = await res.json();
        alert(`Simulation failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (err) { 
      alert('Network Error: Could not connect to the optimization engine. Ensure the backend is running on port 8001.');
      console.error(err); 
    }
    setLoading(false);
  };

  const handleAdvise = async () => {
    setLoading(true);
    // Refresh state before predicting
    const latestState = await fetchCurrentState();
    
    if (!latestState) {
      alert('Cannot generate advice: Supply chain state is unreachable.');
      setLoading(false);
      return;
    }

    try {
      const pNN = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation: latestState, task_id: 'medium' }) 
      });
      if (pNN.ok) {
        const data = await pNN.json();
        setAdvPredictions(data.action);
        setChatHistory([]);
      } else {
        alert('AI Prediction service is currently unavailable.');
      }
    } catch (err) { 
      alert('Neural Network Error: Connection refused. Check backend status.');
      console.error(err); 
    }
    setLoading(false);
  };

  const handleExplain = async (message = null) => {
    if (!advState || !advPredictions) return;
    setExplaining(true);
    
    let currentHistory = [...chatHistory];
    
    if (message) {
      currentHistory.push({ role: 'user', content: message });
      setChatHistory([...currentHistory]);
    }

    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          observation: advState, 
          action: advPredictions,
          history: currentHistory
        })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory([...currentHistory, { role: 'assistant', content: data.explanation }]);
      }
    } catch (err) { console.error(err); }
    setExplaining(false);
  };

  const handleGrade = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(["easy", "medium", "hard"])
      });
      if (res.ok) {
        setGrading(await res.json());
      } else {
        alert('Evaluation service returned an error.');
      }
    } catch (err) { 
      alert('Grader Error: Backend unreachable.');
      console.error(err); 
    }
    setLoading(false);
  };

  /* ===== Inventory Handlers ===== */
  const handleSaveItem = () => {
    if (editingItem) {
      setInventoryItems(inventoryItems.map(item => item.id === editingItem.id ? { ...item, ...formData } : item));
    } else {
      setInventoryItems([...inventoryItems, { id: Date.now(), ...formData }]);
    }
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: '', central: 0, regional: 0, inTransit: 0 });
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setInventoryItems(inventoryItems.filter(item => item.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', central: 0, regional: 0, inTransit: 0 });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const getStatus = (item) => {
    const total = item.central + item.regional;
    if (total < 50) return { label: 'LOW STOCK', class: 'low' };
    if (total < 150) return { label: 'RISKY', class: 'risky' };
    return { label: 'HEALTHY', class: 'healthy' };
  };

  const filteredItems = inventoryItems.filter(item => {
    if (inventoryFilter === 'all') return true;
    const status = getStatus(item).class;
    if (inventoryFilter === 'low') return status === 'low';
    if (inventoryFilter === 'overstock') return (item.central + item.regional) > 300;
    return true;
  });

  const renderDashboard = () => (
    <div className="dashboard-view">
      {intel && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div className="stat-icon blue" style={{ width: '40px', height: '40px' }}><Icons.Globe /></div>
            <div>
              <strong style={{ color: 'var(--accent-blue)', display: 'block', fontSize: '0.9rem' }}>REAL-WORLD INTELLIGENCE SYNC</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>{intel.headline}:</strong> {intel.description}</p>
            </div>
          </div>
        </div>
      )}

      {advState?.geopolitical_event && advState.geopolitical_event !== 'stable' && (
        <div className="event-banner">
          ⚠️ CRISIS ALERT: {advState.geopolitical_event.replace('_', ' ').toUpperCase()} ACTIVE
        </div>
      )}
      
      <div className="hero">
        <h1 className="animate-float">Supply Chain Command Center</h1>
        <p>Real-time autonomous optimization with Manufacturing & Geopolitical resilience.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon factory"><Icons.Factory /></div>
          <div className="stat-info">
            <h3>{advState?.inventory_raw_material || 0}</h3>
            <span>Raw Materials</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Icons.Globe /></div>
          <div className="stat-info">
            <div className={`shock-indicator ${(advState?.shock_magnitude || 0) > 0.4 ? 'critical' : 'stable'}`}>
              <Icons.Zap /> {Math.round((advState?.shock_magnitude || 0) * 100)}% Risk
            </div>
            <span>Geopolitical Shock</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Icons.Brain /></div>
          <div className="stat-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className={backendOnline ? 'status-online' : 'status-offline'} />
              <h3 style={{ fontSize: '1.1rem' }}>{backendOnline ? 'AI Active' : 'Offline'}</h3>
            </div>
            <span>Engine Status</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Icons.Zap /></div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--accent-amber)' }}>{inventoryItems.filter(i => (i.central + (i.regional || 0)) < 50).length}</h3>
            <span>Stock Alerts</span>
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div className="card-header-icon blue"><Icons.BarChart /></div>
            <h2>Network Activity</h2>
          </div>
          <div className="card-body">
            <div className="activity-feed">
              {activityFeed.map(item => (
                <div key={item.id} className="activity-item">
                  <div className={`dot ${item.type}`} />
                  <div className="activity-content">
                    <span className="activity-time">{item.time}</span>
                    <p className="activity-text">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-header-icon purple"><Icons.Zap /></div>
            <h2>Quick Actions</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="quick-action-card" onClick={() => setActiveTab('simulator')}>
              <span className="icon">🏭</span>
              <strong>Manufacture</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Convert raw to finished</p>
            </div>
            <div className="quick-action-card" onClick={() => setActiveTab('inventory')}>
              <span className="icon">🛒</span>
              <strong>Procure Raw</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supply material pipeline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-header-icon green"><Icons.Package /></div>
        <h2>Inventory Management</h2>
      </div>
      <div className="card-body">
        <div className="inventory-controls">
          <div className="filter-tabs">
            <button className={`filter-btn ${inventoryFilter === 'all' ? 'active' : ''}`} onClick={() => setInventoryFilter('all')}>All Products</button>
            <button className={`filter-btn ${inventoryFilter === 'low' ? 'active' : ''}`} onClick={() => setInventoryFilter('low')}>Low Stock</button>
            <button className={`filter-btn ${inventoryFilter === 'overstock' ? 'active' : ''}`} onClick={() => setInventoryFilter('overstock')}>Overstock</button>
          </div>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={openAddModal}>
            <Icons.Plus /> Add Product
          </button>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Central Inv</th>
              <th>Regional Inv</th>
              <th>In-Transit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className={`inventory-row ${status.class}`}>
                  <td><div className="item-name">{item.name}</div></td>
                  <td>{item.central}</td>
                  <td>{item.regional}</td>
                  <td>{item.inTransit}</td>
                  <td>
                    <div className={`status-tag ${status.class}`}>
                      <div className={`status-dot ${status.class}`} />
                      {status.label}
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-icon" onClick={() => openEditModal(item)}><Icons.Edit /></button>
                      <button className="btn btn-icon delete" onClick={() => handleDeleteItem(item.id)}><Icons.Trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="empty-state">
            <div className="icon">📦</div>
            <p>No products found for this filter.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--accent-blue)' }}>{editingItem ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Icons.X /></button>
            </div>
            <div className="form-group">
              <label>Product Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Arabica Coffee" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Central Inv</label>
                <input type="number" value={formData.central} onChange={e => setFormData({...formData, central: parseInt(e.target.value) || 0})} />
              </div>
              <div className="form-group">
                <label>Regional Inv</label>
                <input type="number" value={formData.regional} onChange={e => setFormData({...formData, regional: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="form-group">
              <label>In-Transit</label>
              <input type="number" value={formData.inTransit} onChange={e => setFormData({...formData, inTransit: parseInt(e.target.value) || 0})} />
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-warning" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveItem}>Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSimulator = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-header-icon blue"><Icons.Play /></div>
        <h2>Run Simulation</h2>
      </div>
      <div className="card-body">
        <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label>Difficulty</label>
            <select value={simConfig.difficulty} onChange={e => setSimConfig({...simConfig, difficulty: e.target.value})}>
              <option value="easy">Easy (Stable)</option>
              <option value="medium">Medium (Spikes & Storms)</option>
              <option value="hard">Hard (Hurricanes & High Demand)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Agent Policy</label>
            <select value={simConfig.agent} onChange={e => setSimConfig({...simConfig, agent: e.target.value})}>
              <option value="math">Math Heuristic (s,S)</option>
              <option value="nn" disabled={!modelStatus?.model_loaded}>
                {modelStatus?.model_loaded ? 'Neural Network (RL)' : 'Neural Network (Model not found)'}
              </option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSimulate} disabled={loading}>
          {loading ? <><div className="spinner"/> Running...</> : <><Icons.Play/> Start Simulation</>}
        </button>

        {simResults && (
          <div style={{ marginTop: '2rem' }}>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-info">
                  <h3>{(simResults.score * 100).toFixed(1)}</h3>
                  <span>Overall Score</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>${simResults.final_profit.toFixed(2)}</h3>
                  <span>Final Profit</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>{(simResults.avg_service_level * 100).toFixed(1)}%</h3>
                  <span>Avg Service Level</span>
                </div>
              </div>
            </div>

            <table className="sim-trace-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Weather</th>
                  <th>C-Inv / R-Inv</th>
                  <th>Backlog</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {simResults.trace.map((t, i) => (
                  <tr key={i}>
                    <td>Day {t.day}</td>
                    <td>
                      <span className={`weather-indicator ${t.weather}`}>
                        {t.weather === 'clear' ? '☀️' : t.weather === 'storm' ? '⛈️' : '🌪️'} {t.weather}
                      </span>
                    </td>
                    <td>{t.inventory_central} / {t.inventory_regional}</td>
                    <td style={{ color: t.backlog > 0 ? 'var(--accent-rose)' : 'inherit' }}>{t.backlog}</td>
                    <td>
                      <span className={`badge ${t.action === 'noop' ? 'badge-amber' : 'badge-blue'}`}>
                        {t.action.toUpperCase()}
                      </span>
                      {t.quantity > 0 && ` (${t.quantity} via ${t.supplier || 'transfer'})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="card">
      <div className="card-header">
        <div className="card-header-icon purple"><Icons.Brain /></div>
        <h2>AI Operations Advisor</h2>
      </div>
      <div className="card-body">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Fetch the current OpenEnv simulation state and ask the Neural Network for its recommended action.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn btn-warning" onClick={fetchCurrentState}>Refresh Current State</button>
          <button className="btn btn-primary" onClick={handleAdvise} disabled={loading || !advState || !modelStatus?.model_loaded}>
             {loading ? <><div className="spinner"/> Thinking...</> : <><Icons.Brain/> Ask Neural Network</>}
          </button>
        </div>

        {advState && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Current State (Day {advState.day})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div><strong>C-Inv:</strong> {advState.inventory_central}</div>
              <div><strong>R-Inv:</strong> {advState.inventory_regional}</div>
              <div><strong>Backlog:</strong> {advState.backlog}</div>
              <div><strong>Weather:</strong> {advState.weather_condition}</div>
              <div><strong>Fuel Cost:</strong> {advState.fuel_cost_multiplier}x</div>
              <div><strong>Route:</strong> {advState.overseas_route_status}</div>
            </div>
          </div>
        )}

        {/* --- AI Recommendation Panel --- */}
        {advPredictions && (
          <div className="prediction-panel" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-purple)' }}>Neural Network Recommendation</h3>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Action: <span style={{ color: 'var(--text-primary)' }}>{advPredictions.operation.toUpperCase()}</span>
            </div>
            {advPredictions.quantity > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Quantity:</strong> {advPredictions.quantity} | <strong>Supplier:</strong> {advPredictions.supplier}
              </div>
            )}
            
            <div className="chat-container">
              {chatHistory.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Want to know why the AI chose this action?
                  </p>
                  <button className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto' }} onClick={() => handleExplain()} disabled={explaining}>
                    {explaining ? <><div className="spinner"/> Analyzing...</> : <><Icons.Brain/> Explain Action</>}
                  </button>
                </div>
              ) : (
                <>
                  <div className="chat-box">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                        {msg.content}
                      </div>
                    ))}
                    {explaining && (
                      <div className="chat-bubble ai">
                        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                      </div>
                    )}
                  </div>
                  <div className="chat-input-area">
                    <input 
                      type="text" 
                      placeholder="Ask a follow-up question..." 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && chatInput.trim() && !explaining) {
                          handleExplain(chatInput.trim());
                          setChatInput('');
                        }
                      }}
                    />
                    <button 
                      className="btn btn-primary" 
                      disabled={!chatInput.trim() || explaining}
                      onClick={() => {
                        handleExplain(chatInput.trim());
                        setChatInput('');
                      }}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="card" style={{ border: '1px dashed var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>
          <div className="card-body">
            <h3 style={{ color: 'var(--accent-purple)', marginBottom: '0.5rem' }}>Self-Evolution Mode</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Enable the AI to run simulations against itself. It will collect successful trajectories and retrain its own policy to maximize long-term profit.
            </p>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/learning/start`, { method: 'POST' });
                if (res.ok) alert('Autonomous Learning Loop started in background! Watch the live telemetry below.');
                else alert('Failed to start learning loop. Check if backend is running.');
              } catch (e) { alert('Connection error: ' + e.message); }
            }}>
              Start Autonomous Learning Cycle
            </button>
          </div>
        </div>

        {/* --- LIVE TELEMETRY GRAPHS --- */}
        <div className="main-grid" style={{ marginTop: '2rem' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="card-header-icon blue"><Icons.Play /></div>
                <h2 style={{ fontSize: '1rem' }}>Rollout Performance</h2>
              </div>
              {liveRollout.length > 0 && (
                <div className="status-tag risky" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                  <div className="status-dot risky" style={{ animation: 'pulse 1.5s infinite' }} />
                  ACTIVE
                </div>
              )}
            </div>
            <div className="card-body">
              {liveRollout.length > 0 ? (
                <div className="chart-wrapper" style={{ padding: '0 10px 20px 20px' }}>
                  <div className="chart-container" style={{ height: '180px', width: '100%', position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <path d={`M ${liveRollout.map((val, i) => `${(i / (liveRollout.length - 1)) * 1000},${300 - (val.profit / 15000) * 300}`).join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="3" />
                      <path d={`M ${liveRollout.map((val, i) => `${(i / (liveRollout.length - 1)) * 1000},${300 - (val.inventory / 1000) * 300}`).join(' L ')}`} fill="none" stroke="#3b82f6" strokeWidth="3" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.65rem', justifyContent: 'center' }}>
                    <span style={{ color: '#10b981' }}>● Profit</span>
                    <span style={{ color: '#3b82f6' }}>● Inventory</span>
                  </div>
                </div>
              ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Waiting for rollout...</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="card-header-icon purple"><Icons.BarChart /></div>
                <h2 style={{ fontSize: '1rem' }}>Intelligence Growth</h2>
              </div>
              {trainingHistory.length > 0 && (
                <div className="status-tag healthy" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                  <div className="status-dot healthy" style={{ animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              )}
            </div>
            <div className="card-body">
              {trainingHistory.length > 0 ? (
                <div className="chart-wrapper" style={{ padding: '0 10px 20px 20px' }}>
                  <div className="chart-container" style={{ height: '180px', width: '100%', position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <path d={`M ${trainingHistory.map((val, i) => `${(i / (trainingHistory.length - 1)) * 1000},${300 - (val / 3.0) * 300}`).join(' L ')}`} fill="none" stroke="var(--accent-purple)" strokeWidth="3" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Learning precision (Loss)</div>
                </div>
              ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Waiting for training...</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleGrading = handleGrade; // Alias

  const renderGrading = () => (
    <div className="grading-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon amber"><Icons.Trophy /></div>
          <h2>Performance Evaluation</h2>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Run the SupplyChainGrader to evaluate the AI model across all 3 difficulty tiers.
          </p>
          <button className="btn btn-warning" onClick={handleGrading} disabled={loading}>
            {loading ? <><div className="spinner"/> Evaluating...</> : <><Icons.Trophy/> Run Grader</>}
          </button>

          {grading && (
            <div style={{ marginTop: '2rem' }}>
              <div className="score-ring" style={{ '--score': grading.overall_score * 100 }}>
                <div className="score-ring-value">{(grading.overall_score * 100).toFixed(1)}</div>
              </div>
              <h3 style={{ textAlign: 'center', marginBottom: '2rem' }}>Overall Composite Score</h3>

              <div className="main-grid">
                {grading.tasks.map(t => (
                  <div key={t.task_id} className="agent-card math" style={{ borderColor: 'var(--border)', boxShadow: 'none' }}>
                    <h4 style={{ textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t.task_id}</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                      {(t.score * 100).toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div><strong>Profit:</strong> ${t.profit.toFixed(2)}</div>
                      <div><strong>Service:</strong> {(t.service_level * 100).toFixed(1)}%</div>
                      <div><strong>Backlog Days:</strong> {t.backlog_days}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="bg-mesh" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">SC</div>
          <span className="navbar-title">Antigravity Supply Chain AI</span>
        </div>
        <div className="navbar-links">
          <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-link ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')}>
            Simulator
          </button>
          <button className={`nav-link ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
            AI Advisor
          </button>
          <button className={`nav-link ${activeTab === 'grading' ? 'active' : ''}`} onClick={() => setActiveTab('grading')}>
            Evaluation
          </button>
          <button className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            Inventory
          </button>
        </div>
        {!backendOnline && (
          <div className="status-tag risky" style={{ marginLeft: '1rem', padding: '0.25rem 0.6rem' }}>
            <div className="status-dot risky" style={{ animation: 'pulse 1s infinite' }} />
            BACKEND OFFLINE
          </div>
        )}
      </nav>

      <div className="container">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'simulator' && renderSimulator()}
        {activeTab === 'advisor' && renderAdvisor()}
        {activeTab === 'grading' && renderGrading()}
        {activeTab === 'inventory' && renderInventory()}
      </div>
    </div>
  );
}

export default App;
