const { text } = require('express');
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
        }
        ,rating:
        {
            type: String, // 1 star, 4.5 stars etc ..for now string but posed to be float/double or wv
            required: true
        },
        images: [
            {
                type:String,
                required:true
            }
        ],
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

module.exports = mongoose.model('Hotel',hotelSchema);