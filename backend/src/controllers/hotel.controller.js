const fs = require('fs').promises;
const Hotel = require('../models/hotel.model');
const Room = require('../models/room.model');
const mongoose = require('mongoose');
const path = require('path');

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
                console.error('Failed to remove hotel image:', targetPath, err);
            }
        }
    }));
}

//                                                                  hotel creation
exports.CreateHoltel = async (req,res)=>
{
    try
    {
        const imagePaths = req.files 
        ? req.files.map(file => {
            // Store only "hotel/filename.jpg" — relative to the /images/ static root
            const normalized = file.path.replace(/\\/g, '/');
            const idx = normalized.indexOf('/images/');
            return idx !== -1 ? normalized.slice(idx + '/images/'.length) : path.basename(file.path);
        })
        : [];

        const hotel = await Hotel.create
        ({
            name:req.body.name,
            location:req.body.location,
            images: imagePaths,
            rating: req.body.rating,
            description: req.body.description,
            owner: req.user.id
        });
        res.status(201).json({hotel});
    }
    catch(err)

    {

        res.status(500).json({ message: 'Error creating hotel',error: err.message});
        console.error('Error creating hotel:', err);
    }


}

//                                                                  find all per owner
exports.GetAllHotels = async (req,res)=>
{
    try
    {
        const query = {};
        if(req.query.city)
            query.location = { $regex: req.query.city, $options: 'i'};
        if(req.query.rating)
            query.rating = {$regex: req.query.rating[0], $options: 'i'};

        let hotels;
        if (req.user && req.user.role === 'owner')
            hotels = await Hotel.find({ ...query, owner: req.user.id })
                .populate('owner','name email');
        else
            hotels = await Hotel.find(query)
                .select("-owner -createdAt -updatedAt -__v");
            
        if (!hotels)
            return res.status(404).json({ message: 'no hotels found'});
            
        res.json(hotels);
    }
    catch(err)
    {
        res.status(500).json({ message: 'Error finding hotels', error: err.message})
    }
};
//                                                                  find by id
exports.GetHotel = async (req,res) =>
{
    try
    {
        let hotel;
        if( !req.user || !['admin','owner'].includes(req.user.role) )
            hotel = await Hotel.findById(req.params.id).select("-owner -createdAt -updatedAt -__v");
        else
            hotel = await Hotel.findById(req.params.id);
        
        if(!hotel)
            {
                return res.status(404).json({ message: 'hotel not found'});
            }
            res.json(hotel)
    }
    catch(err)
    {
        return res.status(500).json({message: 'Server error'})
    }
}

//                                                                  update hotel

exports.UpdateHotel= async (req,res) =>
{
    try
    {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel)
        {
            return res.status(404).json({message: 'Cant update, hotel not found'});
        }
        if(hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')
        {
            return res.status(403).json({message: 'Access unauthorized'});
        }
        
        hotel.name = req.body.name || hotel.name;
        hotel.location = req.body.location || hotel.location;
        hotel.rating = req.body.rating || hotel.rating;
        hotel.description = req.body.description || hotel.description;


        await hotel.save();
        res.json({message: 'hotel updated successfully'});
    }
    catch(err)
    {
        res.status(500).json({ message: 'Server error'})

    }
}


//                                                                  delete hotel


exports.DeleteHotel = async(req,res) =>

    {
        try

    {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel)
        {
            return res.status(404).json({message: 'cant delete, hotel not found'});
        }
        if(hotel.owner.toString() !== req.user.id && req.user.role !== 'admin')
        {

            return res.status(403).json({message: 'Access unauthorized'});
        }

        // Remove hotel images from disk before deleting the hotel
        await deleteImagesFromDisk(hotel.images);

        // Delete all rooms associated with this hotel
        await Room.deleteMany({ hotel: req.params.id });

        await hotel.deleteOne();

        res.json({message : 'hotel and associated rooms deleted successfully'});
    }
        catch(err)
    {

            res.status(500).json({message: 'Server error'});
            console.error('Error deleting hotel:', err);
    }
    }