const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');

let mongo;

async function setupDb() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret123456';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/test';

  const externalUri = process.env.MONGODB_URI || process.env.MONGO_TEST_URI;
  if (externalUri) {
    await mongoose.connect(externalUri, { dbName: process.env.MONGO_TEST_DB || 'zenhotel_test' });
    return;
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'zenhotel_test' });
}

async function teardownDb() {
  try {
    if (mongoose.connection.readyState) await mongoose.connection.dropDatabase();
  } catch (e) {
    // ignore cleanup errors in constrained environments
  }
  try {
    await mongoose.disconnect();
  } catch (e) {}
  if (mongo) {
    try { await mongo.stop(); } catch (e) {}
  }
}

async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) await collections[key].deleteMany({});
}

async function createUser(overrides = {}) {
  const password = overrides.password || 'Password123';
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: overrides.name || 'User',
    email: (overrides.email || `user${Date.now()}${Math.random()}@test.local`).toLowerCase(),
    password: hash,
    role: overrides.role || 'client',
    isValidated: overrides.isValidated !== undefined ? overrides.isValidated : (overrides.role === 'owner' ? true : true),
    email_verified: overrides.email_verified !== undefined ? overrides.email_verified : true,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  });
  return { user, password };
}

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function authCookie(user) {
  return [`token=${tokenFor(user)}`];
}

module.exports = { setupDb, teardownDb, clearDb, createUser, tokenFor, authCookie };
