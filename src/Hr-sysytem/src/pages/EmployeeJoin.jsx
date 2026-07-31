import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function EmployeeJoin() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

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

  useEffect(() => {
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
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current count to generate EMP ID
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (countError) throw countError;

      const nextId = count ? count + 1 : 1;
      const empId = `EMP${String(nextId).padStart(3, '0')}`;

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
          branch_name: formData.branchName
        }]);

      if (insertError) throw insertError;

      toast.success(`Employee ${formData.name} Onboarded Successfully as ${empId}!`);
      
      setFormData({
        name: '', email: '', phone: '', department: '', designation: '', joiningDate: '', baseSalary: '', address: '', aadharNo: '', panNo: '', bankName: '', accountNo: '', ifscCode: '', branchName: ''
      });
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
        <p className="page-subtitle">Onboard a new employee to the organization.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Personal & Professional Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
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

          <h3 style={{ marginTop: '32px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Identity Documents</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Aadhar Document (No.)</label>
              <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleChange} required placeholder="1234 5678 9012" />
            </div>
            <div className="form-group">
              <label>PAN Card No.</label>
              <input type="text" name="panNo" value={formData.panNo} onChange={handleChange} required placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
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
    </div>
  );
}
