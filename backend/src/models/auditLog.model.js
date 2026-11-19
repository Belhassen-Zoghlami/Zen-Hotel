const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: 'guest' },
    actorEmail: { type: String, default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    ip: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actor: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
