import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle, Clock, Search, FileText, X } from "lucide-react";
import { generateBill } from "@/lib/pdfGenerator";
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

const AllOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchAllAcceptedOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      
      // Get only accepted orders
      const ordersToAccept = data
        .filter((o: any) => !o.status || o.status === 'pending')
        .map((o: any) => ({
          id: o._id || o.id,
          shopName: o.shop_name || 'Unknown Shop',
          ownerName: o.owner_name || 'Unknown Owner',
          quantity30gm: o.quantity_30gm || 0,
          quantity60gm: o.quantity_60gm || 0,
          quantity500gm: o.quantity_500gm || 0,
          quantity1kg: o.quantity_1kg || 0,
          totalPrice: o.total_price || 0,
          orderDate: format(new Date(o.order_date || new Date()), "dd/MM/yyyy")
        }));

      if (ordersToAccept.length === 0) {
        toast.error('No pending orders found to accept');
        return;
      }

      // Update status to 'accepted' for all orders
      for (const order of ordersToAccept) {
        await fetch(apiPath(`/api/orders/${order.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'accepted',
            order_date: new Date().toISOString() 
          }),
        });
      }

      // Generate combined PDF with all accepted orders
      generateBill({
        shopName: 'Combined Orders',
        ownerName: 'Multiple Shops',
        quantity30gm: 0,
        quantity60gm: 0,
        quantity500gm: 0,
        quantity1kg: 0,
        totalPrice: ordersToAccept.reduce((sum, order) => sum + order.totalPrice, 0),
        isMultipleOrders: true,
        ordersData: ordersToAccept,
        dateRange: {
          from: format(new Date(), "dd/MM/yyyy"),
          to: format(new Date(), "dd/MM/yyyy")
        }
      }, `Accepted-Orders-${format(new Date(), "dd-MM-yyyy")}.pdf`);

      // Refresh the orders list
      await fetchOrders();
      
      toast.success(`Successfully accepted ${ordersToAccept.length} orders and generated PDF`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate combined PDF");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      // Filter out accepted and completed orders
      const normalizedData = data
        .filter((o: any) => o.status !== 'accepted' && o.status !== 'completed') // Remove accepted and completed orders
        .map((o: any) => ({ ...o, id: o._id ? o._id : o.id }));
      setOrders(normalizedData);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (order: Order) => {
    try {
      // First check current packet stock for all sizes
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

      // Check if we have enough stock for each size in the order
      const orderQuantities = {
        '30gm': order.quantity_30gm || 0,
        '60gm': order.quantity_60gm || 0,
        '500gm': order.quantity_500gm || 0,
        '1kg': order.quantity_1kg || 0
      };

      for (const [sizeId, quantity] of Object.entries(orderQuantities)) {
        if (quantity > 0) {
          const available = currentStock[sizeId as keyof typeof currentStock] || 0;
          if (quantity > available) {
            toast.error(`Not enough ${sizeId} packets. Available: ${available}, Required: ${quantity}`);
            return;
          }
        }
      }

      // If we have enough stock for all sizes, proceed with accepting the order
      const res = await fetch(apiPath(`/api/orders/${order.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        }),
      });

      if (!res.ok) throw new Error('Failed to update order');

      // No need to update biscuit stock on order acceptance

      // Remove packets from stock for each size that has quantity
      for (const [sizeId, quantity] of Object.entries(orderQuantities)) {
        if (quantity > 0) {
          await fetch(apiPath('/api/finish-god/remove'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: quantity,
              date: new Date().toISOString(),
              size: sizeId,
              skipMaxUpdate: true  // Add flag to skip updating max possible stock
            }),
          });
        }
      }

      generateBill({
        shopName: order.shop_name,
        ownerName: order.owner_name,
        quantity30gm: order.quantity_30gm,
        quantity60gm: order.quantity_60gm,
        quantity500gm: order.quantity_500gm,
        quantity1kg: order.quantity_1kg,
        totalPrice: order.total_price,
      });

      // Remove the order from the current list immediately
      setOrders(currentOrders => currentOrders.filter(o => o.id !== order.id));
      toast.success("Order accepted and moved to accepted orders!");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept order");
    }
  };

  const handlePending = async (orderId: string) => {
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update order');
      }

      // Update the order in the local state
      setOrders(currentOrders => 
        currentOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: 'pending', 
                next_delivery_date: tomorrow.toISOString() 
              }
            : order
        )
      );

      toast.success("Order moved to next day delivery!");
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || "Failed to update order");
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      // Delete the order (no need to update stock since order was never accepted)
      const res = await fetch(apiPath(`/api/orders/${orderId}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      // Remove the order from the local state regardless of the response
      setOrders(currentOrders => currentOrders.filter(order => order.id !== orderId));
      toast.success("Order rejected successfully!");
    } catch (error) {
      // Don't show any error toast as per requirement
      console.error('Error rejecting order:', error);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <AlertDialog open={!!orderToReject} onOpenChange={() => setOrderToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reject this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-red-500">
              Warning: This action cannot be undone. The order will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (orderToReject) {
                  handleReject(orderToReject.id);
                  setOrderToReject(null);
                }
              }}
            >
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                <CardTitle className="text-2xl text-primary">All Orders</CardTitle>
                <CardDescription>View and manage all orders</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={fetchAllAcceptedOrders}
                >
                  <FileText className="h-4 w-4" />
                  Generate All Accepted PDF
                </Button>
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
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders found</p>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="border-primary/20 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{order.shop_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {order.area} • {order.owner_name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Order Date: {format(new Date(order.order_date), "dd/MM/yy")}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {order.status}
                          </div>
                        </div>
                        {order.next_delivery_date && (
                          <p className="text-sm text-blue-600 mb-4">
                            Next Delivery: {format(new Date(order.next_delivery_date), "dd/MM/yy")}
                          </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {order.quantity_30gm > 0 && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-sm font-medium">30gm</p>
                              <p className="text-lg">{order.quantity_30gm}</p>
                            </div>
                          )}
                          {order.quantity_60gm > 0 && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-sm font-medium">60gm</p>
                              <p className="text-lg">{order.quantity_60gm}</p>
                            </div>
                          )}
                          {order.quantity_500gm > 0 && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-sm font-medium">500gm</p>
                              <p className="text-lg">{order.quantity_500gm}</p>
                            </div>
                          )}
                          {order.quantity_1kg > 0 && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-sm font-medium">1kg</p>
                              <p className="text-lg">{order.quantity_1kg}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="text-lg font-bold text-primary">₹{order.total_price}</div>
                          {order.status === "pending" && (
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
                                onClick={() => handlePending(order.id)}
                                className="gap-1"
                              >
                                <Clock className="h-4 w-4" />
                                Next Day
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setOrderToReject(order)}
                                className="gap-1"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {order.status === "accepted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                generateBill({
                                  shopName: order.shop_name,
                                  ownerName: order.owner_name,
                                  quantity30gm: order.quantity_30gm,
                                  quantity60gm: order.quantity_60gm,
                                  quantity500gm: order.quantity_500gm,
                                  quantity1kg: order.quantity_1kg,
                                  totalPrice: order.total_price,
                                });
                              }}
                              className="gap-1"
                            >
                              <FileText className="h-4 w-4" />
                              Generate Bill
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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

export default AllOrders;