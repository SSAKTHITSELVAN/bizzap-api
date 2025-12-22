// src/modules/company/dto/lead-quota-details.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LeadQuotaDetailsDto {
  @ApiProperty({
    description: 'Total lead quota available for the month',
    example: 25,
  })
  totalLeadQuota: number;

  @ApiProperty({
    description: 'Number of leads consumed this month',
    example: 10,
  })
  consumedLeads: number;

  @ApiProperty({
    description: 'Remaining leads available to consume',
    example: 15,
  })
  remainingLeads: number;

  @ApiProperty({
    description: 'Total posting quota for the month',
    example: 30,
  })
  postingQuota: number;

  @ApiProperty({
    description: 'Number of leads posted this month',
    example: 5,
  })
  postedLeads: number;

  @ApiProperty({
    description: 'Remaining posts available',
    example: 25,
  })
  remainingPosts: number;

  @ApiProperty({
    description: 'Next quota reset date (1st of next month at 00:00)',
    example: '2025-01-01T00:00:00.000Z',
  })
  nextResetDate: Date;

  @ApiProperty({
    description: 'Days remaining until quota reset',
    example: 9,
  })
  daysUntilReset: number;

  @ApiProperty({
    description: 'Company referral code for earning bonus leads',
    example: 'BIZAP1234',
  })
  referralCode: string;

  @ApiProperty({
    description: 'Information about earning more leads',
    example: 'Share your referral code to earn 5 bonus leads per successful referral!',
  })
  referralInfo: string;
}