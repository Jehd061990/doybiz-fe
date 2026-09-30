export interface Service {
  id?: string;
  _id?: string;
  organizationId?: string;
  branchId?: string | { _id?: string; id?: string; name?: string; address?: string } | null;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  imagePublicId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}
export interface ServiceListResponse { success: boolean; data: Service[]; pagination: { total:number; page:number; limit:number; totalPages:number }; }
