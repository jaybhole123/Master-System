import React from 'react';
import usePagePermission from '../hooks/usePagePermission';

/**
 * PermissionGuard
 * Wraps buttons or actions (Add, Edit, Delete, or View).
 * If user does not have permission, it either hides the children or renders a fallback.
 *
 * Usage:
 * <PermissionGuard module="Coal System" page="Dispatch" action="write">
 *   <button>New DO Add</button>
 * </PermissionGuard>
 */
export default function PermissionGuard({
  module,
  page,
  action = 'write', // 'read' | 'write' | 'delete' | 'mis'
  fallback = null,
  children
}) {
  const perm = usePagePermission(module, page);

  let hasAccess = false;
  if (perm.isSuperAdmin) {
    hasAccess = true;
  } else if (action === 'read') {
    hasAccess = perm.canRead;
  } else if (action === 'write') {
    hasAccess = perm.canWrite;
  } else if (action === 'delete') {
    hasAccess = perm.canDelete;
  } else if (action === 'mis') {
    hasAccess = perm.hasMis;
  }

  if (!hasAccess) {
    return fallback;
  }

  return <>{children}</>;
}
