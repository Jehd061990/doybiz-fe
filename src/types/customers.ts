export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  _id?: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  status: CustomerStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerListResponse {
  success: boolean;
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  status: CustomerStatus;
}
