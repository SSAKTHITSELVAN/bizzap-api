// src/modules/notifications/entities/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Lead } from '../../leads/entities/lead.entity';

export enum NotificationType {
  NEW_LEAD = 'NEW_LEAD',
  LEAD_CONSUMED = 'LEAD_CONSUMED',
  ADMIN_BROADCAST = 'ADMIN_BROADCAST',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column('json', { nullable: true })
  data: any;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  leadId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;
}

// ==========================================
