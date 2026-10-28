import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Pencil, Trash2, Loader, Filter, Users, UserCheck, Briefcase, Building, Search, Cake, Sparkles, Phone, Calendar, RefreshCw, Eye, Mail, MapPin, CreditCard, Shield, FileText } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { sendBirthdayWishes } from '../../../services/whatsappService';

const DocumentPreview = ({ file, url, onPreview }) => {
  if (!file && !url) return null;
  const isImageFile = file && file.type.startsWith('image/');
  // Assume it's an image unless it explicitly contains .pdf
  const isImageUrl = url && !url.toLowerCase().includes('.pdf');
  
  if (isImageFile) {
    const previewUrl = URL.createObjectURL(file);
    return <div style={{ marginTop: '8px', cursor: 'pointer' }} onClick={() => onPreview(previewUrl)}><img src={previewUrl} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></div>;
  } else if (file) {
     return <div style={{ marginTop: '4px' }}><small style={{ color: 'var(--success)' }}>{file.name}</small></div>;
  } else if (isImageUrl) {
    return <div style={{ marginTop: '8px', cursor: 'pointer' }} onClick={() => onPreview(url)}><img src={url} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></div>;
  } else if (url) {
    return <div style={{ marginTop: '4px' }}><a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>View Existing Document</a></div>;
  }
  return null;
};

const calculateDynamicExperience = (joiningDate, fallbackExperience) => {
  if (!joiningDate) return fallbackExperience || '-';
  const joinDate = new Date(joiningDate);
  const today = new Date();
  
  if (isNaN(joinDate.getTime())) return fallbackExperience || '-';
  
  let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
  months -= joinDate.getMonth();
  months += today.getMonth();
  
  if (months <= 0) return 'Fresher';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  let expStr = '';
  if (years > 0) expStr += `${years} Year${years > 1 ? 's' : ''} `;
  if (remainingMonths > 0) expStr += `${remainingMonths} Month${remainingMonths > 1 ? 's' : ''}`;
  
  return expStr.trim();
};

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
};

