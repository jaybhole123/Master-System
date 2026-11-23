import React from 'react';
import { useApp } from '../context/AppContext';
import { PAGEL } from '../utils/constants';

export default function Header({ onToggleSidebar }) {
  const { activePage, operatorName } = useApp();

  const title = activePage === 'item' ? 'Material Detail' : (PAGEL[activePage] || 'JBT Coal IMS');
  const dateStr = new Date().toDateString();
  const initial = (operatorName || 'A').trim()[0].toUpperCase();

  return (
    <header id="top">
      <button className="b2 hb" onClick={onToggleSidebar}>
        ☰
      </button>
      <h1 id="ttl">{title}</h1>
      <span id="dt">{dateStr}</span>
      <div className="av" id="av" title={operatorName}>
        {initial}
      </div>
    </header>
  );
}
