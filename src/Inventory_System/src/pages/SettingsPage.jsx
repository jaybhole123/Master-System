import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import GenericPageLayout from '../components/GenericPageLayout';
import { SvgIcon, IC, fmt, today } from '../utils/helpers';
import { PAGEL, DEFCFG } from '../utils/constants';
import Modal from '../components/Modal';

export default function SettingsPage() {
  const {
    data,
    setData,
    currentUser,
    activeTabs,
    setActiveTabs,
    navigateTo,
    nextId,
    logout,
    resetDemo,
    showToast,
    showError
  } = useApp();

  const currentTab = activeTabs.settings || 'users';
  const setTab = tab => setActiveTabs(prev => ({ ...prev, settings: tab }));

  const [activeUserModal, setActiveUserModal] = useState(null); // null = closed, {} = new, or edit user

  const firmMap = new Map(data.firms.map(f => [f.id, f.name]));
  const locMap = new Map(data.locs.map(l => [l.id, l.name]));

  // Backup download
  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `JBT_Coal_IMS_backup_${today()}.json`;
    a.click();
  };

  // Restore from file
  const handleRestoreFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.items || !parsed.txns) {
            throw new Error('Invalid format');
          }
          if (!window.confirm('Replace ALL current data with this backup?')) return;
          parsed.cfg = { ...DEFCFG, ...(parsed.cfg || {}) };
          setData(parsed);
          logout();
          showToast('Backup restored - please log in');
        } catch (err) {
          showError('Not a valid JBT Coal IMS backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Start fresh
  const handleGoLive = () => {
    if (!window.confirm('Delete ALL materials, transactions and physical counts? Download a backup first if you need it.')) return;
    const confirmation = window.prompt('Type DELETE to confirm');
    if (confirmation !== 'DELETE') {
      showToast('Cancelled', true);
      return;
    }
    setData({
      ...data,
      items: [],
      txns: [],
      counts: []
    });
    showToast('All entries cleared - add your materials to start');
    navigateTo('ims');
  };

  // User deletion
  const handleDeleteUser = (id) => {
    const targetUser = data.users.find(u => u.id === id);
    if (!targetUser) return;

    if (currentUser && currentUser.id === id) {
      showError('You cannot delete yourself');
      return;
    }

    if (targetUser.role === 'Admin' && data.users.filter(u => u.role === 'Admin').length < 2) {
      showError('Keep at least one admin');
      return;
    }

    if (!window.confirm(`Delete user ${targetUser.name}?`)) return;

    setData({
      ...data,
      users: data.users.filter(u => u.id !== id)
    });
    showToast(`Deleted ${targetUser.name}`);
  };

  const handleSaveUser = (userVals) => {
    if (!userVals.name?.trim()) return showError('Enter the user name');
    if (!/^\d{4,6}$/.test(userVals.pin?.trim())) return showError('PIN must be 4 to 6 digits');

    if (data.users.some(u => u.id !== activeUserModal.id && u.name.toLowerCase() === userVals.name.trim().toLowerCase())) {
      return showError('A user with this name already exists');
    }

    if (userVals.role === 'User' && !userVals.pages?.length) {
      return showError('Tick at least one page');
    }

    if (activeUserModal.id && userVals.role !== 'Admin' && activeUserModal.role === 'Admin' && data.users.filter(u => u.role === 'Admin').length < 2) {
      return showError('Keep at least one admin');
    }

    const payload = {
      ...userVals,
      name: userVals.name.trim(),
      pin: userVals.pin.trim()
    };

    if (activeUserModal.id) {
      const updatedUsers = data.users.map(u => (u.id === activeUserModal.id ? { ...u, ...payload } : u));
      setData({ ...data, users: updatedUsers });
    } else {
      const newUser = { id: nextId(), ...payload };
      setData({ ...data, users: [...data.users, newUser] });
    }

    showToast('User saved');
    setActiveUserModal(null);
  };

  // General planning settings form state
  const [generalCfg, setGeneralCfg] = useState(() => ({ ...data.cfg }));

  const handleSaveGeneral = () => {
    if (+generalCfg.adcDays < 1 || +generalCfg.fsnDays < 1 || +generalCfg.deadDays < 1) {
      return showError('Days must be at least 1');
    }
    if (+generalCfg.fastTR < 0) {
      return showError('Turnover cannot be negative');
    }

    setData({
      ...data,
      cfg: {
        ...data.cfg,
        ...generalCfg,
        adcDays: +generalCfg.adcDays || 30,
        fsnDays: +generalCfg.fsnDays || 90,
        fastTR: +generalCfg.fastTR || 1,
        deadDays: +generalCfg.deadDays || 90
      }
    });
    showToast('Settings saved');
  };

  const tabsNav = (
    <div className="tabs">
      {[
        ['users', 'Users & access'],
        ['gen', 'General'],
        ['data', 'Backup & data']
      ].map(([key, label]) => (
        <a
          key={key}
          className={key === currentTab ? 'on' : ''}
          onClick={() => setTab(key)}
        >
          {label}
        </a>
      ))}
    </div>
  );

  return (
    <>
      {tabsNav}

      {/* Tab: Users & Access */}
      {currentTab === 'users' && (
        <GenericPageLayout
          title="Users & access"
          sub="Each user sees only the pages, firms and locations you allow. Admins see everything."
          buttons={
            <button type="button" className="b1" onClick={() => setActiveUserModal({})}>
              <SvgIcon path={IC.plus} /> Add user
            </button>
          }
          cols={[
            {
              h: 'User',
              k: 'name',
              f: x => (
                <div className="uc">
                  <span className="av">{x.name[0].toUpperCase()}</span>
                  <div>
                    <b>{x.name}</b>
                    {currentUser && currentUser.id === x.id && <div className="av2">You</div>}
                  </div>
                </div>
              )
            },
            {
              h: 'Role',
              k: 'role',
              f: x => <span className={`bdg ${x.role === 'Admin' ? 'bl' : 'gy'}`}>{x.role}</span>
            },
            {
              h: 'Pages',
              k: 'pages',
              f: x =>
                x.role === 'Admin' ? (
                  <span className="tag">All pages</span>
                ) : (x.pages || []).length ? (
                  x.pages.map(p => (
                    <span key={p} className="tag" style={{ marginRight: '4px' }}>
                      {PAGEL[p] || p}
                    </span>
                  ))
                ) : (
                  <span className="av2">None</span>
                )
            },
            {
              h: 'Firms',
              k: 'firms',
              f: x =>
                x.role === 'Admin' || !(x.firms || []).length ? (
                  <span className="tag">All</span>
                ) : (
                  x.firms.map(fid => (
                    <span key={fid} className="tag" style={{ marginRight: '4px' }}>
                      {firmMap.get(fid) || fid}
                    </span>
                  ))
                )
            },
            {
              h: 'Locations',
              k: 'locs',
              f: x =>
                x.role === 'Admin' || !(x.locs || []).length ? (
                  <span className="tag">All</span>
                ) : (
                  x.locs.map(lid => (
                    <span key={lid} className="tag" style={{ marginRight: '4px' }}>
                      {locMap.get(lid) || lid}
                    </span>
                  ))
                )
            },
            { h: 'PIN', k: 'pin', f: () => '••••' }
          ]}
          data={() => data.users || []}
          act={x => (
            <>
              <button
                type="button"
                className="ico"
                title="Edit"
                onClick={() => setActiveUserModal(x)}
              >
                <SvgIcon path={IC.edit} />
              </button>
              <button
                type="button"
                className="ico dg"
                title="Delete"
                onClick={() => handleDeleteUser(x.id)}
              >
                <SvgIcon path={IC.trash} />
              </button>
            </>
          )}
        />
      )}

      {/* Tab: General Settings */}
      {currentTab === 'gen' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <div className="msec">
            <div className="msh">
              <span className="mic">📈</span>
              <div>
                <b>Planning</b>
                <small>How ADC, re-order levels and FSN are worked out</small>
              </div>
            </div>
            <div className="g3">
              <div className="fg">
                <label>ADC source</label>
                <select
                  value={generalCfg.adcMode}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, adcMode: e.target.value }))}
                >
                  <option value="auto">Actual (from transactions)</option>
                  <option value="manual">Manual (from material)</option>
                </select>
              </div>

              <div className="fg">
                <label>ADC period (days)</label>
                <input
                  type="number"
                  min="1"
                  value={generalCfg.adcDays}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, adcDays: +e.target.value }))}
                />
              </div>

              <div className="fg">
                <label>FSN period (days)</label>
                <input
                  type="number"
                  min="1"
                  value={generalCfg.fsnDays}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, fsnDays: +e.target.value }))}
                />
              </div>

              <div className="fg">
                <label>Fast moving if turnover ≥</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={generalCfg.fastTR}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, fastTR: +e.target.value }))}
                />
              </div>

              <div className="fg">
                <label>Dead if no issue for (days)</label>
                <input
                  type="number"
                  min="1"
                  value={generalCfg.deadDays}
                  onChange={e => setGeneralCfg(prev => ({ ...prev, deadDays: +e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="msec">
            <div className="msh">
              <span className="mic">🛡</span>
              <div>
                <b>Stock control</b>
              </div>
            </div>
            <label className="chk">
              <input
                type="checkbox"
                checked={generalCfg.allowNeg}
                onChange={e => setGeneralCfg(prev => ({ ...prev, allowNeg: e.target.checked }))}
              />{' '}
              Allow stock to go below zero (not recommended)
            </label>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button type="button" className="b1" onClick={handleSaveGeneral}>
              Save settings
            </button>
          </div>
        </div>
      )}

      {/* Tab: Backup & Data */}
      {currentTab === 'data' && (
        <div className="row3">
          <div className="card">
            <div className="msec">
              <div className="msh">
                <span className="mic">💾</span>
                <div>
                  <b>Backup</b>
                  <small>Download everything as one file</small>
                </div>
              </div>
              <p className="lg">
                {data.items.length} materials · {data.txns.length} transactions · {data.users.length} users ·{' '}
                {fmt(new Blob([JSON.stringify(data)]).size / 1024, 0)} KB
              </p>
              <button type="button" className="b1" onClick={handleDownloadBackup}>
                <SvgIcon path={IC.dl} /> Download backup
              </button>
            </div>
          </div>

          <div className="card">
            <div className="msec">
              <div className="msh">
                <span className="mic">📂</span>
                <div>
                  <b>Restore</b>
                  <small>Replace all data with a backup file</small>
                </div>
              </div>
              <p className="lg">Your current data will be overwritten.</p>
              <button type="button" className="b2" onClick={handleRestoreFile}>
                <SvgIcon path={IC.up} /> Restore from file
              </button>
            </div>
          </div>

          <div className="card">
            <div className="msec">
              <div className="msh">
                <span className="mic">🚀</span>
                <div>
                  <b>Go live</b>
                  <small>
                    Delete all materials, entries and counts. Firms, locations, units, parties and users are kept.
                  </small>
                </div>
              </div>
              <button type="button" className="b2 dg" onClick={handleGoLive}>
                Start fresh (blank)
              </button>
            </div>
          </div>

          <div className="card">
            <div className="msec">
              <div className="msh">
                <span className="mic">♻</span>
                <div>
                  <b>Demo data</b>
                  <small>Start again with sample coal data</small>
                </div>
              </div>
              <p className="lg">Deletes all entries. Users reset to admin1 / 1234.</p>
              <button type="button" className="b2 dg" onClick={resetDemo}>
                Reset demo data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit / Add Modal */}
      {activeUserModal && (
        <UserFormModal
          user={activeUserModal}
          firms={data.firms}
          locs={data.locs}
          onSave={handleSaveUser}
          onClose={() => setActiveUserModal(null)}
        />
      )}
    </>
  );
}

function UserFormModal({ user, firms, locs, onSave, onClose }) {
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'User');
  const [pin, setPin] = useState(user.pin || '');
  const [pages, setPages] = useState(user.pages || ['dashboard', 'ims', 'txns']);
  const [userFirms, setUserFirms] = useState(user.firms || []);
  const [userLocs, setUserLocs] = useState(user.locs || []);

  const toggleCheckbox = (list, setList, val) => {
    if (list.includes(val)) {
      setList(list.filter(x => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      role,
      pin,
      pages,
      firms: userFirms,
      locs: userLocs
    });
  };

  const isAdmin = role === 'Admin';

  return (
    <Modal
      title={user.id ? 'Edit user' : 'Add user'}
      width="mid"
      okText={user.id ? 'Save user' : 'Add user'}
      onOk={handleSubmit}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="g3">
          <div className="fg">
            <label>Name *</label>
            <input
              value={name}
              placeholder="e.g. Ramesh (Siltara store)"
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="fg">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="fg">
            <label>PIN * (4-6 digits)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              placeholder="e.g. 4821"
              onChange={e => setPin(e.target.value)}
            />
          </div>
        </div>

        {!isAdmin ? (
          <div style={{ marginTop: '14px' }}>
            <div className="msec">
              <div className="msh">
                <span className="mic">🗂</span>
                <div>
                  <b>Pages</b>
                  <small>Menu items this user can open</small>
                </div>
              </div>
              <div className="cks">
                {Object.entries(PAGEL).map(([pKey, pLabel]) => (
                  <label key={pKey} className="ck">
                    <input
                      type="checkbox"
                      checked={pages.includes(pKey)}
                      onChange={() => toggleCheckbox(pages, setPages, pKey)}
                    />
                    <span>{pLabel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="msec">
              <div className="msh">
                <span className="mic">🏢</span>
                <div>
                  <b>Firms</b>
                  <small>Leave all unticked = all firms</small>
                </div>
              </div>
              <div className="cks">
                {firms.map(f => (
                  <label key={f.id} className="ck">
                    <input
                      type="checkbox"
                      checked={userFirms.includes(f.id)}
                      onChange={() => toggleCheckbox(userFirms, setUserFirms, f.id)}
                    />
                    <span>{f.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="msec">
              <div className="msh">
                <span className="mic">📍</span>
                <div>
                  <b>Locations</b>
                  <small>Leave all unticked = all locations. Stock and entries of other locations stay hidden.</small>
                </div>
              </div>
              <div className="cks">
                {locs.map(l => (
                  <label key={l.id} className="ck">
                    <input
                      type="checkbox"
                      checked={userLocs.includes(l.id)}
                      onChange={() => toggleCheckbox(userLocs, setUserLocs, l.id)}
                    />
                    <span>{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mnote" style={{ marginTop: '14px' }}>
            Admins can open every page and see all firms and locations.
          </div>
        )}
      </form>
    </Modal>
  );
}
