import { useMemo } from 'react';

/**
 * usePagePermission Hook
 * Checks permissions for the currently logged-in user on a specific module and page.
 *
 * Rules:
 * - root admin (user_name === 'admin') has unconditional bypass
 * - all other users are strictly evaluated against their users.page_access JSON
 * - READ: View-only access (canRead: true, canWrite: false, canDelete: false)
 * - WRITE: Full access (canRead: true, canWrite: true, canDelete: true)
 * - MIS: MIS generation enabled for this user
 *
 * @param {string} moduleName - e.g. "Coal System", "Checklist & Delegation", "Transport Reporting"
 * @param {string} pageName - e.g. "Dispatch", "Auction", "Checklist", "Purchase Truck", "Truck Reports"
 */
export function usePagePermission(moduleName, pageName) {
  return useMemo(() => {
    // 1. Focus on user_name
    const userName = (localStorage.getItem('user-name') || '').trim().toLowerCase();
    
    // Only root master admin account ('admin') has unconditional bypass
    const isRootAdmin = userName === 'admin';
    if (isRootAdmin) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        hasMis: true,
        isSuperAdmin: true,
      };
    }

    // 2. Focus on page_access from user table
    const rawPg = localStorage.getItem('page_access') || '';
    let pageMap = {};

    if (rawPg) {
      if (rawPg.trim().startsWith('{')) {
        try {
          pageMap = JSON.parse(rawPg);
        } catch (e) {
          pageMap = {};
        }
      } else if (rawPg.trim().startsWith('[')) {
        try {
          const arr = JSON.parse(rawPg);
          arr.forEach((k) => {
            pageMap[k] = { read: true, write: false, mis: false };
          });
        } catch (e) {}
      } else {
        // Legacy comma-separated format
        rawPg.split(',').forEach((k) => {
          const item = k.trim();
          if (item) {
            pageMap[item] = { read: true, write: false, mis: false };
          }
        });
      }
    }

    // Exact key: "Module::Page" (e.g., "Coal System::Dispatch")
    const exactKey = `${moduleName}::${pageName}`;
    let perm = pageMap[exactKey];

    if (!perm) {
      // Fallback matching: match by module::page or plain page name (case-insensitive)
      const foundKey = Object.keys(pageMap).find((k) => {
        const cleanK = k.trim().toLowerCase();
        return (
          cleanK === exactKey.toLowerCase() ||
          cleanK.endsWith(`::${pageName.toLowerCase()}`) ||
          cleanK === pageName.toLowerCase()
        );
      });
      if (foundKey) {
        perm = pageMap[foundKey];
      }
    }

    // Strict Evaluation directly from page_access:
    // If user has NO entry for this page, they have NO access
    if (!perm || typeof perm !== 'object') {
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        hasMis: false,
        isSuperAdmin: false,
      };
    }

    // READ: true if read is true OR write is true
    const canRead = !!(perm.read || perm.write);
    
    // WRITE: strictly controlled by write boolean in page_access
    const canWrite = !!perm.write;
    
    // DELETE: strictly controlled by write permission
    const canDelete = !!perm.write;
    
    // MIS: strictly controlled by mis boolean in page_access
    const hasMis = !!perm.mis;

    return {
      canRead,
      canWrite,
      canDelete,
      hasMis,
      isSuperAdmin: false,
    };
  }, [moduleName, pageName]);
}

export default usePagePermission;
