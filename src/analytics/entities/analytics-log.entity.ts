// src/analytics/entities/analytics-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('analytics_logs')
export class AnalyticsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string; // Linked to your User/Company ID

  @Column()
  screenName: string; // e.g., 'Home', 'Chat', 'Profile'

  @Column({ type: 'timestamp' })
  entryTime: Date;

  @Column({ type: 'timestamp' })
  exitTime: Date;

  @Column({ type: 'int' })
  durationMs: number; // Time spent in milliseconds

  @CreateDateColumn()
  createdAt: Date; // When the log was received by the server
}