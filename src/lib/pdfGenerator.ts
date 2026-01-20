import jsPDF from 'jspdf';

interface BillData {
  shopName: string;
  ownerName: string;
  area: string;
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
          canvas.width = 600;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 0.12; // More visible watermark
            
            // Draw single large watermark in center
            ctx.drawImage(img, 100, 100, 400, 400);
            
            try {
              // Add watermark centered in the page
              doc.addImage(
                canvas.toDataURL('image/png'),
                'PNG',
                35,
                100,
                140,
                140,
                undefined,
                'NONE'
              );
            } catch (error) {
              console.error('Error adding watermark:', error);
            }
          }
          
          try {
            // Add main logo centered at top
            doc.addImage(img, 'PNG', 80, 20, 50, 50, undefined, 'NONE');
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
      // Use the correct path to the logo in public directory
      const baseUrl = window.location.origin;
      img.src = `${baseUrl}/img/logobg.png`;
    } catch (error) {
      console.error('Error in addLogoWithWatermark:', error);
      resolve(); // Continue even if the entire process fails
    }
  });
};

export const generateBill = async (data: BillDataWithDate, filename?: string) => {
  const doc = new jsPDF();
  
  // Add elegant borders to the page
  doc.setDrawColor(80); // Dark gray for subtle border
  doc.setLineWidth(0.1);
  doc.rect(8, 8, 194, 281); // Outer border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 267); // Inner border
  
  // Add logo and watermark
  await addLogoWithWatermark(doc);
  
  // Add company name below logo
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0); // Black color for professional look
  doc.text('KUKEE BISCUITS', 105, 80, { align: 'center' });
  
  // Add invoice title and date
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Add separator line
  doc.setDrawColor(200); // Light gray
  doc.setLineWidth(0.1);
  doc.line(25, 90, 185, 90);
  
  // Contact information in header
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Contact:', 25, 98);
  doc.text('90238 77511 | 96874 48784', 70, 98);
  
  // Invoice details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', 25, 110);
  doc.setFont(undefined, 'normal');
  doc.text(`Date: ${currentDate}`, 185, 110, { align: 'right' });
  
  // Bill To section with clean design
  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.rect(25, 120, 160, 50);
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', 30, 130);
  doc.setFont(undefined, 'normal');
  
  if (data.isMultipleOrders) {
    doc.text('Multiple Orders Summary', 30, 140);
    doc.text(`Period: ${data.dateRange?.from} to ${data.dateRange?.to}`, 30, 150);
  } else {
    doc.text('Shop Name:', 30, 140);
    doc.text(data.shopName, 90, 140);
    doc.text('Owner Name:', 30, 150);
    doc.text(data.ownerName, 90, 150);
    doc.text('Address:', 30, 160);
    doc.text(data.area, 90, 160);
  }
  
  // Professional table header with improved design
  const tableStartX = 20;
  const tableWidth = 170;
  const col1Width = 70; // Item Description
  const col2Width = 25; // Quantity
  const col3Width = 35; // Unit Price
  const col4Width = 40; // Amount
  
  doc.setDrawColor(254, 183, 19); // Yellow color
  doc.setLineWidth(1);
  doc.setFillColor(254, 183, 19);
  doc.rect(tableStartX, 180, tableWidth, 12, 'F');
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  
  // Header text with proper spacing
  doc.text('Item Description', tableStartX + 3, 187);
  doc.text('Qty', tableStartX + col1Width + 5, 187);
  doc.text('Unit Price', tableStartX + col1Width + col2Width + 3, 187);
  doc.text('Amount', tableStartX + col1Width + col2Width + col3Width + 5, 187);
  
  // Table rows with alternating background
  let yPos = 195;
  const items = [
    { name: '35gm Packet', qty: data.quantity30gm, price: 4.20 },
    { name: '60gm Packet', qty: data.quantity60gm, price: 10 },
    { name: '500gm Packet', qty: data.quantity500gm, price: 90 },
    { name: '1kg Packet', qty: data.quantity1kg, price: 120 },
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
      doc.rect(20, 65, 170, 30, 'F');
      doc.setFontSize(12);
      doc.text('Bill To:', 25, 75);
      doc.setFont(undefined, 'normal');
      doc.text(`Shop Name: ${order.shopName}`, 25, 82);
      doc.text(`Owner Name: ${order.ownerName}`, 25, 89);
      doc.text(`Address: ${order.area}`, 25, 96);
      
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
        { name: '35gm Packet', qty: order.quantity30gm, price: 4.20 },
        { name: '60gm Packet', qty: order.quantity60gm, price: 10 },
        { name: '500gm Packet', qty: order.quantity500gm, price: 90 },
        { name: '1kg Packet', qty: order.quantity1kg, price: 120 },
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
          doc.text(item.price.toFixed(2), 125, yPos);
          doc.text((item.qty * item.price).toFixed(2), 165, yPos);
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
      doc.text(`${order.totalPrice.toFixed(2)} /-`, 165, yPos + 14, { align: 'right' });
      
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
    const tableStartX = 20;
    const tableWidth = 170;
    const col1Width = 70; // Item Description
    const col2Width = 25; // Quantity
    const col3Width = 35; // Unit Price
    const col4Width = 40; // Amount
    
    let yPos = 195;
    doc.setLineWidth(0.8);
    doc.setDrawColor(200, 200, 200);
    
    items.forEach((item, index) => {
      if (item.qty > 0) {
        const rowHeight = 12;
        
        // Alternating row background
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(tableStartX, yPos - 5, tableWidth, rowHeight, 'F');
        }
        
        // Draw row borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(tableStartX, yPos - 5, tableStartX + tableWidth, yPos - 5); // Top
        doc.line(tableStartX, yPos + 7, tableStartX + tableWidth, yPos + 7); // Bottom
        doc.line(tableStartX, yPos - 5, tableStartX, yPos + 7); // Left
        doc.line(tableStartX + tableWidth, yPos - 5, tableStartX + tableWidth, yPos + 7); // Right
        
        // Column dividers
        doc.line(tableStartX + col1Width, yPos - 5, tableStartX + col1Width, yPos + 7);
        doc.line(tableStartX + col1Width + col2Width, yPos - 5, tableStartX + col1Width + col2Width, yPos + 7);
        doc.line(tableStartX + col1Width + col2Width + col3Width, yPos - 5, tableStartX + col1Width + col2Width + col3Width, yPos + 7);
        
        // Cell text
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0);
        
        doc.text(item.name, tableStartX + 3, yPos + 2);
        doc.text(item.qty.toString(), tableStartX + col1Width + 10, yPos + 2);
        doc.text(item.price.toFixed(2), tableStartX + col1Width + col2Width + 8, yPos + 2);
        doc.text((item.qty * item.price).toFixed(2), tableStartX + col1Width + col2Width + col3Width + 10, yPos + 2);
        
        yPos += 12;
      }
    });

    // Professional total section with borders
    doc.setDrawColor(254, 183, 19);
    doc.setLineWidth(1);
    doc.setFillColor(254, 183, 19);
    
    // Total box
    doc.rect(tableStartX, yPos + 5, tableWidth, 12, 'F');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Total:', tableStartX + col1Width + col2Width + 10, yPos + 12);
    doc.text(data.totalPrice.toFixed(2), tableStartX + col1Width + col2Width + col3Width + 10, yPos + 12);

    // Professional footer with terms
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 25, 240);
    doc.setFontSize(8);
    doc.text('1. All prices are inclusive of GST', 30, 247);
    doc.text('2. Please verify the quantity at the time of delivery', 30, 254);
    
    // Final footer with thank you message
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your business!', 105, 270, { align: 'center' });
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
