import { PortalFrame } from '../../components/portal-frame';
import { BookingQuoteCenter } from '../../components/booking-quote-center';

export default function BookingsPage() {
  return (
    <PortalFrame
      currentPath="/bookings"
      title="Booking / Quote"
      subtitle="Request quotes, review pricing, accept offers, and see when accepted bookings route to the China port agent."
    >
      <BookingQuoteCenter />
    </PortalFrame>
  );
}
