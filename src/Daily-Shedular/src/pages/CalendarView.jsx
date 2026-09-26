import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import TaskModal from '../components/dashboard/TaskModal';
import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, subDays, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears,
  isSameMonth, isSameDay, isToday,
  parseISO, getHours, getMinutes,
  differenceInMinutes,
  eachDayOfInterval, eachMonthOfInterval, startOfYear, endOfYear
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
  Clock, User, CheckCircle2, AlertCircle, XCircle,
  LayoutGrid, Columns, AlignJustify, Search, X
} from 'lucide-react';

// ─── Status helpers ───
const statusColors = {
  'Pending':     { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', dot: '#f59e0b' },
  'Completed':   { bg: '#d1fae5', text: '#065f46', border: '#10b981', dot: '#10b981' },
  'Overdue':     { bg: '#ffe4e6', text: '#9f1239', border: '#f43f5e', dot: '#f43f5e' },
};
const getStatusStyle = (status) => statusColors[status] || statusColors['Pending'];

const StatusIcon = ({ status, size = 12 }) => {
  const props = { size, strokeWidth: 2.5 };
  switch (status) {
    case 'Completed': return <CheckCircle2 {...props} color="#10b981" />;
    case 'Not Done':  return <XCircle {...props} color="#ef4444" />;
    case 'Overdue':   return <AlertCircle {...props} color="#f43f5e" />;
    default:          return <Clock {...props} color="#f59e0b" />;
  }
};

// ─── Mini calendar (sidebar) ───
const MiniCalendar = ({ currentDate, onDateSelect, tasks }) => {
  const [miniDate, setMiniDate] = useState(currentDate);
  useEffect(() => { setMiniDate(currentDate); }, [currentDate]);

  const monthStart = startOfMonth(miniDate);
  const monthEnd   = endOfMonth(miniDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const taskDates = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => { if (t.date) set.add(t.date); });
    return set;
  }, [tasks]);

  return (
    <div style={{ userSelect: 'none' }}>
      {/* month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <button onClick={() => setMiniDate(prev => subMonths(prev, 1))} style={miniBtn}><ChevronLeft size={14} /></button>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{format(miniDate, 'MMMM yyyy')}</span>
        <button onClick={() => setMiniDate(prev => addMonths(prev, 1))} style={miniBtn}><ChevronRight size={14} /></button>
      </div>
      {/* weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      {/* day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, miniDate);
          const today   = isToday(day);
          const selected = isSameDay(day, currentDate);
          const hasTasks = taskDates.has(format(day, 'yyyy-MM-dd'));
          return (
            <button
              key={i}
              onClick={() => onDateSelect(day)}
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: today || selected ? 700 : 400,
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: selected ? '#2563eb' : today ? '#eff6ff' : 'transparent',
                color: selected ? '#fff' : !inMonth ? '#cbd5e1' : today ? '#2563eb' : 'var(--text-primary)',
                position: 'relative', transition: 'all 0.15s',
              }}
            >
              {format(day, 'd')}
              {hasTasks && !selected && (
                <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#2563eb' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
const miniBtn = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' };

// ─── Event chip (shared) ───
const EventChip = ({ task, compact, onClick }) => {
  const s = getStatusStyle(task.status);
  const timeStr = task.startTime ? (task.startTime.length === 5 ? task.startTime : task.startTime.substring(0,5)) : '';
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(task); }}
      title={`${task.description || 'No description'}\n${task.status} • ${timeStr}`}
      style={{
        background: s.bg,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: '4px',
        padding: compact ? '1px 5px' : '3px 6px',
        marginBottom: '2px',
        cursor: 'pointer',
        fontSize: compact ? '0.65rem' : '0.72rem',
        fontWeight: 500,
        color: s.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'transform 0.1s, box-shadow 0.1s',
        lineHeight: 1.3,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <StatusIcon status={task.status} size={compact ? 10 : 12} />
      {!compact && timeStr && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>{timeStr}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.description || 'No description'}</span>
    </div>
  );
};

// ─── MONTH VIEW ───
const MonthView = ({ currentDate, tasks, onDateClick, onTaskClick }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays    = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.date) return;
      (map[t.date] = map[t.date] || []).push(t);
    });
    return map;
  }, [tasks]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border-color)' }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
          <div key={d} style={{ padding: '8px 10px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '1fr', overflow: 'hidden' }}>
        {allDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateStr] || [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              style={{
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                padding: '4px 6px',
                minHeight: '90px',
                cursor: 'pointer',
                background: today ? '#f0f7ff' : !inMonth ? '#fafafa' : 'transparent',
                opacity: inMonth ? 1 : 0.5,
                transition: 'background 0.15s',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={(e) => { if (!today) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { if (!today) e.currentTarget.style.background = inMonth ? 'transparent' : '#fafafa'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: today ? 700 : 500,
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: today ? '#2563eb' : 'transparent',
                  color: today ? '#fff' : 'var(--text-primary)',
                }}>{format(day, 'd')}</span>
                {dayTasks.length > 0 && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', background: '#f1f5f9', borderRadius: '9999px', padding: '0 5px', lineHeight: '16px' }}>
                    {dayTasks.length}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {dayTasks.slice(0, 3).map(t => (
                  <EventChip key={t.id} task={t} compact onClick={onTaskClick} />
                ))}
                {dayTasks.length > 3 && (
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#2563eb', padding: '1px 4px', cursor: 'pointer' }}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── WEEK VIEW ───
const WeekView = ({ currentDate, tasks, onTimeClick, onTaskClick, settings }) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const containerRef = useRef(null);

  // Generate time slots from settings (e.g. 10:30, 11:30, 12:30...)
  const timeSlots = useMemo(() => {
    const slots = [];
    const [startH, startM] = (settings?.startTime || '10:30').split(':').map(Number);
    const [endH, endM] = (settings?.endTime || '19:30').split(':').map(Number);
    const interval = settings?.intervalMinutes || 60;
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      currentMinutes += interval;
    }
    return slots;
  }, [settings]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.date) return;
      (map[t.date] = map[t.date] || []).push(t);
    });
    return map;
  }, [tasks]);

  // Auto-scroll to ~current slot
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (settings?.startTime || '10:30').split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const slotIndex = Math.max(0, Math.floor((nowMinutes - startMinutes) / (settings?.intervalMinutes || 60)) - 1);
      containerRef.current.scrollTop = slotIndex * 60;
    }
  }, [settings]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ borderRight: '1px solid var(--border-color)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>GMT+5:30</span>
        </div>
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div key={i} style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid var(--border-color)', background: today ? '#f0f7ff' : 'transparent' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'EEE')}</div>
              <div style={{
                fontSize: '1.25rem', fontWeight: 700,
                width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                background: today ? '#2563eb' : 'transparent',
                color: today ? '#fff' : 'var(--text-primary)',
                marginTop: '2px',
              }}>{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', paddingTop: '10px' }}>
          {timeSlots.map((slot, slotIdx) => {
            const [slotH, slotM] = slot.split(':').map(Number);
            const slotMinutes = slotH * 60 + slotM;
            const interval = settings?.intervalMinutes || 60;
            const nextSlotMinutes = slotMinutes + interval;
            // Format label e.g. "10:30 AM"
            const ampm = slotH >= 12 ? 'PM' : 'AM';
            const displayH = slotH === 0 ? 12 : slotH > 12 ? slotH - 12 : slotH;
            const label = `${displayH}:${String(slotM).padStart(2,'0')} ${ampm}`;
            return (
            <React.Fragment key={slot}>
              <div style={{ height: '60px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '8px', paddingTop: '0px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '-6px' }}>
                  {label}
                </span>
              </div>
              {weekDays.map((day, j) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayTasks = (tasksByDate[dateStr] || []).filter(t => {
                  if (!t.startTime) return false;
                  const [th, tm] = t.startTime.split(':').map(Number);
                  const taskMin = th * 60 + tm;
                  return taskMin >= slotMinutes && taskMin < nextSlotMinutes;
                });
                const today = isToday(day);
                return (
                  <div
                    key={j}
                    onClick={() => onTimeClick(day, slot)}
                    style={{
                      height: '60px',
                      borderRight: '1px solid var(--border-color)',
                      borderBottom: '1px solid #f1f5f9',
                      padding: '1px 2px',
                      cursor: 'pointer',
                      background: today ? 'rgba(37,99,235,0.02)' : 'transparent',
                      overflow: 'hidden',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = today ? 'rgba(37,99,235,0.02)' : 'transparent'; }}
                  >
                    {dayTasks.map(t => (
                      <EventChip key={t.id} task={t} compact={false} onClick={onTaskClick} />
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          )})}
        </div>
      </div>
    </div>
  );
};

// ─── DAY VIEW ───
const DayView = ({ currentDate, tasks, onTimeClick, onTaskClick, settings }) => {
  const containerRef = useRef(null);
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayTasks = useMemo(() => tasks.filter(t => t.date === dateStr), [tasks, dateStr]);

  // Generate time slots from settings
  const timeSlots = useMemo(() => {
    const slots = [];
    const [startH, startM] = (settings?.startTime || '10:30').split(':').map(Number);
    const [endH, endM] = (settings?.endTime || '19:30').split(':').map(Number);
    const interval = settings?.intervalMinutes || 60;
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      currentMinutes += interval;
    }
    return slots;
  }, [settings]);

  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [sH, sM] = (settings?.startTime || '10:30').split(':').map(Number);
      const startMinutes = sH * 60 + sM;
      const slotIndex = Math.max(0, Math.floor((nowMinutes - startMinutes) / (settings?.intervalMinutes || 60)) - 1);
      containerRef.current.scrollTop = slotIndex * 72;
    }
  }, [settings]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', background: isToday(currentDate) ? '#f0f7ff' : 'transparent' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(currentDate, 'EEEE')}</div>
        <div style={{
          fontSize: '2rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '50px', height: '50px', borderRadius: '50%',
          background: isToday(currentDate) ? '#2563eb' : 'transparent',
          color: isToday(currentDate) ? '#fff' : 'var(--text-primary)',
          marginTop: '4px',
        }}>{format(currentDate, 'd')}</div>
      </div>
      {/* Time grid */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', paddingTop: '10px' }}>
          {timeSlots.map((slot) => {
            const [slotH, slotM] = slot.split(':').map(Number);
            const slotMinutes = slotH * 60 + slotM;
            const interval = settings?.intervalMinutes || 60;
            const nextSlotMinutes = slotMinutes + interval;
            const ampm = slotH >= 12 ? 'PM' : 'AM';
            const displayH = slotH === 0 ? 12 : slotH > 12 ? slotH - 12 : slotH;
            const label = `${displayH}:${String(slotM).padStart(2,'0')} ${ampm}`;
            const slotTasks = dayTasks.filter(t => {
              if (!t.startTime) return false;
              const [th, tm] = t.startTime.split(':').map(Number);
              const taskMin = th * 60 + tm;
              return taskMin >= slotMinutes && taskMin < nextSlotMinutes;
            });
            return (
              <React.Fragment key={slot}>
                <div style={{ height: '72px', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '-7px' }}>
                    {label}
                  </span>
                </div>
                <div
                  onClick={() => onTimeClick(currentDate, slot)}
                  style={{
                    height: '72px', borderBottom: '1px solid #f1f5f9', padding: '2px 8px',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {slotTasks.map(t => (
                    <EventChip key={t.id} task={t} compact={false} onClick={onTaskClick} />
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── YEAR VIEW ───
const YearView = ({ currentDate, tasks, onDateClick }) => {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const taskDates = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => { if (t.date) set.add(t.date); });
    return set;
  }, [tasks]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {months.map((month, i) => {
          const mStart = startOfMonth(month);
          const mEnd   = endOfMonth(month);
          const calStart = startOfWeek(mStart, { weekStartsOn: 0 });
          const calEnd   = endOfWeek(mEnd, { weekStartsOn: 0 });
          const days     = eachDayOfInterval({ start: calStart, end: calEnd });
          
          return (
            <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', background: 'var(--surface-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-primary)', textAlign: 'center' }}>
                {format(month, 'MMMM')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                {['S','M','T','W','T','F','S'].map((d,i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                {days.map((day, j) => {
                  const inMonth = isSameMonth(day, month);
                  const today   = isToday(day);
                  const hasTasks = taskDates.has(format(day, 'yyyy-MM-dd'));
                  return (
                    <button
                      key={j}
                      onClick={() => onDateClick(day)}
                      style={{
                        width: '100%', aspectRatio: '1/1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: today ? 700 : 400,
                        borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: today ? '#eff6ff' : 'transparent',
                        color: !inMonth ? '#cbd5e1' : today ? '#2563eb' : 'var(--text-primary)',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => { if (!today) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!today) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {format(day, 'd')}
                      {hasTasks && (
                        <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#2563eb' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── MAIN CALENDAR VIEW ───
const CalendarView = () => {
  const { tasks, allTasks, staffList, fetchTasks, settings } = useScheduler();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // year | month | week | day
  const [modalState, setModalState] = useState({ isOpen: false, time: null, task: null });
  const [taskDetailModal, setTaskDetailModal] = useState({ isOpen: false, task: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchTasks(); }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.remark || '').toLowerCase().includes(q) ||
        (t.createdBy || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter(t => t.status === statusFilter);
    }
    return list;
  }, [tasks, searchQuery, statusFilter]);

  // Navigation
  const goNext = () => {
    if (viewMode === 'year') setCurrentDate(prev => addYears(prev, 1));
    else if (viewMode === 'month') setCurrentDate(prev => addMonths(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => addWeeks(prev, 1));
    else setCurrentDate(prev => addDays(prev, 1));
  };
  const goPrev = () => {
    if (viewMode === 'year') setCurrentDate(prev => subYears(prev, 1));
    else if (viewMode === 'month') setCurrentDate(prev => subMonths(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => subWeeks(prev, 1));
    else setCurrentDate(prev => subDays(prev, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const headerLabel = () => {
    if (viewMode === 'year') return format(currentDate, 'yyyy');
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'dd MMM')} – ${format(we, 'dd MMM yyyy')}`;
    }
    return format(currentDate, 'dd MMMM yyyy');
  };

  const handleDateClick = (day) => {
    setCurrentDate(day);
    setViewMode('day');
  };

  const handleTimeClick = (day, time) => {
    setModalState({ isOpen: true, time, task: null });
    setCurrentDate(day);
  };

  const handleTaskClick = (task) => {
    setTaskDetailModal({ isOpen: true, task });
  };

  // Summary stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const pendingCount = todayTasks.filter(t => t.status === 'Pending').length;
  const completedCount = todayTasks.filter(t => t.status === 'Completed').length;
  const overdueCount = tasks.filter(t => t.status === 'Overdue').length;

  const viewBtnStyle = (mode) => ({
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600,
    border: 'none', cursor: 'pointer', borderRadius: '6px',
    background: viewMode === mode ? '#2563eb' : 'transparent',
    color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.2s',
  });

  return (
    <div className="daily-scheduler-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', minHeight: 0, gap: '0' }}>
      {/* ── Top toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
        padding: '12px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '0',
      }}>
        {/* Left: nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goToday} style={{
            padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600,
            border: '1px solid var(--border-color)', borderRadius: '8px',
            background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>Today</button>
          <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
            <button onClick={goPrev} style={{ ...miniBtn, padding: '6px', borderRadius: '6px' }}><ChevronLeft size={18} /></button>
            <button onClick={goNext} style={{ ...miniBtn, padding: '6px', borderRadius: '6px' }}><ChevronRight size={18} /></button>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{headerLabel()}</h2>
        </div>

        {/* Right: view toggle + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px',
            padding: '0 10px', height: '34px', minWidth: '180px',
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.78rem', width: '100%', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ ...miniBtn, padding: '2px' }}><X size={12} /></button>
            )}
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px', fontSize: '0.78rem', fontWeight: 500,
              border: '1px solid var(--border-color)', borderRadius: '8px',
              background: statusFilter ? '#eff6ff' : 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer',
              outline: 'none', height: '34px',
            }}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </select>
          {/* View switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            <button onClick={() => setViewMode('year')} style={viewBtnStyle('year')}><CalendarIcon size={14} /> Year</button>
            <button onClick={() => setViewMode('month')} style={viewBtnStyle('month')}><LayoutGrid size={14} /> Month</button>
            <button onClick={() => setViewMode('week')} style={viewBtnStyle('week')}><Columns size={14} /> Week</button>
            <button onClick={() => setViewMode('day')} style={viewBtnStyle('day')}><AlignJustify size={14} /> Day</button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', gap: '0', overflow: 'auto', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: '240px', flexShrink: 0, borderRight: '1px solid var(--border-color)',
          padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px',
          overflowY: 'auto',
        }}>
          {/* Mini Calendar */}
          <MiniCalendar currentDate={currentDate} onDateSelect={(d) => { setCurrentDate(d); }} tasks={tasks} />

          {/* Create event button */}
          <button
            onClick={() => setModalState({ isOpen: true, time: settings?.startTime || '10:00', task: null })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '10px', borderRadius: '24px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.3)'; }}
          >
            <Plus size={16} /> Create Task
          </button>

          {/* Today stats */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Today's Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Pending', count: pendingCount, color: '#f59e0b', bg: '#fef3c7' },
                { label: 'Completed', count: completedCount, color: '#10b981', bg: '#d1fae5' },
                { label: 'Overdue', count: overdueCount, color: '#f43f5e', bg: '#ffe4e6' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px', borderRadius: '8px', background: s.bg,
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Status Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(statusColors).map(([status, c]) => (
                <div key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                    background: statusFilter === status ? c.bg : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: c.text }}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main calendar area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--surface-color)' }}>
          {viewMode === 'year' && (
            <YearView
              currentDate={currentDate}
              tasks={filteredTasks}
              onDateClick={handleDateClick}
            />
          )}
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              tasks={filteredTasks}
              onDateClick={handleDateClick}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              tasks={filteredTasks}
              onTimeClick={handleTimeClick}
              onTaskClick={handleTaskClick}
              settings={settings}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              tasks={filteredTasks}
              onTimeClick={handleTimeClick}
              onTaskClick={handleTaskClick}
              settings={settings}
            />
          )}
        </div>
      </div>

      {/* Task Modal (create/edit) */}
      <TaskModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, time: null, task: null })}
        task={modalState.task}
        selectedTime={modalState.time}
        selectedDate={format(currentDate, 'yyyy-MM-dd')}
      />

      {/* Task detail modal */}
      {taskDetailModal.isOpen && taskDetailModal.task && (
        <div
          onClick={() => setTaskDetailModal({ isOpen: false, task: null })}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
            style={{
              background: 'var(--surface-color)', borderRadius: '16px', padding: '24px',
              width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            }}
          >
            {(() => {
              const task = taskDetailModal.task;
              const s = getStatusStyle(task.status);
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusIcon status={task.status} size={20} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: s.text, background: s.bg, padding: '2px 10px', borderRadius: '9999px', textTransform: 'uppercase' }}>{task.status}</span>
                    </div>
                    <button onClick={() => setTaskDetailModal({ isOpen: false, task: null })} style={{ ...miniBtn, padding: '6px', borderRadius: '8px', background: '#f1f5f9' }}><X size={16} /></button>
                  </div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.description || 'No description'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CalendarIcon size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{task.date ? format(new Date(task.date), 'dd MMM yyyy') : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{task.startTime || '—'} – {task.endTime || '—'}</span>
                    </div>
                    {task.createdBy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{task.createdBy}</span>
                      </div>
                    )}
                    {task.remark && (
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--border-color)' }}>
                        {task.remark}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      onClick={() => {
                        setTaskDetailModal({ isOpen: false, task: null });
                        setModalState({ isOpen: true, time: task.startTime, task });
                      }}
                      style={{
                        padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: '#2563eb', color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                        transition: 'background 0.15s',
                      }}
                    >
                      Edit Task
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
