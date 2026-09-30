'use client';

import { useState } from 'react';

export const DEFAULT_SERVICE_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 600%22%3E%3Crect width=%22800%22 height=%22600%22 fill=%22%23e9f5ee%22/%3E%3Ccircle cx=%22400%22 cy=%22250%22 r=%2280%22 fill=%22%231f6f50%22 opacity=%22.12%22/%3E%3Cpath d=%22M350 260h100M400 210v100%22 stroke=%22%231f6f50%22 stroke-width=%2218%22 stroke-linecap=%22round%22/%3E%3Ctext x=%22400%22 y=%22390%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2232%22 font-weight=%22700%22 fill=%22%231f6f50%22%3EDOYBIZ SERVICE%3C/text%3E%3C/svg%3E';

export function ServiceImage({ src, alt = '', className, loading }: { src?: string | null; alt?: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : DEFAULT_SERVICE_IMAGE;
  return <img src={imageSrc} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
