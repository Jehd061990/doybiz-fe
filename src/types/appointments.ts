export interface AppointmentService {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  branchId?: string | { _id?: string; id?: string; name?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentServiceListResponse {
  success: boolean;
  data: AppointmentService[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AppointmentCustomer {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AppointmentCustomerListResponse {
  success: boolean;
  data: AppointmentCustomer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AppointmentStaff {
  id?: string;
  _id?: string;
  firstName: string;
  lastName: string;
  position: string;
  branchId: string | { _id?: string; id?: string; name?: string };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AppointmentStaffListResponse {
  success: boolean;
  data: AppointmentStaff[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ReservationSource = 'ADMIN' | 'STAFF' | 'WEBSITE';

export interface Reservation {
  id?: string;
  _id?: string;
  branchId: string | { _id?: string; id?: string; name?: string; address?: string };
  customerId: string | { _id?: string; id?: string; firstName?: string; lastName?: string; phone?: string; email?: string };
  serviceId: string | { _id?: string; id?: string; name?: string; price?: number; durationMinutes?: number };
  staffId: string | { _id?: string; id?: string; firstName?: string; lastName?: string; position?: string };
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  durationMinutes: number;
  status: ReservationStatus;
  notes?: string;
  source: ReservationSource;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationListResponse {
  success: boolean;
  data: Reservation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateServiceValues {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  branchId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateServiceValues {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  branchId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateReservationValues {
  branchId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  status?: ReservationStatus;
}

export interface UpdateReservationValues {
  branchId?: string;
  customerId?: string;
  serviceId?: string;
  staffId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  status?: ReservationStatus;
}
