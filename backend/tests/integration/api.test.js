const request = require('supertest');
const { setupDb, teardownDb, clearDb, createUser, authCookie } = require('../test-utils');
const Hotel = require('../../src/models/hotel.model');
const Room = require('../../src/models/room.model');
const AuditLog = require('../../src/models/auditLog.model');

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret123456';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.ADMIN_EMAIL = 'admin@test.local';
  process.env.ADMIN_PASSWORD = 'Admin123!';
  await setupDb();
  app = require('../../src/app');
});

afterAll(async () => { await teardownDb(); });
afterEach(async () => { await clearDb(); });

async function seedOwnerHotelRoom() {
  const { user: owner } = await createUser({ role: 'owner', email: 'owner@test.local', isValidated: true, email_verified: true });
  const hotel = await Hotel.create({ name: 'Zen Palace', location: 'Tunis', rating: 5, owner: owner._id, description: 'Nice' });
  const room = await Room.create({ hotel: hotel._id, roomNumber: '101', type: 'double', capacity: 2, pricePerNight: 100, isAvailable: true, amenities: ['Wifi'], description: 'Sea view' });
  return { owner, hotel, room };
}

describe('API integration and contract', () => {
  test('GET /api/Hotel returns paginated payload', async () => {
    const { hotel } = await seedOwnerHotelRoom();
    const res = await request(app).get('/api/Hotel').expect(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some(h => h._id === hotel._id.toString())).toBe(true);
  });

  test('GET /api/Hotel supports search/filter', async () => {
    await seedOwnerHotelRoom();
    const res = await request(app).get('/api/Hotel?q=Zen&city=Tunis&minRating=4').expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('Tag CRUD: admin can create and list tags (N-N target entity)', async () => {
    const { user: admin } = await createUser({ role: 'admin', email: 'admin@test.local' });
    const createRes = await request(app).post('/api/tags').set('Cookie', authCookie(admin)).send({ name: 'Spa', description: 'Relax' }).expect(201);
    expect(createRes.body.name).toBe('spa');
    const listRes = await request(app).get('/api/tags').expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find(t => t.name === 'spa')).toBeTruthy();
  });

  test('Booking workflow: client creates pending, owner confirms then completes; invalid transition rejected', async () => {
    const { owner, hotel, room } = await seedOwnerHotelRoom();
    const { user: client } = await createUser({ role: 'client', email: 'client@test.local' });
    const create = await request(app).post('/api/bookings').set('Cookie', authCookie(client)).send({
      roomId: room._id.toString(), hotelId: hotel._id.toString(), checkIn: '2027-01-10', checkOut: '2027-01-12'
    }).expect(201);
    expect(create.body.booking.status).toBe('pending');
    const id = create.body.booking._id;

    await request(app).patch(`/api/bookings/${id}/complete`).set('Cookie', authCookie(owner)).expect(400);

    const confirm = await request(app).patch(`/api/bookings/${id}/confirm`).set('Cookie', authCookie(owner)).expect(200);
    expect(confirm.body.booking.status).toBe('confirmed');

    const complete = await request(app).patch(`/api/bookings/${id}/complete`).set('Cookie', authCookie(owner)).expect(200);
    expect(complete.body.booking.status).toBe('completed');

    await request(app).patch(`/api/bookings/${id}/confirm`).set('Cookie', authCookie(owner)).expect(400);
  });

  test('Role-based access: non-admin cannot access admin metrics; admin can', async () => {
    const { user: client } = await createUser({ role: 'client', email: 'c2@test.local' });
    const { user: admin } = await createUser({ role: 'admin', email: 'a2@test.local' });
    await request(app).get('/api/admin/metrics').set('Cookie', authCookie(client)).expect(403);
    const res = await request(app).get('/api/admin/metrics').set('Cookie', authCookie(admin)).expect(200);
    expect(res.body).toHaveProperty('totals');
    expect(res.body.totals).toHaveProperty('users');
  });

  test('Audit journal records sensitive actions and is queryable by admin', async () => {
    const { owner, hotel, room } = await seedOwnerHotelRoom();
    const { user: admin } = await createUser({ role: 'admin', email: 'admin3@test.local' });
    await request(app).post('/api/tags').set('Cookie', authCookie(owner)).send({ name: 'Pool' }).expect(201);
    const count = await AuditLog.countDocuments();
    expect(count).toBeGreaterThan(0);
    const res = await request(app).get('/api/audit-logs?entity=Tag').set('Cookie', authCookie(admin)).expect(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('Room CRUD basics and hotel-room relation', async () => {
    const { hotel } = await seedOwnerHotelRoom();
    const res = await request(app).get(`/api/Room/${hotel._id}`).expect(200);
    const items = Array.isArray(res.body) ? res.body : res.body.items;
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  test('Admin user listing returns paginated payload and supports filters', async () => {
    const { user: admin } = await createUser({ role: 'admin', email: 'admin4@test.local' });
    await createUser({ role: 'client', email: 'filterme@test.local' });
    const res = await request(app).get('/api/admin/users?role=client').set('Cookie', authCookie(admin)).expect(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.every(u => u.role === 'client')).toBe(true);
  });
});
