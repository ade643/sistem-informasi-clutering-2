import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';

// Function to handle user login
export const login = async (req, res, next) => {
  try {
    // Extract email and password from request body
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi' // Email and password must be provided
      });
    }

    // Find user by email in the database
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah' // Email or password is incorrect
      });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak aktif' // Account is not active
      });
    }

    // Compare provided password with stored hashed password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah' // Email or password is incorrect
      });
    }

    // Update last login timestamp for the user
    await user.update({ last_login: new Date() });

    // Generate JWT token with user info and secret key, expires in 24 hours
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Send success response with token and user data
    res.json({
      success: true,
      message: 'Login berhasil', // Login successful
      data: {
        token,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    // Log error and send server error response
    console.error('Login error:', error);
    next(error);
  }
};

// Function to handle user registration
export const register = async (req, res, next) => {
  try {
    // Finds the validation errors in this request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Data input tidak valid',
        errors: errors.array(),
      });
    }

    // Extract user details from request body
    const { nama, email, password, role } = req.body;

    // Check if email is already registered
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar', // Email already registered
      });
    }

    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user record in the database
    const user = await User.create({
      nama,
      email,
      password: hashedPassword,
      role: role || 'teacher', // Default role is teacher if not provided
    });

    // Send success response with created user data
    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat', // User created successfully
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    // Log error and send server error response
    console.error('Register error:', error);
    next(error);
  }
};

// Function to get user profile data
export const getProfile = async (req, res, next) => {
  try {
    // Find user by primary key (id) excluding password field
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    // Send success response with user data
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    // Log error and send server error response
    console.error('Get profile error:', error);
    next(error);
  }
};

// Function to change user password
export const changePassword = async (req, res, next) => {
  try {
    // Extract current and new password from request body
    const { currentPassword, newPassword } = req.body;

    // Check if both passwords are provided
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama dan baru harus diisi' // Old and new password must be provided
      });
    }

    // Find user by primary key (id)
    const user = await User.findByPk(req.user.id);
    
    // Verify current password matches stored password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama tidak sesuai' // Old password does not match
      });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user password in the database
    await user.update({ password: hashedPassword });

    // Send success response
    res.json({
      success: true,
      message: 'Password berhasil diubah' // Password changed successfully
    });
  } catch (error) {
    // Log error and send server error response
    console.error('Change password error:', error);
    next(error);
  }
};
