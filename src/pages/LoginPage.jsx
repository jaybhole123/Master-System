"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { loginUser } from "../redux/slice/loginSlice"
import { LoginCredentialsApi } from "../redux/api/loginApi"
import { useMagicToast } from "../context/MagicToastContext"
import supabase from "../SupabaseClient"
import { sendPasswordResetOTP } from "../services/whatsappService"
import { KeyRound, ShieldCheck, User as UserIcon, ArrowLeft, RefreshCw, Smartphone, Eye, EyeOff } from "lucide-react"
import jbtLogo from "../assets/jbt.png"
import jbeLogo from "../assets/jbe.png"
import ganeshLogo from "../assets/ganesh.jpg"

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
        console.log("User Data received:", userData); // Debug log

        let designation = userData.Designation || userData.designation || "";

        // If designation is missing, try fetching it explicitly
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

        console.log("Stored email:", userData.email_id || userData.email); // Debug log

        showToast(`Welcome back, ${userData.user_name || userData.username}!`, "success");
        if (userData.role === 'superadmin') {
          navigate("/dashboard/admin");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-red-50 via-slate-50 to-blue-50 p-4 font-sans relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-8 sm:p-10 relative z-10">
        <style>
          {`
            @keyframes float {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
              100% { transform: translateY(0px); }
            }
            .animate-float {
              animation: float 3s ease-in-out infinite;
            }
            @keyframes blob {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
              animation: blob 7s infinite;
            }
            .animation-delay-2000 {
              animation-delay: 2s;
            }
            .animation-delay-4000 {
              animation-delay: 4s;
            }
          `}
        </style>
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-full overflow-hidden mb-6 relative py-2">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex w-max animate-marquee-seamless gap-4">
              <div className="flex items-center gap-4 shrink-0">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={ganeshLogo} alt="Ganesh Logo" className="h-10 w-auto object-contain rounded-md" />
                </div>
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={jbtLogo} alt="JBT Logo" className="h-10 w-auto object-contain" />
                </div>
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={jbeLogo} alt="JBE Logo" className="h-10 w-auto object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={ganeshLogo} alt="Ganesh Logo" className="h-10 w-auto object-contain rounded-md" />
                </div>
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={jbtLogo} alt="JBT Logo" className="h-10 w-auto object-contain" />
                </div>
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 transition-transform hover:scale-110">
                  <img src={jbeLogo} alt="JBE Logo" className="h-10 w-auto object-contain" />
                </div>
              </div>
            </div>
          </div>
          <h2 className="text-[22px] font-extrabold text-center leading-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Jai Bhole Traders & Enterprises</h2>
          <p className="text-sm text-slate-500 mt-2 text-center font-medium">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
              Username
            </label>
            <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500 focus-within:bg-white transition-all duration-200 group">
              <UserIcon className="h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <input
                id="username"
                name="username"
                type="text"
                placeholder="admin@example.com"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-3 text-[14px] text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
              Password
            </label>
            <div className="relative flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500 focus-within:bg-white transition-all duration-200 group">
              <KeyRound className="h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 ml-3 pr-8 text-[14px] text-slate-800 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              disabled={isLoginLoading}
            >
              {isLoginLoading ? "Signing In..." : "Sign In"}
            </button>
          </div>
          
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[13px] font-semibold text-slate-400 hover:text-red-600 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 text-center relative z-10">
        <span className="inline-flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full text-[11px] font-semibold text-slate-500 shadow-sm border border-slate-100/50">
          Powered by <span className="text-slate-800 font-bold">Botivate</span>
        </span>
      </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isForgotLoading && setShowForgotModal(false)}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-red-50">
              <div className="bg-gradient-to-br from-red-50 to-white px-6 py-6 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  {forgotStep === 'username' && <UserIcon className="text-red-600" size={32} />}
                  {forgotStep === 'otp' && <ShieldCheck className="text-red-600" size={32} />}
                  {forgotStep === 'reset' && <KeyRound className="text-red-600" size={32} />}
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">
                  {forgotStep === 'username' && "Find Your Account"}
                  {forgotStep === 'otp' && "Verify Identity"}
                  {forgotStep === 'reset' && "Set New Password"}
                </h3>
              </div>

              <div className="px-6 pb-8 space-y-4">
                {forgotStep === 'username' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 text-center px-2">Enter your username. An OTP will be sent to the Admin for verification.</p>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Username"
                        value={forgotData.username}
                        onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
                      />
                      <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
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
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isForgotLoading ? <RefreshCw className="animate-spin" size={18} /> : "Send OTP"}
                    </button>
                    <button onClick={() => setShowForgotModal(false)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                )}

                {forgotStep === 'otp' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                      <Smartphone className="text-amber-600 flex-shrink-0" size={16} />
                      <p className="text-[10px] text-amber-800 font-medium">OTP has been sent to the admin number (). Please contact them for the code.</p>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={forgotData.otp}
                        onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm text-center tracking-[0.5em] font-black"
                        maxLength={6}
                      />
                      <ShieldCheck className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                    <button
                      onClick={() => {
                        if (forgotData.otp === forgotData.generatedOtp) {
                          setForgotStep('reset');
                        } else {
                          showToast("Invalid OTP", "error");
                        }
                      }}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                    >
                      Verify OTP
                    </button>
                    <button onClick={() => setForgotStep('username')} className="w-full py-2 text-xs font-bold text-red-600 flex items-center justify-center gap-1"><ArrowLeft size={12} /> Back to Username</button>
                  </div>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (forgotData.newPassword !== forgotData.confirmPassword) return showToast("Passwords don't match", "error");
                    if (forgotData.newPassword.length < 4) return showToast("Password too short", "error");

                    setIsForgotLoading(true);
                    try {
                      const { error } = await supabase.from('users').update({ password: forgotData.newPassword }).eq('user_name', forgotData.username);
                      if (error) throw error;
                      showToast("Password reset successfully!", "success");
                      setShowForgotModal(false);
                      setForgotStep('username');
                      setForgotData({ username: "", otp: "", newPassword: "", confirmPassword: "", generatedOtp: "" });
                    } catch (err) {
                      showToast("Error resetting password", "error");
                    } finally {
                      setIsForgotLoading(false);
                    }
                  }} className="space-y-4">
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="New Password"
                        required
                        value={forgotData.newPassword}
                        onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
                      />
                      <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        required
                        value={forgotData.confirmPassword}
                        onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
                      />
                      <ShieldCheck className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isForgotLoading ? <RefreshCw className="animate-spin" size={18} /> : "Update Password"}
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
