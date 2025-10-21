import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import QRCodeLib from "qrcode";
import { BUSINESS_INFO } from "@/lib/constants";

const QRCode = () => {
  const [amount, setAmount] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Import business information from constants
  const { NAME: businessName, BANK_DETAILS } = BUSINESS_INFO;

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      // Create UPI payment URL with bank account details
      const upiUrl = `upi://pay?pa=${BANK_DETAILS.ACCOUNT_NUMBER}@${BANK_DETAILS.IFSC_CODE}.ifsc.npci&pn=${businessName}&am=${amountNum}&cu=INR&mode=00&orgid=159036`;
      
      // Generate QR code
      const qrCode = await QRCodeLib.toDataURL(upiUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });
      
      setQrCodeData(qrCode);
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Payment QR Code Generator</h1>
            <p className="text-muted-foreground">Generate a QR code for a specific payment amount</p>
          </div>

          {/* QR Code Card */}
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-primary">Generate Payment QR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input Section */}
              <div className="max-w-sm mx-auto space-y-4">
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Enter Amount (₹)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount in rupees"
                      className="text-lg"
                    />
                    <Button 
                      onClick={generateQRCode} 
                      disabled={loading || !amount}
                      className="min-w-[120px]"
                    >
                      {loading ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-4">
                {qrCodeData ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <img
                      src={qrCodeData}
                      alt={`Payment QR Code for ₹${amount}`}
                      className="w-[400px] h-[400px] object-contain"
                    />
                    <p className="text-center mt-4 font-semibold text-lg text-primary">
                      Amount: ₹{parseFloat(amount).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                    <div className="w-[400px] h-[400px] flex items-center justify-center">
                      <img 
                        src="/img/Qr.jpg" 
                        alt="Default QR Code" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center text-sm text-muted-foreground max-w-md mx-auto">
                <p>Enter the desired amount and click Generate to create a payment-specific QR code.</p>
                <p className="mt-2">For best results, hold your phone's camera steady and center the QR code in view.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QRCode;