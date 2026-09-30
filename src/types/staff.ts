export type StaffStatus = 'ACTIVE' | 'INACTIVE';

export interface Staff {
  id?: string;
  _id?: string;
  organizationId: string;
  branchId: string | { _id?: string; id?: string; name?: string; address?: string };
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  position: string;
  status: StaffStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffListResponse {
  success: boolean;
  data: Staff[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface StaffService {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  branchId?: string | { _id?: string; id?: string; name?: string } | null;
}

export interface StaffServiceListResponse {
  success: boolean;
  services: StaffService[];
}

export interface StaffFormValues {
  branchId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  position: string;
  status: StaffStatus;
}
