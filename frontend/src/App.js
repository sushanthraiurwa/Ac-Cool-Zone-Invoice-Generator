// client/src/App.js
import React, { useState } from 'react';
import './App.css';

function App() {
  const [customerName, setCustomerName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substr(0, 10));
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(1);

  // Helper: Converts number to words (basic version)
  const numberToWords = (num) => {
    if (num === 0) return "Zero";
  
    const belowTwenty = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", 
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", 
      "Seventeen", "Eighteen", "Nineteen"
    ];
    
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", 
      "Sixty", "Seventy", "Eighty", "Ninety"
    ];
    
    const thousands = ["", "Thousand", "Million", "Billion"]; // if you need bigger
  
    // Helper for sub-thousands
    const helper = (n) => {
      let str = "";
      if (n < 20) {
        str = belowTwenty[n];
      } else if (n < 100) {
        str = tens[Math.floor(n / 10)] + (n % 10 ? " " + belowTwenty[n % 10] : "");
      } else {
        str = 
          belowTwenty[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 ? " " + helper(n % 100) : "");
      }
      return str.trim();
    };
  
    let word = "";
    let i = 0;
  
    while (num > 0) {
      // For each group of 3 digits (e.g., 123,456,789 -> handle 789, then 456, then 123)
      if (num % 1000 !== 0) {
        word =
          helper(num % 1000) +
          (thousands[i] ? " " + thousands[i] : "") +
          (word ? " " + word : "");
      }
      num = Math.floor(num / 1000);
      i++;
    }
  
    return word;
  };
  

  // Calculate totals
  const total = items.reduce((acc, item) => acc + item.qty * item.rate, 0);
  const amountWords = numberToWords(Math.floor(total));

  // Add a new invoice row
  const addItem = () => {
    setItems([...items, { id: count, description: '', qty: 1, rate: 0 }]);
    setCount(count + 1);
  };

  // Handle change for an item
  const handleItemChange = (id, field, value) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: field === 'description' ? value : Number(value) } : item
      )
    );
  };

  // Download PDF by sending the data to the server
  const downloadPDF = async () => {
    const invoiceData = {
      customerName,
      date: invoiceDate,
      items,
      total,
      amountWords
    };

    try {
      const response = await fetch('http://localhost:5000/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      // Create a link and download the PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customerName || 'invoice'}_invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error:', error);
      alert('Error generating PDF.');
    }
  };

  return (
    <div className="App">
      <div className="container" id="invoice">
        <h1>AS COOL ZONE</h1>
        <h2>All Types of AC Works | Mobile: 6364045936</h2>
        <p className="address">Urwa Marigudi, Mangalore - 575006</p>

        <div className="inputs">
          <div>
            <label>Customer Name:</label>
            <input
              type="text"
              value={customerName}
              placeholder="Enter name"
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div>
            <label>Date:</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
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
          <tbody id="tableBody">
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>
                  <input
                    type="text"
                    value={item.description}
                    placeholder="Description"
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                  />
                </td>
                <td className="amount">
                  {(item.qty * item.rate).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan="4">Total</td>
              <td>{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <button className="btn add-btn" onClick={addItem}>
          + Add Item
        </button>

        <div className="footer">
          <p>
            <strong>Rupees in words:</strong> <span>{amountWords} Only</span>
          </p>
          <p>
            <strong>Signature:</strong> ____________________________
          </p>
        </div>
      </div>

      <button className="btn" onClick={downloadPDF}>
        Download as PDF
      </button>
    </div>
  );
}

export default App;
