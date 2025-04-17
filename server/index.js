// index.js
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'https://ac-cool-zone-invoice-generator.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());
app.use(bodyParser.json());

// Generate invoice HTML
function generateHTML(invoiceData) {
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
              <td>${item.description}</td>
              <td>${item.qty}</td>
              <td>${item.rate}</td>
              <td>${(item.qty * item.rate).toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4">Total</td>
            <td>${invoiceData.total.toFixed(2)}</td>
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
    const html = generateHTML(invoiceData);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      executablePath: puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'Letter', printBackground: true });
    await browser.close();

    res.contentType("application/pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
});

module.exports = app;