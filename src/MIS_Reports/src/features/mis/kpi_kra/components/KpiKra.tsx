'use client';

import {
  Award,
  Briefcase,
  CheckSquare,
  ChevronDown,
  Database,
  Download,
  Link,
  MessageSquare,
  PlayCircle,
  Target,
  TrendingUp,
  User,
  Users2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMisAuth } from '../../shared/utils/useMisAuth';
import { getKpiKraDataApi } from '../server/api/kpi_kraApi';

const KpiKra = () => {
  const { user } = useMisAuth();
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [fetchedRoleData, setFetchedRoleData] = useState('');
  const [fetchedTaskData, setFetchedTaskData] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [commTeam, setCommTeam] = useState('');
  const [howToComm, setHowToComm] = useState('');
  const [keyPerson, setKeyPerson] = useState('');
  const [systemsData, setSystemsData] = useState<any[]>([]);
  const [notification, _setNotification] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDashboard(true);
      try {
        const data = await getKpiKraDataApi();
        if (data) {
          // Try to parse common field patterns from DB response
          setFetchedRoleData(data.actualRole || data.roleDescription || data.role || '');
          setFetchedTaskData(
            data.totalTasks !== undefined && data.totalTasks !== ''
              ? `${data.totalTasks} daily tasks`
              : ''
          );
          setYoutubeLink(data.scoringWorkUrl || data.youtubeLink || data.videoUrl || '');
          setInstagramLink(data.scoreBetterUrl || data.instagramLink || data.guideUrl || '');
          setCommTeam(
            Array.isArray(data.communicationTeam)
              ? data.communicationTeam.join(', ')
              : data.commTeam || data.communicationTeam || ''
          );
          setHowToComm(data.howToCommunicate || data.communicationProtocol || data.howToComm || '');
          setKeyPerson(data.keyPerson || data.reportingPerson || '');
          if (Array.isArray(data.systems)) {
            setSystemsData(data.systems);
          } else if (Array.isArray(data.resources)) {
            setSystemsData(data.resources);
          }
        }
      } catch (_error) {
        // Handled silently
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    fetchData();
  }, []);

  const ensureAbsoluteUrl = (url: any) => {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) return strUrl;
    return `https://${strUrl}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/30">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  KPI & KRA Dashboard
                </h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1">
                  Role-specific performance metrics & resources
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold text-foreground shadow-sm hover:border-blue-400 hover:bg-muted focus:outline-none transition-all"
            >
              <Download className="w-4 h-4 text-muted-foreground" />
              Download PDF
            </button>
          </div>
        </div>

        {notification && (
          <div className="fixed top-4 right-4 z-50">
            <div
              className={`px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${notification.type === 'success' ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-red-950 border-red-700 text-red-300'}`}
            >
              {notification.type === 'success' ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Award className="w-5 h-5" />
              )}
              <p className="text-sm font-semibold">{notification.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Official Designation */}
          <div className="group bg-card rounded-2xl shadow-sm border border-border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Official Designation</h2>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">
                  Primary Role
                </p>
                {isLoadingDashboard ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="h-6 w-48 bg-muted rounded" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">
                    {fetchedRoleData || 'No role description available'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Task Velocity */}
          <div className="group bg-card rounded-2xl shadow-sm border border-border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Task Velocity</h2>
              </div>
              <div className="flex items-baseline gap-2">
                {isLoadingDashboard ? (
                  <div className="h-10 w-24 bg-muted rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-4xl font-black text-foreground">
                      {fetchedTaskData !== ''
                        ? String(fetchedTaskData).includes(' ')
                          ? String(fetchedTaskData).split(' ')[0]
                          : fetchedTaskData
                        : '0'}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {fetchedTaskData !== ''
                        ? String(fetchedTaskData).includes(' ')
                          ? String(fetchedTaskData).split(' ').slice(1).join(' ')
                          : 'Daily Tasks'
                        : 'Daily Tasks'}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Success Guides */}
          <div className="group bg-card rounded-2xl shadow-sm border border-border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Success Guides</h2>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {youtubeLink ? (
                  <a
                    href={ensureAbsoluteUrl(youtubeLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-purple-600 hover:text-white transition-all group/link"
                  >
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-4 h-4 text-purple-500 group-hover/link:text-white" />
                      <span className="text-sm font-semibold text-foreground group-hover/link:text-white">
                        How Scoring Works
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 -rotate-90 opacity-0 group-hover/link:opacity-100 transition-all" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl opacity-50">
                    <PlayCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      How Scoring Works
                    </span>
                  </div>
                )}
                {instagramLink ? (
                  <a
                    href={ensureAbsoluteUrl(instagramLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-blue-600 hover:text-white transition-all group/link"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-blue-500 group-hover/link:text-white" />
                      <span className="text-sm font-semibold text-foreground group-hover/link:text-white">
                        How To Score Better
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 -rotate-90 opacity-0 group-hover/link:opacity-100 transition-all" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl opacity-50">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      How To Score Better
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Collaborative Network */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Users2 className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Collaborative Network</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isLoadingDashboard ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
                  ))
                ) : (commTeam
                    ? String(commTeam)
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : []
                  ).length > 0 ? (
                  commTeam
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .map((member: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-transparent hover:border-amber-500/30 hover:bg-amber-500/10 transition-all"
                      >
                        <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center shadow-sm text-xs font-bold text-amber-500 border border-amber-500/20">
                          {member.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{member}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground col-span-2">No team data available</p>
                )}
              </div>
            </div>

            {/* Communication Protocol */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Communication Protocol</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                  <p className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wide">
                    Methodology
                  </p>
                  {isLoadingDashboard ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full animate-pulse" />
                      <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-sm text-foreground font-medium leading-relaxed">
                      {howToComm || 'Protocol not defined'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl border border-border">
                  <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-md border border-border flex-shrink-0">
                    <User className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Key Reporting Person
                    </p>
                    <p className="text-base font-bold text-foreground uppercase">
                      {isLoadingDashboard ? 'Loading...' : keyPerson || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Systems & Resources */}
          <div className="md:col-span-2 lg:col-span-3 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="bg-card p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Database className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Systems & Resources</h2>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Enterprise Tools Architecture
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden">
              {isLoadingDashboard ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-6 border-b border-border last:border-b-0 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))
              ) : systemsData.length > 0 ? (
                systemsData.map((system: any, index: number) => (
                  <div key={index} className="p-6 border-b border-border last:border-b-0">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {system.systemName}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">
                          {system.taskName}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                          {system.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {system.systemLink && (
                          <a
                            href={ensureAbsoluteUrl(system.systemLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-[10px] font-bold uppercase"
                          >
                            <Link className="w-3 h-3" />
                            <span>System</span>
                          </a>
                        )}
                        {system.dbLink && (
                          <a
                            href={ensureAbsoluteUrl(system.dbLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-[10px] font-bold uppercase"
                          >
                            <Database className="w-3 h-3" />
                            <span>Dashboard</span>
                          </a>
                        )}
                        {system.trainingVideo && (
                          <a
                            href={ensureAbsoluteUrl(system.trainingVideo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-[10px] font-bold uppercase"
                          >
                            <PlayCircle className="w-3 h-3" />
                            <span>Training</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground col-span-2">
                  No systems data available
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Platform
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Objective
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Context / Description
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Access Point
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {isLoadingDashboard ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
                          Loading data...
                        </p>
                      </td>
                    </tr>
                  ) : systemsData.length > 0 ? (
                    systemsData.map((system: any, index: number) => (
                      <tr key={index} className="hover:bg-muted/40 transition-all group">
                        <td className="px-6 py-6">
                          <div className="text-sm font-bold text-blue-500 tracking-tight">
                            {system.systemName}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="text-sm font-bold text-foreground mb-0.5">
                            {system.taskName}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="text-xs text-muted-foreground font-medium max-w-md leading-relaxed">
                            {system.description}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {system.systemLink && (
                              <a
                                href={ensureAbsoluteUrl(system.systemLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-muted text-foreground rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="View System"
                              >
                                <Link className="w-4 h-4" />
                              </a>
                            )}
                            {system.dbLink && (
                              <a
                                href={ensureAbsoluteUrl(system.dbLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-muted text-foreground rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Open Dashboard"
                              >
                                <Database className="w-4 h-4" />
                              </a>
                            )}
                            {system.trainingVideo && (
                              <a
                                href={ensureAbsoluteUrl(system.trainingVideo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-muted text-foreground rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                title="Watch Training"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No systems data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiKra;
