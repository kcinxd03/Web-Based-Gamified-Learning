import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema({
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
  gradeLevel: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  resetPasswordToken: {
    type: String,
    default: undefined,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined,
    select: false
  }
}, {
  timestamps: true,
  collection: 'students'
});

studentSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);
export default Student;
