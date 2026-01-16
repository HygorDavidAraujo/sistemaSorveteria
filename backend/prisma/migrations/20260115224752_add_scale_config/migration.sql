-- CreateTable
CREATE TABLE "scale_config" (
    "id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "manufacturer" VARCHAR(30) NOT NULL DEFAULT 'TOLEDO',
    "model" VARCHAR(60),
    "protocol" VARCHAR(30) NOT NULL DEFAULT 'toledo_prix',
    "port" VARCHAR(50) NOT NULL,
    "baud_rate" INTEGER NOT NULL DEFAULT 9600,
    "data_bits" INTEGER NOT NULL DEFAULT 8,
    "stop_bits" INTEGER NOT NULL DEFAULT 1,
    "parity" VARCHAR(10) NOT NULL DEFAULT 'none',
    "stable_only" BOOLEAN NOT NULL DEFAULT true,
    "read_timeout_ms" INTEGER NOT NULL DEFAULT 1500,
    "request_command" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scale_config_pkey" PRIMARY KEY ("id")
);
