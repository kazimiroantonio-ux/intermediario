-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'VERIFIED_SELLER', 'PRO', 'ENTERPRISE', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('VENDA', 'ALUGUER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'EXPIRED', 'BLOCKED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('BASICO', 'PRO', 'EMPRESA');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDENTE', 'ANALISADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PLANO', 'DESTAQUE', 'VERIFICACAO', 'COMISSAO', 'BANNER', 'FLASH');

-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('HERO', 'HOME_MID', 'LISTING_TOP');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ATIVO', 'PAUSADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AgentTier" AS ENUM ('JUNIOR', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MULTICAIXA', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('INDIVIDUAL_GROUP_C', 'COMPANY_GENERAL', 'COMPANY_SIMPLIFIED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('REQUESTED', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "RequesterType" AS ENUM ('SELLER', 'BUYER', 'SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'ACCRUED', 'PAYABLE', 'PAID', 'REVERSED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CRIADO', 'AGUARDA_PAGAMENTO', 'INICIADO', 'PENDENTE_NO_BANCO', 'RECEBIDO', 'RECONCILIADO', 'FALHOU', 'CANCELADO', 'REEMBOLSO_PENDENTE', 'REEMBOLSADO', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MULTICAIXA_EXPRESS', 'BANK_TRANSFER', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PromotionPosition" AS ENUM ('HOME_HERO', 'CATEGORY_TOP', 'SEARCH_BOOST');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('LEAD', 'QUEUED', 'AGENT_ASSIGNED', 'QUALIFYING', 'FEES_PENDING', 'VISIT_SCHEDULED', 'VISIT_DONE', 'RELATORIO_SOLICITADO', 'DUE_DILIGENCE', 'REPORT_DELIVERED', 'NEGOTIATING', 'AGREED', 'DEPOSIT_PENDING', 'DEPOSIT_PAID', 'ACT_SCHEDULED', 'ACT_IN_PROGRESS', 'SETTLED', 'CLOSED_WON', 'CLOSED_LOST', 'EXPIRED_UNPAID', 'SELLER_WITHDREW', 'BUYER_WITHDREW', 'DISPUTED', 'BLOQUEADO_POR_DOCUMENTOS', 'BLOQUEADO_POR_RISCO', 'SUSPENSO', 'FRAUDE_EM_INVESTIGACAO', 'REEMBOLSO_PENDENTE', 'REEMBOLSO_CONCLUIDO');

-- CreateEnum
CREATE TYPE "ChannelSide" AS ENUM ('AGENT_BUYER', 'AGENT_SELLER', 'AGENT_INTERNAL');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('TRAVEL_FEE', 'VEHICLE_INSPECTION', 'PROPERTY_INSPECTION');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'SCHEDULED', 'DELIVERED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('EMPLOYEE', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('RECEIVED', 'PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "ListingVerificationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING_DOCS', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmlReviewStatus" AS ENUM ('REQUIRED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskActionType" AS ENUM ('IBAN_CHANGE', 'IBAN_UNLOCK', 'MANUAL_PAYOUT');

-- CreateEnum
CREATE TYPE "RiskActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'VOID');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('DEPOSIT', 'BALANCE');

-- CreateEnum
CREATE TYPE "ActStep" AS ENUM ('OPENED', 'IDENTITY_CHECKED', 'DOCS_CHECKED', 'PAYMENT_SENT', 'PAYMENT_CONFIRMED', 'HANDOVER_DONE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'EM_APROVACAO', 'APPROVED', 'EM_PROCESSAMENTO', 'PAID', 'REJECTED', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('MEDIATION_CONTRACT', 'COMMISSION_PAYMENT_AUTHORIZATION', 'SELLER_REPRESENTATION_AUTHORIZATION', 'DATA_CONSENT', 'VISIT_AGREEMENT', 'INSPECTION_AUTHORIZATION', 'PURCHASE_PROPOSAL', 'PROMISE_CONTRACT', 'SALE_CONTRACT', 'RECEIPT_90_DECLARATION', 'HANDOVER_DOCUMENT', 'KEYS_HANDOVER', 'CANCELLATION_DECLARATION', 'REFUND_AGREEMENT', 'TITLE_LEGITIMACY_DECLARATION', 'LIENS_DECLARATION', 'BENEFICIAL_OWNER_FORM', 'FUNDS_ORIGIN_DECLARATION', 'INSPECTION_REPORT_DOC');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SignatureRequirement" AS ENUM ('DIGITAL_SUFFICIENT', 'QUALIFIED_REQUIRED', 'EXTERNAL_FORMALIZATION');

-- CreateEnum
CREATE TYPE "DealDocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'READ', 'SIGNED', 'REJECTED', 'EXPIRED', 'VOID', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('OTP_SMS', 'ELECTRONIC', 'QUALIFIED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('BUYING', 'SELLING', 'VISITING', 'INVESTIGATING');

-- CreateEnum
CREATE TYPE "ActivitySide" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'MFA_PHONE', 'CHANGE_IBAN', 'RESET_PASSWORD', 'SELLER_CONFIRM_RECEIPT');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('PENDENTE', 'EM_VERIFICACAO', 'VERIFICADO', 'REJEITADO', 'SUSPENSO', 'SUBSTITUIDO');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmlCaseStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CLEARED', 'BLOCKED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_USER', 'WAITING_COMPLIANCE', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'EVIDENCE_REQUESTED', 'RESOLVED_IN_FAVOR_OF_BUYER', 'RESOLVED_IN_FAVOR_OF_SELLER', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "launchOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "travelTier" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceInKz" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "maxListings" INTEGER NOT NULL,
    "hasBadge" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "PromotionPosition" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceInKz" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promotion_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_promotions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "promotionPackageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "listingPromotionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "referenceCode" TEXT,
    "proofOfPaymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "province" TEXT,
    "operatorRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bio" TEXT,
    "whatsapp" TEXT,
    "companyName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "twoFactorBackupCodes" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AOA',
    "dealType" "DealType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "province" TEXT NOT NULL,
    "municipality" TEXT,
    "images" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "attributes" JSONB NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verificationStatus" "ListingVerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "sellerIban" TEXT,
    "sellerIbanVerifiedAt" TIMESTAMP(3),
    "sellerIbanLocked" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2),
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewedId" TEXT NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDENTE',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AOA',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "type" "TransactionType" NOT NULL,
    "planTier" "PlanTier",
    "isDestaque" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "commissionId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "position" "BannerPosition" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "advertiserId" TEXT NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_promotions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetProvince" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ENVIADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flash_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "tier" "AgentTier" NOT NULL DEFAULT 'JUNIOR',
    "fullName" TEXT NOT NULL,
    "biNumber" TEXT NOT NULL,
    "nif" TEXT,
    "phone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "biDocUrl" TEXT NOT NULL,
    "addressProof" TEXT,
    "criminalRecordUrl" TEXT,
    "commissionShareBps" INTEGER NOT NULL DEFAULT 5000,
    "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "taxRegime" "TaxRegime" NOT NULL DEFAULT 'INDIVIDUAL_GROUP_C',
    "iban" TEXT,
    "bankName" TEXT,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dealsClosed" INTEGER NOT NULL DEFAULT 0,
    "disputesLost" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_municipalities" (
    "agentId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,

    CONSTRAINT "agent_municipalities_pkey" PRIMARY KEY ("agentId","municipalityId")
);

