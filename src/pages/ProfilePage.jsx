import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import { UserCircle, Mail, Briefcase, Shield, Phone, Camera, CheckSquare, BookmarkCheck, CalendarCheck, ClipboardList, ListTodo } from "lucide-react";
import supabase from "../SupabaseClient";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    username: localStorage.getItem("user-name") || "N/A",
    email: localStorage.getItem("email_id") || "N/A",
    role: localStorage.getItem("role") || "N/A",
    designation: localStorage.getItem("designation") || "N/A",
    number: "Fetching...",
    profile_image: localStorage.getItem("profile_image") || ""
  });
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    email: "",
    number: "",
    designation: ""
  });

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

  const handleEditClick = () => {
    setEditForm({
      username: user.username === "N/A" ? "" : user.username,
      password: "",
      email: user.email === "N/A" ? "" : user.email,
      number: user.number === "Fetching..." || user.number === "Not Provided" ? "" : user.number,
      designation: user.designation === "N/A" ? "" : user.designation
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const updateData = {
      user_name: editForm.username,
      email_id: editForm.email,
      number: editForm.number,
      designation: editForm.designation
    };
    if (editForm.password) {
      updateData.password = editForm.password;
    }
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .ilike('user_name', user.username);
      
    if (!error) {
      setUser(prev => ({
        ...prev,
        username: editForm.username || prev.username,
        email: editForm.email || "N/A",
        number: editForm.number || "Not Provided",
        designation: editForm.designation || "N/A"
      }));
      if (editForm.username && editForm.username !== user.username) {
        localStorage.setItem("user-name", editForm.username);
        window.location.reload();
      }
      localStorage.setItem("email_id", editForm.email);
      localStorage.setItem("designation", editForm.designation);
      setIsEditing(false);
    } else {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
    setIsSaving(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-red-700 to-red-900 relative"></div>
          
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

            {!(user.role && user.role.toLowerCase().includes('admin')) && (
              <>
              <div className="flex justify-center sm:justify-end mt-4 sm:-mt-10 mb-6 relative z-10">
                <button 
                  onClick={handleEditClick}
                  className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                >
                  <UserCircle className="w-5 h-5" />
                  Edit Profile
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
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
              </>
            )}

            {user.role && user.role.toLowerCase().includes('admin') && (
              <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* EA Task */}
              <div 
                onClick={() => navigate('/dashboard/ea-task')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ListTodo className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-medium text-gray-900 capitalize">EA Task Assignment</p>
                </div>
              </div>

              {/* Assign Task */}
              <div 
                onClick={() => navigate('/dashboard/assign-task')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-medium text-gray-900 capitalize">Assign Task</p>
                </div>
              </div>

              {/* Admin Approval */}
              <div 
                onClick={() => navigate('/dashboard/admin-approval')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <BookmarkCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-medium text-gray-900 capitalize">Admin Approval</p>
                </div>
              </div>

              {/* Checklist Task */}
              <div 
                onClick={() => navigate('/dashboard/task')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-medium text-gray-900 capitalize">Checklist Task</p>
                </div>
              </div>

              {/* Delegation Task */}
              <div 
                onClick={() => navigate('/dashboard/delegation')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Module</p>
                  <p className="font-medium text-gray-900 capitalize">Delegation Task</p>
                </div>
              </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSaving && setIsEditing(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Profile</h2>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Username (ID)</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">New Password</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Mobile Number (For WhatsApp)</label>
                <input
                  type="text"
                  value={editForm.number}
                  onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
