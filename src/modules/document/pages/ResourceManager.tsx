import { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import AllDocuments from './document/AllDocuments';
import CalendarReminder from './document/CalendarReminder';
import useHeaderStore from '../store/headerStore';

const ResourceManager = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'calendar'>('documents');
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Resource Manager');
  }, [setTitle]);

  return (
    <div className="space-y-6 pb-20">
      {/* Tabs Header */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'documents'
              ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <FileText size={18} />
          <span>Documents</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Calendar size={18} />
          <span>Calendar Reminder</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'documents' ? (
          <div>
            <AllDocuments />
          </div>
        ) : (
          <div>
            <CalendarReminder />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceManager;
