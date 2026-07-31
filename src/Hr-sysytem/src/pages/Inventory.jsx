import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Pencil, Trash2, Package, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    item_code: '',
    category: '',
    item_name: '',
    unit: '',
    opening_qty: 0,
    current_stock: 0,
    status: 'In Stock'
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          toast.error('CSV file is empty or missing data rows');
          return;
        }

        const dataToInsert = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',');
          // Format: item_code,category,item_name,unit,opening_qty,current_stock,status
          if (values.length >= 4) {
            dataToInsert.push({
              item_code: values[0]?.trim(),
              category: values[1]?.trim(),
              item_name: values[2]?.trim(),
              unit: values[3]?.trim(),
              opening_qty: Number(values[4]?.trim()) || 0,
              current_stock: Number(values[5]?.trim()) || 0,
              status: values[6]?.trim() || 'In Stock',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }

        if (dataToInsert.length === 0) {
          toast.error('No valid data found in CSV');
          return;
        }

        setLoading(true);
        const { error } = await supabase
          .from('inventory_items')
          .insert(dataToInsert);

        if (error) throw error;
        
        toast.success(`${dataToInsert.length} items imported successfully!`);
        fetchInventory();
        setShowUploadModal(false);
        setSelectedFile(null);
      } catch (error) {
        console.error('Error parsing/uploading CSV:', error);
        toast.error('Failed to upload CSV data. Make sure Item Codes are unique.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setLoading(false);
      }
    };
    reader.onerror = () => toast.error('Error reading file');
    reader.readAsText(selectedFile);
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory from Supabase:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'current_stock' || name === 'opening_qty') ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editId);
          
        if (error) throw error;
        toast.success('Item updated successfully!');
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([formData]);
          
        if (error) throw error;
        toast.success('Item added successfully!');
      }
      
      fetchInventory();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save inventory item');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      item_code: item.item_code,
      category: item.category,
      item_name: item.item_name,
      unit: item.unit,
      opening_qty: item.opening_qty || 0,
      current_stock: item.current_stock,
      status: item.status
    });
    setEditId(item.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      fetchInventory();
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      item_code: '',
      category: '',
      item_name: '',
      unit: '',
      opening_qty: 0,
      current_stock: 0,
      status: 'In Stock'
    });
    setIsEditing(false);
    setEditId(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return '#166534';
      case 'Low Stock': return '#ca8a04';
      case 'Out of Stock': return '#dc2626';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="var(--primary-color)" /> Inventory Management
          </h1>
          <p className="page-subtitle">Track and manage inventory items and stock levels.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none' }}
          >
            <option value="">All Categories</option>
            {[...new Set(items.map(item => item.category))].filter(Boolean).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowUploadModal(true)} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              backgroundColor: '#ffffff', color: '#1e293b', 
              border: '1px solid #cbd5e1', borderRadius: '8px',
              padding: '10px 16px', fontSize: '0.9rem', fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            <Upload size={16} color="#64748b" /> Upload CSV
          </button>

          <button 
            onClick={openModal} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              backgroundColor: '#3b82f6', color: '#ffffff', 
              border: 'none', borderRadius: '8px',
              padding: '10px 16px', fontSize: '0.9rem', fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <tr>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Code</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Name</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Qty</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Stock</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10, padding: '16px 24px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Loading inventory...</td>
                </tr>
              ) : items.filter(item => selectedCategory ? item.category === selectedCategory : true).length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No inventory items found. Add a new item to get started.</td>
                </tr>
              ) : (
                items.filter(item => selectedCategory ? item.category === selectedCategory : true).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ fontWeight: 600, color: '#1e293b', padding: '16px 24px' }}>{item.item_code}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{item.category}</td>
                    <td style={{ fontWeight: 500, padding: '16px 24px', color: '#1e293b' }}>{item.item_name}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{item.unit}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{item.opening_qty || 0}</td>
                    <td style={{ fontWeight: 'bold', padding: '16px 24px', color: '#0f172a' }}>{item.current_stock}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        backgroundColor: `${getStatusColor(item.status)}15`,
                        color: getStatusColor(item.status)
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          onClick={() => handleEdit(item)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Item Code <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" name="item_code" value={formData.item_code} onChange={handleInputChange} required placeholder="e.g. ITM-001" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" name="category" value={formData.category} onChange={handleInputChange} required placeholder="e.g. Electronics, Stationary" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Item Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} required placeholder="e.g. A4 Paper Rim" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unit <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} required placeholder="e.g. Pcs, Kg" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Opening Qty <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" name="opening_qty" value={formData.opening_qty} onChange={handleInputChange} required min="0" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Current Stock <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" name="current_stock" value={formData.current_stock} onChange={handleInputChange} required min="0" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Status <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select name="status" value={formData.status} onChange={handleInputChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isEditing ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
        }}>
          <div style={{ 
            backgroundColor: '#ffffff', 
            width: '100%', 
            maxWidth: '500px', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#4b5563' }}>Upload CSV File</h2>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: '1.5px dashed #cbd5e1', 
                borderRadius: '12px', 
                padding: '40px 20px', 
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
                marginBottom: '20px',
                transition: 'all 0.2s'
              }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setSelectedFile(e.dataTransfer.files[0]);
                }
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                <Plus size={24} color="#3b82f6" />
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                {selectedFile ? selectedFile.name : 'Click to Browse CSV'}
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'or drag and drop here'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Please ensure the CSV has an 'item_code' or 'item_name' column.</p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>CSV Header Format (Copy this):</p>
              <div style={{ 
                backgroundColor: '#f1f5f9', 
                color: '#475569',
                padding: '12px 16px', 
                borderRadius: '6px', 
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                item_code,category,item_name,unit,opening_qty,current_stock,status
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0 -24px 20px -24px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                style={{ display: 'none' }} 
              />
              <button 
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid #cbd5e1', 
                  color: '#0f172a', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  padding: '8px 20px', 
                  fontWeight: 500,
                  borderRadius: '8px'
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleFileUpload}
                style={{ 
                  background: '#3b82f6', 
                  border: 'none', 
                  color: '#ffffff', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  padding: '8px 20px', 
                  fontWeight: 500,
                  borderRadius: '8px'
                }}
              >
                Upload Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
