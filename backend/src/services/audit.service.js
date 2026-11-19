const AuditLog = require('../models/auditLog.model');

async function logEvent(req, { action, entity, entityId = null, details = {}, status = 'success' }) {
  try {
    const actor = req && req.user ? req.user.id : null;
    const actorRole = req && req.user ? req.user.role : 'guest';
    const actorEmail = req && req.user ? req.user.email || null : null;
    const ip = req ? (req.headers['x-forwarded-for'] || req.ip || (req.socket && req.socket.remoteAddress) || null) : null;
    await AuditLog.create({
      actor,
      actorRole,
      actorEmail,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      details,
      status,
      ip: Array.isArray(ip) ? ip[0] : ip,
    });
  } catch (err) {
    console.error('[audit] failed to write log', err.message);
  }
}

module.exports = { logEvent };
