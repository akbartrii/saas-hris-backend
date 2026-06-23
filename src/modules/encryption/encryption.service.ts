import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class EncryptionService {
  constructor(private prisma: PrismaService) {}

  private readonly salt = Buffer.from(
    process.env.ENCRYPTION_SALT || "samugara-hris-secret-salt-2026",
    "utf-8",
  );

  // Derive a 256-bit (32 bytes) key using PBKDF2 with 100,000 iterations
  deriveKey(keycode: string): Buffer {
    return crypto.pbkdf2Sync(keycode, this.salt, 100000, 32, "sha256");
  }

  // Validate the keycode against the active database keycode for the current month/year
  async validateKeycode(
    keycode: string,
    month?: number,
    year?: number,
  ): Promise<boolean> {
    const today = new Date();
    const targetMonth = month || today.getMonth() + 1;
    const targetYear = year || today.getFullYear();

    const activeKey = await this.prisma.ms_salary_keys.findFirst({
      where: {
        month: targetMonth,
        year: targetYear,
      },
    });

    if (!activeKey) {
      return false;
    }

    return bcrypt.compare(keycode, activeKey.keycode_hash);
  }

  // Hashing and storing a new keycode for the month, and initializing legacy plain numbers
  async generateKeycode(
    keycode: string,
    month?: number,
    year?: number,
  ): Promise<void> {
    const today = new Date();
    const targetMonth = month || today.getMonth() + 1;
    const targetYear = year || today.getFullYear();

    const existingKey = await this.prisma.ms_salary_keys.findUnique({
      where: { month_year: { month: targetMonth, year: targetYear } },
    });

    if (existingKey) {
      throw new BadRequestException(
        "A keycode has already been generated for this month. Please use rotation instead.",
      );
    }

    const hash = await bcrypt.hash(keycode, 10);
    await this.prisma.ms_salary_keys.create({
      data: {
        keycode_hash: hash,
        month: targetMonth,
        year: targetYear,
      },
    });

    // Automatically encrypt any legacy plain text numbers
    await this.initializeLegacySalaries(keycode, targetMonth, targetYear);
  }

  // Encrypt existing plain numeric values on legacy employee profiles
  async initializeLegacySalaries(
    keycode: string,
    month: number,
    year: number,
  ): Promise<void> {
    const isCreated = await this.validateKeycode(keycode, month, year);
    if (!isCreated) {
      throw new BadRequestException("Keycode is not active for this month.");
    }

    const employees = await this.prisma.ms_employees.findMany();
    await this.prisma.$transaction(
      async (tx) => {
        for (const emp of employees) {
          const basePlain = emp.base_salary;
          const fixedPlain = emp.fixed_allowance;
          const phonePlain = emp.phone_allowance;
          const dinasPlain = emp.dinas_allowance;

          const baseEnc =
            basePlain && !this.isEncrypted(basePlain)
              ? this.encrypt(basePlain, keycode)
              : basePlain;
          const fixedEnc =
            fixedPlain && !this.isEncrypted(fixedPlain)
              ? this.encrypt(fixedPlain, keycode)
              : fixedPlain;
          const phoneEnc =
            phonePlain && !this.isEncrypted(phonePlain)
              ? this.encrypt(phonePlain, keycode)
              : phonePlain;
          const dinasEnc =
            dinasPlain && !this.isEncrypted(dinasPlain)
              ? this.encrypt(dinasPlain, keycode)
              : dinasPlain;

          if (
            baseEnc !== basePlain ||
            fixedEnc !== fixedPlain ||
            phoneEnc !== phonePlain ||
            dinasEnc !== dinasPlain
          ) {
            await tx.ms_employees.update({
              where: { id: emp.id },
              data: {
                base_salary: baseEnc,
                fixed_allowance: fixedEnc,
                phone_allowance: phoneEnc,
                dinas_allowance: dinasEnc,
              },
            });
          }
        }
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  // Core Key Rotation Engine: safe transaction to re-encrypt all database compensation fields
  async rotateKeycode(
    oldKeycode: string,
    newKeycode: string,
    month?: number,
    year?: number,
  ): Promise<void> {
    const today = new Date();
    const targetMonth = month || today.getMonth() + 1;
    const targetYear = year || today.getFullYear();

    const isOldValid = await this.validateKeycode(
      oldKeycode,
      targetMonth,
      targetYear,
    );
    if (!isOldValid) {
      throw new BadRequestException("Old keycode is incorrect.");
    }

    const employees = await this.prisma.ms_employees.findMany();

    await this.prisma.$transaction(
      async (tx) => {
        for (const emp of employees) {
          // Decrypt with old keycode (returns plain numbers or null)
          const basePlain = emp.base_salary
            ? this.decrypt(emp.base_salary, oldKeycode)
            : null;
          const fixedPlain = emp.fixed_allowance
            ? this.decrypt(emp.fixed_allowance, oldKeycode)
            : null;
          const phonePlain = emp.phone_allowance
            ? this.decrypt(emp.phone_allowance, oldKeycode)
            : null;
          const dinasPlain = emp.dinas_allowance
            ? this.decrypt(emp.dinas_allowance, oldKeycode)
            : null;

          // Re-encrypt with new keycode
          const baseEnc = basePlain
            ? this.encrypt(basePlain, newKeycode)
            : null;
          const fixedEnc = fixedPlain
            ? this.encrypt(fixedPlain, newKeycode)
            : null;
          const phoneEnc = phonePlain
            ? this.encrypt(phonePlain, newKeycode)
            : null;
          const dinasEnc = dinasPlain
            ? this.encrypt(dinasPlain, newKeycode)
            : null;

          await tx.ms_employees.update({
            where: { id: emp.id },
            data: {
              base_salary: baseEnc,
              fixed_allowance: fixedEnc,
              phone_allowance: phoneEnc,
              dinas_allowance: dinasEnc,
            },
          });
        }

        // Hash and update the monthly keycode
        const newHash = await bcrypt.hash(newKeycode, 10);
        await tx.ms_salary_keys.upsert({
          where: { month_year: { month: targetMonth, year: targetYear } },
          update: { keycode_hash: newHash },
          create: {
            keycode_hash: newHash,
            month: targetMonth,
            year: targetYear,
          },
        });
      },
      { maxWait: 15000, timeout: 30000 },
    );
  }

  // Helper to check if a value is encrypted (matches GCM format)
  isEncrypted(value: string | null): boolean {
    if (!value) return false;
    const parts = value.split(":");
    if (parts.length !== 3) return false;
    // Check if all parts are valid hex strings
    const hexRegex = /^[0-9a-fA-F]+$/;
    return parts.every((part) => hexRegex.test(part));
  }

  // Encrypt a value using AES-256-GCM
  encrypt(value: number | string | null, keycode: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const key = this.deriveKey(keycode);
    const iv = crypto.randomBytes(12); // 96-bit IV is standard for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(value.toString(), "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
  }

  // Decrypt a value using AES-256-GCM
  decrypt(encryptedValue: string | null, keycode: string): string | null {
    if (!encryptedValue) {
      return null;
    }

    if (!this.isEncrypted(encryptedValue)) {
      return encryptedValue; // Return plain text as-is if it's legacy/not encrypted
    }

    try {
      const key = this.deriveKey(keycode);
      const [ivHex, ciphertextHex, authTagHex] = encryptedValue.split(":");

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      // If decryption fails (e.g. wrong keycode), gracefully return the ciphertext
      // so it shows as locked in the UI rather than throwing a crash
      return encryptedValue;
    }
  }
}
