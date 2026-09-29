import { ServiceDetailContainer } from '@/components/appointments/service-form';

export default async function ServiceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceDetailContainer id={id} />;
}
