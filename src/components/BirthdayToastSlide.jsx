import React, { useState, useEffect } from 'react';
import { Cake, Sparkles, X, Gift, Heart, PartyPopper } from 'lucide-react';
import supabase from '../SupabaseClient';

export default function BirthdayToastSlide() {
  const [todaysBirthdays, setTodaysBirthdays] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkBirthdays = async () => {
      try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        const todayStr = `${today.getFullYear()}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

        // Check if user has explicitly closed/dismissed it today
        const dismissedKey = `birthday_dismissed_by_user_${todayStr}`;
        if (sessionStorage.getItem(dismissedKey)) {
          return;
        }

        // Fetch from 'users' table where employee data is maintained
        const { data, error } = await supabase
          .from('users')
          .select('id, user_name, designation, photo, profile_image, date_of_birth, status');

        if (error || !data) {
          console.warn("BirthdayToastSlide: Failed to fetch users", error);
          return;
        }

        const activeEmployees = data.filter(emp => !emp.status || emp.status.toLowerCase() === 'active');
        
        const bdays = activeEmployees.filter(emp => {
          if (!emp.date_of_birth) return false;
          try {
            // Handle YYYY-MM-DD or DD/MM/YYYY or ISO strings
            const parts = String(emp.date_of_birth).trim().split(/[-/T ]/);
            if (parts.length >= 3) {
              let m, d;
              if (parts[0].length === 4) {
                // YYYY-MM-DD
                m = parseInt(parts[1], 10);
                d = parseInt(parts[2], 10);
              } else {
                // DD-MM-YYYY
                d = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10);
              }
              if (m === todayMonth && d === todayDay) return true;
            }
            const dob = new Date(emp.date_of_birth);
            if (!isNaN(dob.getTime())) {
              return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
            }
          } catch (e) {
            console.error(e);
          }
          return false;
        });

        if (isMounted && bdays.length > 0) {
          setTodaysBirthdays(bdays);
          // Entrance slide animation
          setTimeout(() => {
            if (isMounted) setIsVisible(true);
          }, 500);
        }
      } catch (err) {
        console.error("Birthday toast check error:", err);
      }
    };

    checkBirthdays();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // User explicitly closed it - don't show again for this session
    sessionStorage.setItem(`birthday_dismissed_by_user_${todayStr}`, 'true');

    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 400);
  };

  if (!isVisible || todaysBirthdays.length === 0) return null;

  const getPhotoUrl = (emp) => {
    const photo = emp?.photo || emp?.profile_image || '';
    if (!photo) return null;
    return photo.startsWith('image/') ? `data:${photo}` : photo;
  };

  return (
    <div 
      className="fixed z-[9999] pointer-events-auto"
      style={{
        bottom: '24px',
        right: '24px',
        maxWidth: '400px',
        width: 'calc(100vw - 32px)',
        transform: isClosing ? 'translateX(120%)' : 'translateX(0)',
        opacity: isClosing ? 0 : 1,
        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease'
      }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-pink-200/90 shadow-[0_20px_50px_rgba(244,63,94,0.22)] p-5 text-slate-800">
        {/* Top vibrant gradient banner accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400" />
        
        {/* Background festive glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-pink-100/60 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-amber-100/60 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close Birthday Alert"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8 mb-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0 animate-bounce">
            <Cake size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                🎉 TODAY'S BIRTHDAY
              </span>
              <Sparkles size={13} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <h4 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
              Celebrate Together! 🎂
            </h4>
          </div>
        </div>

        {/* Subtext */}
        <p className="text-xs text-slate-600 mb-3.5 font-medium leading-relaxed">
          Wishing a very joyous and successful Happy Birthday to our teammate{todaysBirthdays.length > 1 ? 's' : ''}:
        </p>

        {/* Employees Cards list */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {todaysBirthdays.map((emp) => {
            const photo = getPhotoUrl(emp);
            return (
              <div 
                key={emp.id}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-pink-50/80 to-rose-50/50 border border-pink-100 hover:border-pink-200 transition-all shadow-2xs"
              >
                {photo ? (
                  <img 
                    src={photo} 
                    alt={emp.user_name} 
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0" 
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-400 to-rose-500 text-white font-extrabold flex items-center justify-center text-sm border-2 border-white shadow-sm shrink-0">
                    {emp.user_name ? emp.user_name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 truncate">
                    {emp.user_name}
                  </div>
                  <div className="text-xs font-semibold text-rose-600 truncate">
                    {emp.designation || 'Team Member'}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-white/90 px-2 py-1 rounded-xl border border-rose-200/80 shadow-2xs">
                    <Heart size={11} className="fill-rose-500 text-rose-500" /> Wish!
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <PartyPopper size={14} className="text-rose-500" />
            <span>Jay Bhole Family</span>
          </div>
          <button
            onClick={handleClose}
            className="text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
}
