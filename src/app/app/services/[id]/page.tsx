import { ServiceFormPage } from '@/components/services/service-pages';

export default async function EditServiceRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceFormPage serviceId={id} />;
}
