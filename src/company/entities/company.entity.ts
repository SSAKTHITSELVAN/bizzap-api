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

  @Column({ default: 10 })
  leadQuota: number;

  @Column({ default: 0 })
  consumedLeads: number;

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
}