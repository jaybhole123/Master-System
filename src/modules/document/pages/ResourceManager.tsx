import { useState, useEffect } from 'react';
import { FileText, Calendar, Shield } from 'lucide-react';
import AllDocuments from './document/AllDocuments';
import ReminderCalendar from './document/ReminderCalendar';
import InsuranceMasterData from './document/InsuranceMasterData';
import useHeaderStore from '../store/headerStore';

const ResourceManager = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'calendar' | 'insuranceMaster'>('documents');
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Insurance');
  }, [setTitle]);

  return (
    <div className="space-y-4">
      {/* Tabs Header */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-wrap sm:flex-nowrap gap-2">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'calendar'
              ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Calendar size={18} />
          <span>Calendar Reminder</span>
        </button>
        <button
          onClick={() => setActiveTab('insuranceMaster')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'insuranceMaster'
              ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Shield size={18} />
          <span>Insurance Master Data</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'documents' && (
          <div>
            <AllDocuments />
          </div>
        )}
        {activeTab === 'calendar' && (
          <div>
            <ReminderCalendar />
          </div>
        )}
        {activeTab === 'insuranceMaster' && (
          <div>
            <InsuranceMasterData />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceManager;
