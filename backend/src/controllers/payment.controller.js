const Booking = require('../models/booking.model');
const stripeService = require('../services/stripe.service');
const { logEvent } = require('../services/audit.service');

exports.createCheckout = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('hotel', 'name owner').populate('room', 'type roomNumber');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.client.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    if (booking.status !== 'confirmed')
      return res.status(400).json({ message: 'Only confirmed bookings can be paid' });
    if (booking.paymentStatus === 'paid')
      return res.status(400).json({ message: 'Already paid' });

    const hotelName = booking.hotel?.name || 'Hotel';
    const roomName = `${booking.room?.type || 'Room'} #${booking.room?.roomNumber || ''}`;
    const { url, sessionId } = await stripeService.createCheckoutSession({
      bookingId,
      amountUSD: booking.totalPrice,
      hotelName,
      roomName,
    });
    booking.stripeSessionId = sessionId;
    await booking.save();
    await logEvent(req, { action: 'PAYMENT_CHECKOUT_CREATE', entity: 'Booking', entityId: booking._id });
    res.json({ url, sessionId });
  } catch (err) {
    await logEvent(req, { action: 'PAYMENT_CHECKOUT_CREATE', entity: 'Booking', status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.verifySession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const { paymentIntentId, bookingId } = await stripeService.verifySession(sessionId);
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.client.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    booking.paymentStatus = 'paid';
    booking.stripePaymentIntentId = paymentIntentId;
    await booking.save();
    await logEvent(req, { action: 'PAYMENT_VERIFIED', entity: 'Booking', entityId: booking._id });
    res.json({ message: 'Payment confirmed', booking });
  } catch (err) {
    await logEvent(req, { action: 'PAYMENT_VERIFIED', entity: 'Booking', status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};

exports.refund = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('hotel','owner');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const { role, id } = req.user;
    if (role === 'client' && booking.client.toString() !== id)
      return res.status(403).json({ message: 'Access denied' });
    if (role === 'owner' && booking.hotel?.owner?.toString() !== id)
      return res.status(403).json({ message: 'Access denied' });
    if (booking.paymentStatus !== 'paid' || !booking.stripePaymentIntentId)
      return res.status(400).json({ message: 'Booking is not paid' });
    booking.paymentStatus = 'refunding';
    await booking.save();
    try {
      await stripeService.refundPayment(booking.stripePaymentIntentId);
      booking.paymentStatus = 'refunded';
      await booking.save();
      await logEvent(req, { action: 'PAYMENT_REFUNDED', entity: 'Booking', entityId: booking._id });
    } catch (refundErr) {
      booking.paymentStatus = 'paid';
      await booking.save();
      await logEvent(req, { action: 'PAYMENT_REFUND_FAILED', entity: 'Booking', entityId: booking._id, status: 'failure', details: { error: refundErr.message } });
      return res.status(500).json({ message: 'Refund failed', error: refundErr.message });
    }
    res.json({ message: 'Refund successful', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
