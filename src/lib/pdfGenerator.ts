import jsPDF from 'jspdf';

interface BillData {
  shopName: string;
  ownerName: string;
  quantity30gm: number;
  quantity60gm: number;
  quantity500gm: number;
  quantity1kg: number;
  totalPrice: number;
  orderDate?: string;
}

interface BillDataWithDate extends BillData {
  orderDate?: string;
  isMultipleOrders?: boolean;
  ordersData?: BillData[];
  dateRange?: {
    from: string;
    to: string;
  };
}

const addLogoWithWatermark = (doc: jsPDF): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Enable cross-origin image loading
      img.onload = () => {
        try {
          // Create watermark
          const canvas = document.createElement('canvas');
          canvas.width = 500;
          canvas.height = 500;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 0.08; // Slightly lighter watermark
            
            // Draw watermark without rotation
            ctx.drawImage(img, 100, 100, 300, 300);
            
            try {
              // Add watermark first (in background) - centered on the page
              doc.addImage(
                canvas.toDataURL('image/png'),
                'PNG',
                20,
                80,
                170,
                170,
                undefined,
                'NONE'
              );
            } catch (error) {
              console.error('Error adding watermark:', error);
            }
          }
          
          try {
            // Add extra large main logo at top left
            doc.addImage(img, 'PNG', 8, 8, 53, 50, undefined, 'NONE');
          } catch (error) {
            console.error('Error adding logo:', error);
          }
          resolve();
        } catch (error) {
          console.error('Error creating canvas:', error);
          resolve(); // Continue even if watermark fails
        }
      };
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        resolve(); // Continue even if image loading fails
      };
      img.src = '/img/logobg.png';
    } catch (error) {
      console.error('Error in addLogoWithWatermark:', error);
      resolve(); // Continue even if the entire process fails
    }
  });
};

