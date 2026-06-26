import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, FileText } from "lucide-react";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  const [preloadedUsers, setPreloadedUsers] = useState<any[][] | null>(null);

  const setAuthenticatedUser = useAuthStore(
    (state) => state.setAuthenticatedUser
  );
  const navigate = useNavigate();

  // Prefetch users list on mount
  React.useEffect(() => {
    const prefetch = async () => {
      try {
        const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbydeOLTJ81fFwTZ85dVDd5GrbSKASsnjlxK9c_owQ_KCFkTUxAeHBfRtjFCMb-zeo6Qgw/exec";
        const url = new URL(GOOGLE_SCRIPT_URL);
        url.searchParams.set("sheet", "Pass");
        url.searchParams.set("_t", Date.now().toString());
        const response = await fetch(url.toString());
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setPreloadedUsers(json.data.slice(1));
        }
      } catch (e) {
        console.error("User list prefetch failed:", e);
      }
    };
    prefetch();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }


    try {
      setIsLoading(true);
      let rows: any[][];
      if (preloadedUsers) {
        rows = preloadedUsers;
      } else {
        const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbydeOLTJ81fFwTZ85dVDd5GrbSKASsnjlxK9c_owQ_KCFkTUxAeHBfRtjFCMb-zeo6Qgw/exec";
        const url = new URL(GOOGLE_SCRIPT_URL);
        url.searchParams.set("sheet", "Pass");
        url.searchParams.set("_t", Date.now().toString());

        const response = await fetch(url.toString());
        const json = await response.json();

        if (!json.success || !Array.isArray(json.data)) {
          throw new Error("Failed to fetch login data");
        }
        rows = json.data.slice(1); // Skip header [Name, username, Password, Role]
      }

      const foundRow = rows.find(row =>
        String(row[1] || "").trim() === username.trim() &&
        String(row[2] || "").trim() === password.trim()
      );

      if (foundRow) {
        // Check for Deleted status in Column F (index 5)
        const deletionStatus = (foundRow[5] || "").toString().trim();
        if (deletionStatus === 'Deleted') {
          toast.error("User Does not exist");
          return;
        }

        const role = (foundRow[3] || "user").toLowerCase() as 'admin' | 'user';

        let permissions: string[] = [];

        if (role === 'admin') {
          permissions = ['Dashboard', 'Document', 'Subscription', 'Loan', 'Calendar', 'Master', 'Settings'];
        } else {
          // Parse permissions from Column E (index 4) for users
          const rawPermissions = (foundRow[4] || "").toString();
          permissions = rawPermissions.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        }

        setAuthenticatedUser({
          id: foundRow[1], // username
          name: (foundRow[0] || "").toString().trim(), // Name from Column A
          role: role,
          permissions: permissions
        });

        toast.success(`Welcome back, ${foundRow[0] || foundRow[1]}!`);
        navigate("/", { replace: true });
      } else {
        toast.error("Invalid username or password");
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(
        `Login failed: ${error instanceof Error ? error.message : "Unknown error"}. Make sure your Google Script is deployed correctly.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-input">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-4">
              <div className="h-40 w-40 flex items-center justify-center rounded-full bg-white shadow-md">
                <FileText className="h-20 w-20 text-indigo-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Document & Subscription System
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">
                Username
              </label>
              <div className="relative">
                <User
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${
                    focusedField === "username"
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl shadow-input focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">
                Password
              </label>
              <div className="relative">
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${
                    focusedField === "password"
                      ? "text-indigo-600"
                      : "text-gray-400"
                  }`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl shadow-input focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                isLoading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600">
          Powered by{" "}
          <a
            href="https://www.botivate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 font-medium"
          >
            Botivate
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
