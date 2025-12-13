const mongoose = require('mongoose');

/**
 * @function connectDB
 * @description Conecta a la base de datos MongoDB Atlas con configuración optimizada
 * 
 * Configuraciones:
 * - maxPoolSize: 10 conexiones simultáneas (aumentar a 20 en producción si hay alto tráfico)
 * - serverSelectionTimeoutMS: 5000ms timeout
 * - socketTimeoutMS: 45000ms timeout
 * - retryWrites: true para operaciones transaccionales
 * - w: 'majority' para write concern seguro
 * 
 * @throws {Error} Si falla la conexión
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Validar que la URI exista
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está configurado en las variables de entorno');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: process.env.NODE_ENV === 'development' ? 20 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);

    // Eventos de monitoreo de conexión
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado. Intentando reconectar...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconectado exitosamente');
    });

    return conn;
  } catch (error) {
    console.error('❌ Error fatal conectando a MongoDB:', error.message);
    console.error('💡 Verifica que MONGODB_URI esté configurado correctamente en Render');
    process.exit(1);
  }
};

/**
 * @function disconnectDB
 * @description Desconecta de la base de datos MongoDB
 * 
 * Usado para graceful shutdown
 * 
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB Desconectado correctamente');
  } catch (error) {
    console.error('❌ Error desconectando de MongoDB:', error.message);
    throw error;
  }
};

/**
 * Verificar estado de conexión
 */
const getConnectionStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState];
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.getConnectionStatus = getConnectionStatus;