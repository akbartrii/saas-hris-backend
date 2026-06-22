-- CreateTable
CREATE TABLE IF NOT EXISTS "tr_user_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "fcm_token" VARCHAR(512) NOT NULL,
    "device_id" VARCHAR(255),
    "platform" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tr_user_devices_fcm_token_key" ON "tr_user_devices"("fcm_token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_user_devices_user" ON "tr_user_devices"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_user_devices_device" ON "tr_user_devices"("device_id");

-- AddForeignKey
ALTER TABLE "tr_user_devices" 
    ADD CONSTRAINT "tr_user_devices_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "tr_users"("id") 
    ON DELETE CASCADE ON UPDATE NO ACTION;
