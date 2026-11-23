import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LOGO_BASE64 } from '../utils/constants';

export default function LoginModal() {
  const { data, login, showError } = useApp();
  const usersList = data?.users && data.users.length ? data.users : [
    { id: 'u1', name: 'admin1', pin: '1234', role: 'Admin', pages: [], firms: [], locs: [] },
    { id: 'u2', name: 'Ramesh (Siltara store)', pin: '1111', role: 'User', pages: ['dashboard', 'ims', 'txns', 'reorder'], firms: [], locs: [] }
  ];
  const [selectedUserId, setSelectedUserId] = useState(usersList[0]?.id || '');
  const [pin, setPin] = useState('');

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const user = usersList.find(u => u.id === selectedUserId);
    if (!user || String(user.pin) !== pin.trim()) {
      showError('Wrong PIN');
      return;
    }
    login(user);
  };

  return (
    <div id="login">
      <div className="lbox">
        <img src={LOGO_BASE64} alt="JBT" />
        <h2>Coal IMS</h2>
        <p className="lg">Sign in to continue</p>
        <form onSubmit={handleLogin}>
          <div className="fg">
            <label>User</label>
            <select
              id="lg_u"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ marginTop: '10px' }}>
            <label>PIN</label>
            <input
              id="lg_p"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              autoFocus
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="b1"
            style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}
          >
            Sign in
          </button>
        </form>
        <p className="lg" style={{ marginTop: '12px' }}>
          Demo: admin1 / 1234 · Ramesh / 1111
        </p>
      </div>
    </div>
  );
}
