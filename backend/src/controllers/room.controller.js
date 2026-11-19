const fs = require('fs').promises;
const path = require('path');
const Room = require('../models/room.model');
const Hotel = require('../models/hotel.model');
const { clearCache } = require('../middleware/cache.middleware');
const mongoose = require('mongoose');
const { logEvent } = require('../services/audit.service');

const IMAGE_ROOT = path.resolve(__dirname, '../../images');

async function deleteImagesFromDisk(imagePaths) {
  const paths = imagePaths ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths]) : [];
  await Promise.allSettled(paths.map(async (relativePath) => {
    if (!relativePath) return;
    const normalized = relativePath.replace(/\\/g, '/');
    const targetPath = path.resolve(IMAGE_ROOT, normalized);
    if (!targetPath.startsWith(IMAGE_ROOT)) return;
    try { await fs.unlink(targetPath); } catch (err) { if (err.code !== 'ENOENT') console.error('Failed to remove room image:', targetPath, err.message); }
  }));
}

function normalizeImages(files) {
  return (files || []).map(file => {
    const normalized = file.path.replace(/\\/g, '/');
    const idx = normalized.indexOf('/images/');
    return idx !== -1 ? normalized.slice(idx + '/images/'.length) : path.basename(file.path);
  });
}

exports.CreateRoom = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) return res.status(404).json({ message: 'cant create room, hotel not found' });
    if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Access Unauthorized' });

    const { roomNumber, type, capacity, pricePerNight, description, amenities, isAvailable } = req.body;
    if (!roomNumber || !type || capacity === undefined || pricePerNight === undefined) {
      return res.status(400).json({ message: 'roomNumber, type, capacity and pricePerNight are required' });
    }
    if (Number(capacity) <= 0) return res.status(400).json({ message: 'Capacity must be positive' });
    if (Number(pricePerNight) <= 0) return res.status(400).json({ message: 'Price per night must be positive' });

    const existing = await Room.findOne({ hotel: req.params.hotelId, roomNumber });
    if (existing) return res.status(409).json({ message: 'Room number already exists for this hotel' });

    const imagePaths = normalizeImages(req.files);
    const room = await Room.create({
      hotel: req.params.hotelId,
      images: imagePaths,
      roomNumber,
      type,
      capacity: Number(capacity),
      pricePerNight,
      amenities: Array.isArray(amenities) ? amenities : (amenities ? String(amenities).split(',').map(s=>s.trim()).filter(Boolean) : []),
      description: description || '',
      isAvailable: isAvailable === undefined ? true : (isAvailable === 'true' || isAvailable === true)
    });
    clearCache('/api/Room');
    await logEvent(req, { action: 'ROOM_CREATE', entity: 'Room', entityId: room._id, details: { hotel: req.params.hotelId, roomNumber } });
    res.status(201).json({ room });
  } catch (err) {
    await logEvent(req, { action: 'ROOM_CREATE', entity: 'Room', status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.GetHotelRooms = async (req, res) => {
  try {
    const { type, minPrice, maxPrice, available, q, page = 1, limit = 20, sort = 'roomNumber' } = req.query;
    const filter = { hotel: req.params.hotelId };
    if (type) filter.type = type;
    if (available !== undefined) filter.isAvailable = available === 'true';
    if (q) {
      filter.$or = [
        { roomNumber: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = mongoose.Types.Decimal128.fromString(String(minPrice));
      if (maxPrice) filter.pricePerNight.$lte = mongoose.Types.Decimal128.fromString(String(maxPrice));
    }
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;
    const [items, total] = await Promise.all([
      Room.find(filter).sort(sort).skip(skip).limit(lim),
      Room.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10) || 1, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.UpdateRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ hotel: req.params.hotelId, _id: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'cant update, Room not found' });
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel || (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Access Unauthorized' });
    }

    const imagePaths = normalizeImages(req.files);
    if (imagePaths.length) room.images = [...room.images, ...imagePaths];

    if (req.body.roomNumber !== undefined) room.roomNumber = req.body.roomNumber;
    if (req.body.type !== undefined) room.type = req.body.type;
    if (req.body.capacity !== undefined) {
      if (Number(req.body.capacity) <= 0) return res.status(400).json({ message: 'Capacity must be positive' });
      room.capacity = Number(req.body.capacity);
    }
    if (req.body.pricePerNight !== undefined) {
      if (Number(req.body.pricePerNight) <= 0) return res.status(400).json({ message: 'Price per night must be positive' });
      room.pricePerNight = mongoose.Types.Decimal128.fromString(req.body.pricePerNight.toString());
    }
    if (req.body.amenities !== undefined) {
      room.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : String(req.body.amenities).split(',').map(s=>s.trim()).filter(Boolean);
    }
    if (req.body.description !== undefined) room.description = req.body.description;
    if (req.body.isAvailable !== undefined) room.isAvailable = (req.body.isAvailable === 'true' || req.body.isAvailable === true);

    await room.save();
    clearCache('/api/Room');
    await logEvent(req, { action: 'ROOM_UPDATE', entity: 'Room', entityId: room._id, details: { hotel: req.params.hotelId, roomNumber: room.roomNumber } });
    res.json({ message: 'room updated successfully', room });
  } catch (err) {
    await logEvent(req, { action: 'ROOM_UPDATE', entity: 'Room', entityId: req.params.roomId, status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.GetRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ hotel: req.params.hotelId, _id: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.DeleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ hotel: req.params.hotelId, _id: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'cant delete, Room not found' });
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel || (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Access Unauthorized' });
    }
    await deleteImagesFromDisk(room.images);
    await room.deleteOne();
    clearCache('/api/Room');
    await logEvent(req, { action: 'ROOM_DELETE', entity: 'Room', entityId: req.params.roomId, details: { hotel: req.params.hotelId, roomNumber: room.roomNumber } });
    res.json({ message: 'room deleted successfully' });
  } catch (err) {
    await logEvent(req, { action: 'ROOM_DELETE', entity: 'Room', entityId: req.params.roomId, status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error' });
  }
};
