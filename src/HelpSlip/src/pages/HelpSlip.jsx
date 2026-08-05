import React, { useState, useEffect } from 'react';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Button from '../components/Button';
import FormCard from '../components/FormCard';
import toast from 'react-hot-toast';
import HelpSlipList from './HelpSlipList';
import supabase from '../../../SupabaseClient';
import { sendNewHelpSlipNotification } from '../../../services/whatsappService';

const HelpSlip = () => {
  const initialState = {
    name: '',
    department: '',
    number: '',
    challenge: '',
    solution1: '',
    solution2: '',
    solution3: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, user_name, department, number, status');
        if (data) {
          const activeUsers = data.filter(u => !u.status || u.status.toLowerCase() === 'active');
          setUsersList(activeUsers);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleUserSelect = (e) => {
    const selectedName = e.target.value;
    const user = usersList.find(u => u.user_name === selectedName);
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_name,
        department: user.department || '',
        number: user.number || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: selectedName,
        department: '',
        number: ''
      }));
    }
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.toString().trim()) newErrors.name = 'Name is required';
    if (!formData.department.toString().trim()) newErrors.department = 'Department is required';
    if (!formData.number?.toString().trim()) newErrors.number = 'Number is required';
    if (!formData.challenge.toString().trim()) newErrors.challenge = 'Challenge is required';
    if (!formData.solution1.toString().trim()) newErrors.solution1 = 'Best solution is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('help_slips')
          .insert([{
            name: formData.name,
            department: formData.department,
            number: formData.number,
            challenge: formData.challenge,
            solution1: formData.solution1,
            solution2: formData.solution2 || null,
            solution3: formData.solution3 || null
          }]);

        if (error) throw error;

        toast.success('Help Slip submitted successfully!');

        // Send WhatsApp notification to Admin
        sendNewHelpSlipNotification({
          userName: formData.name,
          department: formData.department,
          userPhone: formData.number,
          challenge: formData.challenge,
          solution1: formData.solution1,
          solution2: formData.solution2,
          solution3: formData.solution3
        });

        setFormData(initialState);
        setActiveTab('list');
      } catch (err) {
        console.error("Error submitting help slip:", err);
        toast.error('Failed to submit: ' + (err.message || 'Error occurred'));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReset = () => {
    setFormData(initialState);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center mb-6">
        <p className="inline-flex rounded-full bg-red-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-red-700 mb-2">Help Slip</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Submit a Support Request</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-slate-600">Describe your challenge clearly and share the best solution along with alternative ideas.</p>
      </div>

      <div className="max-w-5xl mx-auto mb-4 flex flex-col sm:flex-row justify-center items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('form')}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${activeTab === 'form' ? 'bg-red-600 text-white shadow-xl shadow-red-200/50' : 'bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:text-red-600'}`}
        >
          New Help Slip
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${activeTab === 'list' ? 'bg-red-600 text-white shadow-xl shadow-red-200/50' : 'bg-white text-slate-700 border border-slate-200 hover:border-red-300 hover:text-red-600'}`}
        >
          Submissions
        </button>
      </div>

      {activeTab === 'form' ? (
        <form onSubmit={handleSubmit} noValidate>
          <FormCard title="Help Slip Form" subtitle="Please fill out your details and describe the challenge.">
            <div className="space-y-4">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Employee Details</h2>
                    <p className="mt-1 text-sm text-slate-500">Tell us who is raising the help slip.</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Required fields *</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col mb-4">
                    <label htmlFor="name" className="mb-2 text-sm font-semibold text-slate-800">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleUserSelect}
                      className={`w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm transition duration-200 ease-in-out focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 ${errors.name ? 'border-red-400 focus:ring-red-100 bg-red-50' : ''}`}
                    >
                      <option value="">Select Name</option>
                      {usersList.map((user, idx) => (
                        <option key={idx} value={user.user_name}>{user.user_name}</option>
                      ))}
                    </select>
                    {errors.name && <span className="mt-2 text-xs text-red-500">{errors.name}</span>}
                  </div>
                  
                  <Input
                    id="department"
                    label="Department"
                    placeholder="Auto-filled from user selection"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    error={errors.department}
                  />

                  <Input
                    id="number"
                    label="Number"
                    placeholder="Auto-filled from user selection"
                    required
                    value={formData.number}
                    onChange={handleChange}
                    error={errors.number}
                  />
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Challenge & Solutions</h2>
                  <p className="mt-1 text-sm text-slate-500">Explain the issue and share your best recommended solutions.</p>
                </div>

                <TextArea
                  id="challenge"
                  label="Challenge Faced / Question"
                  placeholder="Describe the challenge or problem you are facing..."
                  required
                  value={formData.challenge}
                  onChange={handleChange}
                  error={errors.challenge}
                />

                <div className="grid gap-3">
                  <TextArea
                    id="solution1"
                    label="Best Solution"
                    placeholder="Enter your best solution..."
                    required
                    value={formData.solution1}
                    onChange={handleChange}
                    error={errors.solution1}
                  />
                  <TextArea
                    id="solution2"
                    label="Second Best Solution"
                    placeholder="Enter an alternative solution..."
                    value={formData.solution2}
                    onChange={handleChange}
                  />
                  <TextArea
                    id="solution3"
                    label="Third Best Solution"
                    placeholder="Enter another possible solution..."
                    value={formData.solution3}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </FormCard>

          <div className="max-w-5xl mx-auto flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4 mb-10">
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit
            </Button>
          </div>
        </form>
      ) : (
        <HelpSlipList />
      )}
    </div>
  );
};

export default HelpSlip;
