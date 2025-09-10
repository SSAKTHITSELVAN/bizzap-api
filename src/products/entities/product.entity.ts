// src/modules/products/entities/product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column('text', { nullable: true })
  minimumQuantity: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.products)
  company: Company;

  @Column()
  companyId: string;
}