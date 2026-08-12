// controllers/masterSearchController.js
const { VendorGST, InvoiceHeader } = require("../models");

const getInvoiceMasterSuggestions = async (req, res) => {
  try {
    const vendorGsts = await VendorGST.findAll({
      attributes: ['VendorGSTID', 'GSTNumber', 'VendorID'],
      raw: true
    });

    // Added CustomerName to attributes list
    const invoiceHeaders = await InvoiceHeader.findAll({
      attributes: ['ToStation', 'FromStation', 'CustomerName'],
      raw: true
    });

    const toStations = [...new Set(invoiceHeaders.map(i => i.ToStation).filter(Boolean))];
    const fromStations = [...new Set(invoiceHeaders.map(i => i.FromStation).filter(Boolean))];
    
    // Extract unique customer names safely
    const customers = [...new Set(invoiceHeaders.map(i => i.CustomerName).filter(Boolean))];

    return res.status(200).json({
      success: true,
      data: {
        vendorGsts: vendorGsts || [],
        toStations: toStations || [],
        fromStations: fromStations || [],
        customers: customers || [] // Return unique customer names list
      }
    });
  } catch (error) {
    console.error("Error fetching master suggestions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInvoiceMasterSuggestions };