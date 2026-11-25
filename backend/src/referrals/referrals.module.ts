import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LetterService } from './letter.service';
import { Referral } from './referral.entity';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ScoringService } from './scoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([Referral])],
  controllers: [ReferralsController],
  providers: [ReferralsService, ScoringService, LetterService],
})
export class ReferralsModule {}
