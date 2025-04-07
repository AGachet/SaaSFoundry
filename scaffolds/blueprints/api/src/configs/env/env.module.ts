import { Module, Global } from '@nestjs/common'
import { EnvConfig } from '@configs/env/services/env.service'

@Global()
@Module({
  providers: [EnvConfig],
  exports: [EnvConfig]
})
export class EnvModule {}
