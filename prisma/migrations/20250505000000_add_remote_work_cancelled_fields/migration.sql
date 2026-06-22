-- AlterTable
ALTER TABLE "tr_remote_work_requests" ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_reason" TEXT;
