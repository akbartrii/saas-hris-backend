import { Injectable, Logger } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePayslipPdf(
    content: {
      employeeName: string;
      nik: string;
      periodName: string;
      baseSalary: number;
      fixedAllowance: number;
      phoneAllowance: number;
      dinasAllowance: number;
      attendanceAllowance: number;
      overtimePay: number;
      overtimeMealAllowance: number;
      grossIncome: number;
      lateDeduction: number;
      loanDeduction: number;
      bpjsKesehatan: number;
      bpjsKetenagakerjaan: number;
      pph21: number;
      totalDeductions: number;
      netIncome: number;
    },
    password?: string,
  ): Promise<Buffer> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Slip Gaji</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { text-align: center; font-size: 24px; margin-bottom: 8px; }
        .company { text-align: center; font-size: 14px; color: #666; margin-bottom: 24px; }
        .info { margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: 600; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        .net-income { font-size: 18px; font-weight: bold; text-align: right; margin-top: 16px; padding-top: 16px; border-top: 2px solid #333; }
      </style>
    </head>
    <body>
      <h1>SLIP GAJI</h1>
      <div class="company">PT Samugara</div>

      <div class="info">
        <div class="info-row"><span>Nama</span><strong>${content.employeeName}</strong></div>
        <div class="info-row"><span>NIK</span><span>${content.nik}</span></div>
        <div class="info-row"><span>Periode</span><span>${content.periodName}</span></div>
      </div>

      <table>
        <thead>
          <tr><th>Pendapatan</th><th class="text-right">Jumlah (Rp)</th></tr>
        </thead>
        <tbody>
          <tr><td>Gaji Pokok</td><td class="text-right">${this.formatNumber(content.baseSalary)}</td></tr>
          <tr><td>Tunjangan Tetap</td><td class="text-right">${this.formatNumber(content.fixedAllowance)}</td></tr>
          <tr><td>Tunjangan Pulsa</td><td class="text-right">${this.formatNumber(content.phoneAllowance)}</td></tr>
          <tr><td>Tunjangan Dinas</td><td class="text-right">${this.formatNumber(content.dinasAllowance)}</td></tr>
          <tr><td>Uang Kehadiran</td><td class="text-right">${this.formatNumber(content.attendanceAllowance)}</td></tr>
          <tr><td>Lembur</td><td class="text-right">${this.formatNumber(content.overtimePay)}</td></tr>
          <tr><td>Uang Makan Lembur</td><td class="text-right">${this.formatNumber(content.overtimeMealAllowance)}</td></tr>
          <tr class="total-row"><td>Total Pendapatan</td><td class="text-right">${this.formatNumber(content.grossIncome)}</td></tr>
        </tbody>
      </table>

      <table>
        <thead>
          <tr><th>Potongan</th><th class="text-right">Jumlah (Rp)</th></tr>
        </thead>
        <tbody>
          <tr><td>Terlambat</td><td class="text-right">${this.formatNumber(content.lateDeduction)}</td></tr>
          <tr><td>Pinjaman</td><td class="text-right">${this.formatNumber(content.loanDeduction)}</td></tr>
          <tr><td>BPJS Kesehatan</td><td class="text-right">${this.formatNumber(content.bpjsKesehatan)}</td></tr>
          <tr><td>BPJS Ketenagakerjaan</td><td class="text-right">${this.formatNumber(content.bpjsKetenagakerjaan)}</td></tr>
          <tr><td>PPh 21</td><td class="text-right">${this.formatNumber(content.pph21)}</td></tr>
          <tr class="total-row"><td>Total Potongan</td><td class="text-right">${this.formatNumber(content.totalDeductions)}</td></tr>
        </tbody>
      </table>

      <div class="net-income">Penghasilan Bersih: Rp ${this.formatNumber(content.netIncome)}</div>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const buffer = Buffer.from(pdfBuffer);
    if (password) {
      try {
        const encryptedBytes = await encryptPDF(buffer, password, password);
        return Buffer.from(encryptedBytes);
      } catch (err) {
        this.logger.error(`Error encrypting PDF: ${err.message}`);
        return buffer;
      }
    }

    return buffer;
  }

  private formatNumber(n: number): string {
    return new Intl.NumberFormat("id-ID").format(n);
  }
}
