import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  HelpCircle, 
  User, 
  Building2, 
  Phone, 
  AlertCircle, 
  Sparkles, 
  Lightbulb, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  MessageSquare, 
  ShieldCheck,
  FileText,
  ChevronDown,
  Info
} from 'lucide-react';
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
    if (!formData.name?.toString().trim()) newErrors.name = 'Please select employee name';
    if (!formData.department?.toString().trim()) newErrors.department = 'Department is required';
    if (!formData.number?.toString().trim()) newErrors.number = 'WhatsApp contact number is required';
    if (!formData.challenge?.toString().trim()) newErrors.challenge = 'Please describe the challenge or question';
    if (!formData.solution1?.toString().trim()) newErrors.solution1 = 'Please provide your best recommended solution';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-200/50 py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Page Header (Single row: Left content, Right tabs) */}
      <div className={`mx-auto mb-6 sm:mb-8 animate-in fade-in duration-300 ${activeTab === 'form' ? 'max-w-4xl' : 'max-w-7xl'}`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          
          {/* Left Side: Title & Description */}
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-600 mb-2 shadow-2xs">
              <HelpCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Help Slip Module</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Submit a Support Request
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500">
              Describe your operational hurdle clearly and propose your best actionable solutions for rapid management resolution.
            </p>
          </div>

          {/* Right Side: Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-full shadow-inner shrink-0 self-start sm:self-end">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`rounded-full py-2 px-5 text-xs font-bold transition-all ${
                activeTab === 'form' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Help Slip
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`rounded-full py-2 px-5 text-xs font-bold transition-all ${
                activeTab === 'list' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Submissions
            </button>
          </div>

        </div>
      </div>

      {activeTab === 'form' ? (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl shadow-xl border border-red-200/80 overflow-hidden mb-12">
            
            {/* Top Form Header Banner - Light Red Theme */}
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-100/70 border-b border-red-200/80 px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-red-100 text-red-600 rounded-2xl border border-red-200/80 shadow-2xs">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-red-950 tracking-tight flex items-center gap-2">
                    Support Request Form
                  </h2>
                  <p className="text-xs sm:text-sm text-red-800/80 font-medium mt-0.5">
                    Fill in the details below. Notifications will be instantly sent to management.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full shadow-2xs w-fit">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp Reply Enabled</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              
              {/* SECTION 1: EMPLOYEE DETAILS */}
              <div className="bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">1. Employee Identification</h3>
                      <p className="text-xs text-slate-500">Select your name to auto-load department and contact number</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider bg-red-50 px-2.5 py-1 rounded-full border border-red-200/60 w-fit">
                    * Required Details
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  
                  {/* Name Dropdown */}
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Employee Name <span className="text-red-500">*</span></span>
                    </label>
                    <div className="relative">
                      <select
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleUserSelect}
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs transition appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${
                          errors.name ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <option value="">Select Employee</option>
                        {usersList.map((user, idx) => (
                          <option key={idx} value={user.user_name}>{user.user_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                  </div>

                  {/* Department (Auto-filled) */}
                  <div className="space-y-1.5">
                    <label htmlFor="department" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Department <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Auto-detected</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        id="department"
                        name="department"
                        placeholder="Auto-filled from user selection"
                        required
                        value={formData.department}
                        onChange={handleChange}
                        className={`w-full rounded-xl border bg-slate-100/70 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white ${
                          errors.department ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.department && <p className="text-xs text-red-500 font-medium">{errors.department}</p>}
                  </div>

                  {/* Number (Auto-filled) */}
                  <div className="space-y-1.5">
                    <label htmlFor="number" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>WhatsApp Number <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" /> For Reply
                      </span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <input
                        type="tel"
                        id="number"
                        name="number"
                        placeholder="Auto-filled WhatsApp number"
                        required
                        value={formData.number}
                        onChange={handleChange}
                        className={`w-full rounded-xl border bg-slate-100/70 pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white ${
                          errors.number ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.number && <p className="text-xs text-red-500 font-medium">{errors.number}</p>}
                  </div>

                </div>
              </div>

              {/* SECTION 2: THE CHALLENGE */}
              <div className="bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/70 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                  <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">2. Challenge or Question Faced</h3>
                    <p className="text-xs text-slate-500">Describe the specific operational bottleneck or challenge in detail</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">
                      Detailed Problem Description <span className="text-red-500">*</span>
                    </span>
                    <span className="text-slate-400 font-mono">{formData.challenge.length} / 1000 characters</span>
                  </div>
                  <textarea
                    id="challenge"
                    name="challenge"
                    rows={4}
                    maxLength={1000}
                    required
                    placeholder="Clearly explain the challenge... (e.g., I have been requesting the Rama Power ledger and debit note for the past 3 months, but have not received any response yet.)"
                    value={formData.challenge}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-white p-3.5 text-sm text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${
                      errors.challenge ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                  {errors.challenge && <p className="text-xs text-red-500 font-medium">{errors.challenge}</p>}
                </div>
              </div>

              {/* SECTION 3: PROPOSED SOLUTIONS */}
              <div className="bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">3. Proposed Solutions & Ideas</h3>
                      <p className="text-xs text-slate-500">Help Slip Principle: Always suggest your best recommended solutions</p>
                    </div>
                  </div>
                </div>

                {/* Info Tip Box */}
                <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pro-Tip:</strong> Providing 2-3 practical suggestions allows management to approve the best action immediately without unnecessary back-and-forth discussions.
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  
                  {/* Solution 1 (Best - Required) */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 rounded-xl p-4 border border-emerald-300/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="solution1" className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Best Solution (Primary Recommendation) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        Recommended Option
                      </span>
                    </div>
                    <textarea
                      id="solution1"
                      name="solution1"
                      rows={2}
                      maxLength={500}
                      required
                      placeholder="What is your best immediate solution or recommendation to resolve this issue?"
                      value={formData.solution1}
                      onChange={handleChange}
                      className={`w-full rounded-lg border bg-white p-3 text-sm text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 ${
                        errors.solution1 ? 'border-red-400 ring-2 ring-red-100' : 'border-emerald-200'
                      }`}
                    />
                    {errors.solution1 && <p className="text-xs text-red-500 font-medium">{errors.solution1}</p>}
                  </div>

                  {/* Solution 2 (Alternative 1) */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="solution2" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        Second Best Solution (Alternative 1)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <textarea
                      id="solution2"
                      name="solution2"
                      rows={2}
                      maxLength={500}
                      placeholder="Enter an alternative solution or backup idea..."
                      value={formData.solution2}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white"
                    />
                  </div>

                  {/* Solution 3 (Alternative 2) */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="solution3" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                        Third Best Solution (Alternative 2)
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <textarea
                      id="solution3"
                      name="solution3"
                      rows={2}
                      maxLength={500}
                      placeholder="Enter another contingency or long-term plan idea..."
                      value={formData.solution3}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-800 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white"
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Bottom Form Action Buttons */}
            <div className="bg-gradient-to-r from-red-50/30 via-slate-50/60 to-rose-50/30 border-t border-red-200/70 px-6 sm:px-8 py-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Superadmin will receive WhatsApp notification upon submission</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 rounded-xl shadow-md shadow-red-600/25 transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit Help Slip</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

        </div>
      ) : (
        <HelpSlipList />
      )}
    </div>
  );
};

export default HelpSlip;
