const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    images: { type: [String], default: [] },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' }
  },
  { timestamps: true }
);

// Add indexes for frequently queried fields
hotelSchema.index({ location: 1 });
hotelSchema.index({ owner: 1 });
hotelSchema.index({ rating: 1 });
hotelSchema.index({ name: 'text', description: 'text' }); // Text search index
hotelSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 }); // Geospatial index

module.exports = mongoose.model('Hotel',hotelSchema);