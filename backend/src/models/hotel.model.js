const mongoose = require('mongoose');
const hotelSchema = new mongoose.Schema

(
    {
        name:

        {
            type: String,
            required: true
        },
        location:
        {
            type: String,
            required: true
        },
        coordinates:
        {
            latitude:
            {
                type: Number,
                default: null
            },
            longitude:
            {
                type: Number,
                default: null
            }
        },
        rating:
        {
            type: String, // 1 star, 4.5 stars etc ..for now string but posed to be float/double or wv
            required: true
        },
        images:
        {
            type: [String],
            default: []
        },
        description:
        {
            type:String

        },
        owner:
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        

    },
    {

        timestamps:true
    }
);

// Add indexes for frequently queried fields
hotelSchema.index({ location: 1 });
hotelSchema.index({ owner: 1 });
hotelSchema.index({ rating: 1 });
hotelSchema.index({ name: 'text', description: 'text' }); // Text search index
hotelSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 }); // Geospatial index

module.exports = mongoose.model('Hotel',hotelSchema);