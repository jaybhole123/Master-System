import React from 'react';
import { useApp } from '../context/AppContext';
import { SvgIcon, IC } from '../utils/helpers';
import { LOGO_BASE64 } from '../utils/constants';

const NAV_ITEMS = [
  ['dashboard', 'Dashboard', IC.home],
  ['ims', 'Inventory (IMS)', IC.box],
  ['txns', 'Transactions', IC.swap],
  ['reorder', 'Re-Orders', IC.ref],
  ['reports', 'Reports', IC.rep],
  ['masters', 'Masters', IC.users]
];

export default function Sidebar({ isOpen, onClose }) {
  const { activePage, navigateTo, canP, cx, operatorName, currentUser, isAdm, logout } = useApp();

  const reorderCount = Object.values(cx).filter(x => x.need).length || '';
  const initial = (operatorName || 'A').trim()[0].toUpperCase();

  const activeBase = activePage === 'item' ? 'ims' : activePage;

  return (
    <aside id="side" className={isOpen ? 'open' : ''}>
      <div className="brand">
        <span className="logo">
          <img src={LOGO_BASE64} alt="JBT" />
        </span>
        <div>
          Coal IMS
          <small>Inventory Management System</small>
        </div>
      </div>

      <nav id="nav">
        {NAV_ITEMS.filter(([pageKey]) => canP(pageKey)).map(([pageKey, label, iconPath]) => {
          const isOn = activeBase === pageKey;
          return (
            <a
              key={pageKey}
              className={isOn ? 'on' : ''}
              onClick={() => {
                navigateTo(pageKey);
                if (onClose) onClose();
              }}
            >
              <SvgIcon path={iconPath} />
              {label}
              {pageKey === 'reorder' && reorderCount > 0 && (
                <span className="nb">{reorderCount}</span>
              )}
            </a>
          );
        })}
      </nav>

      <div className="sfoot">
        <div className="av">{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{operatorName}</b>
          {currentUser?.role}
          {isAdm()
            ? ''
            : ' · ' + (currentUser?.locs?.length ? `${currentUser.locs.length} location(s)` : 'all locations')}
        </div>
        <button
          className="ico so"
          title="Switch user / sign out"
          onClick={logout}
        >
          ⎋
        </button>
      </div>
    </aside>
  );
}
