import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  SLACK_APP_TOKEN: Joi.string().required(),
  SLACK_BOT_TOKEN: Joi.string().required(),
  SLACK_SIGNING_SECRET: Joi.string().optional(),
  NEXT_PUBLIC_API_BASE: Joi.string().uri().required(),
});
