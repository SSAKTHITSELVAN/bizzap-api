// src/modules/company/entities/payment-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  PAY_AS_YOU_GO = 'PAY_AS_YOU_GO',
  ADMIN_CREDIT = 'ADMIN_CREDIT',
}

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  razorpayPaymentId: string;

  @Column({ nullable: true })
  razorpayOrderId: string;

  @Column({ nullable: true })
  razorpaySignature: string;

  @Column({ nullable: true })
  subscriptionTier: string;

  @Column({ default: 0 })
  leadsCredits: number;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  adminNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Company, (company) => company.paymentHistory)
  @JoinColumn({ name: 'companyId' })
  company: Company;
}