const getDesignationStyle = (desg) => {
  if (!desg) return { color: 'var(--text-secondary)' };
  const d = desg.toUpperCase().trim();
  switch (d) {
    case 'HELPING HANDS': return { backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE ENTERPRISE': return { backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL PVT.LTD.': return { backgroundColor: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE LOGISTICS': return { backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'BOTIVATE': return { backgroundColor: '#ffe4e6', color: '#be123c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'JAI BHOLE TRADERS': return { backgroundColor: '#ffedd5', color: '#c2410c', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    case 'ASAK COAL LOGISTICS': return { backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
    default: return { backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block', whiteSpace: 'nowrap', textAlign: 'center' };
  }
};

const getDesignationSortOrder = (desg) => {
  if (!desg) return 8; // empty or undefined at the bottom
  const d = desg.toUpperCase().trim();
  if (d === 'JAI BHOLE') return 1;
  if (d.includes('JAI BHOLE ENTERPRISE')) return 2; // matches ENTERPRISE or ENTERPRISES
  if (d.includes('JAI BHOLE LOGISTIC')) return 3;
  if (d.includes('JAI BHOLE TRADER')) return 4;
  if (d.includes('ASAK COAL PVT') || (d.includes('ASAK') && !d.includes('LOGISTIC'))) return 5;
  if (d.includes('ASAK COAL LOGISTIC') || d.includes('ASAK LOGISTIC')) return 6;
  if (d.includes('HELPING HAND')) return 7;
  return 8; // empty or any other unlisted at the end
};

// Returns total experience in months (number) for accurate numeric sorting (highest experience on top)
const getEmployeeExperienceMonths = (emp) => {
  if (emp?.joining_date) {
    const joinDate = new Date(emp.joining_date);
    if (!isNaN(joinDate.getTime())) {
      const today = new Date();
      let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
      months -= joinDate.getMonth();
      months += today.getMonth();
      if (months > 0) return months;
    }
  }

  // Fallback: parse string experience like "11 Years 6 Months", "5 Years", "8 Months", "2.5 Years", etc.
  const expStr = String(emp?.experience || '').toLowerCase().trim();
  if (!expStr || expStr === '-' || expStr === 'fresher') return 0;

  let totalMonths = 0;
  const yearMatch = expStr.match(/(\d+(?:\.\d+)?)\s*(?:year|yr|y)/i);
  const monthMatch = expStr.match(/(\d+)\s*(?:month|mo|m)/i);

  if (yearMatch) {
    totalMonths += Math.round(parseFloat(yearMatch[1]) * 12);
  }
  if (monthMatch) {
    totalMonths += parseInt(monthMatch[1], 10);
  }

  // If just a raw number was stored e.g. "5" (assume years)
  if (!yearMatch && !monthMatch) {
    const rawNum = parseFloat(expStr);
    if (!isNaN(rawNum)) {
      totalMonths += Math.round(rawNum * 12);
    }
  }

  return totalMonths;
};

const getEmployeePhotoUrl = (emp) => {
  const photo = emp?.photo || emp?.profile_image || '';
  if (!photo) return null;
  return photo.startsWith('image/') ? `data:${photo}` : photo;
};

export default function EmployeeMaster() {
  // Main state
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [todaysBirthdays, setTodaysBirthdays] = useState([]);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  const uniqueNames = useMemo(() => {
    const names = new Set();
    employees.forEach(emp => {
      const n = emp.user_name;
      if (n) names.add(n);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const uniqueDesignations = useMemo(() => {
    const desgs = new Set();
    employees.forEach(emp => {
      const d = emp.designation || emp.Designation;
      if (d) desgs.add(d);
    });
    return Array.from(desgs).sort();
  }, [employees]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      const d = emp.department;
      if (d) depts.add(d);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Drag scroll and row reordering states
  const tableRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (['BUTTON', 'INPUT', 'A', 'SVG', 'PATH'].includes(e.target.tagName)) return;
    if (!tableRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !tableRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tableRef.current.scrollLeft = scrollLeft - walk;
  };

  // Edit state
  const [editingId, setEditingId] = useState(null);

  // Add state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  const initialFormData = {
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
    branchName: '',
    fathersName: '',
    alternatePhone: '',
    maritalStatus: '',
    bloodGroup: '',
    healthIssues: '',
    photo: '',
    aadharDocUrl: '',
    panDocUrl: '',
    dlDocUrl: '',
    accountDocUrl: '',
    dateOfBirth: '',
    drivingLicence: '',
    experience: '',
    pfApplicable: false,
    esicApplicable: false,
    status: 'active',
    displayOrder: ''
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [dlFile, setDlFile] = useState(null);
  const [accountFile, setAccountFile] = useState(null);
  
  // Image Preview Modal State
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Employee Detail View Modal State
  const [viewEmployeeModal, setViewEmployeeModal] = useState(null);
  const [isViewingLoading, setIsViewingLoading] = useState(false);

  const handleEmployeePhotoClick = (emp) => {
    const photoUrl = getEmployeePhotoUrl(emp);
    if (photoUrl) setPreviewModalImg(photoUrl);
  };

  const handleViewEmployee = async (emp) => {
    setIsViewingLoading(true);
    setViewEmployeeModal(emp); // show initial info immediately
    try {
      const { data: fullEmp, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', emp.id)
        .single();
      if (!error && fullEmp) {
        setViewEmployeeModal(fullEmp);
      }
    } catch (e) {
      console.warn("Could not fetch full details, showing available info:", e);
    } finally {
      setIsViewingLoading(false);
    }
  };

  // Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchDepartments()]);
  }, []);

  useEffect(() => {
    if (formData.ifscCode && formData.ifscCode.length === 11) {
      const toastId = toast.loading('Fetching Bank Details...');
      fetch(`https://ifsc.razorpay.com/${formData.ifscCode.toUpperCase()}`)
        .then(res => {
          if (!res.ok) throw new Error('Invalid IFSC Code');
          return res.json();
        })
        .then(data => {
          if (data && data.BRANCH) {
            let actualBranch = data.BRANCH;
            if (actualBranch.toUpperCase() === 'BRANCH') {
              if (data.ADDRESS) {
                const parts = data.ADDRESS.split(',');
                if (parts.length > 1) {
                  let possibleBranch = parts[1].trim();
                  possibleBranch = possibleBranch.replace(/ BRANCH$/i, '').trim();
                  actualBranch = possibleBranch || data.CITY;
                } else {
                  actualBranch = data.CITY || data.BRANCH;
                }
              } else if (data.CITY) {
                actualBranch = data.CITY;
              }
            }
            setFormData(prev => ({
              ...prev,
              branchName: actualBranch,
              bankName: data.BANK || prev.bankName
            }));
            toast.success('Bank details fetched!', { id: toastId });
          } else {
            toast.dismiss(toastId);
          }
        })
        .catch(err => {
          console.log('Error fetching IFSC:', err);
          toast.error('Invalid IFSC Code.', { id: toastId });
        });
    }
  }, [formData.ifscCode]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, employee_id, user_name, department, designation, status, created_at, number, joining_date, fathers_name, experience, photo, profile_image, display_order, date_of_birth')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      const fetchedEmployees = data || [];
      const activeEmployees = fetchedEmployees.filter(emp => !emp.status || emp.status.toLowerCase() === 'active');
      setEmployees(activeEmployees);

      // Check for birthdays today
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      
      const bdays = fetchedEmployees.filter(emp => {
        if (!emp.date_of_birth) return false;
        const dob = new Date(emp.date_of_birth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
      });

      if (bdays.length > 0) {
        setTodaysBirthdays(bdays);
        
        const todayStr = today.toISOString().split('T')[0];
        
        if (!sessionStorage.getItem('birthdayShown')) {
          setShowBirthdayModal(true);
          sessionStorage.setItem('birthdayShown', 'true');
        }

        if (localStorage.getItem('birthdayMsgSentDate') !== todayStr) {
           bdays.forEach(emp => {
             sendBirthdayWishes({ userName: emp.user_name, number: emp.number });
           });
           localStorage.setItem('birthdayMsgSentDate', todayStr);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('users').select('department');
      if (error) throw error;
      if (data) {
        const uniqueDeps = [...new Set(data.map(d => d.department).filter(Boolean))];
        setDepartments(uniqueDeps);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // --- Handlers for Editing / Deleting ---
  const handleDelete = async (emp) => {
    if(window.confirm(`Are you sure you want to mark ${emp.user_name} as Inactive?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .eq('id', emp.id);
          
        if (error) throw error;
        setEmployees(employees.filter(e => e.id !== emp.id));
        toast.success('Employee marked as Inactive successfully');
      } catch (error) {
        console.error('Error deactivating employee:', error);
        toast.error('Failed to deactivate employee');
      }
    }
  };

  const handleEdit = async (emp) => {
    // Optimistically open modal with partial data if we want, or just fetch full data first
    try {
      const toastId = toast.loading('Loading employee details...');
      const { data: fullEmp, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', emp.id)
        .single();
        
      toast.dismiss(toastId);
      
      if (error) throw error;

      const existingPhoto = fullEmp.photo || fullEmp.profile_image || '';
      
      setEditingId(fullEmp.id);
      setFormData({
        name: fullEmp.user_name || '',
        email: fullEmp.email_id || '',
        phone: fullEmp.number ? fullEmp.number.toString() : '',
        department: fullEmp.department || '',
        designation: fullEmp.Designation || fullEmp.designation || '',
        joiningDate: fullEmp.joining_date || '',
        baseSalary: fullEmp.base_salary ? Number(fullEmp.base_salary).toLocaleString('en-IN') : '',
        address: fullEmp.address || '',
        aadharNo: fullEmp.aadhar_no || '',
        panNo: fullEmp.pan_no || '',
        bankName: fullEmp.bank_name || '',
        accountNo: fullEmp.account_no || '',
        ifscCode: fullEmp.ifsc_code || '',
        branchName: fullEmp.branch_name || '',
        fathersName: fullEmp.fathers_name || '',
        alternatePhone: fullEmp.alternate_phone || '',
        maritalStatus: fullEmp.marital_status || '',
        bloodGroup: fullEmp.blood_group || '',
        healthIssues: fullEmp.health_issues || '',
        dateOfBirth: fullEmp.date_of_birth || '',
        drivingLicence: fullEmp.driving_licence || '',
        experience: fullEmp.experience || '',
        photo: existingPhoto,
        aadharDocUrl: fullEmp.aadhar_doc_url || '',
        panDocUrl: fullEmp.pan_doc_url || '',
        dlDocUrl: fullEmp.dl_doc_url || '',
        accountDocUrl: fullEmp.account_doc_url || '',
        pfApplicable: fullEmp.pf_applicable || false,
        esicApplicable: fullEmp.esic_applicable || false,
        status: fullEmp.status || 'Active',
        displayOrder: fullEmp.display_order ?? ''
      });
      setPhotoPreview(existingPhoto ? getEmployeePhotoUrl(fullEmp) : null);
      setAadharFile(null);
      setPanFile(null);
      setDlFile(null);
      setAccountFile(null);
      setIsAddModalOpen(true);
    } catch (err) {
      console.error('Error fetching full details:', err);
      toast.error('Failed to load employee details');
    }
  };

  // --- Handlers for Adding/Editing Employee ---
  const handleAddChange = (e) => {
    if (['photoFile', 'aadharFile', 'panFile', 'dlFile', 'accountFile'].includes(e.target.name)) {
      const file = e.target.files[0];
      const preview = file ? URL.createObjectURL(file) : null;
      if (e.target.name === 'photoFile') { 
        if (file) {
          setCropImageSrc(preview);
          setCropModalOpen(true);
        }
      }
      else if (e.target.name === 'aadharFile') setAadharFile(file);
      if (e.target.name === 'panFile') setPanFile(file);
      if (e.target.name === 'dlFile') setDlFile(file);
      if (e.target.name === 'accountFile') setAccountFile(file);
    } else if (e.target.type === 'checkbox') {
      setFormData({...formData, [e.target.name]: e.target.checked});
    } else {
      let value = e.target.value;
      if (e.target.name === 'baseSalary') {
        const rawValue = value.replace(/\D/g, '');
        value = rawValue ? Number(rawValue).toLocaleString('en-IN') : '';
      }
      let newFormData = { ...formData, [e.target.name]: value };
      
      if (e.target.name === 'joiningDate' && e.target.value) {
        const joinDate = new Date(e.target.value);
        const today = new Date();
        if (joinDate <= today) {
          let diffMonths = (today.getFullYear() - joinDate.getFullYear()) * 12;
          diffMonths -= joinDate.getMonth();
          diffMonths += today.getMonth();
          
          if (today.getDate() < joinDate.getDate()) {
            diffMonths--;
          }
          
          if (diffMonths <= 0) {
            newFormData.experience = 'Fresher';
          } else {
            const years = Math.floor(diffMonths / 12);
            const months = diffMonths % 12;
            let expStr = '';
            if (years > 0) expStr += `${years} Year${years > 1 ? 's' : ''} `;
            if (months > 0) expStr += `${months} Month${months > 1 ? 's' : ''}`;
            newFormData.experience = expStr.trim();
          }
        }
      }
      
      setFormData(newFormData);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    try {
      const croppedImageFile = await getCroppedImg(
        cropImageSrc,
        croppedAreaPixels
      );
      const preview = URL.createObjectURL(croppedImageFile);
      setPhotoFile(new File([croppedImageFile], "profile.jpg", { type: "image/jpeg" }));
      setPhotoPreview(preview);
      setCropModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    const aadharLen = formData.aadharNo ? formData.aadharNo.replace(/\s/g, '').length : 0;
    if (aadharLen > 0 && aadharLen < 12) {
      toast.error('Aadhar Number must be at least 12 characters');
      return;
    }
    const panLen = formData.panNo ? formData.panNo.replace(/\s/g, '').length : 0;
    if (panLen > 0 && panLen < 10) {
      toast.error('PAN Card Number must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadFile = async (file) => {
        if (!file) return null;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `documents/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('profiles').upload(filePath, file);
        if (uploadError) throw new Error('Document upload failed. ' + uploadError.message);
        const { data } = supabase.storage.from('profiles').getPublicUrl(filePath);
        return data.publicUrl;
      };

      let uploadedPhotoUrl = formData.photo;
      if (photoFile) uploadedPhotoUrl = await uploadFile(photoFile);
      
      let aadharDocUrl = formData.aadharDocUrl;
      if (aadharFile) aadharDocUrl = await uploadFile(aadharFile);
      
      let panDocUrl = formData.panDocUrl;
      if (panFile) panDocUrl = await uploadFile(panFile);
      
      let dlDocUrl = formData.dlDocUrl;
      if (dlFile) dlDocUrl = await uploadFile(dlFile);
      
      let accountDocUrl = formData.accountDocUrl;
      if (accountFile) accountDocUrl = await uploadFile(accountFile);

      const employeeData = {
        user_name: formData.name,
        email_id: formData.email,
        number: parseInt(formData.phone.replace(/\D/g, ''), 10) || null,
        department: formData.department,
        designation: formData.designation,
        joining_date: formData.joiningDate || null,
        base_salary: Number(String(formData.baseSalary).replace(/,/g, '')) || 0,
        address: formData.address,
        aadhar_no: formData.aadharNo,
        pan_no: formData.panNo,
        bank_name: formData.bankName,
        account_no: formData.accountNo,
        ifsc_code: formData.ifscCode,
        branch_name: formData.branchName,
        fathers_name: formData.fathersName,
        alternate_phone: formData.alternatePhone,
        marital_status: formData.maritalStatus,
        blood_group: formData.bloodGroup,
        health_issues: formData.healthIssues,
        date_of_birth: formData.dateOfBirth || null,
        driving_licence: formData.drivingLicence,
        experience: formData.experience,
        photo: uploadedPhotoUrl,
        aadhar_doc_url: aadharDocUrl,
        pan_doc_url: panDocUrl,
        dl_doc_url: dlDocUrl,
        account_doc_url: accountDocUrl,
        pf_applicable: formData.pfApplicable,
        esic_applicable: formData.esicApplicable,
        status: formData.status,
        display_order: formData.displayOrder ? parseInt(formData.displayOrder, 10) : 0
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('users')
          .update(employeeData)
          .eq('id', editingId);
          
        if (updateError) throw updateError;
        toast.success(`Employee ${formData.name} Updated Successfully!`);
      } else {
        // Get current count to generate EMP ID
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        if (countError) throw countError;

        const nextId = count ? count + 1 : 1;
        const empId = `EMP${String(nextId).padStart(3, '0')}`;
        employeeData.employee_id = empId;

        const { error: insertError } = await supabase
          .from('users')
          .insert([employeeData]);

        if (insertError) throw insertError;

        toast.success(`Employee ${formData.name} Onboarded Successfully as ${empId}!`);
      }
      
      setFormData(initialFormData);
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsAddModalOpen(false);
      setEditingId(null);
      fetchEmployees(); // Refresh list
    } catch (error) {
      console.error('Error inserting employee:', error);
      toast.error('Failed to onboard employee: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Birthday Banner */}
      {todaysBirthdays.length > 0 && (
        <div style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🎉🎂</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <marquee behavior="scroll" direction="left" scrollamount="6" style={{ fontWeight: 'bold', color: '#be185d', fontSize: '1.1rem', paddingTop: '4px' }}>
              {todaysBirthdays.map((emp, idx) => (
                <span key={emp.id} style={{ marginRight: '40px' }}>
                  Wishing a very Happy Birthday to {emp.user_name} ({emp.designation || emp.Designation || 'Employee'})! 🎈
                </span>
              ))}
            </marquee>
          </div>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🎂🎉</div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Employee Master</h1>
          <p className="text-sm text-slate-500 mt-1">View, onboard, and manage all employee records and profiles.</p>
        </div>
        <button 
          className="btn-primary shadow-md hover:shadow-lg transition-all" 
          onClick={() => {
            setEditingId(null);
            setFormData(initialFormData);
            setPhotoFile(null);
            setPhotoPreview(null);
            setAadharFile(null);
            setPanFile(null);
            setDlFile(null);
            setAccountFile(null);
            setIsAddModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Add New Employee
        </button>
      </div>

      {/* Modern KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Employees */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Employees</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {loading ? '...' : employees.length}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> Active on Payroll
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-50 to-rose-100 text-red-600 flex items-center justify-center shadow-inner">
            <Users size={26} />
          </div>
        </div>

        {/* Departments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Departments</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {loading ? '...' : uniqueDepartments.length}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Functional Units</p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center shadow-inner">
            <Building size={26} />
          </div>
        </div>

        {/* Designations / Firms */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Designations</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {loading ? '...' : uniqueDesignations.length}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Roles & Firms</p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-100 text-amber-600 flex items-center justify-center shadow-inner">
            <Briefcase size={26} />
          </div>
        </div>

        {/* Birthdays Today or Fresher/Exp */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {todaysBirthdays.length > 0 ? "Today's Birthdays" : "Quick Action"}
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {todaysBirthdays.length > 0 ? `${todaysBirthdays.length} 🎂` : '100%'}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {todaysBirthdays.length > 0 ? 'Wishes sent automatically' : 'Verified records'}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-50 to-fuchsia-100 text-purple-600 flex items-center justify-center shadow-inner">
            {todaysBirthdays.length > 0 ? <Cake size={26} /> : <UserCheck size={26} />}
          </div>
        </div>
      </div>

      <div className="card shadow-sm border border-slate-200/80 rounded-2xl">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px', maxWidth: '340px' }}>
            <Search 
              size={17} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#94a3b8', 
                pointerEvents: 'none',
                zIndex: 1
              }} 
            />
            <input 
              type="text" 
              placeholder="Search by name, ID, department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                fontSize: '0.875rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <select
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            style={{ maxWidth: '200px', minWidth: '160px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
          >
            <option value="">All Names</option>
            {uniqueNames.map((name, idx) => (
              <option key={idx} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            style={{ maxWidth: '200px', minWidth: '160px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
          >
            <option value="">All Designations</option>
            {uniqueDesignations.map((desg, idx) => (
              <option key={idx} value={desg}>{desg}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ maxWidth: '200px', minWidth: '160px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
          >
            <option value="">All Departments</option>
            {uniqueDepartments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>
          {(searchQuery || nameFilter || designationFilter || departmentFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setNameFilter(''); setDesignationFilter(''); setDepartmentFilter(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Reset Filters
            </button>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div 
            style={{ 
              overflowX: 'auto', 
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto',
              userSelect: 'text',
              WebkitUserSelect: 'text'
            }}
          >
            <table className="w-full text-left border-collapse select-text table-auto" style={{ whiteSpace: 'nowrap', userSelect: 'text' }}>
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-bold text-slate-600 w-16">S.No</th>
                  <th className="py-2.5 px-2.5 font-bold text-slate-600 w-12 text-center">Photo</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Name</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Phone Number</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Department</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Designation / Firm</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Experience</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Father's Name</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600">Status</th>
                  <th className="py-2.5 px-3 font-bold text-slate-600 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="select-text" style={{ userSelect: 'text' }}>
                {(() => {
                  const filteredEmployees = employees.filter(emp => {
                    const query = searchQuery.toLowerCase();
                    const matchesSearch = !query || (
                      (emp.employee_id && emp.employee_id.toLowerCase().includes(query)) ||
                      (emp.user_name && emp.user_name.toLowerCase().includes(query)) ||
                      (emp.department && emp.department.toLowerCase().includes(query)) ||
                      (emp.designation && emp.designation.toLowerCase().includes(query)) ||
                      (emp.Designation && emp.Designation.toLowerCase().includes(query))
                    );

                    const matchesName = !nameFilter || (emp.user_name && emp.user_name.toLowerCase() === nameFilter.toLowerCase());
                    const empDesg = emp.designation || emp.Designation || '';
                    const matchesDesignation = !designationFilter || empDesg.toLowerCase() === designationFilter.toLowerCase();
                    const matchesDepartment = !departmentFilter || (emp.department && emp.department.toLowerCase() === departmentFilter.toLowerCase());

                    return matchesSearch && matchesName && matchesDesignation && matchesDepartment;
                  }).sort((a, b) => {
                    const orderA = getDesignationSortOrder(a.designation || a.Designation);
                    const orderB = getDesignationSortOrder(b.designation || b.Designation);
                    if (orderA !== orderB) return orderA - orderB;
                    
                    // Inside same Designation / Firm: Highest experience on top (descending)
                    const expA = getEmployeeExperienceMonths(a);
                    const expB = getEmployeeExperienceMonths(b);
                    if (expB !== expA) return expB - expA;

                    // Tertiary sort by name
                    return (a.user_name || '').localeCompare(b.user_name || '');
                  });

                  return filteredEmployees.length > 0 ? filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors select-text">
                    <td className="py-2.5 px-3 text-xs font-bold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewEmployee(emp)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Employee Profile"
                        >
                          <Eye size={14} />
                        </button>
                        <span>{idx + 1}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {getEmployeePhotoUrl(emp) ? (
                        <button
                          type="button"
                          onClick={() => handleEmployeePhotoClick(emp)}
                          className="border-0 bg-transparent p-0 cursor-pointer inline-block transform hover:scale-110 transition-transform"
                          aria-label={`View profile for ${emp.user_name}`}
                        >
                          <img src={getEmployeePhotoUrl(emp)} alt={emp.user_name} className="w-8 h-8 rounded-full object-cover shadow-2xs border border-slate-200" />
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 inline-flex items-center justify-center font-bold text-xs shadow-2xs border border-slate-200">
                          {emp.user_name ? emp.user_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 text-sm">{emp.user_name}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-sm font-medium">{emp.number || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-700 text-sm">{emp.department || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span style={getDesignationStyle(emp.designation)}>
                        {emp.designation || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-sm font-medium">{calculateDynamicExperience(emp.joining_date, emp.experience)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-sm">{emp.fathers_name || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                        (!emp.status || emp.status.toLowerCase() === 'active')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          (!emp.status || emp.status.toLowerCase() === 'active') ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}></span>
                        {emp.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(emp)} 
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" 
                          title="Edit Employee"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp)} 
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" 
                          title="Mark Inactive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Loader size={20} className="spin" /> Loading employees...
                        </div>
                      ) : (
                        'No employees found.'
                      )}
                    </td>
                  </tr>
                )
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4 mt-4 pb-20">
          {(() => {
            const filteredEmployees = employees.filter(emp => {
              const query = searchQuery.toLowerCase();
              const matchesSearch = !query || (
                (emp.employee_id && emp.employee_id.toLowerCase().includes(query)) ||
                (emp.user_name && emp.user_name.toLowerCase().includes(query)) ||
                (emp.department && emp.department.toLowerCase().includes(query)) ||
                (emp.designation && emp.designation.toLowerCase().includes(query)) ||
                (emp.Designation && emp.Designation.toLowerCase().includes(query))
              );

              const matchesName = !nameFilter || (emp.user_name && emp.user_name.toLowerCase() === nameFilter.toLowerCase());
              const empDesg = emp.designation || emp.Designation || '';
              const matchesDesignation = !designationFilter || empDesg.toLowerCase() === designationFilter.toLowerCase();
              const matchesDepartment = !departmentFilter || (emp.department && emp.department.toLowerCase() === departmentFilter.toLowerCase());

              return matchesSearch && matchesName && matchesDesignation && matchesDepartment;
            }).sort((a, b) => {
              const orderA = getDesignationSortOrder(a.designation || a.Designation);
              const orderB = getDesignationSortOrder(b.designation || b.Designation);
              if (orderA !== orderB) return orderA - orderB;
              
              // Inside same Designation / Firm: Highest experience on top (descending)
              const expA = getEmployeeExperienceMonths(a);
              const expB = getEmployeeExperienceMonths(b);
              if (expB !== expA) return expB - expA;

              return (a.user_name || '').localeCompare(b.user_name || '');
            });

            return filteredEmployees.length > 0 ? filteredEmployees.map((emp, idx) => (
              <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    {getEmployeePhotoUrl(emp) ? (
                      <button
                        type="button"
                        onClick={() => handleEmployeePhotoClick(emp)}
                        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <img src={getEmployeePhotoUrl(emp)} className="w-12 h-12 rounded-full object-cover shadow-sm" alt={emp.user_name} />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                        {emp.user_name ? emp.user_name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{emp.user_name}</p>
                      <p className="text-xs text-gray-500 font-medium">{emp.number || 'No Phone'}</p>
                      <span style={{
                        padding: '2px 6px', 
                        borderRadius: '10px', 
                        fontSize: '0.65rem',
                        marginTop: '4px',
                        display: 'inline-block',
                        backgroundColor: (!emp.status || emp.status.toLowerCase() === 'active') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: (!emp.status || emp.status.toLowerCase() === 'active') ? '#10b981' : '#ef4444',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {emp.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <button onClick={() => handleViewEmployee(emp)} className="text-gray-600 p-1.5 hover:bg-gray-100 rounded transition-colors" title="View Profile"><Eye size={16} /></button>
                    <button onClick={() => handleEdit(emp)} className="text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(emp)} className="text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Department</p>
                    <p className="font-medium text-xs text-gray-800">{emp.department || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Designation</p>
                    <div className="mt-1"><span style={getDesignationStyle(emp.designation)}>{emp.designation || '-'}</span></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Experience</p>
                    <p className="font-medium text-xs text-gray-800">{calculateDynamicExperience(emp.joining_date, emp.experience)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Father's Name</p>
                    <p className="font-medium text-xs text-gray-800">{emp.fathers_name || '-'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm font-medium">
                    <Loader size={18} className="animate-spin" /> Loading employees...
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm font-medium">No employees found.</p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Employee Modal (Add/Edit) */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <h3 style={{ marginBottom: '16px', paddingBottom: '8px', color: 'var(--primary-color)' }}>Personal & Professional Details</h3>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <label>Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {photoPreview ? (
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-color)' }}>
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--bg-color, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color, #d1d5db)' }}>
                        <span style={{ fontSize: '24px' }}>👤</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ cursor: 'pointer', backgroundColor: 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500', display: 'inline-block', textAlign: 'center', width: 'fit-content' }}>
                        Upload Image
                        <input type="file" name="photoFile" accept="image/*" onChange={handleAddChange} style={{ display: 'none' }} />
                      </label>
                      {photoFile && <small style={{ color: 'var(--success)' }}>Selected: {photoFile.name}</small>}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleAddChange} placeholder="name" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleAddChange} placeholder="john.doe@company.com" />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleAddChange} placeholder="+1 234 567 8900" />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select name="department" value={formData.department} onChange={handleAddChange}>
                    <option value="">Select Department</option>
                    {departments.map((dep, idx) => (
                      <option key={idx} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleAddChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'none' }}>
                  <label>Display Order (Seq. No.)</label>
                  <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleAddChange} placeholder="e.g. 1" />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input type="text" name="designation" list="designation-options" value={formData.designation} onChange={handleAddChange} placeholder="Software Engineer" />
                  <datalist id="designation-options">
                    {uniqueDesignations.map((desg, idx) => (
                      <option key={idx} value={desg} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Base Salary (₹)</label>
                  <input type="text" name="baseSalary" value={formData.baseSalary} onChange={handleAddChange} placeholder="50,000" />
                </div>
                <div className="form-group">
                  <label>Experience</label>
                  <input type="text" name="experience" value={formData.experience} onChange={handleAddChange} placeholder="e.g. 2 Years / Fresher" />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" name="pfApplicable" checked={formData.pfApplicable} onChange={handleAddChange} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontWeight: 500 }}>PF Applicable</span>
                  </label>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" name="esicApplicable" checked={formData.esicApplicable} onChange={handleAddChange} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontWeight: 500 }}>ESIC Applicable</span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleAddChange} />
                </div>
                <div className="form-group">
                  <label>Date of Joining</label>
                  <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleAddChange} />
                </div>
                <div className="form-group">
                  <label>Father's Name</label>
                  <input type="text" name="fathersName" value={formData.fathersName} onChange={handleAddChange} placeholder="Father's Name" />
                </div>
                <div className="form-group">
                  <label>Alternate Number</label>
                  <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleAddChange} placeholder="e.g. +1 234 567 8901" />
                </div>
                <div className="form-group">
                  <label>Marital Status</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleAddChange}>
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleAddChange}>
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Health Issues</label>
                  <input type="text" name="healthIssues" value={formData.healthIssues} onChange={handleAddChange} placeholder="Any health issues?" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <textarea name="address" value={formData.address} onChange={handleAddChange} placeholder="Full Address" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }} rows="3" />
                </div>
              </div>

              <h3 style={{ marginTop: '32px', marginBottom: '16px', paddingBottom: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', color: 'var(--primary-color)' }}>Identity Documents</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Aadhar Document (No.)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleAddChange} placeholder="1234 5678 9012" />
                    {formData.aadharNo && formData.aadharNo.replace(/\s/g, '').length < 12 && (
                      <small style={{ color: '#ef4444' }}>Aadhar Number must be at least 12 characters</small>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Upload Aadhar
                        <input type="file" name="aadharFile" accept="image/*,.pdf" onChange={handleAddChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <DocumentPreview file={aadharFile} url={formData.aadharDocUrl} onPreview={setPreviewModalImg} />
                  </div>
                </div>
                <div className="form-group">
                  <label>PAN Card No.</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" name="panNo" value={formData.panNo} onChange={handleAddChange} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
                    {formData.panNo && formData.panNo.replace(/\s/g, '').length < 10 && (
                      <small style={{ color: '#ef4444' }}>PAN Card Number must be at least 10 characters</small>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Upload PAN
                        <input type="file" name="panFile" accept="image/*,.pdf" onChange={handleAddChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <DocumentPreview file={panFile} url={formData.panDocUrl} onPreview={setPreviewModalImg} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Driving Licence (No.)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" name="drivingLicence" value={formData.drivingLicence} onChange={handleAddChange} placeholder="e.g. MH1420110062821" style={{ textTransform: 'uppercase' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Upload DL
                        <input type="file" name="dlFile" accept="image/*,.pdf" onChange={handleAddChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <DocumentPreview file={dlFile} url={formData.dlDocUrl} onPreview={setPreviewModalImg} />
                  </div>
                </div>
              </div>

              <h3 style={{ marginTop: '32px', marginBottom: '16px', paddingBottom: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', color: 'var(--primary-color)' }}>Bank Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input type="text" name="bankName" value={formData.bankName} onChange={handleAddChange} placeholder="e.g. HDFC Bank" />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" name="accountNo" value={formData.accountNo} onChange={handleAddChange} placeholder="123456789012" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Upload Passbook/Cheque
                        <input type="file" name="accountFile" accept="image/*,.pdf" onChange={handleAddChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <DocumentPreview file={accountFile} url={formData.accountDocUrl} onPreview={setPreviewModalImg} />
                  </div>
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleAddChange} placeholder="HDFC0001234" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>Branch Name</label>
                  <input type="text" name="branchName" value={formData.branchName} onChange={handleAddChange} placeholder="e.g. Connaught Place" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Onboard Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Crop Modal */}
      {cropModalOpen && cropImageSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Crop Photo</h2>
              <button onClick={() => { setCropModalOpen(false); setCropImageSrc(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: '300px', backgroundColor: '#333', borderRadius: '8px', overflow: 'hidden' }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <input 
                type="range" 
                min={1} max={3} step={0.1} 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => { setCropModalOpen(false); setCropImageSrc(null); }} style={{ padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={showCroppedImage} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}>Crop & Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {previewModalImg && (
        <div 
          onClick={() => setPreviewModalImg(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '40px' }}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewModalImg(null); }}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={32} />
            </button>
            <img 
              src={previewModalImg} 
              alt="Document Preview" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Employee Quick View Modal */}
      {viewEmployeeModal && (
        <div 
          onClick={() => setViewEmployeeModal(null)}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.7)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 10000, 
            padding: '20px' 
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="card fade-in" 
            style={{ 
              width: '100%', 
              maxWidth: '680px', 
              maxHeight: '92vh', 
              overflowY: 'auto', 
              borderRadius: '24px', 
              padding: '0', 
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.35)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              background: '#ffffff',
              position: 'relative'
            }}
          >
            {/* Modal Header with Gradient & Overlay Pattern */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)', 
              padding: '28px 32px 24px', 
              color: '#ffffff', 
              position: 'relative', 
              borderTopLeftRadius: '24px', 
              borderTopRightRadius: '24px',
              overflow: 'hidden'
            }}>
              {/* Decorative background glow circle */}
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0) 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
              <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0) 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>

              <button 
                onClick={() => setViewEmployeeModal(null)}
                style={{ 
                  position: 'absolute', 
                  top: '18px', 
                  right: '18px', 
                  background: 'rgba(255,255,255,0.12)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#ffffff', 
                  borderRadius: '50%', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 2
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                title="Close"
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'relative' }}>
                  {getEmployeePhotoUrl(viewEmployeeModal) ? (
                    <img 
                      src={getEmployeePhotoUrl(viewEmployeeModal)} 
                      alt={viewEmployeeModal.user_name} 
                      style={{ 
                        width: '84px', 
                        height: '84px', 
                        borderRadius: '22px', 
                        objectFit: 'cover', 
                        border: '3px solid rgba(255, 255, 255, 0.9)', 
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)' 
                      }} 
                    />
                  ) : (
                    <div style={{ 
                      width: '84px', 
                      height: '84px', 
                      borderRadius: '22px', 
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '32px', 
                      fontWeight: '800', 
                      border: '3px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)' 
                    }}>
                      {viewEmployeeModal.user_name ? viewEmployeeModal.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <span style={{ 
                    position: 'absolute', 
                    bottom: '-4px', 
                    right: '-4px', 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    border: '3px solid #0f172a',
                    backgroundColor: (!viewEmployeeModal.status || viewEmployeeModal.status.toLowerCase() === 'active') ? '#10b981' : '#ef4444' 
                  }}></span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
                      {viewEmployeeModal.user_name}
                    </h2>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      backgroundColor: (!viewEmployeeModal.status || viewEmployeeModal.status.toLowerCase() === 'active') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${(!viewEmployeeModal.status || viewEmployeeModal.status.toLowerCase() === 'active') ? '#10b981' : '#ef4444'}`,
                      color: (!viewEmployeeModal.status || viewEmployeeModal.status.toLowerCase() === 'active') ? '#34d399' : '#f87171'
                    }}>
                      {viewEmployeeModal.status || 'Active'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Briefcase size={13} color="#94a3b8" /> {viewEmployeeModal.designation || 'Staff'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.12)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: '600' }}>
                      <Building size={13} color="#60a5fa" /> {viewEmployeeModal.department || 'General'}
                    </span>
                    {viewEmployeeModal.employee_id && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        ID: <strong style={{ color: '#e2e8f0' }}>{viewEmployeeModal.employee_id}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px', background: '#f8fafc' }}>
              
              {/* Section 1: Contact Details */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <Phone size={15} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155' }}>
                    Contact & Personal Information
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Phone Number</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.number || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '600', color: '#0f172a', wordBreak: 'break-all' }}>{viewEmployeeModal.email || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Father's Name</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.fathers_name || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Date of Birth</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.dob ? formatDisplayDate(viewEmployeeModal.dob) : '-'}</span>
                  </div>
                  {viewEmployeeModal.address && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Residential Address</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '500', color: '#334155' }}>{viewEmployeeModal.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Employment Info */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                    <Briefcase size={15} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155' }}>
                    Role & Employment Details
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Joining Date</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.joining_date ? formatDisplayDate(viewEmployeeModal.joining_date) : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Experience Duration</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#2563eb' }}>{calculateDynamicExperience(viewEmployeeModal.joining_date, viewEmployeeModal.experience)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Department</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.department || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Designation / Firm</span>
                    <div>
                      <span style={getDesignationStyle(viewEmployeeModal.designation)}>
                        {viewEmployeeModal.designation || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Bank & Identity Verification */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <CreditCard size={15} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155' }}>
                    Bank & Identity Information
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Aadhar Card No</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a', letterSpacing: '0.04em' }}>{viewEmployeeModal.aadhar_no || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Bank Account No</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a', letterSpacing: '0.04em' }}>{viewEmployeeModal.account_no || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>IFSC Code</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.ifsc_code || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Branch Name</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{viewEmployeeModal.branch_name || '-'}</span>
                  </div>
                </div>

                {/* Uploaded Documents Quick Access if available */}
                {(viewEmployeeModal.aadhar_doc || viewEmployeeModal.pan_doc || viewEmployeeModal.account_doc) && (
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {viewEmployeeModal.aadhar_doc && (
                      <button 
                        type="button" 
                        onClick={() => setPreviewModalImg(viewEmployeeModal.aadhar_doc)} 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', padding: '5px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        <FileText size={13} /> View Aadhar
                      </button>
                    )}
                    {viewEmployeeModal.pan_doc && (
                      <button 
                        type="button" 
                        onClick={() => setPreviewModalImg(viewEmployeeModal.pan_doc)} 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', padding: '5px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        <FileText size={13} /> View PAN
                      </button>
                    )}
                    {viewEmployeeModal.account_doc && (
                      <button 
                        type="button" 
                        onClick={() => setPreviewModalImg(viewEmployeeModal.account_doc)} 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', padding: '5px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        <FileText size={13} /> View Passbook
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons inside Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    const emp = viewEmployeeModal;
                    setViewEmployeeModal(null);
                    handleEdit(emp);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 20px', 
                    borderRadius: '12px', 
                    border: '1px solid #cbd5e1', 
                    background: '#ffffff', 
                    color: '#334155', 
                    fontWeight: '700', 
                    cursor: 'pointer', 
                    fontSize: '0.88rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <Pencil size={15} /> Edit Employee
                </button>
                <button 
                  type="button" 
                  onClick={() => setViewEmployeeModal(null)}
                  style={{ 
                    padding: '10px 24px', 
                    borderRadius: '12px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                    color: '#ffffff', 
                    fontWeight: '700', 
                    cursor: 'pointer', 
                    fontSize: '0.88rem',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Birthday Modal */}
      {showBirthdayModal && todaysBirthdays.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '450px', textAlign: 'center', padding: '30px' }}>
            <h2 style={{ fontSize: '2rem', margin: '0 0 16px 0', color: '#ec4899' }}>🎉 Happy Birthday! 🎂</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Today is the birthday of the following employee(s):</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {todaysBirthdays.map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#fdf2f8', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                  {getEmployeePhotoUrl(emp) ? (
                    <img src={getEmployeePhotoUrl(emp)} alt={emp.user_name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fbcfe8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d', fontSize: '20px', fontWeight: 'bold' }}>
                      {emp.user_name ? emp.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#831843' }}>{emp.user_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#be185d' }}>{emp.designation || emp.Designation || 'Employee'}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowBirthdayModal(false)} style={{ padding: '10px 24px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
