const path = require("path");
const PDFDocument = require("pdfkit");

const LOGO_PATH = path.join(__dirname, "../../logo.png");

const handleCreateInvoice = async (invoice, path) => {
  const pdfBuffer = await new Promise((resolve) => {
    let doc = new PDFDocument({ size: "A4", margin: 50 });

    generateHeader(doc, invoice);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);

    doc.end();

    //Finalize document and convert to buffer array
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = new Uint8Array(Buffer.concat(buffers));
      resolve(pdfData);
    });
  });

  return pdfBuffer;
};

const generateHeader = (doc, invoice) => {
  doc
    .fontSize(17)
    .font("Helvetica-Bold")
    .text("Invoice", 50, 50)
    .fontSize(10)
    .font("Helvetica")
    .text("Status :", 50, 70)
    .text(invoice.status, 100, 70)
    .fontSize(10)
    .font("Helvetica")
    .text("VAT Number :", 50, 85)
    .text(invoice?.company_info?.vat_number, 120, 85)

    .image(LOGO_PATH, doc.page.width - 90, doc.y - 75, {
      width: 40,
    })
    // .fillColor('#4C4F54')
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(invoice?.company_info?.company, 200, 50, { align: "right" })
    .fontSize(10)
    .font("Helvetica")
    .text(invoice?.company_info?.address, 200, 65, { align: "right" })
    .text(invoice?.company_info?.phone, 200, 80, { align: "right" })
    .text(invoice?.company_info?.email, 200, 95, { align: "right" })
    .text(invoice?.company_info?.website, 200, 108, { align: "right" })
    .moveDown();
};

function generateCustomerInformation(doc, invoice) {
  // doc.fillColor('#444444').fontSize(20).text('Invoice', 50, 130);

  const customerInformationTop = 140;
  doc.font("Helvetica-Bold");

  generateTableRow(doc, customerInformationTop, "Date", "Invoice", "Method");
  const customerInformationTopDetail = customerInformationTop + 20;
  doc.font("Helvetica");
  doc.fontSize(10);
  generateTableRow(
    doc,
    customerInformationTopDetail,
    invoice?.date,
    "#" + invoice.invoice,
    invoice?.paymentMethod
  );

  doc

    .font("Helvetica-Bold")
    .text("Invoice To", 200, 140, { align: "right" })
    .font("Helvetica")
    .fontSize(10)
    .text(invoice.user_info.name, 200, 155, { align: "right" })
    .text(invoice.user_info.email, 200, 170, { align: "right" })
    .text(invoice?.user_info?.phone, 200, 200, { align: "right" })
    .text(invoice?.user_info?.address, 200, 185, { align: "right" });
}

function generateInvoiceTable(doc, invoice) {
  let i;
  const invoiceTableTop = 250;

  doc.font("Helvetica-Bold");

  generateTableRow(
    doc,
    invoiceTableTop,
    "Name",
    "",
    "Quantity",
    "Item Price",
    "Total Price"
  );
  generateHr(doc, invoiceTableTop + 18);
  doc.font("Helvetica");

  for (i = 0; i < invoice.cart.length; i++) {
    const item = invoice.cart[i];
    const position = invoiceTableTop + (i + 1) * 30;
    total = item.price * item.quantity;
    generateTableRow(
      doc,
      position,
      item.title.substring(0, 25),
      "",
      item.quantity,
      formatCurrency(invoice.company_info.currency, item.price),
      formatCurrency(invoice.company_info.currency, total)
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 31;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    subtotalPosition,
    "SubTotal",
    "VAT",
    "Shipping Cost",
    "Discount",
    "Total"
  );
  const paymentOptionPosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paymentOptionPosition,

    formatCurrency(invoice.company_info.currency, invoice.subTotal),
    formatCurrency(invoice.company_info.currency, invoice.vat),
    formatCurrency(invoice.company_info.currency, invoice.shippingCost),
    formatCurrency(invoice.company_info.currency, invoice.discount),
    formatCurrency(invoice.company_info.currency, invoice.total)
  );
}

function generateTableRow(
  doc,
  y,
  item,
  description,
  unitCost,
  quantity,
  lineTotal
) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(description, 150, y)
    .text(unitCost, 280, y, { width: 90, align: "right" })
    .text(quantity, 370, y, { width: 90, align: "right" })
    .text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatCurrency(curr, cents) {
  // console.log('formatCurrency', curr + '' + cents);
  return curr + "" + Number(cents).toFixed(2);
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}

module.exports = {
  handleCreateInvoice,
};
