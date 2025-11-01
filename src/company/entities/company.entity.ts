// src/modules/company/entities/company.entity.ts (Updated with Permanent Quota Tracking)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Product } from '../../products/entities/product.entity';
import { Follower } from '../../followers/entities/follower.entity';
import { Post } from '../../posts/entities/post.entity';
import { Subscription } from './subscription.entity';
import { PaymentHistory } from './payment-history.entity';

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

  @Column({ nullable: true })
  logo: string;

  @Column('text', { nullable: true })
  address: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ unique: true })
  referralCode: string;

  // 🆕 NEW: Permanent lead quota (referrals + pay-as-you-go + monthly free)
  // This quota NEVER resets and persists across subscription changes
  @Column({ default: 10 })
  permanentLeadQuota: number;

  // Total lead quota (permanent + subscription quota)
  @Column({ default: 10 })
  leadQuota: number;

  @Column({ default: 0 })
  consumedLeads: number;

  @Column({ default: 30 })
  postingQuota: number;

  @Column({ default: 0 })
  postedLeads: number;

  @Column({ default: 'FREEMIUM' })
  currentTier: string;

  @Column({ default: false })
  hasVerifiedBadge: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: 0 })
  followersCount: number;

  @CreateDateColumn()
  createdAt: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  lastLoginDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userPhoto: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column('text', { nullable: true })
  registeredAddress: string;

  @Column('text', { nullable: true })
  about: string;

  @Column('text', { nullable: true })
  operationalAddress: string;

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

  @OneToMany(() => Subscription, (subscription) => subscription.company)
  subscriptions: Subscription[];

  @OneToMany(() => PaymentHistory, (payment) => payment.company)
  paymentHistory: PaymentHistory[];
}