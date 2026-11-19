const fs = require('fs').promises;
const path = require('path');
const Hotel = require('../models/hotel.model');
const Room = require('../models/room.model');
const Tag = require('../models/tag.model');
const { clearCache } = require('../middleware/cache.middleware');
const { logEvent } = require('../services/audit.service');

const IMAGE_ROOT = path.resolve(__dirname, '../../images');

async function deleteImagesFromDisk(imagePaths) {
  const paths = imagePaths ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths]) : [];
  await Promise.allSettled(paths.map(async (relativePath) => {
    if (!relativePath) return;
    const normalized = relativePath.replace(/\\/g, '/');
    const targetPath = path.resolve(IMAGE_ROOT, normalized);
    if (!targetPath.startsWith(IMAGE_ROOT)) return;
    try { await fs.unlink(targetPath); } catch (err) { if (err.code !== 'ENOENT') console.error('Failed to remove hotel image:', targetPath, err.message); }
  }));
}

function normalizeImages(files) {
  return (files || []).map(file => {
    const normalized = file.path.replace(/\\/g, '/');
    const idx = normalized.indexOf('/images/');
    return idx !== -1 ? normalized.slice(idx + '/images/'.length) : path.basename(file.path);
  });
}

function parseTags(input) {
  if (!input) return undefined;
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    try { const p = JSON.parse(input); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    return input.split(',').map(s => s.trim()).filter(Boolean);
  }
  return undefined;
}

exports.CreateHoltel = async (req, res) => {
  try {
    const { name, location, rating, description, latitude, longitude, status } = req.body;
    if (!name || !location || rating === undefined) {
      return res.status(400).json({ message: 'Name, location and rating are required' });
    }
    const ratingNum = Number(rating);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }
    const imagePaths = normalizeImages(req.files);
    const tags = parseTags(req.body.tags);
    const hotel = await Hotel.create({
      name,
      location,
      images: imagePaths,
      rating: ratingNum,
      description: description || '',
      owner: req.user.id,
      tags: tags || [],
      status: status && ['draft','published','archived'].includes(status) ? status : 'published',
      coordinates: {
        latitude: latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null,
      },
    });
    clearCache('/api/Hotel');
    await logEvent(req, { action: 'HOTEL_CREATE', entity: 'Hotel', entityId: hotel._id, details: { name: hotel.name } });
    res.status(201).json({ hotel });
  } catch (err) {
    await logEvent(req, { action: 'HOTEL_CREATE', entity: 'Hotel', status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Error creating hotel', error: err.message });
  }
};

exports.GetAllHotels = async (req, res) => {
  try {
    const { city, rating, q, tag, status, minRating, maxRating, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    const filter = {};
    if (city) filter.location = { $regex: city, $options: 'i' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (rating) filter.rating = Number(rating);
    if (minRating || maxRating) {
      filter.rating = { ...(filter.rating || {}) };
      if (minRating) filter.rating.$gte = Number(minRating);
      if (maxRating) filter.rating.$lte = Number(maxRating);
    }
    if (tag) filter.tags = tag;
    if (status) filter.status = status;

    const isOwner = req.user && req.user.role === 'owner';
    const isAdmin = req.user && req.user.role === 'admin';
    if (isOwner) filter.owner = req.user.id;
    if (!isOwner && !isAdmin && !status) filter.status = 'published';

    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNum - 1) * lim;

    let query = Hotel.find(filter).populate('tags', 'name description').sort(sort).skip(skip).limit(lim);
    if (isOwner || isAdmin) query = query.populate('owner', 'name email');
    else query = query.select('-__v');

    const [items, total] = await Promise.all([query, Hotel.countDocuments(filter)]);
    res.json({ items, total, page: pageNum, pages: Math.ceil(total / lim) || 1 });
  } catch (err) {
    res.status(500).json({ message: 'Error finding hotels', error: err.message });
  }
};

exports.GetHotel = async (req, res) => {
  try {
    let hotelQuery = Hotel.findById(req.params.id).populate('tags', 'name description').populate('owner', 'name email');
    if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
      hotelQuery = Hotel.findById(req.params.id).populate('tags', 'name description').select('-__v');
    }
    const hotel = await hotelQuery;
    if (!hotel) return res.status(404).json({ message: 'hotel not found' });
    if (req.user && req.user.role === 'owner' && hotel.owner && hotel.owner._id && hotel.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access unauthorized' });
    }
    res.json(hotel);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.UpdateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Cant update, hotel not found' });
    if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access unauthorized' });
    }
    const imagePaths = normalizeImages(req.files);
    if (imagePaths.length) hotel.images = [...hotel.images, ...imagePaths];

    if (req.body.name !== undefined) hotel.name = req.body.name;
    if (req.body.location !== undefined) hotel.location = req.body.location;
    if (req.body.rating !== undefined) {
      const r = Number(req.body.rating);
      if (Number.isNaN(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      hotel.rating = r;
    }
    if (req.body.description !== undefined) hotel.description = req.body.description;
    if (req.body.status && ['draft','published','archived'].includes(req.body.status)) hotel.status = req.body.status;
    const tags = parseTags(req.body.tags);
    if (tags !== undefined) hotel.tags = tags;
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      hotel.coordinates = {
        latitude: req.body.latitude === '' || req.body.latitude === null ? null : parseFloat(req.body.latitude),
        longitude: req.body.longitude === '' || req.body.longitude === null ? null : parseFloat(req.body.longitude),
      };
    }
    await hotel.save();
    clearCache('/api/Hotel');
    await logEvent(req, { action: 'HOTEL_UPDATE', entity: 'Hotel', entityId: hotel._id, details: { name: hotel.name } });
    res.json({ message: 'hotel updated successfully', hotel });
  } catch (err) {
    await logEvent(req, { action: 'HOTEL_UPDATE', entity: 'Hotel', entityId: req.params.id, status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.DeleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
    if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this hotel' });
    }
    if (hotel.images && hotel.images.length > 0) await deleteImagesFromDisk(hotel.images);
    await Room.deleteMany({ hotel: req.params.id });
    await Hotel.findByIdAndDelete(req.params.id);
    clearCache('/api/Hotel');
    clearCache('/api/Room');
    await logEvent(req, { action: 'HOTEL_DELETE', entity: 'Hotel', entityId: req.params.id, details: { name: hotel.name } });
    res.json({ message: 'hotel deleted successfully' });
  } catch (err) {
    console.error('Error deleting hotel:', err);
    await logEvent(req, { action: 'HOTEL_DELETE', entity: 'Hotel', entityId: req.params.id, status: 'failure', details: { error: err.message } });
    res.status(500).json({ message: 'Server error' });
  }
};
