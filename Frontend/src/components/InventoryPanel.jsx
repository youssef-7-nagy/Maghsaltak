import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { notify } from '../utils/notify';
import { FiEdit2, FiTrash2, FiPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import '../pages/AdminPanel.css';

const InventoryPanel = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'chemicals',
    currentStock: 0,
    threshold: 10,
    unit: 'units'
  });

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8080/inventory', config);
      setInventory(res.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`http://localhost:8080/inventory/${editingItem._id}`, formData, config);
        notify.success('Item updated successfully');
      } else {
        await axios.post('http://localhost:8080/inventory', formData, config);
        notify.success('Item added successfully');
      }
      setShowForm(false);
      setEditingItem(null);
      fetchInventory();
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to save item.');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      threshold: item.threshold,
      unit: item.unit
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`http://localhost:8080/inventory/${id}`, config);
      notify.success('Item deleted successfully');
      fetchInventory();
    } catch (err) {
      notify.error('Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'chemicals', currentStock: 0, threshold: 10, unit: 'units' });
    setEditingItem(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="admin-skeleton-table">
        {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="admin-skeleton-row"></div>)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-state-card error">
        <h3>Failed to load inventory</h3>
        <p>{error}</p>
        <button className="btn-save" style={{ width: 'auto', marginTop: 15, padding: '10px 20px' }} onClick={fetchInventory}>Retry</button>
      </div>
    );
  }

  return (
    <div className="panel-section">
      <div className="admin-header-actions" style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Inventory Management</h2>
        <div className="admin-header-buttons">
            <button className="btn-save" style={{ margin: 0, height: '40px', padding: '0 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { resetForm(); setShowForm(true); }}>
              <FiPlus /> Add Item
            </button>
        </div>
      </div>

      {showForm && (
        <form className="perfect-form menu-form-card" onSubmit={handleSubmit}>
          <div className="form-header">
            <div className="form-icon">
              {editingItem ? <FiEdit2 /> : <FiPlus />}
            </div>
            <div>
              <h3>{editingItem ? 'Edit Supply Item' : 'Register New Supply'}</h3>
              <p>Keep track of your stock to ensure operations never stop.</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col-6">
                <div className="input-group-modern">
                    <label>Item Name</label>
                    <input className="form-control" type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Premium Carnauba Wax" />
                </div>
            </div>
            <div className="form-col-6">
                <div className="input-group-modern">
                    <label>Category</label>
                    <select className="form-select" name="category" value={formData.category} onChange={handleInputChange}>
                        <option value="chemicals">Chemicals & Soaps</option>
                        <option value="towels">Microfiber Towels</option>
                        <option value="equipment">Equipment & Pads</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col-4">
                <div className="input-group-modern">
                    <label>Current Stock</label>
                    <input className="form-control" type="number" name="currentStock" value={formData.currentStock} onChange={handleInputChange} required min="0" />
                </div>
            </div>
            <div className="form-col-4">
                <div className="input-group-modern">
                    <label>Low Stock Threshold</label>
                    <input className="form-control" type="number" name="threshold" value={formData.threshold} onChange={handleInputChange} required min="0" />
                </div>
            </div>
            <div className="form-col-4">
                <div className="input-group-modern">
                    <label>Measurement Unit</label>
                    <input className="form-control" type="text" name="unit" value={formData.unit} onChange={handleInputChange} required placeholder="e.g. Liters, Pieces" />
                </div>
            </div>
          </div>

          <div className="form-actions-modern">
            <button type="submit" className="btn-save">{editingItem ? 'Save Changes' : 'Create Item'}</button>
            <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {inventory.length === 0 ? (
        <div className="admin-state-card">
          <h3>No inventory items found</h3>
          <p>Add some items to start tracking your stock.</p>
        </div>
      ) : (
        <div className="menu-grid">
          {inventory.map((item) => {
            const isLowStock = item.currentStock <= item.threshold;
            return (
              <div key={item._id} className="menu-card-mini" style={{ border: isLowStock ? '1px solid #fca5a5' : '', background: isLowStock ? '#fff5f5' : '' }}>
                  <div className="card-img-holder" style={{ background: isLowStock ? '#fee2e2' : '#eef2ff', color: isLowStock ? '#ef4444' : '#4361ee' }}>
                      {isLowStock ? <FiAlertCircle size={32} /> : <FiCheckCircle size={32} />}
                  </div>
                  <div className="menu-info" style={{ flex: 1 }}>
                      <h4 style={{ color: isLowStock ? '#b91c1c' : '' }}>{item.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>{item.category}</span>
                      <div style={{ marginTop: '5px' }}>
                          <span style={{ color: isLowStock ? '#ef4444' : '#2ecc71', fontWeight: '800', fontSize: '1.1rem' }}>{item.currentStock}</span>
                          <span style={{ color: '#8d99ae', marginLeft: '5px', fontWeight: '600', fontSize: '0.85rem' }}>/ {item.threshold} {item.unit}</span>
                      </div>
                  </div>
                  <div className="menu-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button className="btn-action edit" onClick={() => handleEdit(item)} title="Edit"><FiEdit2 /></button>
                      <button className="btn-action delete" onClick={() => handleDelete(item._id)} title="Delete"><FiTrash2 /></button>
                  </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;
