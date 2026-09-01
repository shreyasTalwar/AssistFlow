import { PrismaClient } from '@prisma/client';
import { indexKnowledgeDocument } from '../src/services/knowledge/knowledgeService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up and seeding essential baseline data only...');

  // Delete all existing operational data
  await prisma.customerFeedback.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.aiSuggestion.deleteMany();
  await prisma.ticketEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Essential Organization
  const acmeOrg = await prisma.organization.create({
    data: {
      name: 'SmartSupport Platform',
      slug: 'smartsupport',
    },
  });

  console.log('✅ Essential Organization created:', acmeOrg.name);

  // 2. Create Core Real Roles (1 Customer, 1 Agent, 1 Admin)
  const customer = await prisma.user.create({
    data: {
      clerkUserId: 'user_cust_shreyas',
      email: 'shreyastalwar19@gmail.com',
      name: 'Shreyas Customer',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: 'CUSTOMER',
      organizationId: acmeOrg.id,
    },
  });

  const agent = await prisma.user.create({
    data: {
      clerkUserId: 'user_agent_shreyas',
      email: 'shreyastawar11@gmail.com',
      name: 'Shreyas Agent',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'AGENT',
      organizationId: acmeOrg.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      clerkUserId: 'user_admin_shreyas',
      email: 'shreyastalwar334@gmail.com',
      name: 'Shreyas Talwar',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      role: 'ADMIN',
      organizationId: acmeOrg.id,
    },
  });

  console.log('✅ Core Users created (Customer, Agent, Admin)');

  // 3. Seed Essential Knowledge Base Documents (Required for RAG Engine)
  const kbDocs = [
    {
      title: 'Refund and Cancellation Policy',
      description: 'Guidelines on eligible refunds, dispute processes, and duplicate billing remedies.',
      fileContent: `Official Refund Policy (Updated 2026):
1. Duplicate Charges: If a customer is billed multiple times in error for the same billing cycle or subscription renewal, full refunds for duplicate amounts will be processed within 3-5 business days upon verification.
2. Subscription Cancellations: Customers may cancel their plan anytime through their Account Settings. Cancelled accounts remain active until the end of the current billing cycle.
3. 30-Day Money-Back Guarantee: First-time Annual Plan subscribers are eligible for a 100% refund within 30 days of sign-up.
4. How to Request: Contact support with invoice IDs or transaction receipts. No cancellation penalty fees apply.`,
      version: '2.1',
    },
    {
      title: 'Account Security and 2FA Guide',
      description: 'Procedures for compromised credentials, 2FA resets, and password changes.',
      fileContent: `Account Security Protocol:
1. Suspected Unauthorized Access: If an account was accessed without authorization or payment details modified, support agents must immediately lock payment updates, revoke active API keys, and trigger an automated security verification email.
2. Two-Factor Authentication (2FA) Reset: Customers requesting 2FA resets must confirm identity via registered backup recovery code or SMS identity verification.
3. Password Resets: Self-serve password resets are accessible via the login portal with temporary 15-minute expiring magic links.`,
      version: '1.4',
    },
    {
      title: 'Subscription Tiers & API Rate Limits',
      description: 'Details on Starter, Pro, and Enterprise quotas, rate limiting, and plan upgrades.',
      fileContent: `Subscription Limits & API Quotas:
- Starter Tier: $29/mo, 10,000 requests/day, 60 requests/minute. Standard email support.
- Pro Tier: $99/mo, 100,000 requests/day, 300 requests/minute. Priority support within 2 hours.
- Enterprise Tier: Custom pricing, Unlimited throughput, Dedicated agent and 99.99% SLA.
If an account exceeds rate limits, HTTP 429 Too Many Requests will be returned. Upgrades apply instantly.`,
      version: '3.0',
    },
  ];

  for (const doc of kbDocs) {
    const createdDoc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: acmeOrg.id,
        title: doc.title,
        description: doc.description,
        fileContent: doc.fileContent,
        version: doc.version,
        status: 'INDEXED',
        createdBy: admin.name,
      },
    });
    try {
      await indexKnowledgeDocument(createdDoc);
    } catch (idxErr) {
      console.error('[Seed Indexing Warning]', idxErr.message);
    }
  }

  console.log('✅ Essential Knowledge Base docs created');

  // 4. Seed 1 Sample Initial Ticket (Ticket #1042 matching PRD Section 24 example)
  await prisma.ticket.create({
    data: {
      ticketNumber: 1042,
      organizationId: acmeOrg.id,
      customerId: customer.id,
      assignedAgentId: agent.id,
      subject: 'Duplicate Payment for Pro annual subscription renewal',
      description: 'Hi, I checked my bank statement today and noticed I was billed twice for our Pro annual subscription. Could you please check and refund the duplicate charge?',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'Billing',
      sentiment: 'FRUSTRATED',
      summary: 'Customer was billed twice for the annual Pro subscription renewal and is requesting a duplicate refund.',
      messages: {
        create: [
          {
            senderId: customer.id,
            senderType: 'CUSTOMER',
            content: 'Hi, I checked my bank statement today and noticed I was billed twice for our Pro annual subscription. Could you please check and refund the duplicate charge?',
          },
          {
            senderId: agent.id,
            senderType: 'AGENT',
            content: 'Hello Shreyas! I understand your concern. I am pulling up your invoice records in our billing ledger right now.',
          },
        ],
      },
      events: {
        create: [
          {
            userId: customer.id,
            eventType: 'TICKET_CREATED',
            metadata: JSON.stringify({ category: 'Billing', priority: 'HIGH' }),
          },
          {
            userId: agent.id,
            eventType: 'TICKET_ASSIGNED',
            metadata: JSON.stringify({ assignedTo: agent.name }),
          },
        ],
      },
      aiSuggestions: {
        create: [
          {
            type: 'REPLY',
            content: 'Hello Shreyas,\n\nI have verified your transaction record. According to our Refund and Cancellation Policy for Duplicate Charges, I have initiated a full refund for the second charge to your original payment method. You should see this credited within 3 to 5 business days.\n\nPlease let me know if you need any additional invoice receipts!\n\nBest regards,\nCustomer Support Team',
            model: 'gemini-2.5-flash',
            accepted: false,
          },
        ],
      },
    },
  });

  console.log('✅ Initial seed ticket #1042 created');
  console.log('🚀 Essential baseline database setup complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
