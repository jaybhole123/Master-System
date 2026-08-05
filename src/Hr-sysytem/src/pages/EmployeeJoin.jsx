import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Upload, GripVertical } from 'lucide-react';

export default function EmployeeJoin() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [dragActiveField, setDragActiveField] = useState(null);
  const [files, setFiles] = useState({
    aadharDoc: null,
    panDoc: null,
    bankDoc: null
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: '',
    baseSalary: '',
    address: '',
    aadharNo: '',
    panNo: '',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    branchName: ''
  });

  // Recent onboarded employees for quick view & drag-reorder
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const tableRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchDepartments();
    fetchRecentEmployees();
  }, []);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('department');
        
      if (error) throw error;
      
      if (data) {
        const uniqueDeps = [...new Set(data.map(d => d.department).filter(Boolean))];
        setDepartments(uniqueDeps);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }

  async function fetchRecentEmployees() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, employee_id, user_name, department, designation, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setRecentEmployees(data);
    } catch (err) {}
  }

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  // Drag and Drop File Handlers
  const handleDrag = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveField(field);
    } else if (e.type === 'dragleave') {
      setDragActiveField(null);
    }
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveField(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFiles(prev => ({ ...prev, [field]: file }));
      toast.success(`${field.toUpperCase()} document attached!`);
    }
  };

  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  // Table Drag Scroll Handlers
  const handleMouseDown = (e) => {
    if (['BUTTON', 'INPUT', 'A', 'SVG', 'PATH'].includes(e.target.tagName)) return;
    if (!tableRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsMouseDown(false);
  const handleMouseUp = () => setIsMouseDown(false);
  const handleMouseMove = (e) => {
    if (!isMouseDown || !tableRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tableRef.current.scrollLeft = scrollLeft - walk;
  };

  // Row Drag and Drop Handlers
  const handleRowDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const updated = [...recentEmployees];
    const item = updated[draggedIdx];
    updated.splice(draggedIdx, 1);
    updated.splice(index, 0, item);
    setDraggedIdx(index);
    setRecentEmployees(updated);
  };

  const handleRowDragEnd = () => {
    setDraggedIdx(null);
  };

  const uploadDoc = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('profiles').upload(filePath, file);
    if (uploadError) return null;
    const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;

      const nextId = count ? count + 1 : 1;
      const empId = `EMP${String(nextId).padStart(3, '0')}`;

      const aadharUrl = await uploadDoc(files.aadharDoc);
      const panUrl = await uploadDoc(files.panDoc);

      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          employee_id: empId,
          user_name: formData.name,
          email_id: formData.email,
          number: parseInt(formData.phone.replace(/\D/g, ''), 10) || null,
          department: formData.department,
          designation: formData.designation,
          joining_date: formData.joiningDate,
          base_salary: Number(formData.baseSalary) || 0,
          address: formData.address,
          aadhar_no: formData.aadharNo,
          pan_no: formData.panNo,
          bank_name: formData.bankName,
          account_no: formData.accountNo,
          ifsc_code: formData.ifscCode,
          branch_name: formData.branchName,
          aadhar_doc_url: aadharUrl,
          pan_doc_url: panUrl
        }]);

      if (insertError) throw insertError;

      toast.success(`Employee ${formData.name} Onboarded Successfully as ${empId}!`);
      
      setFormData({
        name: '', email: '', phone: '', department: '', designation: '', joiningDate: '', baseSalary: '', address: '', aadharNo: '', panNo: '', bankName: '', accountNo: '', ifscCode: '', branchName: ''
      });
      setFiles({ aadharDoc: null, panDoc: null, bankDoc: null });
      fetchRecentEmployees();
    } catch (error) {
      console.error('Error inserting employee:', error);
      toast.error('Failed to onboard employee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Employee Join</h1>
        <p className="page-subtitle">Onboard a new employee to the organization with drag-and-drop file upload.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Personal & Professional Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="name" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john.doe@company.com" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 8900" />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select name="department" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                {departments.map((dep, idx) => (
                  <option key={idx} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} required placeholder="Software Engineer" />
            </div>
            <div className="form-group">
              <label>Base Salary (₹)</label>
              <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} required placeholder="50000" />
            </div>
            <div className="form-group">
              <label>Date of Joining</label>
              <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} required placeholder="Full Address" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }} rows="3" />
            </div>
          </div>

          <h3 style={{ marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Identity Documents (Drag & Drop Supported)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Aadhar Document (No.)</label>
              <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleChange} required placeholder="1234 5678 9012" />
              
              <div 
                onDragEnter={(e) => handleDrag(e, 'aadharDoc')}
                onDragOver={(e) => handleDrag(e, 'aadharDoc')}
                onDragLeave={(e) => handleDrag(e, 'aadharDoc')}
                onDrop={(e) => handleDrop(e, 'aadharDoc')}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: dragActiveField === 'aadharDoc' ? '2px dashed var(--primary-color)' : '1px dashed var(--border-color)',
                  backgroundColor: dragActiveField === 'aadharDoc' ? 'rgba(79, 70, 229, 0.05)' : '#fafafa',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <Upload size={20} style={{ color: 'var(--primary-color)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {files.aadharDoc ? `Attached: ${files.aadharDoc.name}` : 'Drag & drop Aadhar file here or click to browse'}
                  </span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'aadharDoc')} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>PAN Card No.</label>
              <input type="text" name="panNo" value={formData.panNo} onChange={handleChange} required placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
              
              <div 
                onDragEnter={(e) => handleDrag(e, 'panDoc')}
                onDragOver={(e) => handleDrag(e, 'panDoc')}
                onDragLeave={(e) => handleDrag(e, 'panDoc')}
                onDrop={(e) => handleDrop(e, 'panDoc')}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: dragActiveField === 'panDoc' ? '2px dashed var(--primary-color)' : '1px dashed var(--border-color)',
                  backgroundColor: dragActiveField === 'panDoc' ? 'rgba(79, 70, 229, 0.05)' : '#fafafa',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <Upload size={20} style={{ color: 'var(--primary-color)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {files.panDoc ? `Attached: ${files.panDoc.name}` : 'Drag & drop PAN file here or click to browse'}
                  </span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'panDoc')} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Bank Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Bank Name</label>
              <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} required placeholder="e.g. HDFC Bank" />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input type="text" name="accountNo" value={formData.accountNo} onChange={handleChange} required placeholder="123456789012" />
            </div>
            <div className="form-group">
              <label>IFSC Code</label>
              <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} required placeholder="HDFC0001234" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label>Branch Name</label>
              <input type="text" name="branchName" value={formData.branchName} onChange={handleChange} required placeholder="e.g. Connaught Place" />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '24px' }} disabled={loading}>
            {loading ? 'Onboarding...' : 'Onboard Employee'}
          </button>
        </form>
      </div>

      {/* Draggable Recent Onboarded Employees Table */}
      {recentEmployees.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Recent Onboarded Employees (Draggable Rows & Drag-Scroll Table)
          </h3>
          <div 
            ref={tableRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ 
              overflowX: 'auto', 
              maxHeight: '400px',
              overflowY: 'auto',
              cursor: isMouseDown ? 'grabbing' : 'grab',
              userSelect: isMouseDown ? 'none' : 'auto'
            }}
          >
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28px' }}></th>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id || idx}
                    draggable
                    onDragStart={(e) => handleRowDragStart(e, idx)}
                    onDragOver={(e) => handleRowDragOver(e, idx)}
                    onDragEnd={handleRowDragEnd}
                    style={{
                      opacity: draggedIdx === idx ? 0.4 : 1,
                      backgroundColor: draggedIdx === idx ? '#f0f4ff' : undefined,
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ cursor: 'grab', color: '#9ca3af', paddingRight: '4px', textAlign: 'center' }} title="Drag to reorder">
                      <GripVertical size={16} />
                    </td>
                    <td>{emp.employee_id}</td>
                    <td style={{ fontWeight: 500 }}>{emp.user_name}</td>
                    <td>{emp.department || '-'}</td>
                    <td>{emp.designation || emp.Designation || '-'}</td>
                    <td>{emp.created_at ? new Date(emp.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
