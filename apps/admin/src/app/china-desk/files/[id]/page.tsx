import { redirect } from 'next/navigation';

export default async function ChinaDeskFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/china-desk/queue?shipment=${encodeURIComponent(id)}`);
}
