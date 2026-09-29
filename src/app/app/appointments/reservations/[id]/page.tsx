import { ReservationDetailContainer } from '@/components/appointments/reservation-detail';

export default async function ReservationDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReservationDetailContainer id={id} />;
}
