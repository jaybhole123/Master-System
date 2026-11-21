import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDisplayableImageUrl } from '../utils/imageUtils';

const AuthContext = createContext(undefined);

const defaultUser = {
  id: 'admin',
  name: 'Admin',
  role: 'admin',
  rowIndex: 1,
  image: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
  email: 'admin@mis.com',
  department: 'Management',
  designation: 'Administrator',
  reportedBy: ''
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('mis_user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.warn("Error reading stored user:", e);
    }
    return defaultUser;
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    const verifiedUser = {
      ...defaultUser,
      name: username || 'Admin',
      id: username || 'admin'
    };
    setUser(verifiedUser);
    localStorage.setItem('mis_user', JSON.stringify(verifiedUser));
    setLoading(false);
    return true;
  };

  // Update profile image function (local base64/objectURL storage)
  const updateProfileImage = async (file) => {
    if (!user) return { success: false, error: "User not identified" };

    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const updatedUser = { ...user, image: base64Data };
      setUser(updatedUser);
      localStorage.setItem('mis_user', JSON.stringify(updatedUser));
      return { success: true, image: base64Data };
    } catch (err) {
      console.error("Profile update error:", err);
      return { success: false, error: err.message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('mis_user');
    setUser(defaultUser);
    navigate('/admin/dashboard');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateProfileImage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}