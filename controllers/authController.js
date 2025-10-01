const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe con este email'
      });
    }

    // Crear nuevo usuario
    const user = await User.create({
      email,
      password,
      profile: {
        firstName,
        lastName,
        phone
      }
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        token: generateToken(user._id),
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// @desc    Autenticar usuario
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar email y contraseña
    const user = await User.findOne({ email });
    
    if (user && (await user.comparePassword(password))) {
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Cuenta desactivada. Contacta al administrador.'
        });
      }

      // Actualizar último login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Login exitoso',
        token: generateToken(user._id),
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// @desc    Obtener perfil del usuario
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};