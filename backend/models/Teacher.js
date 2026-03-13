import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const teacherSchema = new mongoose.Schema({
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
  }
}, {
  timestamps: true,
  collection: 'teachers'
});

teacherSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;
