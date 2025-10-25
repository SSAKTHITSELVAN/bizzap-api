// src/modules/leads/entities/lead.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  // Changed: Now stores S3 key instead of URL
  @Column({ nullable: true })
  imageKey: string; // S3 key for the image

  @Column({ nullable: true })
  imageUrl: string; // Temporary field for backward compatibility (can be removed later)

  @Column({ nullable: true })
  imageName: string; // Original filename

  @Column({ nullable: true })
  imageSize: number; // File size in bytes

  @Column({ nullable: true })
  imageMimeType: string; // MIME type of the image

  @Column({ nullable: true })
  budget: string;

  @Column({ nullable: true })
  quantity: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  reasonForDeactivation?: string;

  @Column({ default: 0 })
  consumedCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.leads)
  company: Company;

  @Column()
  companyId: string;
}