import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
});
