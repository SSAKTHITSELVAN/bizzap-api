// src/modules/company/entities/subscription.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

export enum SubscriptionTier {
  FREEMIUM = 'FREEMIUM',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREEMIUM,
  })
  tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ nullable: true })
  razorpaySubscriptionId: string;

  @Column({ nullable: true })
  razorpayPaymentId: string;

  @Column({ nullable: true })
  razorpayOrderId: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ default: 0 })
  leadQuota: number;

  @Column({ default: 0 })
  consumedLeads: number;

  @Column({ default: 0 })
  postingQuota: number;

  @Column({ default: 0 })
  postedLeads: number;

  @Column({ default: false })
  hasVerifiedBadge: boolean;

  @Column({ default: false })
  hasVerifiedLeadAccess: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.subscriptions)
  @JoinColumn({ name: 'companyId' })
  company: Company;
}