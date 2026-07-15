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

  DATABASE_URL: Joi.string()
    .uri({
      scheme: ['postgresql', 'postgres'],
    })
    .required(),

  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(50).default(10),

  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(5000),

  DATABASE_IDLE_TIMEOUT_MS: Joi.number().integer().min(1000).default(300000),
});
