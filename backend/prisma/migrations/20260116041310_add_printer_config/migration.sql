-- CreateTable
CREATE TABLE "printer_config" (
    "id" UUID NOT NULL,
    "paper_width" VARCHAR(10) NOT NULL DEFAULT '80mm',
    "content_width" VARCHAR(10) NOT NULL DEFAULT '70mm',
    "font_family" VARCHAR(100) NOT NULL DEFAULT 'Courier New',
    "font_size" INTEGER NOT NULL DEFAULT 11,
    "line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.4,
    "margin_mm" INTEGER NOT NULL DEFAULT 5,
    "max_chars_per_line" INTEGER NOT NULL DEFAULT 42,
    "show_logo" BOOLEAN NOT NULL DEFAULT true,
    "show_company_info" BOOLEAN NOT NULL DEFAULT true,
    "footer_text" VARCHAR(255),
    "footer_secondary_text" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "printer_config_pkey" PRIMARY KEY ("id")
);
