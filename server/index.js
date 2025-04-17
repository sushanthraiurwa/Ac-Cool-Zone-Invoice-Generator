const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');

// Error handling at process level
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://ac-cool-zone-invoice-generator.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Generate invoice HTML
function generateHTML(invoiceData) {
  if (!invoiceData || !invoiceData.items) {
    throw new Error('Invalid invoice data');
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
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
          <label>Date:</label> ${invoiceData.date || ''}
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
          ${invoiceData.items
            .map(
              (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description || ''}</td>
              <td>${item.qty || 0}</td>
              <td>${item.rate || 0}</td>
              <td>${((item.qty || 0) * (item.rate || 0)).toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4">Total</td>
            <td>${invoiceData.total?.toFixed(2) || '0.00'}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <p><strong>Rupees in words:</strong> ${invoiceData.amountWords || ''} Only</p>
        <p><strong>Signature:</strong> ____________________________</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Endpoint to generate PDF
app.post('/generate-pdf', async (req, res) => {
  try {
    const invoiceData = req.body;
    
    if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      return res.status(400).json({ error: 'Invalid invoice data format' });
    }

    const html = generateHTML(invoiceData);

    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });
    
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=invoice.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Error generating PDF', details: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;