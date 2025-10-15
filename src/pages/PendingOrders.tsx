import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle, Clock, Search } from "lucide-react";
import { format } from "date-fns";

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
  next_delivery_date?: string;
}

const PendingOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      // Filter only pending orders
      const pendingOrders = data
        .filter((o: any) => o.status === 'pending')
        .map((o: any) => ({ ...o, id: o._id ? o._id : o.id }));
      setOrders(pendingOrders);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch pending orders");
    } finally {
      setLoading(false);
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

      toast.success("Order accepted successfully!");
      fetchPendingOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to accept order");
    }
  };

  const handlePostpone = async (orderId: string) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await fetch(apiPath(`/api/orders/${orderId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pending',
          next_delivery_date: tomorrow.toISOString()
        }),
      });

      if (!res.ok) throw new Error('Failed to update order');

      toast.success("Order postponed to next day!");
      fetchPendingOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to postpone order");
    }
  };

  const filteredOrders = orders.filter(order => 
    order.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl text-primary">Pending Orders</CardTitle>
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                    {orders.length} Orders
                  </span>
                </div>
                <CardDescription>Manage orders scheduled for later delivery</CardDescription>
                <div className="mt-2 flex gap-4">
                  <div className="text-sm">
                    <span className="font-medium">Total Items: </span>
                    <span>{orders.reduce((sum, order) => 
                      sum + (order.quantity_30gm || 0) + 
                      (order.quantity_60gm || 0) + 
                      (order.quantity_500gm || 0) + 
                      (order.quantity_1kg || 0), 0)
                    }</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Total Value: </span>
                    <span>₹{orders.reduce((sum, order) => sum + order.total_price, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[250px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending orders</p>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{order.shop_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.area} • {order.owner_name}
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          <p className="text-sm text-muted-foreground">
                            Order Date: {format(new Date(order.order_date), "dd/MM/yy")}
                          </p>
                          {order.next_delivery_date && (
                            <p className="text-sm text-blue-600">
                              Delivery Date: {format(new Date(order.next_delivery_date), "dd/MM/yy")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        {order.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {order.quantity_30gm > 0 && (
                        <p>30gm: {order.quantity_30gm}</p>
                      )}
                      {order.quantity_60gm > 0 && (
                        <p>60gm: {order.quantity_60gm}</p>
                      )}
                      {order.quantity_500gm > 0 && (
                        <p>500gm: {order.quantity_500gm}</p>
                      )}
                      {order.quantity_1kg > 0 && (
                        <p>1kg: {order.quantity_1kg}</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="font-bold text-primary">₹{order.total_price}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePostpone(order.id)}
                          className="gap-1"
                        >
                          <Clock className="h-4 w-4" />
                          Next Day
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default PendingOrders;