import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gamified-learning';
      await mongoose.connect(mongoUri);
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

    const existingAdmin = await Admin.findOne({ 
      email: adminEmail.toLowerCase().trim()
    });

    if (existingAdmin) {
      if (mongoose.connection.readyState === 1 && process.argv[1]?.includes('seedAdmin.js')) {
        await mongoose.disconnect();
      }
      return;
    }

    const admin = new Admin({
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
      gender: 'Other',
      birthDate: {
        month: '',
        day: '',
        year: ''
      }
    });

    await admin.save();

    // Only disconnect if we connected in this function
    if (mongoose.connection.readyState === 1 && process.argv[1]?.includes('seedAdmin.js')) {
      await mongoose.disconnect();
    }
  } catch (error) {
    // Only disconnect if we connected in this function
    if (mongoose.connection.readyState === 1 && process.argv[1]?.includes('seedAdmin.js')) {
      await mongoose.disconnect();
    }
    if (process.argv[1]?.includes('seedAdmin.js')) {
      process.exit(1);
    }
    throw error;
  }
};

// Run if called directly (when executed as a script)
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
                     process.argv[1]?.includes('seedAdmin.js');

if (isMainModule) {
  createDefaultAdmin();
}

export default createDefaultAdmin;

