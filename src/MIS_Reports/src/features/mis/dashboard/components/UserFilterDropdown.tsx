'use client';

import { ChevronDown, Loader2, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DashboardUserOption } from '../server/api/dashboardApi';

interface UserFilterDropdownProps {
  users: DashboardUserOption[];
  loading?: boolean;
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
}

// Checkbox multi-select with search. Ticks are staged in a local draft and
// only committed when the popover closes (or on Apply), so picking five
// people fires one dashboard request instead of five.
const UserFilterDropdown = ({
  users,
  loading = false,
  selectedUserIds,
  onChange,
}: UserFilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>(selectedUserIds);

  const draftSet = useMemo(() => new Set(draft), [draft]);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q) ||
        (u.tenant?.name ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const allVisibleSelected =
    visibleUsers.length > 0 && visibleUsers.every((u) => draftSet.has(u.id));

  const commit = (next: string[]) => {
    const changed =
      next.length !== selectedUserIds.length || next.some((id) => !selectedUserIds.includes(id));
    if (changed) onChange(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(selectedUserIds);
      setSearch('');
    } else {
      commit(draft);
    }
    setOpen(next);
  };

  const toggleUser = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleUsers.map((u) => u.id);
    setDraft((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    );
  };

  const selectedNames = users.filter((u) => selectedUserIds.includes(u.id)).map((u) => u.name);
  const triggerLabel =
    selectedUserIds.length === 0
      ? 'All Users'
      : selectedUserIds.length === 1
        ? (selectedNames[0] ?? '1 user')
        : `${selectedUserIds.length} users`;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-1.5 px-3 text-sm font-semibold border rounded-xl whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              selectedUserIds.length > 0
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
            title={selectedNames.join(', ') || 'All Users'}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="max-w-[140px] truncate">{triggerLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading users...
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No users found</div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Checkbox
                  id="mis-user-filter-all"
                  checked={allVisibleSelected}
                  onCheckedChange={toggleAllVisible}
                />
                <label
                  htmlFor="mis-user-filter-all"
                  className="text-xs font-semibold text-foreground cursor-pointer select-none"
                >
                  {search ? 'Select all matching' : 'Select all'} ({visibleUsers.length})
                </label>
              </div>
              <ScrollArea className="h-64">
                <div className="py-1">
                  {visibleUsers.map((u) => {
                    const inputId = `mis-user-filter-${u.id}`;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/60"
                      >
                        <Checkbox
                          id={inputId}
                          checked={draftSet.has(u.id)}
                          onCheckedChange={() => toggleUser(u.id)}
                        />
                        <label
                          htmlFor={inputId}
                          className="flex-1 min-w-0 cursor-pointer select-none"
                        >
                          <span className="block text-xs font-medium text-foreground truncate">
                            {u.name}
                          </span>
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {u.department}
                            {u.tenant?.name ? ` · ${u.tenant.name}` : ''}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex items-center justify-between gap-2 p-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDraft([])}
              disabled={draft.length === 0}
            >
              Clear
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {draft.length === 0 ? 'All users' : `${draft.length} selected`}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleOpenChange(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selectedUserIds.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Clear user filter"
          title="Clear user filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default UserFilterDropdown;
