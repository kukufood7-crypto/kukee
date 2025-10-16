import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { apiPath } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Phone, User, Truck } from "lucide-react";

interface Order {
  id: string;
  shop_name: string;
  quantity_30gm: number;
  quantity_60gm: number;
  quantity_500gm: number;
  quantity_1kg: number;
  total_price: number;
  order_date: string;
  status: string;
  payment_method: 'CASH' | 'UPI';
}

interface Shop {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_number: string;
  owner_name: string;
  area: string;
  delivery_boy: string;
  last_visit_date: string;
}

const ShopDetails = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShopAndOrders();
  }, [shopId]);

  const fetchShopAndOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, get all shops to find the correct shop
      const shopsRes = await fetch(apiPath('/api/shops'));
      if (!shopsRes.ok) {
        throw new Error('Failed to fetch shops');
      }
      const allShops = await shopsRes.json();
      
      // Find the shop with matching ID
      const shopData = allShops.find((s: any) => 
        (s._id === shopId) || (s.id === shopId)
      );
      
      if (!shopData) {
        throw new Error('Shop not found');
      }
      setShop(shopData);

      // Fetch all orders
      const ordersRes = await fetch(apiPath('/api/orders'));
      const allOrders = await ordersRes.json();
      if (!ordersRes.ok) {
        throw new Error('Failed to fetch orders');
      }

      // Filter orders for this shop and calculate total
      const shopOrders = allOrders.filter((order: Order) => 
        order.shop_name.toLowerCase() === shopData.shop_name.toLowerCase()
      );
      setOrders(shopOrders);

      // Calculate total amount
      const total = shopOrders.reduce((sum: number, order: Order) => sum + order.total_price, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-10 w-32 bg-primary/10 rounded animate-pulse"></div>
            <div className="h-48 bg-primary/5 rounded animate-pulse"></div>
            <div className="h-96 bg-primary/5 rounded animate-pulse"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error || !shop) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/dashboard/shop-history')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Shop History
          </Button>
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="text-2xl font-semibold text-destructive">
                  {!shop ? 'Shop Not Found' : 'Error Loading Shop Details'}
                </div>
                <p className="text-muted-foreground">
                  {error || 'The requested shop could not be found'}
                </p>
                <Button onClick={fetchShopAndOrders} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Button 
          variant="ghost" 
          className="mb-4 group"
          onClick={() => navigate('/dashboard/shop-history')}
        >
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Shop History
        </Button>

        {/* Shop Information */}
        <Card className="mb-8 border-primary/20 overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-primary/5 to-background border-b border-primary/10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="space-y-2">
                <CardTitle className="text-3xl md:text-4xl font-bold text-primary animate-in zoom-in duration-500">
                  {shop.shop_name}
                </CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary animate-bounce" />
                  <span className="text-lg">{shop.area}</span>
                </div>
              </div>
              <div className="text-center md:text-right p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="text-sm text-primary font-medium mb-1">Total Revenue</div>
                <div className="text-3xl font-bold text-primary animate-in zoom-in duration-700">
                  ₹{totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Owner</div>
                    <div className="text-lg font-semibold">{shop.owner_name}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                  <Phone className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Contact</div>
                    <div className="text-lg font-semibold">{shop.shop_number}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                  <Truck className="h-8 w-8 text-primary" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Delivery</div>
                    <div className="text-lg font-semibold">{shop.delivery_boy}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">Address</div>
              <div className="text-lg">{shop.shop_address}</div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="border-primary/20">
          <CardHeader className="border-b border-primary/10 bg-gradient-to-br from-primary/5 to-background">
            <CardTitle className="text-2xl font-bold text-primary">Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No orders found for this shop
                </div>
              ) : (
                <div className="grid gap-6">
                  {orders.map((order, index) => (
                    <Card 
                      key={order.id} 
                      className="border-primary/10 overflow-hidden transition-all hover:shadow-lg hover:border-primary/30"
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      <CardContent className="p-6 bg-gradient-to-br from-background to-primary/5">
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">Order Date</p>
                            <p className="text-lg font-semibold">{format(new Date(order.order_date), 'PPP')}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">Status</p>
                            <p className="text-lg font-semibold capitalize">{order.status}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">Amount</p>
                            <p className="text-2xl font-bold text-primary">₹{order.total_price.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">Payment Method</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.payment_method === 'CASH'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {order.payment_method}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-primary">Order Details</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: '30gm', value: order.quantity_30gm },
                              { label: '60gm', value: order.quantity_60gm },
                              { label: '500gm', value: order.quantity_500gm },
                              { label: '1kg', value: order.quantity_1kg }
                            ]
                            .filter(item => (item.value || 0) > 0) // Only show items with quantity > 0
                            .map(item => (
                              <div 
                                key={item.label}
                                className="bg-background rounded-lg p-3 border border-primary/10 transition-all hover:scale-105"
                              >
                                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                                <p className="text-xl font-bold text-primary">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ShopDetails;