import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, ArrowLeft, Package, Calendar, IndianRupee, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";

interface Shop {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_number: string;
  owner_name: string;
  area: string;
}

interface Order {
  _id: string;
  shop_id: string;
  order_date: string;
  status: string;
  quantity_30gm?: number;
  quantity_60gm?: number;
  quantity_500gm?: number;
  quantity_1kg?: number;
  total_amount?: number;
  amount?: number; // Some orders might use 'amount' instead of 'total_amount'
  payment_method?: string; // Payment method for completed orders (CASH/UPI)
}

const ShopOrderHistory = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchShopAndOrders();
    }
  }, [shopId]);

  const fetchShopAndOrders = async () => {
    try {
      setLoading(true);
      let currentShop;

      // Try to get shop from navigation state first
      if (location.state?.shop) {
        currentShop = location.state.shop;
      } else {
        // Fetch shop details if not in navigation state
        const shopRes = await fetch(apiPath('/api/shops'));
        if (!shopRes.ok) throw new Error('Failed to fetch shop details');
        const shopsData = await shopRes.json();
        currentShop = shopsData.find((s: any) => (s._id || s.id) === shopId);
      }

      if (!currentShop) throw new Error('Shop not found');
      setShop(currentShop);

      // Fetch orders
      const ordersRes = await fetch(apiPath('/api/orders'));
      if (!ordersRes.ok) throw new Error('Failed to fetch orders');
      const ordersData = await ordersRes.json();

      // Fetch completed orders to get payment methods
      const completedOrdersRes = await fetch(apiPath('/api/completed-orders'));
      if (!completedOrdersRes.ok) throw new Error('Failed to fetch completed orders');
      const completedOrdersData = await completedOrdersRes.json();

      // Create a map of completed orders with their payment methods
      const completedOrdersMap = new Map(
        completedOrdersData.map((order: any) => [order._id || order.id, order.payment_method])
      );
      
      // Filter and format orders
      const shopOrders = ordersData
        .filter((order: any) => 
          order.shop_id === shopId || 
          order.shop_id === currentShop._id || 
          order.shop_id === currentShop.id)
        .map((order: any) => {
          const formattedOrder = {
            ...order,
            _id: order._id || order.id,
            quantity_30gm: Number(order.quantity_30gm) || 0,
            quantity_60gm: Number(order.quantity_60gm) || 0,
            quantity_500gm: Number(order.quantity_500gm) || 0,
            quantity_1kg: Number(order.quantity_1kg) || 0,
            status: order.status || 'pending',
            payment_method: order.status === 'completed' ? completedOrdersMap.get(order._id || order.id) : undefined
          };
          
          // Calculate the total amount based on quantities and prices
          formattedOrder.total_amount = calculateOrderAmount(formattedOrder);
          
          return formattedOrder;
        });
      if (shopOrders.length === 0) {
        toast.info("No orders found for this shop", {
          description: "This shop hasn't placed any orders yet."
        });
      } else {
        setOrders(shopOrders.sort((a: Order, b: Order) => 
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch shop details and orders', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
      if (error instanceof Error && error.message === 'Shop not found') {
        navigate('/order-history');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Product prices
  const PRICES = {
    PER_KG: 180,
    PACK_30GM: 4,
    PACK_60GM: 10,
    PACK_500GM: 90,
  };

  const calculateTotalWeight = (order: Order) => {
    const weight = (
      ((order.quantity_30gm || 0) * 0.03) +
      ((order.quantity_60gm || 0) * 0.06) +
      ((order.quantity_500gm || 0) * 0.5) +
      ((order.quantity_1kg || 0) * 1)
    );
    return weight.toFixed(2);
  };

  const calculateOrderAmount = (order: Order) => {
    const amount = (
      ((order.quantity_30gm || 0) * PRICES.PACK_30GM) +
      ((order.quantity_60gm || 0) * PRICES.PACK_60GM) +
      ((order.quantity_500gm || 0) * PRICES.PACK_500GM) +
      ((order.quantity_1kg || 0) * PRICES.PER_KG)
    );
    return amount;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!shop) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-destructive">Shop not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/order-history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shops
          </Button>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Store className="h-6 w-6" />
            {shop.shop_name} - Order History
          </h1>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Owner:</span> {shop.owner_name}
            </div>
            <div>
              <span className="font-medium">Contact:</span> {shop.shop_number}
            </div>
            <div>
              <span className="font-medium">Area:</span> {shop.area}
            </div>
            <div>
              <span className="font-medium">Address:</span> {shop.shop_address}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Order History</CardTitle>
                <CardDescription>All past orders from this shop</CardDescription>
              </div>
              <div className="text-xl font-semibold text-primary">
                Total Orders: {orders.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No orders found for this shop
                </div>
              ) : (
                orders.map((order) => (
                  <Card key={order._id} className="border-primary/10">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-primary mt-1" />
                          <div>
                            <div className="font-medium">Order Date</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(order.order_date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Package className="h-4 w-4 text-primary mt-1" />
                          <div>
                            <div className="font-medium">Quantities</div>
                            <div className="text-sm text-muted-foreground">
                              {(order.quantity_30gm || 0) > 0 && `${order.quantity_30gm} x 30g `}
                              {(order.quantity_60gm || 0) > 0 && `${order.quantity_60gm} x 60g `}
                              {(order.quantity_500gm || 0) > 0 && `${order.quantity_500gm} x 500g `}
                              {(order.quantity_1kg || 0) > 0 && `${order.quantity_1kg} x 1kg `}
                              {!order.quantity_30gm && !order.quantity_60gm && 
                               !order.quantity_500gm && !order.quantity_1kg && 'No quantities specified'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total: {calculateTotalWeight(order)} KG
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <IndianRupee className="h-4 w-4 text-primary mt-1" />
                          <div>
                            <div className="font-medium">Order Details</div>
                            <div className="text-sm space-y-1">
                              {order.quantity_30gm > 0 && (
                                <div>30g × {order.quantity_30gm} = ₹{(order.quantity_30gm * PRICES.PACK_30GM).toFixed(2)}</div>
                              )}
                              {order.quantity_60gm > 0 && (
                                <div>60g × {order.quantity_60gm} = ₹{(order.quantity_60gm * PRICES.PACK_60GM).toFixed(2)}</div>
                              )}
                              {order.quantity_500gm > 0 && (
                                <div>500g × {order.quantity_500gm} = ₹{(order.quantity_500gm * PRICES.PACK_500GM).toFixed(2)}</div>
                              )}
                              {order.quantity_1kg > 0 && (
                                <div>1kg × {order.quantity_1kg} = ₹{(order.quantity_1kg * PRICES.PER_KG).toFixed(2)}</div>
                              )}
                              <div className="font-medium text-primary pt-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span>Total: ₹{order.total_amount.toFixed(2)}</span>
                                </div>
                                {order.status === "completed" && order.payment_method && (
                                  <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs rounded-full ${
                                      order.payment_method.toLowerCase() === 'cash' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-purple-100 text-purple-700'
                                    } font-medium uppercase tracking-wider`}>
                                      {order.payment_method}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderDetailsOpen(true);
                            }}
                            className="gap-2 bg-primary text-white hover:bg-primary/90"
                          >
                            <Eye className="h-4 w-4" />
                            View Order Details
                          </Button>
                          <div className="flex flex-col gap-2 items-end">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                            {order.status === "completed" && order.payment_method && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.payment_method.toLowerCase() === 'cash'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {order.payment_method} Payment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        {/* Order Details Dialog */}
        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">
                        Order Date: {formatDate(selectedOrder.order_date)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Order Items:</h3>
                    <div className="space-y-2">
                      {selectedOrder.quantity_30gm > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>30gm × {selectedOrder.quantity_30gm}</span>
                          <span>₹{(selectedOrder.quantity_30gm * PRICES.PACK_30GM).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.quantity_60gm > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>60gm × {selectedOrder.quantity_60gm}</span>
                          <span>₹{(selectedOrder.quantity_60gm * PRICES.PACK_60GM).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.quantity_500gm > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>500gm × {selectedOrder.quantity_500gm}</span>
                          <span>₹{(selectedOrder.quantity_500gm * PRICES.PACK_500GM).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.quantity_1kg > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>1kg × {selectedOrder.quantity_1kg}</span>
                          <span>₹{(selectedOrder.quantity_1kg * PRICES.PER_KG).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Total Weight: {calculateTotalWeight(selectedOrder)} KG
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold">
                            Total Amount: ₹{selectedOrder.total_amount?.toFixed(2)}
                          </span>
                        </div>
                        {selectedOrder.status === "completed" && selectedOrder.payment_method && (
                          <div className="flex items-center gap-2">
                            <span className={`px-4 py-2 rounded-full text-sm font-medium uppercase ${
                              selectedOrder.payment_method.toLowerCase() === 'cash'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {selectedOrder.payment_method} Payment
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ShopOrderHistory;