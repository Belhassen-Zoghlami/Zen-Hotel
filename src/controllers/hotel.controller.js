
const Hotel = require('../models/hotel.model');

//                                                                  hotel creation
exports.CreateHoltel = async (req,res)=>
{
    try
    {

        const hotel = await Hotel.create
        ({
            name:req.body.name,
            location:req.body.location,
            rating: req.body.rating,
            description: req.body.description,
            owner: req.user.id
        });
        res.status(201).json({hotel});
    }
    catch(err)

    {

        res.status(500).json({ message: 'Error creating hotel'});
    }


}

//                                                                  find all per owner
exports.GetAllHotels = async (req,res)=>
{
    try
    {
        //gettin per search criterias 
        const query = {};
        if(req.query.city)
            query.location = { $regex: req.query.city, $options: 'i'};
        if(req.query.rating)
            query.rating = {$regex: req.query.rating[0], $options: 'i'};

        let hotels;
        if (!req.user || !['admin','owner'].includes(req.user.role))
            hotels = await Hotel.find(query).select("-owner -createdAt -updatedAt -__v");
        else
            hotels = await Hotel.find({ owner : req.user.id }).populate('owner','name email');
            
            
        if (!hotels)
            {
                return res.status(404).json({ message: 'no hotels found for this user'});
            }
        res.json(hotels);


    }catch(err)
    {
        res.status(500).json({ message: 'Error finding hotels',error: err.message})
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

        await hotel.deleteOne();

        res.json({message : 'hotel deleted successfully'});
    }
        catch(err)
    {

            res.status(500).json({message: 'Server error'});
    }
    }