const Room = require('../models/room.model');
const Hotel = require('../models/hotel.model');

//room creation
exports.CreateRoom = async(req,res) =>

    {
        try
        {
            const hotel = await Hotel.findById(req.params.hotelId);

            if (!hotel)
                return res.status(404).json({message: 'cant create room, hotel not found'});
            if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')
                return res.status(403).json({message: 'Access Unauthorized'});
            
            
            const room = await Room.create
            
            (
                {
                    hotel: req.params.hotelId,
                    roomNumber: req.body.roomNumber,
                    type: req.body.type,
                    capacity: req.body.capacity,
                    pricePerNight: req.body.pricePerNight,
                    amenities: req.body.amenities,
                    description: req.body.description,
                    isAvailable: req.body.isAvailable,
                    //images
                }
            );

            // await room.save();
            res.json('Room created successfully');
        }
        catch(err)
        {
            res.status(500).json({message: 'Server error',error:err.message});
        }
    }

// rooms per hotel
exports.GetHotelRooms = async (req,res) =>
{
    try
    {

        const rooms = await Room.find({hotel: req.params.hotelId});
        res.json(rooms)
    }
    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}

//update room

exports.UpdateRoom = async (req,res)=>
{
    try 
    {

        const room = await Room.find({hotel:req.params.hotelId}).findById(req.params.roomId);
        if (!room)
            return res.status(404).json({ message: 'cant update, Room not found'});
        room.roomNumber= req.body.roomNumber || room.roomNumber;
        room.type= req.body.type || room.type;
        room.capacity= req.body.capacity || room.capacity;
        room.pricePerNight= req.body.pricePerNight || room.pricePerNight;
        room.amenities= req.body.amenities || room.amenities;
        room.desciption= req.body.desciption || room.desciption;
        if (req.body.isAvailable !== undefined) room.isAvailable=req.body.isAvailable;
        //images
        await room.save()
        res.json({message: 'room updated successfully'});
    }
    catch(err)
    {
        res.status(500).json({message: 'Server error', error:err.message});
    }
}

//get room by id

exports.GetRoom = async (req,res) =>
{
    try
    {
        const room = await Room.find({hotel:req.params.hotelId}).findById(req.params.roomId);
        if(!room)
        {

            return res.status(404).json({message: 'Room not found'})
        }
        res.json(room)

    }
    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}

//delete room

exports.DeleteRoom = async (req,res) =>
{
    try
    {
        const room = await Room.find({hotel:req.params.hotelId}).findById(req.params.roomId);
        if (!room)
        {
            return res.status(404).json({message: 'cant delete, Room not found'});
        }
        await room.deleteOne();
        res.json({message: 'room deleted successfully'})
    }
    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}
