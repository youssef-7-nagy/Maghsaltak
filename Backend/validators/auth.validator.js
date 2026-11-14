const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    "string.min": "Username must be at least 3 characters long.",
    "any.required": "Name is required.",
  }),
  phone: Joi.string()
    .pattern(/^\d{11}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must contain exactly 11 digits and only numeric characters.",
      "any.required": "Phone number is required.",
    }),
  email: Joi.string()
    .trim()
    .email()
    .custom((value, helpers) => {
      if (!value.toLowerCase().endsWith("@gmail.com")) {
        return helpers.message("Email must end with @gmail.com");
      }
      return value.toLowerCase();
    })
    .required()
    .messages({
      "string.email": "Must be a valid email format.",
      "any.required": "Email is required.",
    }),
  password: Joi.string()
    .min(10)
    .pattern(/(?=.*[a-z])/)
    .message("Password must contain at least one lowercase letter (a-z)")
    .pattern(/(?=.*[A-Z])/)
    .message("Password must contain at least one uppercase letter (A-Z)")
    .pattern(/(?=.*[0-9])/)
    .message("Password must contain at least one number (0-9)")
    .pattern(/(?=.*[!@#$%^&*])/)
    .message("Password must contain at least one special character (!@#$%^&*)")
    .required()
    .messages({
      "string.min": "Password must be at least 10 characters long.",
      "any.required": "Password is required.",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().required(),
});

const genderSchema = Joi.object({
  gender: Joi.string().valid("male", "female").required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  genderSchema,
};
