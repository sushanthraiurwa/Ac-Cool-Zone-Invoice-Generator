const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();

// Middleware Configuration
app.use(cors({
  origin: 'https://ac-cool-zone-invoice-generator.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', chromium: process.env.CHROMIUM_PATH || 'puppeteer' });
});

// Generate invoice HTML
function generateHTML(invoiceData) {
  if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
    throw new Error('Invalid invoice data structure');
  }

  // Calculate total if not provided
  const calculatedTotal = invoiceData.total || invoiceData.items.reduce((sum, item) => {
    return sum + (item.qty || 0) * (item.rate || 0);
  }, 0);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AS COOL ZONE Invoice</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f9f9f9;
        padding: 20px;
        margin: 0;
      }
      .container {
        max-width: 900px;
        margin: auto;
        background: #fff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      h1, h2 {
        text-align: center;
        margin: 0;
      }
      .address {
        text-align: center;
        color: #555;
        margin-bottom: 20px;
      }
      .inputs {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .inputs div {
        flex: 1;
        margin: 5px;
        min-width: 250px;
      }
      .inputs label {
        font-weight: bold;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: center;
      }
      .total-row {
        font-weight: bold;
      }
      .footer {
        margin-top: 30px;
      }
      @media print {
        body {
          padding: 0;
          background: white;
        }
        .container {
          box-shadow: none;
          padding: 10px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container" id="invoice">
      <h1>AS COOL ZONE</h1>
      <h2>All Types of AC Works | Mobile: 6364045936</h2>
      <p class="address">Urwa Marigudi, Mangalore - 575006</p>

      <div class="inputs">
        <div>
          <label>Customer Name:</label> ${invoiceData.customerName || ''}
        </div>
        <div>
          <label>Date:</label> ${invoiceData.date || new Date().toLocaleDateString()}
        </div>
      </div>

      <table id="invoiceTable">
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description || ''}</td>
              <td>${item.qty || 0}</td>
              <td>₹${(item.rate || 0).toFixed(2)}</td>
              <td>₹${((item.qty || 0) * (item.rate || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4">Total</td>
            <td>₹${calculatedTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <p><strong>Rupees in words:</strong> ${invoiceData.amountWords || numberToWords(calculatedTotal)} Only</p>
        <p><strong>Signature:</strong> ____________________________</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Helper function to convert numbers to words
function numberToWords(num) {
  // Simple implementation - replace with a full library if needed
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  return 'Rupees'; // Basic implementation - extend as needed
}

// PDF Generation Endpoint
app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const invoiceData = req.body;
    
    if (!invoiceData?.items || !Array.isArray(invoiceData.items)) {
      return res.status(400).json({ error: 'Invalid invoice data format' });
    }

    const html = generateHTML(invoiceData);

    // Use @sparticuz/chromium-min for Render.com
    let launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      timeout: 30000
    };

    if (process.env.RENDER) {
      // Use Chromium-min package for Render
      const chromium = require('@sparticuz/chromium-min');
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        defaultViewport: chromium.defaultViewport
      };
    }

    console.log('Launching browser with options:', launchOptions);
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="invoice.pdf"'
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ 
      error: 'PDF generation failed',
      message: error.message,
      platform: process.platform,
      render: !!process.env.RENDER
    });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

module.exports = app;