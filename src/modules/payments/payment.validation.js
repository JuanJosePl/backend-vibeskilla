const Joi = require('joi');

/**
 * @description Validaciones para el módulo PAYMENTS
 */

const processPaymentValidation = {
  body: Joi.object({
    orderId: Joi.string().required().messages({
      'any.required': 'El ID de la orden es requerido'
    }),
    paymentMethod: Joi.string()
      .valid('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery')
      .required()
      .messages({
        'any.only': 'Método de pago inválido'
      }),
    paymentData: Joi.object().optional()
  })
};

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.body.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  req.body = value;
  next();
};

module.exports = {
  processPaymentValidation,
  validate
};