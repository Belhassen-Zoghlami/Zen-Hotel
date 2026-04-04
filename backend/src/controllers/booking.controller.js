const Booking = require('../models/booking.model');
const Room = require('../models/room.model');

//                                                                  Create Booking
exports.createBooking = async (req, res) => {
  try {
    const { roomId, hotelId, checkIn, checkOut } = req.body;

    //   Vérifier que la chambre existe
    const room = await Room.findById(roomId);
    if (!room)
      return res.status(404).json({ message: 'Room not found' });

    if (!room.isAvailable)
      return res.status(400).json({ message: 'Room is not available' });

    //  Vérifier les conflits de dates
    const conflict = await Booking.findOne({
      room: roomId,
      status: { $ne: 'cancelled' },
      $or: [
        { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
        { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
        { checkIn: { $lte: new Date(checkIn) }, checkOut: { $gte: new Date(checkOut) } },
      ],
    });

    if (conflict)
      return res.status(400).json({ message: 'Room already booked for these dates' });

    // Calculer le prix total
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0)
      return res.status(400).json({ message: 'Check-out must be after check-in' });

    const pricePerNight = parseFloat(room.pricePerNight.toString());
    const totalPrice = nights * pricePerNight;

    //    Créer la réservation
    const booking = await Booking.create({
      client: req.user.id,
      room: roomId,
      hotel: hotelId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      nights,
      totalPrice,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

//                                                                  Get client's bookings
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ client: req.user.id })
      .populate('room', 'roomNumber type pricePerNight')
      .populate('hotel', 'name location')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

//                                                                  Get bookings per hotel (owner)
exports.getHotelBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ hotel: req.params.hotelId })
      .populate('client', 'name email')
      .populate('room', 'roomNumber type')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

//                                                                  Confirm booking (owner)
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'pending')
      return res.status(400).json({ message: 'Only pending bookings can be confirmed' });

    booking.status = 'confirmed';
    await booking.save();

    res.json({ message: 'Booking confirmed successfully', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

//                                                                  Cancel booking (client, owner, admin)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking)
      return res.status(404).json({ message: 'Booking not found' });

    if (booking.status === 'cancelled')
      return res.status(400).json({ message: 'Booking is already cancelled' });

    const { role, id } = req.user;

    // client peut annuler seulement sa réservation
    if (role === 'client' && booking.client.toString() !== id)
      return res.status(403).json({ message: 'Access unauthorized' });

    booking.status = 'cancelled';
    booking.cancelledBy = role;
    booking.cancelReason = req.body.cancelReason || null;
    await booking.save();

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

//                                                                  Get all bookings (admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('client', 'name email')
      .populate('room', 'roomNumber type')
      .populate('hotel', 'name location')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};