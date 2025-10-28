// src/modules/company/razorpay.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Razorpay from 'razorpay'; // Changed from * as Razorpay
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface SubscriptionPlan {
  tier: string;
  price: number;
  leadQuota: number;
  postingQuota: number;
  hasVerifiedBadge: boolean;
  hasVerifiedLeadAccess: boolean;
}

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;
  
  private readonly subscriptionPlans: Record<string, SubscriptionPlan> = {
    FREEMIUM: {
      tier: 'FREEMIUM',
      price: 0,
      leadQuota: 10,
      postingQuota: 30,
      hasVerifiedBadge: false,
      hasVerifiedLeadAccess: false,
    },
    STARTER: {
      tier: 'STARTER',
      price: 99900, // in paise (999 INR)
      leadQuota: 20,
      postingQuota: 30,
      hasVerifiedBadge: true,
      hasVerifiedLeadAccess: true,
    },
    GROWTH: {
      tier: 'GROWTH',
      price: 159900, // in paise (1599 INR)
      leadQuota: 30,
      postingQuota: 30,
      hasVerifiedBadge: true,
      hasVerifiedLeadAccess: true,
    },
    ENTERPRISE: {
      tier: 'ENTERPRISE',
      price: 222900, // in paise (2229 INR)
      leadQuota: 50,
      postingQuota: 30,
      hasVerifiedBadge: true,
      hasVerifiedLeadAccess: true,
    },
  };

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new InternalServerErrorException(
        'Razorpay credentials are not configured properly'
      );
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  getPlanDetails(tier: string): SubscriptionPlan {
    return this.subscriptionPlans[tier];
  }

  getAllPlans(): Record<string, SubscriptionPlan> {
    return this.subscriptionPlans;
  }

  async createOrder(amount: number, currency: string = 'INR', receipt?: string): Promise<any> {
    const options = {
      amount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };
    
    return this.razorpay.orders.create(options);
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    
    if (!keySecret) {
      throw new InternalServerErrorException('Razorpay key secret is not configured');
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');
    
    return generatedSignature === signature;
  }

  calculatePayAsYouGoAmount(leadsCount: number): number {
    const pricePerLead = 4900; // 49 INR in paise
    return leadsCount * pricePerLead;
  }

  async fetchPaymentDetails(paymentId: string): Promise<any> {
    return this.razorpay.payments.fetch(paymentId);
  }
}