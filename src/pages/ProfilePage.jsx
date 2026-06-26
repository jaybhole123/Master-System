import React, { useEffect, useState } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import { UserCircle, Mail, Briefcase, Shield, Phone, Camera } from "lucide-react";
import supabase from "../SupabaseClient";

export default function ProfilePage() {
  const [user, setUser] = useState({
    username: localStorage.getItem("user-name") || "N/A",
    email: localStorage.getItem("email_id") || "N/A",
    role: localStorage.getItem("role") || "N/A",
    designation: localStorage.getItem("designation") || "N/A",
    number: "Fetching...",
    profile_image: localStorage.getItem("profile_image") || ""
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUsername = localStorage.getItem("user-name");
      if (!storedUsername) return;

      const { data, error } = await supabase
        .from('users')
        .select('number, profile_image')
        .ilike('user_name', storedUsername)
        .single();

      if (data && !error) {
        setUser(prev => ({
          ...prev,
          number: data.number || "Not Provided",
          profile_image: data.profile_image || prev.profile_image
        }));
        if (data.profile_image) {
            localStorage.setItem("profile_image", data.profile_image);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Image = reader.result;
        
        // Update Supabase
        const { error } = await supabase
            .from('users')
            .update({ profile_image: base64Image })
            .ilike('user_name', user.username);
            
        if (!error) {
            setUser(prev => ({ ...prev, profile_image: base64Image }));
            localStorage.setItem("profile_image", base64Image);
            window.location.reload(); // Refresh to update sidebar image
        } else {
            console.error("Error uploading image:", error);
        }
        setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-red-600 to-red-700 relative"></div>
          
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 relative z-10 mb-8">
              {/* Avatar */}
              <div className="relative group">
                  <div className="h-32 w-32 rounded-full border-4 border-white bg-red-50 flex items-center justify-center shadow-md shrink-0 overflow-hidden relative">
                    {user.profile_image ? (
                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-5xl font-black text-red-600 uppercase">
                        {user.username ? user.username.charAt(0) : "U"}
                        </span>
                    )}
                    
                    {/* Upload Overlay */}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera className="w-8 h-8 mb-1" />
                        <span className="text-xs font-bold">{uploading ? 'Uploading...' : 'Change'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
              </div>
              
              <div className="mb-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-900 capitalize">
                  {user.username}
                </h1>
                <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Shield className="w-4 h-4" />
                  {user.role}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-10">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Username</p>
                  <p className="font-medium text-gray-900 capitalize">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email Address</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Mobile Number</p>
                  <p className="font-medium text-gray-900">{user.number}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Designation</p>
                  <p className="font-medium text-gray-900 capitalize">{user.designation}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