-- CreateTable
CREATE TABLE "agent_categories" (
    "agentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "agent_categories_pkey" PRIMARY KEY ("agentId","categoryId")
);

-- CreateTable
CREATE TABLE "agent_assignments" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "listingId" TEXT NOT NULL,
    "reservationId" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedBy" "RequesterType" NOT NULL DEFAULT 'SELLER',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "offeredAt" TIMESTAMP(3),
    "respondDeadline" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "checklist" JSONB,
    "visitPhotos" TEXT[],
    "visitLat" DOUBLE PRECISION,
    "visitLng" DOUBLE PRECISION,
    "buyerConfirmedAt" TIMESTAMP(3),
    "sellerConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_events" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "assignmentId" TEXT,
    "dealId" TEXT,
    "dealAmount" BIGINT NOT NULL,
    "rateBps" INTEGER NOT NULL DEFAULT 1000,
    "totalCommission" BIGINT NOT NULL,
    "agentShareBps" INTEGER NOT NULL DEFAULT 5000,
    "agentAmount" BIGINT NOT NULL DEFAULT 0,
    "platformAmount" BIGINT NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "accruedAt" TIMESTAMP(3),
    "payableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedReason" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_payouts" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" BIGINT NOT NULL,
    "withholdingTax" BIGINT NOT NULL DEFAULT 0,
    "netAmount" BIGINT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "reference" TEXT,
    "approvedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureReason" TEXT,
    "idempotencyKey" TEXT,

    CONSTRAINT "agent_payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_payouts_idempotencyKey_key" ON "agent_payouts"("idempotencyKey");

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "DealType" NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "agentId" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'LEAD',
    "listedPrice" BIGINT NOT NULL,
    "agreedPrice" BIGINT,
    "lostReason" TEXT,
    "queuedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "firstContactAt" TIMESTAMP(3),
    "visitAt" TIMESTAMP(3),
    "agreedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_events" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "ipAddress" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "side" "ChannelSide" NOT NULL,
    "direction" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "durationSec" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "side" "ChannelSide" NOT NULL,
    "agentId" TEXT NOT NULL,
    "partyId" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL DEFAULT 'USER',
    "senderId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_prices" (
    "id" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "travelTier" INTEGER,
    "categoryId" TEXT,
    "amount" BIGINT NOT NULL,
    "agentPayout" BIGINT NOT NULL DEFAULT 0,
    "partnerCost" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amount" BIGINT NOT NULL,
    "paymentId" TEXT,
    "agentId" TEXT,
    "partnerId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "refundReason" TEXT,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "nif" TEXT,
    "costPerUnit" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_municipalities" (
    "partnerId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,

    CONSTRAINT "partner_municipalities_pkey" PRIMARY KEY ("partnerId","municipalityId")
);

