-- CreateTable
CREATE TABLE `ErasureRequest` (
    `id` VARCHAR(191) NOT NULL,
    `subjectName` VARCHAR(191) NOT NULL,
    `subjectEmail` VARCHAR(191) NOT NULL,
    `subjectPhone` VARCHAR(191) NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NOT NULL,
    `systems` JSON NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'PARTIAL') NOT NULL DEFAULT 'PENDING',
    `assignedTo` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `proofDocUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ErasureRequest_status_idx`(`status`),
    INDEX `ErasureRequest_requestDate_idx`(`requestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
