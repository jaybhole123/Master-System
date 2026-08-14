import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isBefore, parse, startOfDay, addDays, isSameDay } from 'date-fns';

const SchedulerContext = createContext();

export const useScheduler = () => useContext(SchedulerContext);

export const SchedulerProvider = ({ children }) => {
  const [staffList, setStaffList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [somedayTasks, setSomedayTasks] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [settings, setSettings] = useState({ startTime: '10:30', endTime: '19:30', intervalMinutes: 60 });
  const [categories, setCategories] = useState(['Meeting', 'Call', 'Report', 'Follow-up', 'Project', 'Admin']);
  
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Staff (mapped from users)
      const { data: staffData } = await supabase.from('users').select('*');
      if (staffData) {
        const mappedStaff = staffData.map(u => ({
          ...u,
          name: u.user_name || 'Unknown',
          designation: u.Designation || 'Staff'
        }));
        setStaffList(mappedStaff);
        
        // Match with logged in user from localStorage
        const storedUserId = localStorage.getItem('user-id');
        const storedUserName = localStorage.getItem('user-name');
        
        if (storedUserId) {
          const matchedUser = mappedStaff.find(s => String(s.id) === String(storedUserId));
          if (matchedUser) {
            setCurrentUser(matchedUser);
          } else {
            setCurrentUser({ id: storedUserId, name: storedUserName || 'Admin' });
          }
        } else if (mappedStaff.length > 0) {
          setCurrentUser(mappedStaff[0]);
        }
      }

      // Fetch Tasks
      const { data: tasksData } = await supabase.from('tasks').select('*');
      if (tasksData) {
        const camelCaseTasks = tasksData.map(t => ({
          ...t,
          startTime: t.start_time.substring(0, 5),
          endTime: t.end_time ? t.end_time.substring(0, 5) : null,
          assignedStaff: t.assigned_staff,
          createdBy: t.created_by,
          actualDoneDate: t.actual_done_date,
          attachments: t.attachments ? JSON.parse(t.attachments) : []
        }));
        setTasks(camelCaseTasks);
      }

      // Fetch Someday Tasks
      const { data: somedayData } = await supabase.from('someday_tasks').select('*');
      if (somedayData) {
        const camelSomeday = somedayData.map(t => ({
          ...t,
          createdBy: t.created_by
        }));
        setSomedayTasks(camelSomeday);
      }

      // Fetch Recurring Tasks
      const { data: recurringData } = await supabase.from('recurring_tasks').select('*');
      if (recurringData) {
        const camelRecurring = recurringData.map(t => ({
          ...t,
          startTime: t.start_time.substring(0, 5),
          endTime: t.end_time ? t.end_time.substring(0, 5) : null,
          assignedStaff: t.assigned_staff,
          repeatType: t.repeat_type
        }));
        setRecurringTasks(camelRecurring);
      }

      // Fetch Settings
      const { data: settingsData } = await supabase.from('settings').select('*').single();
      if (settingsData) {
        setSettings({
          ...settingsData,
          startTime: settingsData.start_time.substring(0, 5),
          endTime: settingsData.end_time.substring(0, 5),
          intervalMinutes: settingsData.interval_minutes
        });
      }
    };
    fetchData();
  }, []);

  // Generate Time Slots based on settings
  const generateTimeSlots = () => {
    const slots = [];
    let currentTime = parse(settings.startTime, 'HH:mm', new Date());
    const endTimeDate = parse(settings.endTime, 'HH:mm', new Date());

    while (isBefore(currentTime, endTimeDate) || currentTime.getTime() === endTimeDate.getTime()) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = new Date(currentTime.getTime() + settings.intervalMinutes * 60000);
    }
    return slots;
  };

  // Helper to convert HH:mm to 12h format
  const formatTime12h = (time24h) => {
    return format(parse(time24h, 'HH:mm', new Date()), 'hh:mm a');
  };

  // Check and update Overdue tasks automatically
  useEffect(() => {
    const checkOverdue = async () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const tasksToUpdate = tasks.filter(task => {
        const taskDateStr = task.date;
        if (task.status === 'Pending' || task.status === 'In Progress' || task.status === 'Scheduled') {
          if (taskDateStr < todayStr) return true;
        } else if (task.status === 'Overdue') {
          if (taskDateStr >= todayStr) return true;
        }
        return false;
      });

      if (tasksToUpdate.length > 0) {
        for (const task of tasksToUpdate) {
          const newStatus = task.date < todayStr ? 'Overdue' : 'Pending';
          await updateTask(task.id, { status: newStatus });
        }
      }
    };

    const interval = setInterval(checkOverdue, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  const addTask = async (task) => {
    const id = crypto.randomUUID();
    const newTask = { ...task, id };
    
    const dbTask = {
      id: newTask.id,
      description: newTask.description || null,
      date: newTask.date,
      start_time: newTask.startTime,
      end_time: newTask.endTime,
      assigned_staff: newTask.assignedStaff || null,
      created_by: newTask.createdBy,
      status: newTask.status,
      remark: newTask.remark || null,
      attachments: newTask.attachments ? JSON.stringify(newTask.attachments) : '[]'
    };

    const { error } = await supabase.from('tasks').insert(dbTask);
    if (error) {
      console.error("Insert Error: ", error);
      alert("Error saving task: " + error.message);
      return;
    }
    
    // Update UI only on success
    setTasks(prev => [...prev, newTask]);
  };
  
  const updateTask = async (id, updates) => {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.actualDoneDate !== undefined) dbUpdates.actual_done_date = updates.actualDoneDate;
    if (updates.remark !== undefined) dbUpdates.remark = updates.remark;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    
    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
    if (error) {
      alert("Error updating task: " + error.message);
      return;
    }

    // Update UI only on success
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const markTaskDone = (id) => {
    updateTask(id, {
      status: 'Completed',
      actualDoneDate: new Date().toISOString(),
    });
  };

  const markTaskNotDone = (id, remark) => {
    updateTask(id, {
      status: 'Not Done',
      remark: remark,
    });
  };

  const addSomedayTask = async (task) => {
    const id = crypto.randomUUID();
    const newTask = { ...task, id };
    
    const dbPayload = {
      id: newTask.id,
      description: newTask.description,
      priority: newTask.priority,
      category: newTask.category,
      created_by: newTask.createdBy,
      created_date: newTask.createdDate
    };
    
    // In case the DB expects 'title', we can use description or title if available
    dbPayload.title = newTask.title || newTask.description;
    
    if (newTask.assignedStaff) {
      dbPayload.assigned_staff = newTask.assignedStaff;
    }

    const { error } = await supabase.from('someday_tasks').insert(dbPayload);
    
    if (error) {
      console.error("Someday task insert error:", error);
      alert("Error adding someday task: " + error.message);
      return;
    }

    setSomedayTasks(prev => [...prev, newTask]);
  };
  
  const scheduleSomedayTask = async (id, scheduleData) => {
    const task = somedayTasks.find(t => t.id === id);
    if (task) {
      await addTask({
        ...task,
        ...scheduleData,
        status: 'Pending',
        actualDoneDate: null,
        remark: ''
      });
      setSomedayTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('someday_tasks').delete().eq('id', id);
    }
  };

  const updateSomedayTask = async (id, updates) => {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase.from('someday_tasks').update(dbUpdates).eq('id', id);
    if (error) {
      alert("Error updating task: " + error.message);
      return;
    }

    setSomedayTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteSomedayTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this someday task?')) {
      setSomedayTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('someday_tasks').delete().eq('id', id);
    }
  };

  const rescheduleTask = (id, newDate, newStartTime, newEndTime) => {
    updateTask(id, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'Pending'
    });
  };

  const deleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    await supabase.from('settings').update({
      start_time: newSettings.startTime,
      end_time: newSettings.endTime,
      interval_minutes: newSettings.intervalMinutes
    }).eq('id', 1);
  };

  // Role-based filtering: Admin sees all, Staff sees only their tasks
  const isAdmin = currentUser?.designation === 'System Admin' || 
                  currentUser?.name === 'Admin' ||
                  (currentUser?.role || '').toLowerCase().trim() === 'superadmin' ||
                  (localStorage.getItem('role') || '').toLowerCase().trim() === 'superadmin';
  
  const filteredTasks = isAdmin ? tasks : tasks.filter(t => t.assignedStaff === currentUser?.id || t.createdBy === currentUser?.name);
  const filteredSomedayTasks = isAdmin ? somedayTasks : somedayTasks.filter(t => t.createdBy === currentUser?.name);
  const filteredRecurringTasks = isAdmin ? recurringTasks : recurringTasks.filter(t => t.assignedStaff === currentUser?.id);

  const value = {
    staffList, setStaffList,
    tasks: filteredTasks, setTasks, addTask, updateTask, markTaskDone, markTaskNotDone, rescheduleTask, deleteTask,
    somedayTasks: filteredSomedayTasks, setSomedayTasks, addSomedayTask, scheduleSomedayTask, updateSomedayTask, deleteSomedayTask,
    recurringTasks: filteredRecurringTasks, setRecurringTasks,
    settings, setSettings: updateSettings,
    categories,
    currentUser, setCurrentUser,
    generateTimeSlots,
    formatTime12h
  };

  return (
    <SchedulerContext.Provider value={value}>
      {children}
    </SchedulerContext.Provider>
  );
};
