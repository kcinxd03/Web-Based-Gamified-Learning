import { Teacher, Admin, getAccountModel } from '../models/accountModels.js';
import mongoose from 'mongoose';

// Get all teachers (from teachers collection)
export const getTeachers = async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.userId);
    if (!adminUser || req.accountType !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const teachers = await Teacher.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Teachers retrieved successfully',
      teachers: teachers.map((t) => {
        const obj = t.toObject();
        return { ...obj, id: obj._id, accountType: 'TEACHER' };
      })
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create teacher account — save to teachers collection
export const createTeacher = async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.userId);
    if (!adminUser || req.accountType !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { firstName, lastName, email, password, gender } = req.body;

    if (!firstName || !lastName || !email || !password || !gender) {
      return res.status(400).json({ 
        message: 'Please provide all required fields',
        missing: {
          firstName: !firstName,
          lastName: !lastName,
          email: !email,
          password: !password,
          gender: !gender
        }
      });
    }

    const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ 
        message: `Invalid gender. Must be one of: ${validGenders.join(', ')}`,
        received: gender
      });
    }

    const existingUser = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const teacher = new Teacher({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      gender: gender.trim(),
      birthDate: {
        month: '',
        day: '',
        year: ''
      }
    });

    // Validate the user document before saving
    const validationError = teacher.validateSync();
    if (validationError) {
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors
      });
    }

    await teacher.save();

    res.status(201).json({
      message: 'Teacher account created successfully',
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        gender: teacher.gender,
        accountType: 'TEACHER',
        profilePicture: teacher.profilePicture || '',
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User with this email already exists',
        error: 'Duplicate email'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during teacher creation', 
      error: error.message
    });
  }
};

// Update teacher account (admin only)
export const updateTeacher = async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.userId);
    if (!adminUser || req.accountType !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const { firstName, lastName, email, gender, password } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (firstName !== undefined) {
      if (!firstName || !String(firstName).trim()) {
        return res.status(400).json({ message: 'First name is required' });
      }
      teacher.firstName = String(firstName).trim();
    }
    if (lastName !== undefined) {
      if (!lastName || !String(lastName).trim()) {
        return res.status(400).json({ message: 'Last name is required' });
      }
      teacher.lastName = String(lastName).trim();
    }
    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email is required' });
      }
      const existing = await Teacher.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: 'Another teacher already has this email' });
      }
      teacher.email = normalizedEmail;
    }
    if (gender !== undefined) {
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ message: `Invalid gender. Must be one of: ${validGenders.join(', ')}` });
      }
      teacher.gender = gender;
    }
    if (password !== undefined && password !== '') {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      teacher.password = password;
    }

    await teacher.save();

    res.json({
      message: 'Teacher account updated successfully',
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        gender: teacher.gender,
        accountType: 'TEACHER',
        profilePicture: teacher.profilePicture || '',
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Another teacher already has this email' });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete teacher account (admin only)
export const deleteTeacher = async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.userId);
    if (!adminUser || req.accountType !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }

    const teacher = await Teacher.findByIdAndDelete(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({
      message: 'Teacher account deleted successfully',
      teacherId: id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

