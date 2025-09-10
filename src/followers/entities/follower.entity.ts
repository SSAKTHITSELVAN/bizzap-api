// src/modules/followers/entities/follower.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('followers')
@Unique(['followerCompanyId', 'followedCompanyId'])
export class Follower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  followerCompanyId: string;

  @Column()
  followedCompanyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Company, (company) => company.following)
  followerCompany: Company;

  @ManyToOne(() => Company, (company) => company.followers)
  followedCompany: Company;
}