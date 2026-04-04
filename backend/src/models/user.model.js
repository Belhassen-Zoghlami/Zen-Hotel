const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  
{
  name: 
  { 
    type: String,
     required: true,
     trim: true
  },
  email: 
  { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: 
  { 
    type: String, 
    required: true,
    //select: false
  },
  role: 
  {
    type: String,
    enum: ['client', 'owner', 'admin'],
    default: 'client'
  },
  isValidated: 
  {
    type: Boolean,
    default: function() 
    {
      return this.role !== 'owner';
    }
  },

  isActive:
  {
    type : Boolean,
    default: true
  }
},
{
  timestamps: true
}
);

module.exports = mongoose.model('User', userSchema);
