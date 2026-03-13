import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Student, Teacher, Admin, getAccountModel } from '../models/accountModels.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT Token (include accountType so we know which collection the userId belongs to)
const generateToken = (userId, accountType) => {
  return jwt.sign({ userId, accountType }, JWT_SECRET, { expiresIn: '30d' });
};

// Register User
export const register = async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not available. Please ensure MongoDB is running.' 
      });
    }

    const { firstName, lastName, email, password, month, day, year, gender, accountType, gradeLevel, section } = req.body;

    // Validate required fields
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

    // Validate gender enum
    const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ 
        message: `Invalid gender. Must be one of: ${validGenders.join(', ')}`,
        received: gender
      });
    }

    // Validate and normalize accountType (role) — must be STUDENT, TEACHER, or ADMIN; default STUDENT
    const validAccountTypes = ['STUDENT', 'TEACHER', 'ADMIN'];
    const role = (accountType && typeof accountType === 'string')
      ? accountType.trim().toUpperCase()
      : 'STUDENT';
    if (!validAccountTypes.includes(role)) {
      return res.status(400).json({
        message: `Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`,
        received: accountType
      });
    }

    // Signup is for students only — save to students collection
    const StudentModel = role === 'STUDENT' ? Student : role === 'TEACHER' ? Teacher : Admin;
    const existingUser = await StudentModel.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new StudentModel({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      birthDate: {
        month: month ? String(month).trim() : '',
        day: day ? String(day).trim() : '',
        year: year ? String(year).trim() : ''
      },
      gender: gender.trim(),
      gradeLevel: gradeLevel ? String(gradeLevel).trim() : '',
      section: section ? String(section).trim() : ''
    });

    // Validate the user document before saving
    const validationError = user.validateSync();
    if (validationError) {
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: errors
      });
    }

    await user.save();

    const token = generateToken(user._id, role);

    const toUserResponse = (doc) => ({
      id: doc._id,
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      gender: doc.gender,
      birthDate: doc.birthDate,
      accountType: role,
      gradeLevel: doc.gradeLevel || '',
      section: doc.section || '',
      profilePicture: doc.profilePicture || ''
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: toUserResponse(user)
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
      message: 'Server error during registration', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Login User — check students, then teachers, then admins
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await Student.findOne({ email: normalizedEmail });
    let accountType = 'STUDENT';
    if (!user) {
      user = await Teacher.findOne({ email: normalizedEmail });
      accountType = 'TEACHER';
    }
    if (!user) {
      user = await Admin.findOne({ email: normalizedEmail });
      accountType = 'ADMIN';
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, accountType);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gender: user.gender,
        birthDate: user.birthDate,
        accountType,
        gradeLevel: user.gradeLevel || '',
        section: user.section || '',
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Get current user — load from the collection indicated by JWT accountType
export const getCurrentUser = async (req, res) => {
  try {
    const Model = getAccountModel(req.accountType);
    const user = await Model.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.accountType = req.accountType;
    res.json({ user: userObj });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile — update in the collection indicated by JWT accountType
export const updateProfile = async (req, res) => {
  try {
    const { firstName, profilePicture } = req.body;
    const Model = getAccountModel(req.accountType);
    const user = await Model.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (firstName !== undefined) {
      user.firstName = firstName.trim();
    }
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture.trim();
    }

    await user.save();

    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.accountType = req.accountType;
    delete userObj.password;
    res.json({
      message: 'Profile updated successfully',
      user: userObj
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot password — students only. Sends a reset token (in production, send via email).
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();

    const student = await Student.findOne({ email: normalizedEmail }).select('+resetPasswordToken +resetPasswordExpires');
    if (!student) {
      return res.json({
        message: 'If a student account exists with this email, you can set a new password using the link below.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    student.resetPasswordToken = resetToken;
    student.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await student.save({ validateBeforeSave: false });

    res.json({
      message: 'If a student account exists with this email, you can set a new password using the link below.',
      resetToken
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password — students only. Requires valid token from forgot-password.
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const student = await Student.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!student) {
      return res.status(400).json({
        message: 'Invalid or expired reset link. Please request a new one from the Forgot Password page.'
      });
    }

    student.password = newPassword;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpires = undefined;
    await student.save();

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};