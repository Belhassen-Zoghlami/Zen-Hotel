const mongoose = require('mongoose');
const { setupDb, teardownDb, clearDb } = require('../test-utils');
const Hotel = require('../../src/models/hotel.model');
const Booking = require('../../src/models/booking.model');
const Tag = require('../../src/models/tag.model');
const Room = require('../../src/models/room.model');

describe('Business rules and data model constraints', () => {
  beforeAll(async () => { await setupDb(); }, 60000);
  afterAll(async () => { await teardownDb(); }, 60000);
  afterEach(async () => { await clearDb(); });

  test('BR1: hotel rating must be between 1 and 5', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    await expect(Hotel.create({ name: 'H', location: 'Tunis', rating: 6, owner: ownerId })).rejects.toThrow();
    await expect(Hotel.create({ name: 'H', location: 'Tunis', rating: 0, owner: ownerId })).rejects.toThrow();
    const ok = await Hotel.create({ name: 'H', location: 'Tunis', rating: 4, owner: ownerId });
    expect(ok.rating).toBe(4);
  });

  test('BR2: booking status is restricted to workflow states', async () => {
    const b = () => Booking.create({
      client: new mongoose.Types.ObjectId(),
      room: new mongoose.Types.ObjectId(),
      hotel: new mongoose.Types.ObjectId(),
      checkIn: new Date('2026-01-01'),
      checkOut: new Date('2026-01-02'),
      totalPrice: 100,
      status: 'invalid'
    });
    await expect(b()).rejects.toThrow();
  });

  test('BR3: tag names are unique (case-normalized)', async () => {
    const uid = new mongoose.Types.ObjectId();
    await Tag.create({ name: 'spa', createdBy: uid });
    await expect(Tag.create({ name: 'Spa', createdBy: uid })).rejects.toBeTruthy();
  });

  test('BR4: hotel supports N-N relation with tags', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const t1 = await Tag.create({ name: 'spa', createdBy: ownerId });
    const t2 = await Tag.create({ name: 'pool', createdBy: ownerId });
    const h = await Hotel.create({ name: 'H', location: 'Tunis', rating: 5, owner: ownerId, tags: [t1._id, t2._id] });
    const loaded = await Hotel.findById(h._id).populate('tags');
    expect(loaded.tags).toHaveLength(2);
  });

  test('BR5: room requires valid type and availability flag', async () => {
    const hotelId = new mongoose.Types.ObjectId();
    await expect(Room.create({ hotel: hotelId, roomNumber: '101', type: 'villa', capacity: 2, pricePerNight: 100, isAvailable: true })).rejects.toThrow();
    const room = await Room.create({ hotel: hotelId, roomNumber: '101', type: 'double', capacity: 2, pricePerNight: 120, isAvailable: true });
    expect(room.type).toBe('double');
    expect(room.isAvailable).toBe(true);
  });
});
