  import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Loader, Download, FileSpreadsheet, MapPin, Navigation, Clock, CheckCircle2, User, RefreshCw, LogOut, LogIn, Camera, UserPlus } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error } = await supabase.from('employee').select('*').order('id');
        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployees();
  }, []);

  const [saving, setSaving] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editingEmpName, setEditingEmpName] = useState('');
  const [savingEmpName, setSavingEmpName] = useState(false);

  const handleEditEmpName = (emp) => {
    setEditingEmpId(emp.id);
    setEditingEmpName(emp.name);
  };

  const handleSaveEmpName = async (empId) => {
    const trimmed = editingEmpName.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    setSavingEmpName(true);
    try {
      const { error } = await supabase.from('employee').update({ name: trimmed }).eq('id', empId);
      if (error) throw error;
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, name: trimmed } : e));
      toast.success('Employee name updated!');
      setEditingEmpId(null);
    } catch (err) {
      toast.error('Failed to update name: ' + err.message);
    } finally {
      setSavingEmpName(false);
    }
  };

  
  const [activeTab, setActiveTab] = useState('Register');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showModal, setShowModal] = useState(false);
  const [uploadData, setUploadData] = useState(() => {
    const now = new Date();
    return { month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()), file: null };
  });

  // Add Employee Modal States
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const trimmedName = newEmployeeName.trim();
    if (!trimmedName) return toast.error('Please enter employee name');
    setAddingEmployee(true);
    try {
      const { data, error } = await supabase
        .from('employee')
        .insert([{ name: trimmedName }])
        .select()
        .single();
      if (error) throw error;
      setEmployees(prev => [...prev, data]);
      toast.success(`Employee "${trimmedName}" added successfully!`);
      setNewEmployeeName('');
      setShowAddEmployeeModal(false);
    } catch (err) {
      console.error('Error adding employee:', err);
      toast.error('Failed to add employee: ' + err.message);
    } finally {
      setAddingEmployee(false);
    }
  };

  // Self Attendance States
  const [selectedSelfEmployee, setSelectedSelfEmployee] = useState('');
  const [selfAttendance, setSelfAttendance] = useState(null);
  const [liveWorkingHours, setLiveWorkingHours] = useState('00:00:00');
  const [monitoringLogs, setMonitoringLogs] = useState([]);
  const [monitoringDate, setMonitoringDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState(null);
  
  const { location, loading: locating, error: locationError, refreshLocation } = useCurrentLocation();
  
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Default Office coordinates (Example: New Delhi)
  const OFFICE_LAT = 28.6139;
  const OFFICE_LON = 77.2090;
  const OFFICE_RADIUS_METERS = 500;

  // Distance calculator (Haversine)
  const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius of the earth in m
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in m
  };

  const getAddressFromCoords = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      return data.display_name || 'Address not found';
    } catch(e) {
      console.error(e);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  const fetchSelfAttendance = async (empId) => {
    if(!empId) {
       setSelfAttendance(null);
       return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', parseInt(empId, 10))
        .eq('attendance_date', today)
        .maybeSingle();
        
      if (error) throw error;
      setSelfAttendance(data || null);
    } catch(err) {
      console.error(err);
      toast.error('Failed to load self attendance');
    }
  };

  useEffect(() => {
    fetchSelfAttendance(selectedSelfEmployee);
  }, [selectedSelfEmployee]);

  // Live timer for working hours
  useEffect(() => {
    let interval;
    if(selfAttendance && selfAttendance.check_in && !selfAttendance.check_out) {
      interval = setInterval(() => {
        const checkInTime = new Date(selfAttendance.check_in).getTime();
        const now = new Date().getTime();
        const diff = now - checkInTime;
        
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        setLiveWorkingHours(`${h}:${m}:${s}`);
      }, 1000);
    } else if(selfAttendance && selfAttendance.working_hours) {
      setLiveWorkingHours(selfAttendance.working_hours);
    } else {
      setLiveWorkingHours('00:00:00');
    }
    return () => clearInterval(interval);
  }, [selfAttendance]);

  const fetchCurrentLocation = () => {
    refreshLocation();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error('Unable to access camera.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setSelfiePreview(dataUrl);
      stopCamera();
      
      if (!location) {
        refreshLocation();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleCheckIn = async () => {
    if(!selectedSelfEmployee) return toast.error('Please select an employee first');
    if(!selfiePreview) return toast.error('Please capture an image to check in');
    
    if (!location) {
        toast.error("Validating location, please wait...");
        refreshLocation();
        return;
    }
    if (locationError) {
        toast.error(locationError);
        return;
    }
    if (location.accuracy > 150) {
        toast.error("Your GPS accuracy is low. Please move to an open area and try again.");
        return;
    }

    setActionLoading(true);
    try {
        const { latitude, longitude, accuracy, address, city, state, country, pincode, timestamp } = location;
        const dist = getDistanceFromLatLonInM(latitude, longitude, OFFICE_LAT, OFFICE_LON);
        const type = dist <= OFFICE_RADIUS_METERS ? 'Office' : 'Field';
        const today = new Date().toISOString().split('T')[0];
        
        const emp = employees.find(e => e.id === parseInt(selectedSelfEmployee, 10));
        const newRecord = {
          employee_id: parseInt(selectedSelfEmployee, 10),
          employee_name: emp ? emp.name : 'Unknown',
          attendance_date: today,
          check_in: new Date().toISOString(),
          attendance_type: type,
          latitude,
          longitude,
          address,
          image: selfiePreview,
          status: 'Present',
          device_info: navigator.userAgent,
          remarks: JSON.stringify({ accuracy, city, state, country, pincode, timestamp })
        };
        
        const { data: insertedData, error } = await supabase
          .from('attendance')
          .insert([newRecord])
          .select()
          .single();
          
        if (error) throw error;

        // Update the Attendance Register state (currentMonthData) so it reflects immediately
        const todayObj = new Date();
        const todayDay = todayObj.getDate();
        const [selYear, selMonth] = selectedMonth.split('-');
        
        if (parseInt(selYear, 10) === todayObj.getFullYear() && parseInt(selMonth, 10) === todayObj.getMonth() + 1) {
          setCurrentMonthData(prev => ({
            ...prev,
            [selectedSelfEmployee]: {
              ...(prev[selectedSelfEmployee] || {}),
              [todayDay]: 'P'
            }
          }));
        }

        toast.success(`Checked In Successfully as ${type}!`);
        setSelfAttendance(insertedData);
        setSelfiePreview(null);
    } catch(e) {
         console.error(e);
         toast.error('Failed to Check-In');
    } finally {
         setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if(!selfAttendance || !selfAttendance.id) return;
    if(!selfiePreview) return toast.error('Please capture an image to check out');
    
    if (!location) {
        toast.error("Validating location, please wait...");
        refreshLocation();
        return;
    }
    if (locationError) {
        toast.error(locationError);
        return;
    }
    if (location.accuracy > 150) {
        toast.error("Your GPS accuracy is low. Please move to an open area and try again.");
        return;
    }

    setActionLoading(true);
    try {
        const { latitude, longitude, accuracy, address, city, state, country, pincode, timestamp } = location;
        const checkOutTime = new Date();
        const checkInTime = new Date(selfAttendance.check_in);
        
        const diff = checkOutTime.getTime() - checkInTime.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        const workingHours = `${h}:${m}:${s}`;

        const { data: updatedData, error } = await supabase
          .from('attendance')
          .update({
            check_out: checkOutTime.toISOString(),
            working_hours: workingHours,
            remarks: `Check-out location: ${address}. Details: ${JSON.stringify({ accuracy, city, state, country, pincode, timestamp })}`,
            latitude,
            longitude
          })
          .eq('id', selfAttendance.id)
          .select()
          .single();
          
        if (error) throw error;

        toast.success('Checked Out Successfully!');
        setSelfAttendance(updatedData);
        setSelfiePreview(null);
    } catch(e) {
         console.error(e);
         toast.error('Failed to Check-Out');
    } finally {
         setActionLoading(false);
    }
  };

  const fetchMonitoringLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', monitoringDate)
        .order('check_in', { ascending: false });
        
      if (error) throw error;

      // Attach employee name manually
      const populatedLogs = (data || []).map(log => {
        const emp = employees.find(e => e.id === log.employee_id);
        return { ...log, employee: { name: emp ? emp.name : 'Unknown' } };
      });

      setMonitoringLogs(populatedLogs);
    } catch(e) {
      console.error(e);
      toast.error('Failed to load monitoring logs');
    }
  };

  useEffect(() => {
    if(activeTab === 'Monitoring') {
      fetchMonitoringLogs();
    }
  }, [activeTab, monitoringDate]);

  // Current month data
  const [currentMonthData, setCurrentMonthData] = useState({});

  // Helper to format '2026-07' to 'July 2026'
  const getFormattedMonth = (yyyy_mm) => {
    if (!yyyy_mm) return '';
    const [y, m] = yyyy_mm.split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
  };

  useEffect(() => {
    async function fetchAttendance() {
      if (employees.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('monthly_attendance')
          .select('employee_id, attendance_data')
          .eq('month_year', getFormattedMonth(selectedMonth));
          
        if (error) throw error;
        
        const dataMap = {};
        if (data) {
          data.forEach(row => {
            dataMap[row.employee_id] = row.attendance_data;
          });
        }
        
        const initializedData = {};
        employees.forEach(emp => {
          initializedData[emp.id] = dataMap[emp.id] || {};
        });
        
        setCurrentMonthData(initializedData);
      } catch (err) {
        console.error('Error fetching attendance:', err);
      }
    }
    fetchAttendance();
  }, [selectedMonth, employees]);

  const handleCellChange = (empId, day, value) => {
    const v = value.toUpperCase();
    // Allow any input so user sees what they type, but only valid codes will be colored and calculated
    setCurrentMonthData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [day]: v
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formattedMonth = getFormattedMonth(selectedMonth);
      const upsertData = employees.map(emp => ({
        employee_id: emp.id,
        month_year: formattedMonth,
        attendance_data: currentMonthData[emp.id] || {}
      }));
      
      const { error } = await supabase
        .from('monthly_attendance')
        .upsert(upsertData, { onConflict: 'employee_id, month_year' });
        
      if (error) throw error;
      toast.success('Attendance saved successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) return toast.error('Please select a CSV file to upload.');
    
    const file = uploadData.file;
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        if (rows.length < 2) {
          return toast.error('CSV file is empty or missing data rows');
        }
        
        // Assume first row is header
        const headers = rows[0].split(',').map(h => h.trim());
        // Try to find employee_id or name column
        const empIdIndex = headers.findIndex(h => {
          const lower = h.toLowerCase().replace(/['"]/g, '');
          return lower === 'employee_id' || lower === 'employeeid' || lower === 'employee id' || lower === 'emp id' || lower === 'empid';
        });

        const nameIndex = headers.findIndex(h => {
          const lower = h.toLowerCase().replace(/['"]/g, '');
          return lower === 'name' || lower === 'employee name' || lower === 'employeename';
        });
        
        if (empIdIndex === -1 && nameIndex === -1) {
          return toast.error('CSV must have either an "employee_id" or "name" column');
        }
        
        const upsertData = [];
        const unmatchedRecords = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[parseInt(uploadData.month, 10) - 1];
        const monthYearStr = `${monthName} ${uploadData.year}`;
        
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i].split(',').map(c => c.trim());
          
          let empId = null;
          let identifier = 'Unknown';

          if (empIdIndex !== -1 && columns[empIdIndex]) {
            empId = columns[empIdIndex];
            identifier = `ID: ${columns[empIdIndex]}`;
          } else if (nameIndex !== -1 && columns[nameIndex]) {
            const empName = columns[nameIndex];
            identifier = `Name: ${empName}`;
            const foundEmp = employees.find(e => e.name?.toLowerCase().trim() === empName?.toLowerCase().trim());
            if (foundEmp) empId = foundEmp.id;
          }

          if (!empId) {
             unmatchedRecords.push(identifier);
             continue; // Skip if we couldn't resolve an employee ID
          }
          
          const attendance_data = {};
          for (let j = 0; j < headers.length; j++) {
            if (j !== empIdIndex && j !== nameIndex) {
              const day = headers[j]; // Should be a number 1-31
              const val = columns[j] ? columns[j].toUpperCase() : '';
              if (['P', 'A', 'L', 'HD'].includes(val)) {
                 attendance_data[day] = val;
              }
            }
          }
          
          upsertData.push({
            employee_id: empId,
            month_year: monthYearStr,
            attendance_data
          });
        }
        
        if (upsertData.length === 0) {
          return toast.error('No valid data found in CSV');
        }
        
        const { error } = await supabase
          .from('monthly_attendance')
          .upsert(upsertData, { onConflict: 'employee_id, month_year' });
          
        if (error) throw error;
        
        if (unmatchedRecords.length > 0) {
          toast.success(`Uploaded successfully, but skipped not found: ${unmatchedRecords.join(', ')}`, { duration: 6000 });
        } else {
          toast.success(`Attendance sheet for ${monthYearStr} uploaded successfully!`);
        }
        setShowModal(false);
        const now = new Date();
        setUploadData({ month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()), file: null });
        
        // If they uploaded data for the current month, refresh page to show it
        if (getFormattedMonth(selectedMonth) === monthYearStr) {
           setTimeout(() => { window.location.reload(); }, 1500);
        }
        
      } catch (err) {
        console.error('Error parsing CSV:', err);
        toast.error('Failed to upload CSV: ' + err.message);
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read the file');
    };
    
    reader.readAsText(file);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.text(`Attendance Register - ${getFormattedMonth(selectedMonth)}`, 40, 40);
    
    const headers = ['Sr. No.', 'Employee Name', ...daysArray.map(String), 'P', 'A', 'L', 'HD', 'Att.%'];
    const body = employees.map((emp, idx) => {
      const stats = dashboardStats.find(s => s.id === emp.id);
      const rowData = [idx + 1, emp.name];
      daysArray.forEach(day => {
        const val = day > daysCount ? '' : (currentMonthData[emp.id]?.[day] || '');
        rowData.push(val);
      });
      rowData.push(stats.p, stats.a, stats.l, stats.hd, stats.attPercent.toFixed(1) + '%');
      return rowData;
    });

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 50,
      styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
      columnStyles: { 1: { halign: 'left' } },
      theme: 'grid'
    });

    doc.save(`Attendance_${selectedMonth}.pdf`);
  };

  const handleDownloadCSV = () => {
    const headers = ['Employee ID', 'Employee Name', ...daysArray.map(String), 'P', 'A', 'L', 'HD', 'Att.%'];
    const rows = employees.map((emp) => {
      const stats = dashboardStats.find(s => s.id === emp.id);
      const rowData = [emp.id, emp.name];
      daysArray.forEach(day => {
        const val = day > daysCount ? '' : (currentMonthData[emp.id]?.[day] || '');
        rowData.push(val);
      });
      rowData.push(stats.p, stats.a, stats.l, stats.hd, `${stats.attPercent.toFixed(1)}%`);
      return rowData;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    
    XLSX.writeFile(workbook, `Attendance_${selectedMonth}.xlsx`);
  };

  // Helper to calculate days in selected month
  const getDaysInMonth = (yearMonth) => {
    const [y, m] = yearMonth.split('-');
    return new Date(y, m, 0).getDate();
  };
  const daysCount = getDaysInMonth(selectedMonth);
  const daysArray = Array.from({length: 31}, (_, i) => i + 1); // Always show 31 cols as per Excel

  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10) - 1;

  // Calculations for Dashboard
  const dashboardStats = employees.map(emp => {
    const empData = currentMonthData[emp.id] || {};
    let p = 0, a = 0, l = 0, hd = 0;

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === yearNum && today.getMonth() === monthNum;
    const maxDayToCount = isCurrentMonth ? today.getDate() : daysCount;

    for(let i=1; i<=daysCount; i++) {
      const val = empData[i];
      const isSunday = new Date(yearNum, monthNum, i).getDay() === 0;

      if(val === 'P') p++;
      else if(val === 'A') a++;
      else if(val === 'L') l++;
      else if(val === 'HD') hd++;
      else if(isSunday && i <= maxDayToCount) {
        // Automatically count Sunday as Present (P) if it's left empty, 
        // but don't count future Sundays if we are in the current month.
        p++;
      }
    }
    
    const presentEquiv = p + (hd * 0.5);
    // Exclude weekends/holidays if we want, but for now working days = daysCount
    const attPercent = daysCount > 0 ? (presentEquiv / daysCount) * 100 : 0;

    return {
      id: emp.id,
      name: emp.name,
      p, a, l, hd,
      attPercent
    };
  });

  const totalAbsences = dashboardStats.reduce((acc, curr) => acc + curr.a, 0);
  const avgAttendance = dashboardStats.length > 0 
    ? dashboardStats.reduce((acc, curr) => acc + curr.attPercent, 0) / dashboardStats.length 
    : 0;

  const chartData = dashboardStats.map(s => ({
    name: s.name,
    AttendancePercent: parseFloat(s.attPercent.toFixed(1))
  }));

  const thStyle = {
    border: '1px solid var(--border-color)',
    padding: '8px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-main)'
  };

  const tdStyle = {
    border: '1px solid var(--border-color)',
    padding: '4px',
    fontSize: '0.85rem',
    textAlign: 'center'
  };

  return (
    <div className="fade-in">
      <style>
        {`
          .desktop-table-container { overflow-x: auto; }
          .desktop-table { display: table; width: 100%; border-collapse: collapse; margin: 0; }
          .mobile-cards { display: none; }
          
          /* Responsive Utilities */
          .page-header-wrapper { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
          .page-actions { display: flex; gap: 12px; flex-wrap: wrap; }
          .tabs-container { display: flex; gap: 16px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
          
          /* Hide scrollbar for tabs */
          .tabs-container::-webkit-scrollbar { display: none; }
          .tabs-container { -ms-overflow-style: none; scrollbar-width: none; }

          .monitoring-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }

          @media (max-width: 768px) {
            .desktop-table-container { display: none; }
            .mobile-cards { display: flex; flex-direction: column; gap: 16px; padding: 16px; background-color: var(--bg-main); border-radius: 12px; }
            
            .page-header-wrapper { flex-direction: column; align-items: stretch; text-align: center; }
            .page-actions { justify-content: center; }
            
            .monitoring-header { flex-direction: column; align-items: stretch; }
            .monitoring-header > div { display: flex; flex-direction: column; width: 100%; gap: 8px; }
            .monitoring-header input, .monitoring-header button { width: 100%; justify-content: center; }
          }
        `}
      </style>
      <div className="page-header-wrapper">
        <div>
          <h1 className="page-title">Attendance Dashboard</h1>
          <p className="page-subtitle">Excel-style Attendance Register and Overview Dashboard.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0284c7' }}>
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button className="btn-primary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b981' }}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--text-secondary)' }}>
            <Plus size={16} /> Upload CSV
          </button>
          <button className="btn-primary" onClick={() => setShowAddEmployeeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#7c3aed' }}>
            <UserPlus size={16} /> Add Employee
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saving ? <Loader size={16} className="spin" /> : <Save size={16} />} 
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('Register')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Register' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Register' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Attendance Register
        </button>
        <button
          onClick={() => setActiveTab('Dashboard')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Dashboard' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('Self Attendance')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'Self Attendance' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Self Attendance' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease'
          }}
        >
          Self Attendance
        </button>
        <button
          onClick={() => setActiveTab('Monitoring')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'Monitoring' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'Monitoring' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease'
          }}
        >
          Live Monitoring
        </button>
      </div>

      {activeTab === 'Register' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {/* Header of Excel Sheet */}
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', textAlign: 'center', padding: '16px', fontWeight: 500, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
            ATTENDANCE REGISTER
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Month</span>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontWeight: 'bold', backgroundColor: 'var(--bg-main)' }} 
              />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Codes: <span style={{color:'var(--success)', fontWeight:600}}>P</span>=Present &nbsp;
              <span style={{color:'var(--danger)', fontWeight:600}}>A</span>=Absent &nbsp;
              <span style={{color:'#ca8a04', fontWeight:600}}>L</span>=Leave &nbsp;
              <span style={{color:'var(--primary-color)', fontWeight:600}}>HD</span>=Half Day
            </div>
          </div>

          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '550px', paddingBottom: '12px' }}>
            <table style={{ borderCollapse: 'collapse', margin: '0' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{...thStyle, width: '50px', position: 'sticky', top: 0, zIndex: 10}}>Sr.<br/>No.</th>
                  <th style={{...thStyle, minWidth: '200px', position: 'sticky', top: 0, zIndex: 10}}>Employee Name</th>
                  {daysArray.map(day => {
                    const isInvalidDay = day > daysCount;
                    const isSunday = !isInvalidDay && new Date(yearNum, monthNum, day).getDay() === 0;
                    return (
                      <th key={day} style={{...thStyle, padding: '4px', width: '45px', minWidth: '45px', fontSize: '0.8rem', position: 'sticky', top: 0, zIndex: 10, backgroundColor: isSunday ? '#fef08a' : 'var(--bg-main)', color: isSunday ? '#a16207' : 'var(--text-secondary)'}}>{day}</th>
                    );
                  })}
                  <th style={{...thStyle, width: '45px', minWidth: '45px', position: 'sticky', top: 0, zIndex: 10}}>P</th>
                  <th style={{...thStyle, width: '45px', minWidth: '45px', position: 'sticky', top: 0, zIndex: 10}}>A</th>
                  <th style={{...thStyle, width: '45px', minWidth: '45px', position: 'sticky', top: 0, zIndex: 10}}>L</th>
                  <th style={{...thStyle, width: '45px', minWidth: '45px', position: 'sticky', top: 0, zIndex: 10}}>HD</th>
                  <th style={{...thStyle, width: '60px', minWidth: '60px', position: 'sticky', top: 0, zIndex: 10}}>Att.%</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((emp, idx) => {
                    const stats = dashboardStats.find(s => s.id === emp.id);
                    return (
                      <tr key={emp.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{idx + 1}</td>
                        <td style={{...tdStyle, textAlign: 'left', fontWeight: 600, paddingLeft: '8px', minWidth: '200px'}}>
                          {editingEmpId === emp.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                value={editingEmpName}
                                onChange={e => setEditingEmpName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEmpName(emp.id);
                                  if (e.key === 'Escape') setEditingEmpId(null);
                                }}
                                autoFocus
                                style={{
                                  flex: 1, border: '1px solid var(--primary-color)', borderRadius: '4px',
                                  padding: '2px 6px', fontSize: '0.82rem', fontWeight: 600,
                                  textTransform: 'uppercase', outline: 'none', color: 'var(--text-primary)'
                                }}
                              />
                              <button
                                onClick={() => handleSaveEmpName(emp.id)}
                                disabled={savingEmpName}
                                title="Save"
                                style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              >✓</button>
                              <button
                                onClick={() => setEditingEmpId(null)}
                                title="Cancel"
                                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              >✗</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', paddingRight: '4px' }}>
                              <span style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{emp.name}</span>
                              <button
                                onClick={() => handleEditEmpName(emp)}
                                title="Edit Name"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', borderRadius: '4px', lineHeight: 1, flexShrink: 0 }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color)'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                              >
                                ✎
                              </button>
                            </div>
                          )}
                        </td>
                        
                        {daysArray.map(day => {
                          const isInvalidDay = day > daysCount;
                          const val = isInvalidDay ? '' : (currentMonthData[emp.id]?.[day] || '');
                          const isSunday = !isInvalidDay && new Date(yearNum, monthNum, day).getDay() === 0;
                          
                          let color = 'var(--text-primary)';
                          if(val==='P') color = '#166534';
                          if(val==='A') color = '#dc2626';
                          if(val==='L') color = '#ca8a04';
                          if(val==='HD') color = '#2563eb';

                          return (
                            <td key={day} style={{...tdStyle, padding: 0, width: '45px', minWidth: '45px', backgroundColor: isInvalidDay ? '#f1f5f9' : (isSunday ? '#fef9c3' : 'inherit')}}>
                              <input 
                                type="text"
                                value={val}
                                onChange={(e) => handleCellChange(emp.id, day, e.target.value)}
                                disabled={isInvalidDay}
                                style={{ 
                                  width: '100%', height: '35px', border: 'none', textAlign: 'center', 
                                  background: 'transparent', fontWeight: 'bold', color: color,
                                  textTransform: 'uppercase', fontSize: '0.85rem'
                                }}
                                maxLength={2}
                              />
                            </td>
                          );
                        })}
                        
                        <td style={{...tdStyle, backgroundColor: 'rgba(202, 138, 4, 0.1)', fontWeight: 'bold'}}>{stats.p}</td>
                        <td style={{...tdStyle, backgroundColor: 'rgba(202, 138, 4, 0.1)', fontWeight: 'bold', color: stats.a > 0 ? '#dc2626' : 'inherit'}}>{stats.a}</td>
                        <td style={{...tdStyle, backgroundColor: 'rgba(202, 138, 4, 0.1)', fontWeight: 'bold'}}>{stats.l}</td>
                        <td style={{...tdStyle, backgroundColor: 'rgba(202, 138, 4, 0.1)', fontWeight: 'bold'}}>{stats.hd}</td>
                        <td style={{...tdStyle, backgroundColor: 'rgba(202, 138, 4, 0.2)', fontWeight: 800, color: stats.attPercent < 75 ? '#dc2626' : '#166534'}}>{stats.attPercent.toFixed(1)}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={38} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No employees found. Please add employees first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 24px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '24px', backgroundColor: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #94a3b8' }}></div>
              Blue = Manual Entry (type code directly)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#475569' }}></div>
              P/A/L/HD/Att% columns = Auto-Formula
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Dashboard' && (
        <div className="fade-in">
          {/* Dashboard Header */}
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '16px 24px', fontWeight: 500, fontSize: '1.1rem', borderRadius: '12px 12px 0 0', letterSpacing: '0.5px' }}>
            DASHBOARD — Attendance Overview
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px 24px', border: '1px solid var(--border-color)', borderTop: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '24px', borderRadius: '0 0 12px 12px' }}>
            Auto-updates from 'Attendance'
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Employees</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--primary-color)', fontWeight: 800, fontSize: '2rem' }}>{employees.length}</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Avg. Attendance %</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--success)', fontWeight: 800, fontSize: '2rem' }}>{avgAttendance.toFixed(1)}%</div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Total Absences</div>
              <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', color: 'var(--danger)', fontWeight: 800, fontSize: '2rem' }}>{totalAbsences}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Employee-wise Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'fit-content' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', padding: '12px 16px', fontWeight: 700, letterSpacing: '0.5px' }}>Employee-wise Attendance %</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-main)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', textTransform: 'none', color: 'var(--text-secondary)' }}>Employee</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', textTransform: 'none', color: 'var(--text-secondary)' }}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardStats.map((stat, idx) => (
                    <tr key={stat.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500 }}>{stat.name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: stat.attPercent < 75 ? '#dc2626' : 'var(--success)' }}>{stat.attPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {[...Array(Math.max(0, 15 - dashboardStats.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ backgroundColor: (dashboardStats.length + idx) % 2 === 0 ? 'var(--bg-main)' : 'var(--bg-card)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: 'transparent' }}>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '24px', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', textAlign: 'center' }}>Attendance % by Employee</h3>
              {dashboardStats.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(val) => `${val}%`} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                      <Tooltip 
                        formatter={(value) => `${value}%`} 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: '#ca8a04', fontWeight: 700 }}
                      />
                      <Bar dataKey="AttendancePercent" fill="#ca8a04" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No data to display chart.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Self Attendance' && (
        <div className="fade-in">
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>Self Attendance</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Employee Identity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', color: 'var(--primary-color)' }}>
                    <User size={20} />
                  </div>
                  <select 
                    value={selectedSelfEmployee} 
                    onChange={e => {
                      setSelectedSelfEmployee(e.target.value);
                      setSelfiePreview(null);
                    }}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.95rem' }}
                  >
                    <option value="">Select your name...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>

                <>
                  {selfAttendance?.check_out ? (
                    <div style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#166534', textAlign: 'center', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={40} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Attendance Completed</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>You have already checked in and checked out for today.</p>
                      
                      <div style={{ display: 'flex', gap: '24px', margin: '8px 0', backgroundColor: 'rgba(255,255,255,0.6)', padding: '12px 24px', borderRadius: '8px' }}>
                        <div>


                          
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Check-In Time</div>
                          <div style={{ fontWeight: 600, marginTop: '4px' }}>{new Date(selfAttendance.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                        <div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Check-Out Time</div>
                          <div style={{ fontWeight: 600, marginTop: '4px' }}>{new Date(selfAttendance.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>Total Working Hours: {selfAttendance.working_hours}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</span>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: selfAttendance?.check_in ? '#10b981' : '#f59e0b' }}>
                            {selfAttendance?.check_in ? 'Checked In' : 'Not Checked In'}
                          </div>
                          {selfAttendance?.check_in && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                              Time: {new Date(selfAttendance.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Working Hours</span>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'monospace' }}>
                            {liveWorkingHours}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                        <button onClick={handleCheckIn} disabled={!!selfAttendance?.check_in || actionLoading || locating || (location && location.accuracy > 150)} className="btn-primary" style={{ flex: 1, padding: '14px', fontSize: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', opacity: (!!selfAttendance?.check_in || actionLoading || locating || (location && location.accuracy > 150)) ? 0.6 : 1 }}>
                          {(actionLoading && !selfAttendance?.check_in) ? <Loader className="spin" size={18} /> : <Navigation size={18} />}
                          Check-In
                        </button>
                        <button onClick={handleCheckOut} disabled={!selfAttendance?.check_in || actionLoading || locating || (location && location.accuracy > 150)} className="btn-primary" style={{ flex: 1, padding: '14px', fontSize: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#ef4444', opacity: (!selfAttendance?.check_in || actionLoading || locating || (location && location.accuracy > 150)) ? 0.6 : 1 }}>
                          {(actionLoading && selfAttendance?.check_in) ? <Loader className="spin" size={18} /> : <LogOut size={18} />}
                          Check-Out
                        </button>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Capture Photo</label>
                        
                        {!selfiePreview ? (
                          isCameraOpen ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#64748b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #475569' }}>
                              <div style={{ position: 'relative', width: '100%', backgroundColor: '#000' }}>
                                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', maxHeight: '250px', objectFit: 'cover' }} />
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 16px' }}>
                                <button onClick={stopCamera} style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff', fontSize: '1rem', cursor: 'pointer', padding: '8px', fontWeight: 500 }}>
                                  Cancel
                                </button>
                                
                                {/* Shutter Button */}
                                <button 
                                  onClick={captureImage} 
                                  style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    borderRadius: '50%', 
                                    backgroundColor: '#fff', 
                                    border: '3px solid #94a3b8', 
                                    outline: '2px solid #fff',
                                    outlineOffset: '2px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    transition: 'transform 0.1s'
                                  }}
                                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                />
                                
                                <div style={{ width: '56px' }}></div> {/* Spacer to keep shutter perfectly centered */}
                              </div>
                            </div>
                          ) : (
                            <div onClick={startCamera} style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-main)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', color: 'var(--primary-color)' }}>
                                  <Camera size={24} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Tap to Open Camera</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={selfiePreview} alt="Selfie Preview" style={{ width: '100%', display: 'block', maxHeight: '250px', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '12px', backdropFilter: 'blur(4px)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Clock size={12} /> {new Date().toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, display: 'flex', gap: '6px', lineHeight: '1.4' }}>
                                  <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                                  {locating ? 'Fetching...' : (location?.address || 'Unavailable')}
                                </div>
                                {location && (
                                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: location.accuracy > 150 ? '#ef4444' : '#10b981', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span>Accuracy: {location.accuracy} meters</span>
                                    <span>Coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
                                  </div>
                                )}
                                {locationError && (
                                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#ef4444', marginTop: '4px' }}>
                                    {locationError}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => { setSelfiePreview(null); }}
                              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Monitoring' && (
        <div className="fade-in">
          <div className="monitoring-header">
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={20} color="var(--primary-color)" /> Live Attendance Monitoring
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="date" 
                value={monitoringDate} 
                onChange={e => setMonitoringDate(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
              <button onClick={fetchMonitoringLogs} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="desktop-table-container">
              <table className="desktop-table">
                <thead style={{ backgroundColor: 'var(--bg-main)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{...thStyle, textAlign: 'left'}}>Employee</th>
                    <th style={thStyle}>Photo</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Check In</th>
                    <th style={thStyle}>Check Out</th>
                    <th style={thStyle}>Work Hours</th>
                    <th style={{...thStyle, textAlign: 'left'}}>Location</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringLogs.length > 0 ? (
                    monitoringLogs.map((log, idx) => {
                      const formattedDate = log.attendance_date ? log.attendance_date.split('-').reverse().join('-') : '-';
                      return (
                      <tr key={log.id} style={{ backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{...tdStyle, textAlign: 'left', fontWeight: 600}}>{log.employee?.name || `Emp ID: ${log.employee_id}`}</td>
                        <td style={tdStyle}>
                          {log.image ? (
                            <img 
                              src={log.image} 
                              alt="Selfie" 
                              onClick={() => setViewingImage(log.image)}
                              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'transform 0.2s' }} 
                              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', margin: '0 auto' }}>
                              <User size={20} />
                            </div>
                          )}
                        </td>
                        <td style={{...tdStyle, fontWeight: 600, color: 'var(--text-secondary)'}}>{formattedDate}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', backgroundColor: log.attendance_type === 'Office' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: log.attendance_type === 'Office' ? '#166534' : '#1d4ed8', fontWeight: 600 }}>
                            {log.attendance_type}
                          </span>
                        </td>
                        <td style={{...tdStyle, fontWeight: 500}}>{log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                        <td style={{...tdStyle, fontWeight: 500}}>{log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                        <td style={{...tdStyle, fontFamily: 'monospace', fontWeight: 700}}>{log.working_hours || '-'}</td>
                        <td style={{...tdStyle, textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          {log.address && log.address.length > 50 ? `${log.address.substring(0, 50)}...` : log.address}
                        </td>
                        <td style={tdStyle}>
                          {log.latitude && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-color)' }}>
                              <MapPin size={12} /> Map
                            </a>
                          )}
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No live attendance records for {monitoringDate.split('-').reverse().join('-')}.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mobile-cards">
              {monitoringLogs.length > 0 ? (
                monitoringLogs.map(log => {
                  const formattedDate = log.attendance_date ? log.attendance_date.split('-').reverse().join('-') : '-';
                  return (
                    <div key={log.id} style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                       <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                          {log.image ? (
                             <img src={log.image} onClick={() => setViewingImage(log.image)} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid var(--border-color)', flexShrink: 0 }} />
                          ) : (
                             <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-color)', flexShrink: 0 }}><User size={24} color="var(--text-secondary)"/></div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                             <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.employee?.name || `Emp ID: ${log.employee_id}`}</h4>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', backgroundColor: log.attendance_type === 'Office' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: log.attendance_type === 'Office' ? '#166534' : '#1d4ed8', fontWeight: 600 }}>{log.attendance_type}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{formattedDate}</span>
                             </div>
                          </div>
                       </div>
                
                       <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px' }}>
                             <div style={{ flex: 1, textAlign: 'left' }}>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check In</div>
                               <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</div>
                             </div>
                             <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Work Hrs</div>
                               <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{log.working_hours || '-'}</div>
                             </div>
                             <div style={{ flex: 1, textAlign: 'right' }}>
                               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Check Out</div>
                               <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</div>
                             </div>
                          </div>
                   
                          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                             <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', fontSize: '0.8rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}>
                                <MapPin size={16} color="var(--primary-color)" style={{ flexShrink: 0 }} /> 
                                {log.address || 'Location N/A'}
                             </div>
                             {log.latitude && (
                               <a href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none', backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', flexShrink: 0 }}>
                                 <MapPin size={14} /> Live Location
                               </a>
                             )}
                          </div>
                       </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No live attendance records for {monitoringDate.split('-').reverse().join('-')}.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Upload Attendance</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--bg-main)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-main)'}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Month</label>
                  <select value={uploadData.month} onChange={(e) => setUploadData({...uploadData, month: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.95rem' }}>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Year</label>
                  <input type="number" value={uploadData.year} onChange={(e) => setUploadData({...uploadData, year: e.target.value})} required min="2000" max="2100" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.95rem' }} />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Upload CSV File</label>
                <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '32px 24px', textAlign: 'center', backgroundColor: 'var(--bg-main)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <input type="file" accept=".csv" onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})} required style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: '50%', color: 'var(--primary-color)' }}>
                      <Plus size={24} />
                    </div>
                    <span style={{ fontWeight: 600, color: uploadData.file ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                      {uploadData.file ? uploadData.file.name : 'Click to Browse CSV'}
                    </span>
                    {!uploadData.file && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>or drag and drop here</span>}
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '12px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }}></span>
                  Please ensure the CSV has an 'employee_id' or 'name' column.
                </p>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>CSV Header Format (Copy this):</p>
                <code style={{ display: 'block', padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  S.NO,NAME,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
                </code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontWeight: 600, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                  Upload Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {viewingImage && (
        <div 
          onClick={() => setViewingImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', animation: 'fadeIn 0.2s ease-out' }}
          >
            <button 
              onClick={() => setViewingImage(null)}
              style={{ position: 'absolute', top: '-48px', right: 0, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', padding: '8px 16px', borderRadius: '32px' }}
            >
              <X size={20} /> Close
            </button>
            <img src={viewingImage} alt="Full Size" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease-out', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={20} /> Add New Employee
              </h3>
              <button onClick={() => { setShowAddEmployeeModal(false); setNewEmployeeName(''); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Employee Name *</label>
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Enter employee full name"
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 16px', border: '2px solid var(--border-color)', borderRadius: '10px',
                    fontSize: '1rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-main)',
                    outline: 'none', transition: 'border-color 0.2s ease', boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => { setShowAddEmployeeModal(false); setNewEmployeeName(''); }} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={addingEmployee} className="btn-primary" style={{ padding: '10px 24px', fontWeight: 600, backgroundColor: '#7c3aed', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {addingEmployee ? <Loader size={16} className="spin" /> : <UserPlus size={16} />}
                  {addingEmployee ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
