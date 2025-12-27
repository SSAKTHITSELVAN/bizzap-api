
// src/modules/notifications/entities/expo-push-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('expo_push_tokens')
export class ExpoPushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  companyId: string;

  @Index()
  @Column({ unique: true })
  token: string;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  platform?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;
}