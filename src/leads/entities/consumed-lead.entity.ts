// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   ManyToOne,
//   JoinColumn,
//   Column,
//   CreateDateColumn,
// } from 'typeorm';
// import { Company } from '../../company/entities/company.entity';
// import { Lead } from './lead.entity';

// @Entity('consumed_leads')
// export class ConsumedLead {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   companyId: string;

//   @Column()
//   leadId: string;

//   @CreateDateColumn()
//   consumedAt: Date;

//   @ManyToOne(() => Company)
//   @JoinColumn({ name: 'companyId' })
//   company: Company;

//   @ManyToOne(() => Lead)
//   @JoinColumn({ name: 'leadId' })
//   lead: Lead;
// }

// src/modules/leads/entities/consumed-lead.entity.ts (UPDATED with Deal Status)
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Lead } from './lead.entity';

export enum DealStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_RESPONSE = 'NO_RESPONSE',
}

@Entity('consumed_leads')
export class ConsumedLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  leadId: string;

  @CreateDateColumn()
  consumedAt: Date;

  // 🆕 NEW: Deal status tracking
  @Column({
    type: 'enum',
    enum: DealStatus,
    default: DealStatus.PENDING,
  })
  dealStatus: DealStatus;

  // 🆕 NEW: Notes about the deal outcome
  @Column('text', { nullable: true })
  dealNotes: string;

  // 🆕 NEW: Deal value in INR (for completed deals)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  dealValue: number;

  // 🆕 NEW: When status was last updated
  @Column({ type: 'timestamp', nullable: true })
  statusUpdatedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'leadId' })
  lead: Lead;
}