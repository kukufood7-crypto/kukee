import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/api";
// Using REST API instead of Supabase
import { toast } from "sonner";
import { Package, TrendingDown } from "lucide-react";

interface StockItem {
  id: string;
  packet_size: string;
  price: number;
  total_stock_kg: number;
  packets_sold: number;
}

const Stock = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [newStock, setNewStock] = useState("");

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const res = await fetch(apiPath('/api/stock'));
    if (!res.ok) return;
    const data = await res.json();
    setStock(data.map((s: any) => ({ ...s, id: s._id ? s._id : s.id })));
  };

  const handleAddStock = async () => {
    const stockKg = parseFloat(newStock);
    if (!stockKg || stockKg <= 0) {
      toast.error("Please enter a valid stock amount");
      return;
    }

    try {
      for (const item of stock) {
        await fetch(apiPath(`/api/stock/${item.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total_stock_kg: item.total_stock_kg + stockKg }),
        });
      }

      toast.success(`Added ${stockKg}kg to all stock items`);
      setNewStock("");
      fetchStock();
    } catch (error: any) {
      toast.error(error.message || "Failed to update stock");
    }
  };

  const getPacketWeight = (size: string) => {
    switch (size) {
      case "30gm": return 0.03;
      case "60gm": return 0.06;
      case "500gm": return 0.5;
      case "1kg": return 1;
      default: return 0;
    }
  };

  const calculateRemainingPackets = (item: StockItem) => {
    const weight = getPacketWeight(item.packet_size);
    return Math.floor(item.total_stock_kg / weight);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Stock Management</CardTitle>
            <CardDescription>Track and manage your biscuit inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newStock">Add Stock (in kg)</Label>
              <div className="flex gap-2">
                <Input
                  id="newStock"
                  type="number"
                  step="0.1"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Enter amount in kg"
                />
                <Button onClick={handleAddStock}>Add Stock</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stock.map((item) => (
            <Card key={item.id} className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{item.packet_size}</span>
                  <Package className="h-5 w-5 text-primary" />
                </CardTitle>
                <CardDescription>₹{item.price} per packet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-bold text-primary">{item.total_stock_kg.toFixed(2)} kg</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Available Packets</p>
                  <p className="text-lg font-semibold">{calculateRemainingPackets(item)}</p>
                </div>
                <div className="pt-3 border-t flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">Sold:</span>
                  <span className="font-medium">{item.packets_sold}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Stock;
