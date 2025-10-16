import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { generateBill } from "@/lib/pdfGenerator";
import { CheckCircle, Clock } from "lucide-react";

interface Shop {
  id: string;
  shop_name: string;
  area: string;
  owner_name: string;
  shop_number: string;
}

interface PacketSize {
  id: string;
  name: string;
  price: number;
  weight: number;
}

interface Order {
  id: string;
  shop_name: string;
  area: string;
  owner_name: string;
  shop_number: string;
  quantity_30gm: number;
  quantity_60gm: number;
  quantity_500gm: number;
  quantity_1kg: number;
  total_price: number;
  status: string;
  order_date: string;
}

const Orders = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const packetSizes: PacketSize[] = [
    { id: '30gm', name: '30gm', price: 5, weight: 0.03 },
    { id: '60gm', name: '60gm', price: 10, weight: 0.06 },
    { id: '500gm', name: '500gm', price: 90, weight: 0.5 },
    { id: '1kg', name: '1kg', price: 180, weight: 1 },
  ];

  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchShops();
    fetchOrders();
  }, []);

  const fetchShops = async () => {
    const res = await fetch(apiPath('/api/shops'));
    if (!res.ok) return;
    const data = await res.json();
    setShops(data.map((s: any) => ({ ...s, id: s._id ? s._id : s.id })));
  };

  const fetchOrders = async () => {
    const res = await fetch(apiPath('/api/orders'));
    if (!res.ok) return;
    const data = await res.json();
    const normalized = data.map((o: any) => ({ ...o, id: o._id ? o._id : o.id }));
    setOrders(normalized);
  };

  const calculateTotal = () => {
    return packetSizes.reduce((total, size) => {
      const quantity = quantities[size.id] || 0;
      return total + (quantity * size.price);
    }, 0);
  };

  const checkAndUpdateStock = async () => {
    // Get current full packet stock
    const packetResponse = await fetch(apiPath('/api/finish-god/current'));
    if (!packetResponse.ok) throw new Error('Failed to fetch current packet stock');
    const balanceData = await packetResponse.json();

    // Get current stock for different sizes
    const currentStock = {
      '30gm': balanceData.balances?.['30gm'] || 0,
      '60gm': balanceData.balances?.['60gm'] || 0,
      '500gm': balanceData.balances?.['500gm'] || 0,
      '1kg': balanceData.balances?.['1kg'] || 0
    };

    // Check if we have enough stock for each size
    for (const [sizeId, quantity] of Object.entries(quantities)) {
      if (quantity > 0) {
        const available = currentStock[sizeId as keyof typeof currentStock] || 0;
        if (quantity > available) {
          throw new Error(`Not enough ${sizeId} packets. Available: ${available}, Required: ${quantity}`);
        }
      }
    }

    // Update stock for each size that has a quantity in the order
    for (const [sizeId, quantity] of Object.entries(quantities)) {
      if (quantity > 0) {
        // Remove stock from finish-god
        const response = await fetch(apiPath('/api/finish-god/remove'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: quantity,
            date: new Date().toISOString(),
            size: sizeId
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update stock for ${sizeId}`);
        }
      }
    }

    return { success: true };
  };

  // Calculate total biscuit weight needed for an order
  const calculateTotalBiscuitWeight = () => {
    let totalGrams = 0;
    for (const [sizeId, quantity] of Object.entries(quantities)) {
      if (quantity > 0) {
        const packetSize = packetSizes.find(size => size.id === sizeId);
        if (packetSize) {
          totalGrams += packetSize.weight * 1000 * quantity; // Convert kg to grams
        }
      }
    }
    return totalGrams / 1000; // Convert back to kg
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) {
      toast.error("Please select a shop");
      return;
    }

    const hasSelectedItems = Array.from(selectedSizes).some(sizeId => (quantities[sizeId] || 0) > 0);
    if (!hasSelectedItems) {
      toast.error("Please add at least one item to the order");
      return;
    }

    try {
      const orderData = {
        shop_id: selectedShop.id,
        shop_name: selectedShop.shop_name,
        area: selectedShop.area,
        owner_name: selectedShop.owner_name,
        shop_number: selectedShop.shop_number,
        quantity_30gm: quantities['30gm'] || 0,
        quantity_60gm: quantities['60gm'] || 0,
        quantity_500gm: quantities['500gm'] || 0,
        quantity_1kg: quantities['1kg'] || 0,
        total_price: calculateTotal()
      };

      const res = await fetch(apiPath('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error('Failed to create order');

      toast.success("Order created successfully!");
      setSelectedSizes(new Set());
      setQuantities({});
      setSelectedShop(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
      console.error('Order creation error:', error);
    }
  };

  const handleAccept = async (order: Order) => {
    try {
      const res = await fetch(apiPath(`/api/orders/${order.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });

      if (!res.ok) throw new Error('Failed to update order');

      generateBill({
        shopName: order.shop_name,
        ownerName: order.owner_name,
        quantity30gm: order.quantity_30gm,
        quantity60gm: order.quantity_60gm,
        quantity500gm: order.quantity_500gm,
        quantity1kg: order.quantity_1kg,
        totalPrice: order.total_price,
      });

      // Update stock
      const stockUpdate = [
        { size: '30gm', qty: order.quantity_30gm, weight: 0.03 },
        { size: '60gm', qty: order.quantity_60gm, weight: 0.06 },
        { size: '500gm', qty: order.quantity_500gm, weight: 0.5 },
        { size: '1kg', qty: order.quantity_1kg, weight: 1 },
      ];

      for (const item of stockUpdate) {
        if (item.qty > 0) {
          const stockRes = await fetch(apiPath('/api/stock'));
          const stockData = await stockRes.json();
          const stockItem = stockData.find((s: any) => s.packet_size === item.size);

          if (stockItem) {
            await fetch(apiPath(`/api/stock/${stockItem._id || stockItem.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                packets_sold: (stockItem.packets_sold || 0) + item.qty,
                total_stock_kg: (stockItem.total_stock_kg || 0) - (item.qty * item.weight),
              }),
            });
          }
        }
      }

      toast.success("Order accepted and bill generated!");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept order");
    }
  };

  const handlePending = async (orderId: string) => {
    try {
      const tomorrow = new Date();

      const res = await fetch(apiPath(`/api/orders/${orderId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', order_date: tomorrow.toISOString() }),
      });

      if (!res.ok) throw new Error('Failed to update order');

      toast.success("Order moved to next day!");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Create Order</CardTitle>
            <CardDescription>Place a new order for a shop</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Select Shop *</Label>
                <Select
                  value={selectedShop?.id || ""}
                  onValueChange={(value) => {
                    const shop = shops.find((s) => s.id === value);
                    setSelectedShop(shop || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.shop_name} - {shop.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedShop && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{selectedShop.owner_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{selectedShop.shop_number}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Packet Size Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {packetSizes.map((size) => (
                    <div
                      key={size.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedSizes.has(size.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const newSizes = new Set(selectedSizes);
                        if (newSizes.has(size.id)) {
                          newSizes.delete(size.id);
                          const newQuantities = { ...quantities };
                          delete newQuantities[size.id];
                          setQuantities(newQuantities);
                        } else {
                          newSizes.add(size.id);
                        }
                        setSelectedSizes(newSizes);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedSizes.has(size.id)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {selectedSizes.has(size.id) && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3 h-3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{size.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">₹{size.price} each</div>
                    </div>
                  ))}
                </div>

                {/* Quantity Inputs for Selected Sizes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from(selectedSizes).map((sizeId) => {
                    const size = packetSizes.find(s => s.id === sizeId)!;
                    return (
                      <div key={size.id} className="space-y-2">
                        <Label>{size.name} Quantity</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const currentQty = quantities[size.id] || 0;
                              if (!currentQty) {
                                return;
                              }
                              if (currentQty === 1) {
                                const newQuantities = { ...quantities };
                                delete newQuantities[size.id];
                                setQuantities(newQuantities);
                              } else {
                                setQuantities({
                                  ...quantities,
                                  [size.id]: currentQty - 1
                                });
                              }
                            }}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[size.id] === undefined ? '' : quantities[size.id]}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 
                                undefined : 
                                parseInt(e.target.value);
                              if (value === undefined) {
                                const newQuantities = { ...quantities };
                                delete newQuantities[size.id];
                                setQuantities(newQuantities);
                              } else {
                                setQuantities({
                                  ...quantities,
                                  [size.id]: value < 0 ? 0 : value
                                });
                              }
                            }}
                            className="text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const currentQty = quantities[size.id] || 0;
                              setQuantities({
                                ...quantities,
                                [size.id]: currentQty + 1
                              });
                            }}
                          >
                            +
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: ₹{(quantities[size.id] || 0) * size.price}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-bold text-primary">Total: ₹{calculateTotal()}</p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Create Order
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
export default Orders;
