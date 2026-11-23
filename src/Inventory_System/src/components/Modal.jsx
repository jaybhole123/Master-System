import React, { useEffect } from 'react';
import { SvgIcon, IC } from '../utils/helpers';

export default function Modal({
  title,
  children,
  onClose,
  onOk,
  okText = 'Save',
  cancelText = 'Cancel',
  width = '', // '', 'mid', 'wide'
  headerExtra,
  footerExtra,
  showOk = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div id="mod" className="on">
      <div className={`mb ${width}`}>
        <div className="mh">
          <b>{title}</b>
          <div className="mhb">
            {headerExtra}
            <button className="ico" onClick={onClose} title="Close">
              <SvgIcon path={IC.x} />
            </button>
          </div>
        </div>
        <div className="mc">{children}</div>
        <div className="mf">
          {footerExtra}
          {cancelText && (
            <button type="button" className="b2" onClick={onClose}>
              {cancelText}
            </button>
          )}
          {showOk && onOk && (
            <button type="button" className="b1" onClick={onOk}>
              {okText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
