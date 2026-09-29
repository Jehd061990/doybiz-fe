'use client';

import { useLogout } from '@refinedev/core';

export function LogoutButton() {
  const { mutate: logout, isPending } = useLogout();
  return (
    <button className="text-button" type="button" onClick={() => logout()} disabled={isPending}>
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
