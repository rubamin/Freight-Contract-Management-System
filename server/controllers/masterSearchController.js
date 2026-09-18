// controllers/masterSearchController.js
<<<<<<< HEAD
const { Vendor, VendorGST, DestinationMaster, CustomerMaster, sequelize } = require("../models");

const getInvoiceMasterSuggestions = async (req, res) => {
  try {
    // Active vendors only, so the AddInvoice "Vendor Name" dropdown never
    // offers a vendor that's been deactivated.
    const vendors = await Vendor.findAll({
      attributes: ['VendorID', 'VendorName'],
      where: { IsActive: true },
      order: [['VendorName', 'ASC']],
      raw: true
    });

    // IsDefault lets the frontend pick each vendor's active/default GST
    // number automatically when a vendor is selected.
    const vendorGsts = await VendorGST.findAll({
      attributes: ['VendorGSTID', 'GSTNumber', 'VendorID', 'IsDefault'],
      raw: true
    });

    // Customer names now come from the Customer Master (task item 6)
    // rather than being scraped from historical InvoiceHeader.CustomerName
    // values, so the dropdown reflects a real, reusable master list and
    // supports the "+ Add Customer" inline-create flow.
    const customerRecords = await CustomerMaster.findAll({
      attributes: ['CustomerID', 'CustomerName'],
      where: { IsActive: true },
      order: [['CustomerName', 'ASC']],
      raw: true
    });
    const customers = customerRecords.map((c) => c.CustomerName).filter(Boolean);

    // ToStation choices come from the DestinationMaster city list, not
    // historical invoice values, so the AddInvoice dropdown only ever
    // offers valid destination cities.
    const destinations = await DestinationMaster.findAll({
      attributes: ['City'],
      where: { IsActive: true },
      raw: true
    });
    const toStations = [...new Set(destinations.map(d => d.City).filter(Boolean))];
=======
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
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

    return res.status(200).json({
      success: true,
      data: {
<<<<<<< HEAD
        vendors: vendors || [],
        vendorGsts: vendorGsts || [],
        toStations: toStations || [],
        customers: customers || []
=======
        vendorGsts: vendorGsts || [],
        toStations: toStations || [],
        fromStations: fromStations || [],
        customers: customers || [] // Return unique customer names list
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      }
    });
  } catch (error) {
    console.error("Error fetching master suggestions:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

<<<<<<< HEAD
// Creates a new Customer Master record from the Add Invoice grid's inline
// "+ Add Customer" action, so a new customer never requires leaving the
// invoice form. Silently no-ops (still returns success) if the name
// already exists, since the frontend calls this on every new-looking
// customer name typed into the grid.
// Updated createCustomerFromInvoice in masterSearchController.js
// Updated createCustomerFromInvoice in masterSearchController.js
const createCustomerFromInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const customerName = (req.body?.customerName || "").trim();

    if (!customerName) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Customer name is required." });
    }

    let customer = await CustomerMaster.findOne({
      where: { CustomerName: customerName },
      transaction,
    });

    let created = false;
    if (!customer) {
      // Omit CreatedAt here; model/database default will apply GETDATE() automatically
      customer = await CustomerMaster.create(
        {
          CustomerName: customerName
        },
        { transaction }
      );
      created = true;
    }

    await transaction.commit();
    return res.status(created ? 201 : 200).json({
      success: true,
      created,
      data: customer,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback().catch(() => {});
    }
    console.error("Error creating customer from invoice form:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = { getInvoiceMasterSuggestions, createCustomerFromInvoice };
=======
module.exports = { getInvoiceMasterSuggestions };
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
