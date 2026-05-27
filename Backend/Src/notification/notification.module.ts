import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [UserModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
