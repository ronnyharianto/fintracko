-- CreateEnum
CREATE TYPE "ft_core"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ft_core"."WorkspaceInvitation" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "inviterId" UUID NOT NULL,
    "inviteeId" UUID NOT NULL,
    "status" "ft_core"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_inviteeId_status_idx" ON "ft_core"."WorkspaceInvitation"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_idx" ON "ft_core"."WorkspaceInvitation"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_workspaceId_inviteeId_key" ON "ft_core"."WorkspaceInvitation"("workspaceId", "inviteeId");

-- AddForeignKey
ALTER TABLE "ft_core"."WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
