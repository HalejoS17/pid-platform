import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number().port().default(4000),

  API_PREFIX: Joi.string().trim().default('api/v1'),

  CORS_ORIGIN: Joi.string().trim().required(),

  THROTTLE_TTL: Joi.number().integer().positive().default(60000),

  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
});
