import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Eye, Download, Pencil } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const Indent = () => {
  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);
  
  const [departmentName, setDepartmentName] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [items, setItems] = useState([
    { product: '', qty: '', unit: '', expectedDate: '', remarks: '' }
  ]);
  
  const [activeTab, setActiveTab] = useState('Create Indent');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editIndentNumber, setEditIndentNumber] = useState(null);
  const [editTimestamp, setEditTimestamp] = useState(null);
  const [editStatus, setEditStatus] = useState(null);

  useEffect(() => {
    fetchIndents();
  }, []);

  const fetchIndents = async () => {
    try {
      const { data, error } = await supabase
        .from('indents')
        .select(`
          *,
          indent_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map(ind => ({
        id: ind.id,
        indentNumber: ind.indent_number,
        timestamp: new Date(ind.created_at).toLocaleString('en-GB'),
        departmentName: ind.department_name,
        status: ind.status,
        issuedBy: ind.issued_by,
        approvedBy: ind.approved_by,
        items: ind.indent_items.map(item => ({
          id: item.id,
          product: item.product,
          qty: item.qty,
          unit: item.unit,
          expectedDate: item.expected_date,
          remarks: item.remarks
        }))
      }));
      setIndentData(formattedData);
    } catch (error) {
      console.error('Error fetching indents:', error);
      toast.error('Failed to load indents');
    } finally {
      setLoading(false);
    }
  };

  const generateIndentNumber = () => {
    if (indentData.length === 0) return 'P-IND-001';
    const numbers = indentData.map(i => {
       const parts = i.indentNumber.split('-');
       return parseInt(parts[parts.length - 1]) || 0;
    });
    const maxNum = Math.max(...numbers);
    return `P-IND-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Automatically add a new row if the user types anything in the last row
    if (index === newItems.length - 1 && value.toString().trim() !== '') {
      newItems.push({ product: '', qty: '', unit: '', expectedDate: '', remarks: '' });
    }
    
    setItems(newItems);
  };

  const handleAddRow = () => {
    setItems([...items, { product: '', qty: '', unit: '', expectedDate: '', remarks: '' }]);
  };
  
  const handleRemoveRow = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.product.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one material item');
      return;
    }

    if (!departmentName.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      const indentNumber = isEditing ? editIndentNumber : generateIndentNumber();
      const status = isEditing ? editStatus : 'Pending';

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('indents')
          .update({
            department_name: departmentName,
            status: status
          })
          .eq('indent_number', indentNumber);
          
        if (updateError) throw updateError;
        
        const indentObj = indentData.find(i => i.indentNumber === indentNumber);
        if (indentObj) {
          await supabase.from('indent_items').delete().eq('indent_id', indentObj.id);
          
          const itemsToInsert = validItems.map(item => ({
            indent_id: indentObj.id,
            product: item.product,
            qty: item.qty,
            unit: item.unit,
            expected_date: item.expectedDate || null,
            remarks: item.remarks
          }));
          const { error: itemsError } = await supabase.from('indent_items').insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        toast.success('Indent updated successfully!');
      } else {
        const { data: newInd, error: insertError } = await supabase
          .from('indents')
          .insert([{
            indent_number: indentNumber,
            department_name: departmentName,
            status: status
          }])
          .select()
          .single();
          
        if (insertError) throw insertError;

        const itemsToInsert = validItems.map(item => ({
          indent_id: newInd.id,
          product: item.product,
          qty: item.qty,
          unit: item.unit,
          expected_date: item.expectedDate || null,
          remarks: item.remarks
        }));
        
        const { error: itemsError } = await supabase.from('indent_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
        
        toast.success('Indent submitted successfully!');
      }
      
      fetchIndents();
      handleCancel();
    } catch (error) {
      console.error('Error saving indent:', error);
      toast.error('Failed to save indent');
    }
  };

  const handleCancel = () => {
    setItems([
      { product: '', qty: '', unit: '', expectedDate: '', remarks: '' }
    ]);
    setIsEditing(false);
    setEditIndentNumber(null);
    setEditTimestamp(null);
    setEditStatus(null);
    setDepartmentName('');
    setIssuedBy('');
    setApprovedBy('');
    setActiveTab('Department Head');
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setEditIndentNumber(item.indentNumber);
    setEditTimestamp(item.timestamp);
    setEditStatus(item.status);
    setDepartmentName(item.departmentName || '');
    setIssuedBy(item.issuedBy || '');
    setApprovedBy(item.approvedBy || '');
    
    // Ensure there is at least one empty row at the end for adding new items easily
    const loadedItems = item.items && item.items.length > 0 ? [...item.items] : [];
    loadedItems.push({ product: '', qty: '', unit: '', expectedDate: '', remarks: '' });
    setItems(loadedItems);
    
    setActiveTab('Create Indent');
  };

  const handleDelete = async (indentNumber) => {
    if (!window.confirm('Are you sure you want to delete this indent?')) return;
    try {
      const { error } = await supabase.from('indents').delete().eq('indent_number', indentNumber);
      if (error) throw error;
      setIndentData(indentData.filter(item => item.indentNumber !== indentNumber));
      toast.success('Indent deleted successfully');
    } catch (error) {
      console.error('Error deleting indent:', error);
      toast.error('Failed to delete indent');
    }
  };

  const generatePDF = () => {
    if (!selectedIndent) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('Material Details', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`Indent No: ${selectedIndent.indentNumber}`, 14, 32);
    doc.text(`Date: ${selectedIndent.timestamp}`, 14, 38);
    
    const tableColumn = ["#", "Product / Material", "Qty", "Unit", "Expected Date", "Remarks"];
    const tableRows = [];

    if (selectedIndent.items && selectedIndent.items.length > 0) {
      selectedIndent.items.forEach((item, idx) => {
        const itemData = [
          idx + 1,
          item.product,
          item.qty,
          item.unit || '-',
          item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : '-',
          item.remarks || '-'
        ];
        tableRows.push(itemData);
      });
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    doc.save(`${selectedIndent.indentNumber}.pdf`);
  };

  const handleUpdateStatus = async (indentNumber, newStatus) => {
    try {
      const { error } = await supabase.from('indents').update({ status: newStatus }).eq('indent_number', indentNumber);
      if (error) throw error;
      
      const updatedData = indentData.map(item => {
        if (item.indentNumber === indentNumber) {
          return { ...item, status: newStatus };
        }
        return item;
      });
      setIndentData(updatedData);
      toast.success(`Indent ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredData = indentData.filter(item => {
    if (activeTab === 'Department Head') return item.status === 'Pending';
    if (activeTab === 'HR') return ['Approved', 'Rejected', 'Done', 'Not Done'].includes(item.status);
    return true;
  });

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Product Indents</h1>
          <p className="page-subtitle">Manage material and supply indents.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('Create Indent')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Create Indent' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Create Indent' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Create Indent
        </button>
        <button
          onClick={() => setActiveTab('Department Head')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Department Head' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Department Head' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Department Head
        </button>
        <button
          onClick={() => setActiveTab('HR')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'HR' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'HR' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          HR
        </button>
      </div>

      {activeTab === 'Create Indent' && (
        <div className="card">
          <h2 style={{ margin: 0, fontSize: '1.5rem', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>{isEditing ? 'Edit Material Indent' : 'Create Material Indent'}</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label>Department Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select 
                required 
                value={departmentName} 
                onChange={(e) => setDepartmentName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}
              >
                <option value="">Select Department...</option>
                <option value="Jai Bhole Enterprises">Jai Bhole Enterprises</option>
                <option value="Jai Bhole Traders">Jai Bhole Traders</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Product / Material</th>
                    <th style={{ width: '100px' }}>Qty</th>
                    <th style={{ width: '100px' }}>Unit</th>
                    <th style={{ width: '160px' }}>Expected Date</th>
                    <th>Remarks</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{index + 1}</td>
                      <td>
                        <input type="text" value={item.product} onChange={e => handleItemChange(index, 'product', e.target.value)} placeholder="Enter material..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)' }} />
                      </td>
                      <td>
                        <input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} min="1" placeholder="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)' }} />
                      </td>
                      <td>
                        <input type="text" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} placeholder="e.g. Kg" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)' }} />
                      </td>
                      <td>
                        <input type="date" value={item.expectedDate} onChange={e => handleItemChange(index, 'expectedDate', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)' }} />
                      </td>
                      <td>
                        <input type="text" value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} placeholder="Remarks..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-main)' }} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" onClick={() => handleRemoveRow(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="button" onClick={handleAddRow} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>
                <Plus size={16} /> Add New Row
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" onClick={handleCancel} className="btn-primary" style={{ backgroundColor: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? 'Update Request' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab !== 'Create Indent' && (
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Indent No</th>
                <th>Date</th>
                <th>Department</th>
                <th>Total Items</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    No material indents found in this section.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{item.indentNumber}</td>
                    <td>{item.timestamp}</td>
                    <td>{item.departmentName || '-'}</td>
                    <td>{item.items ? item.items.length : 0} items</td>
                    <td>
                      {activeTab === 'Department Head' ? (
                        <select 
                          value={item.status}
                          onChange={(e) => {
                            if (e.target.value === 'Approved' || e.target.value === 'Rejected') {
                              handleUpdateStatus(item.indentNumber, e.target.value);
                            }
                          }}
                          style={{ padding: '6px', fontSize: '0.85rem' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approve</option>
                          <option value="Rejected">Reject</option>
                        </select>
                      ) : (
                        <select 
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.indentNumber, e.target.value)}
                          style={{ padding: '6px', fontSize: '0.85rem' }}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Done">Done</option>
                          <option value="Not Done">Not Done</option>
                          {item.status === 'Rejected' && <option value="Rejected">Rejected</option>}
                        </select>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setSelectedIndent(item)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {activeTab === 'Department Head' && (
                          <>
                            <button 
                              onClick={() => handleEdit(item)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                              title="Edit Indent"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.indentNumber)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                              title="Delete Indent"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* View Indent Modal */}
      {selectedIndent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)', padding: '4px 12px', borderRadius: '4px', fontSize: '1rem' }}>
                  {selectedIndent.indentNumber}
                </span>
                Indent Details
              </h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={generatePDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                  <Download size={16} /> PDF
                </button>
                <button onClick={() => setSelectedIndent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Date</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedIndent.timestamp}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Department</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedIndent.departmentName || '-'}</p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Items</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedIndent.items?.length || 0}</p>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Requested Materials</h3>
            <table style={{ marginBottom: '24px' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Material</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Expected Date</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {selectedIndent.items && selectedIndent.items.length > 0 ? (
                  selectedIndent.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.product}</td>
                      <td style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{item.qty}</td>
                      <td>{item.unit || '-'}</td>
                      <td>{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : '-'}</td>
                      <td>{item.remarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Indent;