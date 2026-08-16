CREATE TABLE "consent_acceptances" (
    "id" UUID NOT NULL,
    "anonymousSessionId" UUID,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "ageConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "locationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "termsVersion" VARCHAR(32) NOT NULL,
    "safetyVersion" VARCHAR(32) NOT NULL,
    "privacyVersion" VARCHAR(32) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_acceptances_anonymousSessionId_idx"
ON "consent_acceptances"("anonymousSessionId");

CREATE INDEX "consent_acceptances_acceptedAt_idx"
ON "consent_acceptances"("acceptedAt");
