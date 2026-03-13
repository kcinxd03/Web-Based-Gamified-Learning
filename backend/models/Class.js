import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },
  gradeLevel: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  classCode: {
    type: String,
    unique: true,
    trim: true,
    sparse: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }]
}, {
  timestamps: true
});

// Generate unique class code before saving
classSchema.pre('save', async function(next) {
  if (!this.classCode) {
    // Generate a random 9-character alphanumeric code
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.classCode = code;
  }
  next();
});

const Class = mongoose.model('Class', classSchema);

export default Class;

