const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema

(
    {
        hotel:
        {

            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hotel',
            required: true
        },
        images:
        {
            type: [String],
            default: []
        },
        roomNumber:
        {
            type:String,
            required: true
        }
        ,
        type:
        {

            type:String,
            enum:
             [  
                'single',
                'double',
                'suite'
            ],
            required: true
        },
        capacity:

        {
            type:Number,
            required:true
        },
        pricePerNight:
        {
            type:mongoose.Schema.Types.Decimal128,
            required: true,

        }
        ,amenities:[
        {
            type: String,
            enum:
            [
                 'Wifi',
                 'AC',
                 'Heating',
                 'TV',
                 'Mini_bar',
                 'Room_service',
                 'Sea_view',
                 'Balcony',
            ]

        }]
        ,
        description:
        {

            type: String,
        },
        isAvailable:
        {

            type:Boolean,
            required:true
        }


    },{timestamps:true}
);

module.exports = mongoose.model('Room',roomSchema);