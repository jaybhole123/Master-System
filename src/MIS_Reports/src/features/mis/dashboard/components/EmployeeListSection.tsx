'use client';

import { ChevronDown, Filter, Loader2, Search } from 'lucide-react';
import PersonAvatar from '../../shared/components/PersonAvatar';

const EmployeeListSection = ({
  user,
  ALL_COLUMNS,
  visibleColumns,
  showColumnFilter,
  setShowColumnFilter,
  toggleColumn,
  toggleAllColumns,
  columnLabels,
  filterName,
  setFilterName,
  filterDepartment,
  setFilterDepartment,
  uniqueDesignations,
  onMainSubmit,
  selectedEmployees,
  mainSubmitting,
  loading,
  filteredEmployees,
  selectAll,
  handleSelectAll,
  handleCheckboxChange,
  handleEmployeeSelect,
  handleRowClick,
  editableData,
  handleInputChange,
  expandedEmployee,
  setExpandedEmployee,
  employeeCommitments,
  handleCommitmentChange,
  scoreAsNegative,
  // 'week' or 'month' — names the commitment column groups.
  periodUnit = 'week',
}: any) => {
  // The row carries "not done" percentages. Positive mode shows what was
  // done (100 − value); Negative mode shows the not-done share as a minus.
  // A row with nothing to measure (no target / nothing done) shows "—"
  // instead of a misleading 100% or 0%.
  const fmtPct = (val: number, measurable: boolean) => {
    if (!measurable) return '—';
    const v = Number(val) || 0;
    if (scoreAsNegative) return v > 0 ? `−${v}%` : '0%';
    return `${100 - v}%`;
  };
  const pctClass = (val: number, measurable: boolean) =>
    !measurable
      ? 'text-muted-foreground'
      : scoreAsNegative && Number(val) > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground';
  const isSelected = (id: string) => selectedEmployees.includes(id);
  // Header groups over the column groups that are currently switched on.
  const baseKeys = [
    'name',
    'designation',
    'target',
    'actualWork',
    'weeklyDone',
    'weeklyOnTime',
    'totalWork',
    'weekPending',
    'allPending',
  ];
  const lastKeys = ['lastWeekPlannedNotDone', 'lastWeekPlannedNotDoneOnTime', 'lastWeekCommitment'];
  const nextKeys = ['nextWeekPlannedNotDone', 'nextWeekPlannedNotDoneOnTime', 'nextWeekCommitment'];
  const countOn = (keys: string[]) => keys.filter((k) => visibleColumns[k]).length;
  const lastSpan = countOn(lastKeys);
  const nextSpan = countOn(nextKeys);
  const thBase =
    'px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap';
  const thLast = `${thBase} bg-amber-50/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300`;
  const thNext = `${thBase} bg-emerald-50/70 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300`;
  const tdNum = 'px-3 py-3 whitespace-nowrap text-sm text-center tabular-nums';
  const tdLast = `${tdNum} bg-amber-50/40 text-foreground dark:bg-amber-500/5`;
  const tdNext = `${tdNum} bg-emerald-50/40 dark:bg-emerald-500/5`;
  const pendingPill = (n: number) =>
    n > 3
      ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
      : n > 1
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  const inputClass =
    'px-2 py-1 border border-border rounded-md text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-4 md:px-5 border-b border-border">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base md:text-[17px] font-semibold text-foreground">
                List of People
              </h2>
              <span className="text-xs text-muted-foreground">
                Click a name to see their work, system by system
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMainSubmit(e);
                  }}
                  disabled={mainSubmitting}
                  className={`inline-flex h-10 items-center px-4 rounded-xl shadow-sm text-sm font-semibold text-white transition-all transform active:scale-95 ${mainSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {mainSubmitting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Selection'
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="relative w-full sm:w-auto order-1">
              <button
                type="button"
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="w-full sm:w-auto inline-flex h-10 items-center justify-center px-4 border border-border text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Columns
              </button>
              {showColumnFilter && (
                <div className="absolute left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 border-b border-border sticky top-0 bg-card z-10">
                    <label className="flex items-center p-2 hover:bg-muted rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Object.values(visibleColumns).every(Boolean)}
                        onChange={toggleAllColumns}
                        className="h-4 w-4 text-blue-600 rounded border-border focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-foreground font-semibold">Select All</span>
                    </label>
                  </div>
                  <div className="p-2 space-y-1">
                    {ALL_COLUMNS.map((col: any) => (
                      <label
                        key={col.key}
                        className="flex items-center p-2 hover:bg-muted rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="h-4 w-4 text-blue-600 rounded border-border focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          {col.key === 'weeklyDone' || col.key === 'weeklyOnTime'
                            ? columnLabels[col.key]
                            : col.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-1 min-w-[200px] sm:min-w-[150px] order-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label="Search by name"
                placeholder="Search by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 min-w-[200px] sm:min-w-[150px] order-3">
              <select
                aria-label="Designation"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map((desig: string) => (
                  <option key={desig} value={desig}>
                    {desig}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-auto max-h-[700px] relative">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-muted/60 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            {(lastSpan > 0 || nextSpan > 0) && (
              <tr>
                <th
                  colSpan={countOn(baseKeys) + 1}
                  className="px-4 pt-2.5 pb-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  This period
                </th>
                {lastSpan > 0 && (
                  <th
                    colSpan={lastSpan}
                    className="px-3 pt-2.5 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider border-l border-border bg-amber-50/70 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    Last {periodUnit} · commitment
                  </th>
                )}
                {nextSpan > 0 && (
                  <th
                    colSpan={nextSpan}
                    className="px-3 pt-2.5 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider border-l border-border bg-emerald-50/70 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    Next {periodUnit} · commitment
                  </th>
                )}
              </tr>
            )}
            <tr className="[&>th]:border-b [&>th]:border-border">
              <th className="w-12 px-4 py-2.5 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </th>

              {visibleColumns.name && (
                <th className={`${thBase} text-left min-w-44`}>{columnLabels.name}</th>
              )}
              {visibleColumns.designation && (
                <th className={`${thBase} text-left`}>{columnLabels.designation}</th>
              )}
              {visibleColumns.target && <th className={thBase}>{columnLabels.target}</th>}
              {visibleColumns.actualWork && <th className={thBase}>{columnLabels.actualWork}</th>}
              {visibleColumns.weeklyDone && <th className={thBase}>{columnLabels.weeklyDone}</th>}
              {visibleColumns.weeklyOnTime && (
                <th className={thBase}>{columnLabels.weeklyOnTime}</th>
              )}
              {visibleColumns.totalWork && <th className={thBase}>{columnLabels.totalWork}</th>}
              {visibleColumns.weekPending && <th className={thBase}>{columnLabels.weekPending}</th>}
              {visibleColumns.allPending && <th className={thBase}>{columnLabels.allPending}</th>}
              {visibleColumns.lastWeekPlannedNotDone && (
                <th className={`${thLast} border-l border-border`}>Planned % Work Not Done</th>
              )}
              {visibleColumns.lastWeekPlannedNotDoneOnTime && (
                <th className={thLast}>Planned % Work Not Done On Time</th>
              )}
              {visibleColumns.lastWeekCommitment && <th className={thLast}>Commitment</th>}
              {visibleColumns.nextWeekPlannedNotDone && (
                <th className={`${thNext} border-l border-border`}>Planned % Work Not Done</th>
              )}
              {visibleColumns.nextWeekPlannedNotDoneOnTime && (
                <th className={thNext}>Planned % Work Not Done On Time</th>
              )}
              {visibleColumns.nextWeekCommitment && <th className={thNext}>Commitment</th>}
            </tr>
          </thead>
          <tbody className="bg-card relative">
            {loading && filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={ALL_COLUMNS.length + 1} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Loading employee data...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={ALL_COLUMNS.length + 1}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  No employees found matching the filters.
                </td>
              </tr>
            ) : (
              <>
                {loading && (
                  <tr className="bg-blue-50/40 dark:bg-blue-500/10">
                    <td colSpan={ALL_COLUMNS.length + 1} className="px-3 py-1 text-center">
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider animate-pulse">
                        Refreshing Data...
                      </span>
                    </td>
                  </tr>
                )}
                {filteredEmployees.map((employee: any) => (
                  <tr
                    key={employee.id}
                    onClick={() => handleRowClick(employee)}
                    className={`group cursor-pointer transition-colors [&>td]:border-b [&>td]:border-border ${
                      isSelected(employee.id)
                        ? 'bg-blue-50/60 dark:bg-blue-500/10'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${employee.name}`}
                        checked={isSelected(employee.id)}
                        onChange={() => handleCheckboxChange(employee.id)}
                        className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {visibleColumns.name && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <PersonAvatar src={employee.image} name={employee.name} size={36} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {employee.name}
                            </div>
                            {employee.tenant && (
                              <div className="text-xs text-muted-foreground">
                                {employee.tenant.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.designation && (
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {employee.designation}
                      </td>
                    )}
                    {visibleColumns.target && (
                      <td className={`${tdNum} text-foreground`}>{employee.target}</td>
                    )}
                    {visibleColumns.actualWork && (
                      <td className={`${tdNum} font-semibold text-foreground`}>
                        {employee.actualWorkDone}
                      </td>
                    )}
                    {visibleColumns.weeklyDone && (
                      <td
                        className={`${tdNum} font-medium ${pctClass(employee.weeklyWorkDone, Number(employee.target) > 0)}`}
                      >
                        {fmtPct(employee.weeklyWorkDone, Number(employee.target) > 0)}
                      </td>
                    )}
                    {visibleColumns.weeklyOnTime && (
                      <td
                        className={`${tdNum} font-medium ${pctClass(employee.weeklyWorkDoneOnTime, Number(employee.actualWorkDone) > 0)}`}
                      >
                        {fmtPct(employee.weeklyWorkDoneOnTime, Number(employee.actualWorkDone) > 0)}
                      </td>
                    )}
                    {visibleColumns.totalWork && (
                      <td className={`${tdNum} text-foreground`}>{employee.totalWorkDone}</td>
                    )}
                    {visibleColumns.weekPending && (
                      <td className={tdNum}>
                        <span
                          className={`inline-flex min-w-8 justify-center items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pendingPill(employee.weekPending)}`}
                        >
                          {employee.weekPending}
                        </span>
                      </td>
                    )}
                    {visibleColumns.allPending && (
                      <td className={`${tdNum} font-semibold text-foreground`}>
                        {employee.allPendingTillDate}
                      </td>
                    )}
                    {visibleColumns.lastWeekPlannedNotDone && (
                      <td className={`${tdLast} border-l border-border`}>
                        {employee.plannedWorkNotDone}
                      </td>
                    )}
                    {visibleColumns.lastWeekPlannedNotDoneOnTime && (
                      <td className={tdLast}>{employee.plannedWorkNotDoneOnTime}</td>
                    )}
                    {visibleColumns.lastWeekCommitment && (
                      <td className={tdLast}>{employee.commitment}</td>
                    )}
                    {visibleColumns.nextWeekPlannedNotDone && (
                      <td className={`${tdNext} border-l border-border`}>
                        {isSelected(employee.id) ? (
                          <input
                            type="text"
                            placeholder="0"
                            value={editableData[employee.id]?.nextWeekPlannedNotDone || ''}
                            onChange={(e) =>
                              handleInputChange(
                                employee.id,
                                'nextWeekPlannedNotDone',
                                e.target.value
                              )
                            }
                            className={`w-16 ${inputClass}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {employee.nextWeekPlannedWorkNotDone || 0}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.nextWeekPlannedNotDoneOnTime && (
                      <td className={tdNext}>
                        {isSelected(employee.id) ? (
                          <input
                            type="text"
                            placeholder="0"
                            value={editableData[employee.id]?.nextWeekPlannedNotDoneOnTime || ''}
                            onChange={(e) =>
                              handleInputChange(
                                employee.id,
                                'nextWeekPlannedNotDoneOnTime',
                                e.target.value
                              )
                            }
                            className={`w-16 ${inputClass}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {employee.nextWeekPlannedWorkNotDoneOnTime || 0}
                          </span>
                        )}
                      </td>
                    )}
                    {visibleColumns.nextWeekCommitment && (
                      <td className={tdNext}>
                        {isSelected(employee.id) ? (
                          <input
                            type="text"
                            placeholder="enter your commitment"
                            value={editableData[employee.id]?.nextWeekCommitment || ''}
                            onChange={(e) =>
                              handleInputChange(employee.id, 'nextWeekCommitment', e.target.value)
                            }
                            className={`w-48 ${inputClass}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {employee.nextWeekCommitment || 0}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="px-3 py-3 bg-muted flex items-center gap-3 border-b border-border sticky top-0 z-10">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-foreground">
            Select All ({filteredEmployees.length})
          </span>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {filteredEmployees.map((employee: any) => (
            <div
              key={employee.id}
              className={`border-b border-border ${selectedEmployees.includes(employee.id) ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}
            >
              <div className="p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => handleEmployeeSelect(employee.id)}
                    className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => handleRowClick(employee)}
                    >
                      <PersonAvatar src={employee.image} name={employee.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {employee.name}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-semibold text-foreground">{employee.target}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-semibold text-foreground">
                          {employee.actualWorkDone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending:</span>
                        <span
                          className={`font-semibold ${employee.weekPending > 3 ? 'text-red-600 dark:text-red-400' : employee.weekPending > 1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                        >
                          {employee.weekPending}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-semibold text-foreground">{employee.score}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)
                    }
                    className="p-2 hover:bg-muted rounded flex-shrink-0"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-foreground transition-transform ${expandedEmployee === employee.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {expandedEmployee === employee.id && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">{columnLabels.weeklyDone}</p>
                        <p
                          className={`font-semibold ${pctClass(employee.weeklyWorkDone, Number(employee.target) > 0)}`}
                        >
                          {fmtPct(employee.weeklyWorkDone, Number(employee.target) > 0)}
                        </p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">{columnLabels.weeklyOnTime}</p>
                        <p
                          className={`font-semibold ${pctClass(employee.weeklyWorkDoneOnTime, Number(employee.actualWorkDone) > 0)}`}
                        >
                          {fmtPct(
                            employee.weeklyWorkDoneOnTime,
                            Number(employee.actualWorkDone) > 0
                          )}
                        </p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">Total Work Done</p>
                        <p className="font-semibold text-foreground">{employee.totalWorkDone}</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-muted-foreground">All Pending</p>
                        <p className="font-semibold text-foreground">
                          {employee.allPendingTillDate}
                        </p>
                      </div>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 space-y-3">
                      <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                        Last {periodUnit === 'month' ? 'Month' : 'Week'} Performance
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-red-700 dark:text-red-400 font-medium">
                            % Work Not Done
                          </p>
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {employee.plannedWorkNotDone || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-red-700 dark:text-red-400 font-medium">
                            Not Done On Time
                          </p>
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {employee.plannedWorkNotDoneOnTime || 0}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-red-700 dark:text-red-400 font-medium">Commitment</p>
                          <p className="text-sm font-bold text-red-700 dark:text-red-300">
                            {employee.commitment || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 space-y-3">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Next {periodUnit === 'month' ? 'Month' : 'Week'} Planning
                      </p>

                      {selectedEmployees.includes(employee.id) ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mb-1">
                              Work Not Done %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                employeeCommitments[employee.id]?.nextWeekPlannedWorkNotDone || 0
                              }
                              onChange={(e) =>
                                handleCommitmentChange(
                                  employee.id,
                                  'nextWeekPlannedWorkNotDone',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-card text-foreground"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mb-1">
                              Work Not Done On Time %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                employeeCommitments[employee.id]
                                  ?.nextWeekPlannedWorkNotDoneOnTime || 0
                              }
                              onChange={(e) =>
                                handleCommitmentChange(
                                  employee.id,
                                  'nextWeekPlannedWorkNotDoneOnTime',
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-card text-foreground"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mb-1">
                              Commitment %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={employeeCommitments[employee.id]?.commitment || 0}
                              onChange={(e) =>
                                handleCommitmentChange(employee.id, 'commitment', e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-border rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-card text-foreground"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                              % Work Not Done
                            </p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {employee.nextWeekPlannedWorkNotDone || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Not Done On Time
                            </p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {employee.nextWeekPlannedWorkNotDoneOnTime || 0}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Commitment
                            </p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {employee.nextWeekCommitment || 0}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeListSection;
