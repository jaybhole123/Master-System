import React from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toastInfo } = useApp();

  if (!toastInfo.visible) return null;

  return (
    <div
      id="toast"
      className={toastInfo.isError ? 'er' : ''}
      style={{ display: 'block' }}
    >
      {toastInfo.message}
    </div>
  );
}
