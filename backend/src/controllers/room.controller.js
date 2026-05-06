const fs = require('fs').promises;
const path = require('path');
const Room = require('../models/room.model');
const Hotel = require('../models/hotel.model');
const mongoose = require('mongoose');

const IMAGE_ROOT = path.resolve(__dirname, '../../images');

async function deleteImagesFromDisk(imagePaths) {
    const paths = imagePaths
        ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths])
        : [];

    await Promise.allSettled(paths.map(async (relativePath) => {
        if (!relativePath) return;
        const normalized = relativePath.replace(/\\/g, '/');
        const targetPath = path.resolve(IMAGE_ROOT, normalized);
        if (!targetPath.startsWith(IMAGE_ROOT)) return;
        try {
            await fs.unlink(targetPath);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('Failed to remove room image:', targetPath, err);
            }
        }
    }));
}

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

            const imagePaths = req.files
                ? req.files.map(file => {
                    const normalized = file.path.replace(/\\/g, '/');
                    const idx = normalized.indexOf('/images/');
                    return idx !== -1 ? normalized.slice(idx + '/images/'.length) : path.basename(file.path);
                })
                : [];

            const room = await Room.create
            
            (
                {
                    hotel: req.params.hotelId,
                    images: imagePaths,
                    roomNumber: req.body.roomNumber,
                    type: req.body.type,
                    capacity: req.body.capacity,
                    pricePerNight: mongoose.Types.Decimal128.fromString(req.body.pricePerNight.toString()),
                    amenities: req.body.amenities,
                    description: req.body.description,
                    isAvailable: req.body.isAvailable,
                }
            );

            res.status(201).json({room});
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

        const room = await Room.findOne({hotel: req.params.hotelId, _id: req.params.roomId});
        if (!room)
            return res.status(404).json({ message: 'cant update, Room not found'});

        const imagePaths = req.files
            ? req.files.map(file => {
                const normalized = file.path.replace(/\\/g, '/');
                const idx = normalized.indexOf('/images/');
                return idx !== -1 ? normalized.slice(idx + '/images/'.length) : path.basename(file.path);
            })
            : [];

        if (imagePaths.length) {
            room.images = [...room.images, ...imagePaths];
        }

        room.roomNumber = req.body.roomNumber || room.roomNumber;
        room.type = req.body.type || room.type;
        room.capacity = req.body.capacity || room.capacity;
        if (req.body.pricePerNight !== undefined)
            room.pricePerNight = mongoose.Types.Decimal128.fromString(req.body.pricePerNight.toString());
        room.amenities = req.body.amenities || room.amenities;
        room.description = req.body.description || room.description;
        if (req.body.isAvailable !== undefined) room.isAvailable=req.body.isAvailable;

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
        const room = await Room.findOne({hotel:req.params.hotelId, _id: req.params.roomId});
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
        const room = await Room.findOne({hotel:req.params.hotelId, _id: req.params.roomId});
        if (!room)
        {
            return res.status(404).json({message: 'cant delete, Room not found'});
        }

        await deleteImagesFromDisk(room.images);
        await room.deleteOne();
        res.json({message: 'room deleted successfully'})
    }
    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}
