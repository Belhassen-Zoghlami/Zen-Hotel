const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendOwnerRequestNotification } = require('../services/email.service');
require('dotenv').config();




const generateVerificationLink = (userId) => {
  const timestamp = Date.now();
  const payload = `${userId}.${timestamp}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  return `http://localhost:3000/api/verify-email?token=${encodeURIComponent(`${payload}.${signature}`)}`;
};

exports.register = async (req, res) => {

  try 
  {
    const allowed = ['client', 'owner'];
    const { name, email, password} = req.body;
    let role = allowed.includes(req.body.role) ? req.body.role : 'client';

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
    const verifyLink = generateVerificationLink(user._id);
    try
    {
      await sendVerificationEmail(user, verifyLink);
      if (user.role === 'owner')
        await sendOwnerRequestNotification(user);
    }
    catch (err)
    {
      user.deleteOne();
      console.error('Error sending validation email:', err);
      return res.status(500).json({ message: 'Error sending validation email' });
    }

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
  console.error('Error during registration:', err);
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
      return res.status(403).json({message: 'Account suspended'});
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

    return res.json({token,user: { id: user._id, name: user.name, role: user.role}});

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

 exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // Split the token into payload and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return res.status(400).json({ message: 'Invalid verification token format' });
    }

    const [payload, signature] = parts;
    
    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET)
      .update(payload)
      .digest('hex');
    
    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    // Extract userId and timestamp
    const [userId, timestamp] = payload.split('.');
    
    if (!userId || !timestamp) {
      return res.status(400).json({ message: 'Invalid verification token structure' });
    }

    // Check if link is expired (e.g., 24 hours)
    const linkAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (linkAge > maxAge) {
      return res.status(400).json({ message: 'Verification link has expired' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Update user verification status
    user.email_verified = true;
    await user.save();

    // Return success response
    return res.status(200).json({ 
      message: 'Email verified successfully! You can now login.',
      verified: true 
    });
    
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ 
      message: 'An error occurred during email verification',
      error: err.message 
    });
  }
};

// Add resend verification endpoint
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.email_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }
    
    const verifyLink = generateVerificationLink(user._id);
    await sendVerificationEmail(user, verifyLink);
    
    return res.status(200).json({ 
      message: 'Verification email resent successfully' 
    });
    
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ 
      message: 'Error resending verification email' 
    });
  }
};

exports.Logout = (req,res) =>
  {
    res.clearCookie('token');
    res.json({ message: 'User Logged out successfully'});
  };