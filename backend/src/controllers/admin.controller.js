const User = require('../models/user.model');
const mailing = require('../services/email.service');

                                                                /*      get all users       */
exports.getAllUsers = async (req,res) =>

{
    const users = await User.find().select('-password');
    res.json(users);
};

                                                                /*      validate owner's account       */
exports.validateOwner = async (req,res)=>
{

    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user || user.role !== 'owner')
    {
        return res.status(400).json
        ({
            message: 'Invalid owner account'
        });
    }

    user.isValidated = true;
    await user.save();
    await mailing.sendOwnerValidationEmail(user);
    res.status(200).json({
        message: 'owner validated successfully! Email sent successfully.'
    });
};

                                                                /*      activate/deactivate user's account       */
exports.toggleUserStatus = async (req, res) =>
{
    const {userId} = req.params;
    const user = await User.findById(userId);

    if(req.user.role !== 'admin')
        return res.status(403).json({message: 'Access Unauthorized'});

    if (!user)
    {
        return res.status(404).json({message: 'User not found'});
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
        message: `User is now set to ${user.isActive ? 'Active' : 'Inactive'}`
    })
};

                                                                /*      get user by id       */
exports.getUser = async (req,res) =>
{
    try
    {

        const { userId } = req.params;
        const user = await User.findById(userId);
        if ( req.user.role !== 'admin')
            return res.status(403).json({ message: 'access unauthorized'});
        if(!user)
            return res.status(404).json({ message : 'user not found'});
        res.status(200).json(user);
    }

    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}


                                                                /*      Delete a user       */

exports.deleteUser = async (req,res) =>
{
    try
    
    {
        const {userId} = req.params;
        if (req.user.role !== 'admin')
            return res.status(403).json({message: 'access unauthorized'});
        const user = await User.findById(userId);
        if(!user)
            return res.status(404).json({message: 'cant delete, user not found'});

        user.deleteOne();
        res.status(200).json({message: 'User deleted successfully'})
    }
    catch(err)
    {
        res.status(500).json({message: 'Server error'});
    }
}