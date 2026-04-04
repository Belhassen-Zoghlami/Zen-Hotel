const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {

  try 
  {

    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already used' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'client'
    });

    return res.status(201).json
    (
      {
        message: 
        user.role === 'owner' ? 
        'owner account pending validation' :
        'user registration successful!'
      }
    );
}
catch(err)
{
  return res.status(500).json
  (
    
    {
      message: 'Server error'
    }
  );
}
};

exports.login = async (req, res) => {
  try
  {

    const { email, password } = req.body;
    const user = await User.findOne({ email });//.select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const pwmatch = await bcrypt.compare(password, user.password);
    if (!pwmatch)
    {
      return res.status(400).json({message: 'Invalid credentials'});

    }
    if (!user.isActive)
    {
      res.status(403).json({message: 'Account suspended'});
    }
    if ( user.role === 'owner' && !user.isValidated)

      {


        return res.status(403).json(
          {
            message: 'Owner account awaiting admin approval'
          }
        );
      }
    const token = jwt.sign( 
      { 
        id: user._id, 
        role: user.role, 
        name: user.name 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN 
      }
    );

    res.cookie
    (
      'token',token,
      {
        httpOnly: true,
        secure: false,
        sameSite: 'Strict',
        maxAge:3600000
      }
    );

    res.json({message: `user ${user.name} logged in successfully`});

  }
  catch (err)
  {

    res.status(500).json
    
    (
      {
        message: 'server error'
      }
    );
  }
};


exports.Logout = (req,res) =>
  {
    res.clearCookie('token');
    res.json({ message: 'User Logged out successfully'});
  };