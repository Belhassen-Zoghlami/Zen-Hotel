const User = require("../models/user.model");
const Hotel = require("../models/hotel.model");
const Room = require("../models/room.model");
const Booking = require("../models/booking.model");
const AuditLog = require("../models/auditLog.model");
const mailing = require("../services/email.service");
const { logEvent } = require("../services/audit.service");

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, isValidated, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isValidated !== undefined) filter.isValidated = isValidated === 'true';
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;
    const [items, total] = await Promise.all([
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(lim),
      User.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10) || 1, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

exports.validateOwner = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || user.role !== "owner") {
      return res.status(400).json({ message: "Invalid owner account" });
    }
    user.isValidated = true;
    await user.save();
    await mailing.sendOwnerValidationEmail(user);
    await logEvent(req, { action: 'USER_VALIDATE_OWNER', entity: 'User', entityId: user._id, details: { email: user.email } });
    res.status(200).json({ message: "owner validated successfully! Email sent successfully." });
  } catch (err) {
    res.status(500).json({ message: 'Failed to validate owner', error: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot change your own status" });
    }
    user.isActive = !user.isActive;
    await user.save();
    await logEvent(req, { action: 'USER_TOGGLE_STATUS', entity: 'User', entityId: user._id, details: { isActive: user.isActive } });
    res.status(200).json({ message: `User is now set to ${user.isActive ? "Active" : "Inactive"}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle user status', error: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: "user not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id === userId)
      return res.status(400).json({ message: "You cannot delete your own account" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner") {
      const hotels = await Hotel.find({ owner: userId }, "_id");
      const hotelIds = hotels.map((h) => h._id);
      if (hotelIds.length > 0) {
        await Room.deleteMany({ hotel: { $in: hotelIds } });
        await Booking.deleteMany({ hotel: { $in: hotelIds } });
        await Hotel.deleteMany({ _id: { $in: hotelIds } });
      }
    }
    if (user.role === "client") {
      await Booking.deleteMany({ client: userId });
    }
    await user.deleteOne();
    await logEvent(req, { action: 'USER_DELETE', entity: 'User', entityId: userId, details: { role: user.role, email: user.email } });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("[Admin] deleteUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const [users, bookings, hotels, rooms, recentAudit] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }
      ]),
      Hotel.countDocuments(),
      Room.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).populate('actor', 'name email role'),
    ]);
    const usersByRole = users.reduce((acc, u) => { acc[u._id] = u.count; return acc; }, {});
    const bookingsByStatus = bookings.reduce((acc, b) => { acc[b._id] = { count: b.count, revenue: b.revenue }; return acc; }, {});
    const totalRevenue = bookings.filter(b => b._id === 'confirmed' || b._id === 'completed').reduce((s,b)=>s+b.revenue,0);
    res.json({
      totals: {
        users: Object.values(usersByRole).reduce((a,b)=>a+b,0),
        hotels,
        rooms,
        bookings: bookings.reduce((a,b)=>a+b.count,0),
        revenue: totalRevenue,
      },
      usersByRole,
      bookingsByStatus,
      recentAudit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch metrics', error: err.message });
  }
};
