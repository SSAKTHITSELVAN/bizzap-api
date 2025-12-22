// src/modules/company/entities/company.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Product } from '../../products/entities/product.entity';
import { Follower } from '../../followers/entities/follower.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ unique: true })
  gstNumber: string;

  @Column()
  companyName: string;

  @Column({ unique: true })
  referralCode: string;

  // Monthly free leads (10) + referral bonuses (5 per referral)
  @Column({ default: 10 })
  leadQuota: number;

  @Column({ default: 0 })
  consumedLeads: number;

  // Monthly posting quota
  @Column({ default: 30 })
  postingQuota: number;

  @Column({ default: 0 })
  postedLeads: number;

  // Track social engagement - required for FollowersService
  @Column({ default: 0 })
  followersCount: number;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  lastLoginDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Profile fields
  @Column({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  address?: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  userName?: string;

  @Column({ nullable: true })
  userPhoto?: string;

  @Column({ nullable: true })
  coverImage?: string;

  @Column({ nullable: true })
  registeredAddress?: string;

  @Column('text', { nullable: true })
  about?: string;

  @Column({ nullable: true })
  operationalAddress?: string;

  // Relations
  @OneToMany(() => Lead, (lead) => lead.company)
  leads: Lead[];

  @OneToMany(() => Product, (product) => product.company)
  products: Product[];

  @OneToMany(() => Follower, (follower) => follower.followedCompany)
  following: Follower[];

  @OneToMany(() => Follower, (follower) => follower.followerCompany)
  followers: Follower[];

  @OneToMany(() => Post, (post) => post.company)
  posts: Post[];
}