export const generateBill = async (data: BillDataWithDate, filename?: string) => {
  const doc = new jsPDF();
  
  // Add border to the page
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277); // Outer border
  doc.rect(12, 12, 186, 273); // Inner border
  
  // Add logo and watermark
  await addLogoWithWatermark(doc);
  
  // Header with date and contact information
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(currentDate, 190, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.text('  7567427225', 190, 27, { align: 'right' });
  doc.text('  9687448784', 190, 34, { align: 'right' });
  
  // Company name and title
  doc.setFontSize(32);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(254, 183, 19); // Yellow
  doc.text('KUKEE BISCUITS', 105, 35, { align: 'center' });
  
  // Invoice title
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text('INVOICE', 105, 55, { align: 'center' });
  
  // Shop details with styled box
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 65, 170, 25, 'F');
  doc.setFontSize(12);
  doc.text('Bill To:', 25, 75);
  doc.setFont(undefined, 'normal');
  
  if (data.isMultipleOrders) {
    doc.text(`Multiple Orders Summary`, 25, 82);
    doc.text(`Date Range: ${data.dateRange?.from} to ${data.dateRange?.to}`, 25, 89);
  } else {
    doc.text(`Shop Name: ${data.shopName}`, 25, 82);
    doc.text(`Owner Name: ${data.ownerName}`, 25, 89);
  }
  
  // Table header with gradient-like effect
  doc.setFillColor(254, 183, 19);
  doc.rect(20, 100, 170, 12, 'F');
  doc.setTextColor(0);
  doc.setFont(undefined, 'bold');
  doc.text('Item', 25, 108);
  doc.text('Quantity', 80, 108);
  doc.text('Price/Unit', 120, 108);
  doc.text('Total', 165, 108);
  
  // Table rows with alternating background
  let yPos = 120;
  const items = [
    { name: '30gm Packet', qty: data.quantity30gm, price: 5 },
    { name: '60gm Packet', qty: data.quantity60gm, price: 10 },
    { name: '500gm Packet', qty: data.quantity500gm, price: 90 },
    { name: '1kg Packet', qty: data.quantity1kg, price: 180 },
  ];
  
  if (data.isMultipleOrders && data.ordersData) {
    // Create a new page for each order
    data.ordersData.forEach((order, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Reset yPos for new page
      yPos = 120;

      // Add border to each page
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277); // Outer border
      doc.rect(12, 12, 186, 273); // Inner border
      
      // Header with date
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(order.orderDate || currentDate, 190, 20, { align: 'right' });
      
      // Contact information
      doc.setFontSize(10);
      doc.text('Harsh : 7567427225', 190, 27, { align: 'right' });
      doc.text('Montu : 9687448784', 190, 34, { align: 'right' });
      
      // Company name
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(254, 183, 19); // Yellow
      doc.text('KUKEE BISCUITS', 105, 35, { align: 'center' });
      
      // Invoice title
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0);
      doc.text('INVOICE', 105, 55, { align: 'center' });
      
      // Shop details box
      doc.setFillColor(245, 245, 245);
      doc.rect(20, 65, 170, 25, 'F');
      doc.setFontSize(12);
      doc.text('Bill To:', 25, 75);
      doc.setFont(undefined, 'normal');
      doc.text(`Shop Name: ${order.shopName}`, 25, 82);
      doc.text(`Owner Name: ${order.ownerName}`, 25, 89);
      
      // Table header
      doc.setFillColor(254, 183, 19);
      doc.rect(20, 100, 170, 12, 'F');
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text('Item', 25, 108);
      doc.text('Quantity', 80, 108);
      doc.text('Price/Unit', 120, 108);
      doc.text('Total', 165, 108);
      
      // Table rows
      yPos = 120;
      const items = [
        { name: '30gm Packet', qty: order.quantity30gm, price: 5 },
        { name: '60gm Packet', qty: order.quantity60gm, price: 10 },
        { name: '500gm Packet', qty: order.quantity500gm, price: 90 },
        { name: '1kg Packet', qty: order.quantity1kg, price: 180 },
      ];
      
      items.forEach((item, idx) => {
        if (item.qty > 0) {
          if (idx % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(20, yPos - 5, 170, 10, 'F');
          }
          doc.setFont(undefined, 'normal');
          doc.text(item.name, 25, yPos);
          doc.text(item.qty.toString(), 85, yPos);
          doc.text('₹' + Math.floor(item.price).toString(), 125, yPos);
          doc.text('₹' + Math.floor(item.qty * item.price).toString(), 165, yPos);
          yPos += 12;
        }
      });
      
      // Total section
      // Total section with underline
      doc.setFillColor(255, 255, 255);  // White background
      doc.setTextColor(0);  // Black text
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Total : ', 120, yPos + 14);
      // Draw an underline instead of using text
      doc.line(140, yPos + 15, 180, yPos + 15);
      doc.text(`₹${Math.floor(order.totalPrice)}`, 165, yPos + 14, { align: 'right' });
      
      // Footer
      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('Thank you for your business!', 105, 270, { align: 'center' });
      
      // Add subtle line above footer
      doc.setLineWidth(0.2);
      doc.line(20, 260, 190, 260);
    });

    // Calculate totals
    const totalQuantities = {
      '30gm': 0,
      '60gm': 0,
      '500gm': 0,
      '1kg': 0
    };
    
    data.ordersData.forEach(order => {
      totalQuantities['30gm'] += order.quantity30gm;
      totalQuantities['60gm'] += order.quantity60gm;
      totalQuantities['500gm'] += order.quantity500gm;
      totalQuantities['1kg'] += order.quantity1kg;
    });
  } else {
    items.forEach((item, index) => {
      if (item.qty > 0) {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos - 5, 170, 10, 'F');
        }
        doc.setFont(undefined, 'normal');
        doc.text(item.name, 25, yPos);
        doc.text(item.qty.toString(), 85, yPos);
        doc.text(`₹${Math.floor(item.price)}`, 125, yPos);
        doc.text(`₹${Math.floor(item.qty * item.price)}`, 165, yPos);
        yPos += 12;
      }
    });

    // Total section for single order with underline
      doc.setFillColor(255, 255, 255);  // White background
      doc.setTextColor(0);  // Black text
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Total:', 120, yPos + 14);
      // Draw an underline instead of using text
      doc.line(140, yPos + 15, 180, yPos + 15);
      doc.text('₹' + Math.floor(data.totalPrice), 165, yPos + 14, { align: 'right' });    // Footer for single order
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your business!', 105, 270, { align: 'center' });
    
    // Add subtle line above footer
    doc.setLineWidth(0.2);
    doc.line(20, 260, 190, 260);
  }
  
  // Add subtle line above footer
  doc.setLineWidth(0.2);
  doc.line(20, 260, 190, 260);
  
  try {
    // Save the PDF with error handling
    const pdfFilename = filename || `KUKEE-Bill-${data.shopName}-${Date.now()}.pdf`;
    doc.save(pdfFilename);
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
