const User = require('../models/User');
const { generateToken } = require('../config/jwt');

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
        message: 'Ya existe un usuario con este email'
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

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token: generateToken(user._id),
      user: user
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Autenticar usuario
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario y incluir password para comparar
    const user = await User.findOne({ email }).select('+password');
    
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
        user: user
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// @desc    Actualizar perfil del usuario
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'profile.firstName': firstName,
          'profile.lastName': lastName,
          'profile.phone': phone
        }
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};