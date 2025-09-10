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

  @Column({ nullable: true })
  image: string;

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