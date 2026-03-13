import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  birthDate: {
    month: String,
    day: String,
    year: String
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'admins'
});

adminSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