-- CreateTable
CREATE TABLE "inspection_reports" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "score" INTEGER,
    "redFlags" TEXT[],
    "photos" TEXT[],
    "documentUrls" TEXT[],
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_shifts" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agent_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_availabilities" (
    "agentId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "activeDeals" INTEGER NOT NULL DEFAULT 0,
    "maxActiveDeals" INTEGER NOT NULL DEFAULT 8,
    "lastAssignedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_availabilities_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "agent_compensations" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "engagement" "EngagementType" NOT NULL DEFAULT 'SERVICE_PROVIDER',
    "baseSalary" BIGINT NOT NULL DEFAULT 0,
    "travelStipend" BIGINT NOT NULL DEFAULT 0,
    "mealStipend" BIGINT NOT NULL DEFAULT 0,
    "commissionShareBps" INTEGER NOT NULL DEFAULT 5000,
    "isDrawAgainstCommission" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "agent_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_documents" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_risk_actions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "type" "RiskActionType" NOT NULL,
    "status" "RiskActionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "pending_risk_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "agreedPrice" BIGINT NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "commissionNet" BIGINT NOT NULL,
    "vatBps" INTEGER NOT NULL DEFAULT 1400,
    "commissionVat" BIGINT NOT NULL,
    "buyerPayable" BIGINT NOT NULL,
    "sellerPayable" BIGINT NOT NULL,
    "sellerIban" TEXT NOT NULL,
    "sellerIbanVerifiedAt" TIMESTAMP(3),
    "amlReviewStatus" "AmlReviewStatus" NOT NULL DEFAULT 'REQUIRED',
    "amlMemo" TEXT,
    "amlReviewedById" TEXT,
    "amlReviewedAt" TIMESTAMP(3),
    "buyerOtpAt" TIMESTAMP(3),
    "sellerOtpAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "actDeadline" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_charges" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "kind" "ChargeKind" NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "reference" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "bankTxnRef" TEXT,
    "invoiceId" TEXT,

    CONSTRAINT "commission_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_sessions" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "step" "ActStep" NOT NULL DEFAULT 'OPENED',
    "buyerIdVerified" BOOLEAN NOT NULL DEFAULT false,
    "sellerIdVerified" BOOLEAN NOT NULL DEFAULT false,
    "docsChecklist" JSONB,
    "transferProofUrls" TEXT[],
    "sellerReceiptConfirmedAt" TIMESTAMP(3),
    "sellerReceiptOtp" TEXT,
    "handoverSignedUrl" TEXT,
    "buyerHandoverOtpAt" TIMESTAMP(3),
    "sellerHandoverOtpAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "act_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_transfers" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" TEXT NOT NULL,
    "proofUrl" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "seller_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "preparedById" TEXT,
    "approvedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "proofUrl" TEXT,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'AO',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "signatureRequirement" "SignatureRequirement" NOT NULL DEFAULT 'DIGITAL_SUFFICIENT',
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" INTEGER NOT NULL DEFAULT 1,
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_revisions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "varsSchema" JSONB NOT NULL,
    "clausulas" JSONB NOT NULL,
    "fileHash" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_documents" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "status" "DealDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "alerts" TEXT[],
    "bodyHash" TEXT,
    "fileUrl" TEXT,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "signatureRequirement" "SignatureRequirement" NOT NULL DEFAULT 'DIGITAL_SUFFICIENT',
    "generatedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sentToKind" TEXT,
    "consentUrl" TEXT,
    "consentExpiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerId" TEXT,
    "signerRole" TEXT NOT NULL,
    "method" "SignatureMethod" NOT NULL DEFAULT 'OTP_SMS',
    "consentAt" TIMESTAMP(3),
    "otpVerifiedAt" TIMESTAMP(3),
    "otpExpiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceData" TEXT,
    "signedAt" TIMESTAMP(3),
    "certificateReference" TEXT,
    "documentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_events" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "ipAddress" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_events" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "ipAddress" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_role_permissions" (
    "operatorRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_role_permissions_pkey" PRIMARY KEY ("operatorRoleId","permissionId")
);

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "dealId" TEXT,
    "listingId" TEXT,
    "outcome" JSONB,
    "confidence" DOUBLE PRECISION,
    "promptHash" TEXT,
    "status" TEXT NOT NULL,
    "suggestedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedChanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "eventId" TEXT,
    "refId" TEXT,
    "status" TEXT NOT NULL,
    "requestHash" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "side" "ActivitySide" NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'OPEN',
    "transactionId" TEXT,
    "listingId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "ibanCipher" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderNif" TEXT NOT NULL,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'PENDENTE',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB,
    "riskFactors" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status" "AmlCaseStatus" NOT NULL DEFAULT 'OPEN',
    "flags" JSONB,
    "decisionById" TEXT,
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aml_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "transactionId" TEXT,
    "operation" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "outputHash" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourcesUsed" JSONB,
    "status" "AiRequestStatus" NOT NULL DEFAULT 'SUGGESTED',
    "approvedById" TEXT,
    "appliedChanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "SupportStatus" NOT NULL DEFAULT 'NEW',
    "assigneeId" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "satisfaction" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "transactionId" TEXT,
    "initiatorId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "blockDeal" BOOLEAN NOT NULL DEFAULT true,
    "resolvedById" TEXT,
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "assigneeId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_code_key" ON "municipalities"("code");

-- CreateIndex
CREATE INDEX "municipalities_provinceId_idx" ON "municipalities"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_provinceId_name_key" ON "municipalities"("provinceId", "name");

-- CreateIndex
CREATE INDEX "districts_municipalityId_idx" ON "districts"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "districts_municipalityId_name_key" ON "districts"("municipalityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "payments_referenceCode_key" ON "payments"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "listings_category_status_idx" ON "listings"("category", "status");

-- CreateIndex
CREATE INDEX "listings_province_idx" ON "listings"("province");

-- CreateIndex
CREATE INDEX "listings_userId_idx" ON "listings"("userId");

-- CreateIndex
CREATE INDEX "chat_rooms_sellerId_idx" ON "chat_rooms"("sellerId");

-- CreateIndex
CREATE INDEX "chat_rooms_buyerId_idx" ON "chat_rooms"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_listingId_buyerId_sellerId_key" ON "chat_rooms"("listingId", "buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "messages_chatRoomId_idx" ON "messages"("chatRoomId");

-- CreateIndex
CREATE INDEX "reservations_listingId_startDate_endDate_idx" ON "reservations"("listingId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "favorites_listingId_idx" ON "favorites"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_listingId_key" ON "favorites"("userId", "listingId");

-- CreateIndex
CREATE INDEX "reviews_reviewedId_idx" ON "reviews"("reviewedId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_reviewedId_key" ON "reviews"("reviewerId", "reviewedId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterId_listingId_key" ON "reports"("reporterId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "commission_ledger_reservationId_key" ON "commission_ledger"("reservationId");

-- CreateIndex
CREATE INDEX "commission_ledger_userId_idx" ON "commission_ledger"("userId");

-- CreateIndex
CREATE INDEX "verification_requests_userId_idx" ON "verification_requests"("userId");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE INDEX "banners_position_status_idx" ON "banners"("position", "status");

-- CreateIndex
CREATE INDEX "flash_promotions_advertiserId_idx" ON "flash_promotions"("advertiserId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_code_key" ON "agents"("code");

-- CreateIndex
CREATE INDEX "agents_status_tier_idx" ON "agents"("status", "tier");

-- CreateIndex
CREATE INDEX "agent_municipalities_municipalityId_idx" ON "agent_municipalities"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_assignments_reservationId_key" ON "agent_assignments"("reservationId");

-- CreateIndex
CREATE INDEX "agent_assignments_status_agentId_idx" ON "agent_assignments"("status", "agentId");

-- CreateIndex
CREATE INDEX "agent_assignments_listingId_idx" ON "agent_assignments"("listingId");

-- CreateIndex
CREATE INDEX "assignment_events_assignmentId_idx" ON "assignment_events"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_reservationId_key" ON "commissions"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_assignmentId_key" ON "commissions"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_dealId_key" ON "commissions"("dealId");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "agent_payouts_agentId_status_idx" ON "agent_payouts"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "deals_reference_key" ON "deals"("reference");

-- CreateIndex
CREATE INDEX "deals_status_agentId_idx" ON "deals"("status", "agentId");

-- CreateIndex
CREATE INDEX "deals_listingId_idx" ON "deals"("listingId");

-- CreateIndex
CREATE INDEX "deals_sellerId_idx" ON "deals"("sellerId");

-- CreateIndex
CREATE INDEX "deals_buyerId_idx" ON "deals"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "deals_listingId_buyerId_key" ON "deals"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "deal_events_dealId_idx" ON "deal_events"("dealId");

-- CreateIndex
CREATE INDEX "call_logs_dealId_idx" ON "call_logs"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_dealId_side_key" ON "conversations"("dealId", "side");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "service_orders_dealId_status_idx" ON "service_orders"("dealId", "status");

-- CreateIndex
CREATE INDEX "partner_municipalities_municipalityId_idx" ON "partner_municipalities"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_reports_serviceOrderId_key" ON "inspection_reports"("serviceOrderId");

-- CreateIndex
CREATE INDEX "agent_shifts_agentId_weekday_idx" ON "agent_shifts"("agentId", "weekday");

-- CreateIndex
CREATE INDEX "agent_compensations_agentId_effectiveFrom_idx" ON "agent_compensations"("agentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "listing_documents_listingId_idx" ON "listing_documents"("listingId");

-- CreateIndex
CREATE INDEX "listing_documents_status_idx" ON "listing_documents"("status");

-- CreateIndex
CREATE INDEX "pending_risk_actions_status_type_idx" ON "pending_risk_actions"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_dealId_key" ON "agreements"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_supersededById_key" ON "agreements"("supersededById");

-- CreateIndex
CREATE UNIQUE INDEX "commission_charges_bankTxnRef_key" ON "commission_charges"("bankTxnRef");

-- CreateIndex
CREATE INDEX "commission_charges_status_expiresAt_idx" ON "commission_charges"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "commission_charges_agreementId_kind_key" ON "commission_charges"("agreementId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "act_sessions_dealId_key" ON "act_sessions"("dealId");

-- CreateIndex
CREATE INDEX "seller_transfers_dealId_idx" ON "seller_transfers"("dealId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_code_key" ON "document_templates"("code");

-- CreateIndex
CREATE INDEX "document_templates_status_docType_idx" ON "document_templates"("status", "docType");

-- CreateIndex
CREATE INDEX "template_revisions_templateId_idx" ON "template_revisions"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "template_revisions_templateId_version_key" ON "template_revisions"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "deal_documents_supersededById_key" ON "deal_documents"("supersededById");

-- CreateIndex
CREATE INDEX "deal_documents_dealId_status_idx" ON "deal_documents"("dealId", "status");

-- CreateIndex
CREATE INDEX "deal_documents_docType_status_idx" ON "deal_documents"("docType", "status");

-- CreateIndex
CREATE INDEX "document_signatures_documentId_idx" ON "document_signatures"("documentId");

-- CreateIndex
CREATE INDEX "document_events_documentId_idx" ON "document_events"("documentId");

-- CreateIndex
CREATE INDEX "listing_events_listingId_createdAt_idx" ON "listing_events"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "operator_roles_code_key" ON "operator_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "ai_actions_dealId_idx" ON "ai_actions"("dealId");

-- CreateIndex
CREATE INDEX "ai_actions_listingId_idx" ON "ai_actions"("listingId");

-- CreateIndex
CREATE INDEX "ai_actions_status_createdAt_idx" ON "ai_actions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "integration_events_provider_eventId_idx" ON "integration_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "integration_events_refId_status_idx" ON "integration_events"("refId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_events_occurrenceId_key" ON "audit_events"("occurrenceId");

-- CreateIndex
CREATE INDEX "audit_events_domain_entityId_idx" ON "audit_events"("domain", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_action_createdAt_idx" ON "audit_events"("action", "createdAt");

-- CreateIndex
CREATE INDEX "user_activities_userId_side_idx" ON "user_activities"("userId", "side");

-- CreateIndex
CREATE INDEX "user_activities_userId_activityType_createdAt_idx" ON "user_activities"("userId", "activityType", "createdAt");

-- CreateIndex
CREATE INDEX "otp_codes_userId_purpose_idx" ON "otp_codes"("userId", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_status_idx" ON "bank_accounts"("userId", "status");

-- CreateIndex
CREATE INDEX "kyc_cases_userId_status_idx" ON "kyc_cases"("userId", "status");

-- CreateIndex
CREATE INDEX "aml_cases_userId_status_idx" ON "aml_cases"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_requests_requestId_key" ON "ai_requests"("requestId");

-- CreateIndex
CREATE INDEX "ai_requests_requestId_idx" ON "ai_requests"("requestId");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "support_tickets_userId_createdAt_idx" ON "support_tickets"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_transactionId_status_idx" ON "disputes"("transactionId", "status");

-- CreateIndex
CREATE INDEX "tasks_status_dueAt_idx" ON "tasks"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_promotions" ADD CONSTRAINT "listing_promotions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_promotions" ADD CONSTRAINT "listing_promotions_promotionPackageId_fkey" FOREIGN KEY ("promotionPackageId") REFERENCES "promotion_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_listingPromotionId_fkey" FOREIGN KEY ("listingPromotionId") REFERENCES "listing_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_operatorRoleId_fkey" FOREIGN KEY ("operatorRoleId") REFERENCES "operator_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewedId_fkey" FOREIGN KEY ("reviewedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_promotions" ADD CONSTRAINT "flash_promotions_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_promotions" ADD CONSTRAINT "flash_promotions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_municipalities" ADD CONSTRAINT "agent_municipalities_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_municipalities" ADD CONSTRAINT "agent_municipalities_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_categories" ADD CONSTRAINT "agent_categories_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "agent_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "agent_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "agent_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_payouts" ADD CONSTRAINT "agent_payouts_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_payouts" ADD CONSTRAINT "agent_payouts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_municipalities" ADD CONSTRAINT "partner_municipalities_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_municipalities" ADD CONSTRAINT "partner_municipalities_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_shifts" ADD CONSTRAINT "agent_shifts_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_availabilities" ADD CONSTRAINT "agent_availabilities_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_compensations" ADD CONSTRAINT "agent_compensations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_documents" ADD CONSTRAINT "listing_documents_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_risk_actions" ADD CONSTRAINT "pending_risk_actions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_risk_actions" ADD CONSTRAINT "pending_risk_actions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_risk_actions" ADD CONSTRAINT "pending_risk_actions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_charges" ADD CONSTRAINT "commission_charges_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_charges" ADD CONSTRAINT "commission_charges_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_sessions" ADD CONSTRAINT "act_sessions_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_sessions" ADD CONSTRAINT "act_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_transfers" ADD CONSTRAINT "seller_transfers_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "commission_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_revisions" ADD CONSTRAINT "template_revisions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "deal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "deal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "deal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_role_permissions" ADD CONSTRAINT "operator_role_permissions_operatorRoleId_fkey" FOREIGN KEY ("operatorRoleId") REFERENCES "operator_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_role_permissions" ADD CONSTRAINT "operator_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_cases" ADD CONSTRAINT "kyc_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_cases" ADD CONSTRAINT "aml_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
