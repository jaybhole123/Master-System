"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { loginUser } from "../redux/slice/loginSlice"
import { LoginCredentialsApi } from "../redux/api/loginApi"
import { useMagicToast } from "../context/MagicToastContext"
import supabase from "../SupabaseClient"
import { sendPasswordResetOTP } from "../services/whatsappService"
import { 
  KeyRound, ShieldCheck, User as UserIcon, ArrowLeft, RefreshCw, 
  Smartphone, Eye, EyeOff, Sparkles, Lock, Shield, CheckCircle2 
} from "lucide-react"
import jbtLogo from "../assets/jbt.png"
import jbeLogo from "../assets/jbe.png"
import jblLogo from "../assets/jbl.png"
import ganeshLogo from "../assets/ganesh.jpg"
import askLogo from "../assets/ASK.png"
import jaiLogostic from "../assets/jai.logostic.png"
import loginBg from "../assets/login.png"

const LoginPage = () => {
  const navigate = useNavigate()
  const { isLoggedIn, userData, error } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState('username') // 'username', 'otp', 'reset'
  const [forgotData, setForgotData] = useState({
    username: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    generatedOtp: ""
  })
  const [isForgotLoading, setIsForgotLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    dispatch(loginUser(formData));
  };

  useEffect(() => {
    const handleLoginSuccess = async () => {
      if (isLoggedIn && userData) {
        console.log("User Data received:", userData);

        let designation = userData.Designation || userData.designation || "";

        if (!designation && userData.user_name) {
          try {
            const { data } = await supabase
              .from('users')
              .select('Designation')
              .eq('user_name', userData.user_name || userData.username)
              .single();
            if (data) {
              designation = data.Designation || "";
            }
          } catch (err) {
            console.error("Error fetching designation:", err);
          }
        }

        // Store all user data in localStorage
        localStorage.setItem('user-name', userData.user_name || userData.username || "");
        localStorage.setItem('user-id', userData.id || "");
        localStorage.setItem('role', userData.role || "");
        localStorage.setItem('email_id', userData.email_id || userData.email || "");
        localStorage.setItem('user_access', userData.user_access || "");
        localStorage.setItem('profile_image', userData.profile_image || "");
        localStorage.setItem('can_self_assign', userData.can_self_assign === true ? "true" : "false");
        localStorage.setItem('designation', designation);
        localStorage.setItem('system_access', userData.system_access || "");
        localStorage.setItem('page_access', userData.page_access || "");

        showToast(`Welcome back, ${userData.user_name || userData.username}!`, "success");
        
        const isSuperAdminUser = (userData.user_name || userData.username || "").toLowerCase() === "admin" || (userData.role || "").toLowerCase() === "superadmin";
        if (isSuperAdminUser) {
            navigate("/master-dashboard");
        } else {
            navigate("/dashboard/profile");
        }
      } else if (error) {
        showToast(error, "error");
        setIsLoginLoading(false);
      }
    };

    handleLoginSuccess();
  }, [isLoggedIn, userData, error, navigate, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] z-0"></div>
      
      {/* Subtle Ambient Red Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-red-600/20 rounded-full blur-[130px] pointer-events-none z-0"></div>

      {/* ═══════════════════════════════════════════════════════════
          EXECUTIVE LOGIN CARD
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40 p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Brand Pill & Ganesh Emblem */}
        <div className="flex flex-col items-center text-center mb-5">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-[10px] font-black uppercase tracking-wider text-red-700 shadow-2xs mb-3">
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span>Jay Bhole Enterprise System</span>
          </div>

          {/* Group Entities Smooth Infinite Marquee */}
          <div className="w-full overflow-hidden relative py-1 mb-3 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex w-max animate-marquee-seamless">
              <div className="flex items-center gap-4 shrink-0 pr-4">
                <div className="p-1 rounded-lg bg-white shadow-2xs border border-slate-100">
                  <img src={ganeshLogo} alt="Ganesh" className="h-7 w-auto object-contain rounded" />
                </div>
                <img src={askLogo} alt="ASK" className="h-5 max-w-[90px] w-auto object-contain" />
                <img src={jaiLogostic} alt="Jai Logistic" className="h-6 max-w-[95px] w-auto object-contain" />
                <img src={jbtLogo} alt="JBT" className="h-6 w-auto object-contain" />
                <img src={jbeLogo} alt="JBE" className="h-7 w-auto object-contain" />
                <img src={jblLogo} alt="JBL" className="h-6 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-4 shrink-0 pr-4">
                <div className="p-1 rounded-lg bg-white shadow-2xs border border-slate-100">
                  <img src={ganeshLogo} alt="Ganesh" className="h-7 w-auto object-contain rounded" />
                </div>
                <img src={askLogo} alt="ASK" className="h-5 max-w-[90px] w-auto object-contain" />
                <img src={jaiLogostic} alt="Jai Logistic" className="h-6 max-w-[95px] w-auto object-contain" />
                <img src={jbtLogo} alt="JBT" className="h-6 w-auto object-contain" />
                <img src={jbeLogo} alt="JBE" className="h-7 w-auto object-contain" />
                <img src={jblLogo} alt="JBL" className="h-6 w-auto object-contain" />
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Jai Bhole Group
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Enterprise Operations & Intelligence Hub
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            LOGIN CREDENTIALS FORM
        ═══════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="username" 
              className="block text-[11px] font-black uppercase tracking-wider text-slate-500 ml-0.5"
            >
              Username / ID
            </label>
            <div className="relative flex items-center bg-slate-50/80 border border-slate-200/90 rounded-2xl px-3.5 py-3 focus-within:ring-4 focus-within:ring-red-500/10 focus-within:border-red-500 focus-within:bg-white transition-all duration-200 group shadow-2xs">
              <UserIcon className="h-4 w-4 text-slate-400 group-focus-within:text-red-600 transition-colors shrink-0" />
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username or email"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-3 text-sm text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label 
              htmlFor="password" 
              className="block text-[11px] font-black uppercase tracking-wider text-slate-500 ml-0.5"
            >
              Password
            </label>
            
            <div className="relative flex items-center bg-slate-50/80 border border-slate-200/90 rounded-2xl px-3.5 py-3 focus-within:ring-4 focus-within:ring-red-500/10 focus-within:border-red-500 focus-within:bg-white transition-all duration-200 group shadow-2xs">
              <KeyRound className="h-4 w-4 text-slate-400 group-focus-within:text-red-600 transition-colors shrink-0" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-3 pr-8 text-sm text-slate-900 placeholder-slate-400 font-medium tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-600/35 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoginLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Master Portal</span>
              )}
            </button>
          </div>

        </form>

        {/* Security Assurance Badge */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Enterprise 256-Bit Encrypted Portal</span>
        </div>

      </div>
      
      {/* Footer Branding Pill */}
      <div className="mt-6 text-center relative z-10">
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-semibold text-slate-300 shadow-sm border border-white/15">
          Powered by <a href="https://www.botivate.in/" target="_blank" rel="noopener noreferrer" className="text-white font-extrabold hover:text-red-400 transition-colors">Botivate</a>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FORGOT PASSWORD MODAL CONTROLLER
      ═══════════════════════════════════════════════════════════ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => !isForgotLoading && setShowForgotModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-red-50 to-white px-6 pt-6 pb-4 text-center border-b border-red-50">
              <div className="mx-auto w-14 h-14 bg-red-100/80 rounded-2xl flex items-center justify-center mb-3 shadow-2xs">
                {forgotStep === 'username' && <UserIcon className="text-red-600" size={28} />}
                {forgotStep === 'otp' && <ShieldCheck className="text-red-600" size={28} />}
                {forgotStep === 'reset' && <KeyRound className="text-red-600" size={28} />}
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {forgotStep === 'username' && "Find Your Account"}
                {forgotStep === 'otp' && "Verify Identity OTP"}
                {forgotStep === 'reset' && "Set New Password"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {forgotStep === 'username' && "Enter your username to receive a security OTP."}
                {forgotStep === 'otp' && "Enter the 6-digit OTP code sent to Admin."}
                {forgotStep === 'reset' && "Choose a strong password for your account."}
              </p>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Step 1: Username */}
              {forgotStep === 'username' && (
                <div className="space-y-4">
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 focus-within:bg-white transition-all">
                    <UserIcon className="text-slate-400 shrink-0" size={16} />
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={forgotData.username}
                      onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-2.5 text-sm text-slate-900 font-medium"
                    />
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (!forgotData.username) return showToast("Please enter username", "error");
                      setIsForgotLoading(true);
                      try {
                        const { data, error } = await supabase.from('users').select('user_name').eq('user_name', forgotData.username).single();
                        if (error || !data) return showToast("User not found", "error");

                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        await sendPasswordResetOTP(forgotData.username, otp);
                        setForgotData({ ...forgotData, generatedOtp: otp });
                        setForgotStep('otp');
                        showToast("OTP sent to Admin", "success");
                      } catch (err) {
                        showToast("Error processing request", "error");
                      } finally {
                        setIsForgotLoading(false);
                      }
                    }}
                    disabled={isForgotLoading}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-600/20 active:scale-95 text-sm"
                  >
                    {isForgotLoading ? <RefreshCw className="animate-spin" size={16} /> : "Send Verification OTP"}
                  </button>
                  <button 
                    onClick={() => setShowForgotModal(false)} 
                    className="w-full py-1 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {forgotStep === 'otp' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex gap-2.5">
                    <Smartphone className="text-amber-600 shrink-0" size={18} />
                    <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                      OTP has been sent to the registered admin device. Please contact them for the 6-digit code.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="••••••"
                      value={forgotData.otp}
                      onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value })}
                      className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-base text-center tracking-[0.5em] font-black text-slate-900 transition-all"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (forgotData.otp === forgotData.generatedOtp) {
                        setForgotStep('reset');
                      } else {
                        showToast("Invalid OTP code", "error");
                      }
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md shadow-red-600/20 active:scale-95 text-sm"
                  >
                    Verify OTP
                  </button>
                  <button 
                    onClick={() => setForgotStep('username')} 
                    className="w-full py-1 text-xs font-bold text-slate-500 hover:text-red-600 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={12} /> Back to Username
                  </button>
                </div>
              )}

              {/* Step 3: Reset Password */}
              {forgotStep === 'reset' && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (forgotData.newPassword !== forgotData.confirmPassword) return showToast("Passwords don't match", "error");
                    if (forgotData.newPassword.length < 4) return showToast("Password must be at least 4 characters", "error");

                    setIsForgotLoading(true);
                    try {
                      const { error } = await supabase.from('users').update({ password: forgotData.newPassword }).eq('user_name', forgotData.username);
                      if (error) throw error;
                      showToast("Password reset successfully! Please sign in.", "success");
                      setShowForgotModal(false);
                      setForgotStep('username');
                      setForgotData({ username: "", otp: "", newPassword: "", confirmPassword: "", generatedOtp: "" });
                    } catch (err) {
                      showToast("Error resetting password", "error");
                    } finally {
                      setIsForgotLoading(false);
                    }
                  }} 
                  className="space-y-4"
                >
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 focus-within:bg-white transition-all">
                    <KeyRound className="text-slate-400 shrink-0" size={16} />
                    <input
                      type="password"
                      placeholder="New password"
                      required
                      value={forgotData.newPassword}
                      onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-2.5 text-sm text-slate-900 font-medium"
                    />
                  </div>

                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 focus-within:bg-white transition-all">
                    <ShieldCheck className="text-slate-400 shrink-0" size={16} />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      required
                      value={forgotData.confirmPassword}
                      onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-2.5 text-sm text-slate-900 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 text-sm"
                  >
                    {isForgotLoading ? <RefreshCw className="animate-spin" size={16} /> : "Update Password"}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default LoginPage
