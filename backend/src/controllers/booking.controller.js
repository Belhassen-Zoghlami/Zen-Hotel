const Booking = require("../models/booking.model");
const Room = require("../models/room.model");
const Hotel = require("../models/hotel.model");
const User = require("../models/user.model");
const stripeService = require("../services/stripe.service");
const {
  sendBookingRequestToOwner,
  sendBookingConfirmedToClient,
  sendBookingCancelledToClient,
} = require("../services/email.service");
const { logEvent } = require("../services/audit.service");

const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed"],
  cancelled: [],
  completed: [],
};

function assertTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

async function findConflictingBooking(roomId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    room: roomId,
    status: { $ne: "cancelled" },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return Booking.findOne(query);
}

exports.createBooking = async (req, res) => {
  try {
    const { roomId, hotelId, checkIn, checkOut } = req.body;
    if (!roomId || !hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ message: "roomId, hotelId, checkIn and checkOut are required" });
    }
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (String(room.hotel) !== String(hotelId)) {
      return res.status(400).json({ message: "Room does not belong to the specified hotel" });
    }
    if (!room.isAvailable) return res.status(400).json({ message: "Room is not available" });
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ message: "Invalid dates" });
    }
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return res.status(400).json({ message: "Check-out must be after check-in" });

    const conflict = await findConflictingBooking(roomId, checkInDate, checkOutDate);
    if (conflict) return res.status(400).json({ message: "Room already booked for these dates" });

    const pricePerNight = parseFloat(room.pricePerNight.toString());
    const totalPrice = nights * pricePerNight;
    const booking = await Booking.create({
      client: req.user.id,
      room: roomId,
      hotel: hotelId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice,
      status: "pending",
    });

    try {
      const hotel = await Hotel.findById(hotelId).populate("owner", "name email");
      const client = await User.findById(req.user.id, "name email");
      if (hotel?.owner?.email) {
        await sendBookingRequestToOwner({ owner: hotel.owner, client, hotel, room, checkIn: checkInDate, checkOut: checkOutDate, nights, totalPrice });
      }
    } catch (emailErr) {
      console.error("[Booking] Failed to send owner notification email:", emailErr.message);
    }

    await logEvent(req, { action: "BOOKING_CREATE", entity: "Booking", entityId: booking._id, details: { room: roomId, hotel: hotelId, status: booking.status, totalPrice } });
    res.status(201).json({ message: "Booking created successfully", booking, nights, totalPrice });
  } catch (err) {
    await logEvent(req, { action: "BOOKING_CREATE", entity: "Booking", status: "failure", details: { error: err.message } });
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getRoomBookedDates = async (req, res) => {
  try {
    const bookings = await Booking.find({ room: req.params.roomId, status: { $ne: 'cancelled' } }).select('checkIn checkOut');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const filter = { client: req.user.id };
    if (status) filter.status = status;
    if (from || to) {
      filter.checkIn = {};
      if (from) filter.checkIn.$gte = new Date(from);
      if (to) filter.checkIn.$lte = new Date(to);
    }
    const lim = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    const pageNum = Math.max(parseInt(page,10)||1,1);
    const skip = (pageNum-1)*lim;
    const [items, total] = await Promise.all([
      Booking.find(filter).populate("room", "roomNumber type pricePerNight").populate("hotel", "name location").sort({ createdAt: -1 }).skip(skip).limit(lim),
      Booking.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total/lim) || 1 });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getHotelBookings = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    if (req.user.role === 'owner' && hotel.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access unauthorized' });
    }
    const filter = { hotel: req.params.hotelId };
    if (status) filter.status = status;
    if (from || to) {
      filter.checkIn = {};
      if (from) filter.checkIn.$gte = new Date(from);
      if (to) filter.checkIn.$lte = new Date(to);
    }
    const lim = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    const pageNum = Math.max(parseInt(page,10)||1,1);
    const skip = (pageNum-1)*lim;
    const [items, total] = await Promise.all([
      Booking.find(filter).populate("client", "name email").populate("room", "roomNumber type").sort({ createdAt: -1 }).skip(skip).limit(lim),
      Booking.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total/lim) || 1 });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("client", "name email")
      .populate("room", "roomNumber type pricePerNight")
      .populate({ path: "hotel", populate: { path: 'owner', select: 'name email' } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (req.user.role === 'owner' && booking.hotel?.owner?._id?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access unauthorized' });
    }
    if (!assertTransition(booking.status, 'confirmed'))
      return res.status(400).json({ message: "Only pending bookings can be confirmed" });
    booking.status = "confirmed";
    booking.paymentStatus = booking.paymentStatus || "unpaid";
    await booking.save();
    try {
      if (booking.client?.email) {
        const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
        await sendBookingConfirmedToClient({ booking, nights });
      }
    } catch (emailErr) { console.error("[Booking] Failed to send confirmation email:", emailErr.message); }
    await logEvent(req, { action: 'BOOKING_CONFIRM', entity: 'Booking', entityId: booking._id, details: { status: booking.status } });
    res.json({ message: "Booking confirmed successfully", booking });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate({ path: 'hotel', select: 'owner name' });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role === 'owner' && booking.hotel?.owner?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access unauthorized' });
    }
    if (!assertTransition(booking.status, 'completed')) {
      return res.status(400).json({ message: 'Only confirmed bookings can be completed' });
    }
    booking.status = 'completed';
    await booking.save();
    await logEvent(req, { action: 'BOOKING_COMPLETE', entity: 'Booking', entityId: booking._id });
    res.json({ message: 'Booking completed successfully', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate("client", "name email")
      .populate("room", "roomNumber type pricePerNight")
      .populate({ path: "hotel", select: "name location owner" });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled") return res.status(400).json({ message: "Booking is already cancelled" });
    if (booking.status === "completed") return res.status(400).json({ message: "Completed bookings cannot be cancelled" });
    const { role, id } = req.user;
    if (role === "client" && booking.client._id.toString() !== id)
      return res.status(403).json({ message: "Access unauthorized" });
    if (role === 'owner' && booking.hotel?.owner?.toString() !== id)
      return res.status(403).json({ message: 'Access unauthorized' });

    const cancelReason = req.body.cancelReason || null;
    booking.status = "cancelled";
    booking.cancelledBy = role;
    booking.cancelReason = cancelReason;
    if (booking.paymentStatus === "paid" && booking.stripePaymentIntentId) {
      booking.paymentStatus = "refunding";
      await booking.save();
      try {
        await stripeService.refundPayment(booking.stripePaymentIntentId);
        booking.paymentStatus = "refunded";
      } catch (refundErr) {
        console.error("[Booking] Refund failed:", refundErr.message);
        booking.paymentStatus = "paid";
      }
    }
    await booking.save();
    try {
      if (role !== "client" && booking.client?.email) {
        const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
        await sendBookingCancelledToClient({ booking, nights, cancelReason, cancelledBy: role });
      }
    } catch (emailErr) { console.error("[Booking] Failed to send cancellation email:", emailErr.message); }
    await logEvent(req, { action: 'BOOKING_CANCEL', entity: 'Booking', entityId: booking._id, details: { cancelledBy: role, reason: cancelReason } });
    res.json({ message: "Booking cancelled successfully", booking });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { status, hotel, client, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (hotel) filter.hotel = hotel;
    if (client) filter.client = client;
    if (from || to) {
      filter.checkIn = {};
      if (from) filter.checkIn.$gte = new Date(from);
      if (to) filter.checkIn.$lte = new Date(to);
    }
    const lim = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    const pageNum = Math.max(parseInt(page,10)||1,1);
    const skip = (pageNum-1)*lim;
    const [items, total] = await Promise.all([
      Booking.find(filter)
        .populate("client", "name email")
        .populate("room", "roomNumber type")
        .populate("hotel", "name location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Booking.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total/lim) || 1 });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
