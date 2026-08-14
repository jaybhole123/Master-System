import React, { useState, useEffect } from 'react';
import { X, Paperclip, Trash2, UploadCloud, FileText, Image as ImageIcon, Mic, Square, Radio, PlayCircle } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const TaskModal = ({ isOpen, onClose, task, selectedTime, selectedDate }) => {
  const { addTask, updateTask, staffList, categories, currentUser } = useScheduler();

  const [formData, setFormData] = useState({
    description: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    startTime: selectedTime || '10:00',
    endTime: '10:30',
    assignedStaff: currentUser?.id || '',
    priority: 'Medium',
    category: categories[0] || 'Meeting',
    remark: '',
    attachments: []
  });

  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const toggleSpeechToText = () => {
    if (isListening) {
      if (recognitionInstance) recognitionInstance.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setFormData(prev => ({ ...prev, description: (prev.description || '') + (prev.description && !prev.description.endsWith(' ') ? ' ' : '') + finalTranscript }));
      }
    };
    
    recognition.onerror = (e) => { console.error(e); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
    setRecognitionInstance(recognition);
  };

  const toggleAudioRecording = async () => {
    if (isRecordingAudio && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `VoiceNote_${format(new Date(), 'HHmmss')}.webm`, { type: 'audio/webm' });
        
        const filePath = `tasks/${file.name}`;
        
        const { error } = await supabase.storage
          .from('audio-recordings')
          .upload(filePath, file);

        if (error) {
          console.error("Audio upload error:", error);
          alert("Failed to upload audio: " + error.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('audio-recordings')
          .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), {
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrlData.publicUrl
        }]}));
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (err) {
      alert("Microphone access denied or error occurred.");
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    const newAttachments = await Promise.all(files.map(async file => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tasks/${fileName}`;

      const { error } = await supabase.storage
        .from('task-instructions')
        .upload(filePath, file);

      if (error) {
        console.error("Upload error:", error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('task-instructions')
        .getPublicUrl(filePath);

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrlData.publicUrl
      };
    }));
    
    const validAttachments = newAttachments.filter(a => a !== null);
    setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...validAttachments] }));
  };

  const removeAttachment = (index) => {
    setFormData(prev => {
      const newAttachments = [...(prev.attachments || [])];
      newAttachments.splice(index, 1);
      return { ...prev, attachments: newAttachments };
    });
  };

  useEffect(() => {
    if (task) {
      setFormData({
        description: task.description,
        date: task.date,
        startTime: task.startTime,
        endTime: task.endTime,
        assignedStaff: task.assignedStaff,
        remark: task.remark || '',
        attachments: task.attachments || []
      });
    } else {
      setFormData(prev => ({
        ...prev,
        date: selectedDate || prev.date,
        startTime: selectedTime || prev.startTime,
        assignedStaff: currentUser?.id || '',
        description: '',
        remark: '',
        attachments: []
      }));
    }
  }, [task, selectedTime, selectedDate, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task) {
      updateTask(task.id, formData);
    } else {
      addTask({
        ...formData,
        createdBy: currentUser?.name || 'Unknown',
        status: 'Pending',
        actualDoneDate: null
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: 'var(--surface-color)', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{task ? 'Edit Task' : 'Add New Task'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Submitted By</label>
              <input type="text" value={currentUser?.name || 'Admin'} readOnly className="input-field" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Task Date</label>
              <input type="text" value={format(new Date(formData.date), 'dd MMM yyyy')} readOnly className="input-field" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Task Description *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={toggleSpeechToText} title="Speech to Text" style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
                  borderRadius: 'var(--radius-sm)', border: `1px solid ${isListening ? 'var(--status-notdone)' : 'var(--border-color)'}`,
                  backgroundColor: isListening ? '#fef2f2' : 'var(--bg-color)', 
                  color: isListening ? 'var(--status-notdone)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s'
                }}>
                  {isListening ? <Square size={14} /> : <Mic size={14} />} {isListening ? 'Stop' : 'Dictate'}
                </button>
                <button type="button" onClick={toggleAudioRecording} title="Record Voice Note" style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', 
                  borderRadius: 'var(--radius-sm)', border: `1px solid ${isRecordingAudio ? 'var(--status-notdone)' : 'var(--border-color)'}`,
                  backgroundColor: isRecordingAudio ? '#fef2f2' : 'var(--bg-color)', 
                  color: isRecordingAudio ? 'var(--status-notdone)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s'
                }}>
                  {isRecordingAudio ? <Square size={14} /> : <Radio size={14} />} {isRecordingAudio ? 'Recording...' : 'Voice Note'}
                </button>
              </div>
            </div>
            <textarea required name="description" value={formData.description} onChange={handleChange} className="input-field" rows="3" placeholder="Enter task details..."></textarea>
          </div>

          <div className="input-group">
            <label className="input-label">Remark</label>
            <input type="text" name="remark" value={formData.remark} onChange={handleChange} className="input-field" placeholder="Any remarks or reasons..." />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={16} /> Attachments
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label 
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                  padding: '1rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', 
                  cursor: 'pointer', backgroundColor: 'var(--surface-color)', color: 'var(--text-secondary)', 
                  transition: 'all 0.2s ease', gap: '0.5rem'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--surface-color)'; }}
              >
                <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.txt" />
                <div style={{ backgroundColor: '#e0f2fe', color: 'var(--primary-color)', padding: '0.5rem', borderRadius: '50%' }}>
                  <UploadCloud size={20} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.15rem', fontSize: '0.875rem' }}>Click to upload</p>
                  <p style={{ fontSize: '0.7rem' }}>SVG, PNG, JPG, PDF or DOC (max. 5MB)</p>
                </div>
              </label>
              
              {formData.attachments && formData.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>Attached Files ({formData.attachments.length})</p>
                  {formData.attachments.map((file, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-color)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ color: 'var(--primary-color)' }}>
                          {file.type && file.type.startsWith('image/') ? <ImageIcon size={18} /> : 
                           file.type && file.type.startsWith('audio/') ? <PlayCircle size={18} /> : 
                           <FileText size={18} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--status-notdone)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">{task ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
