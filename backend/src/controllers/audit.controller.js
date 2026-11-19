const AuditLog = require('../models/auditLog.model');

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, entity, action, actor, status } = req.query;
    const filter = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = action;
    if (actor) filter.actor = actor;
    if (status) filter.status = status;
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * Math.max(parseInt(limit, 10), 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate('actor', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ items, total, page: parseInt(page, 10) || 1, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit logs', error: err.message });
  }
};
