import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { FileText, Search, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { generateBill } from "@/lib/pdfGenerator";
import { cn } from "@/lib/utils";

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
  accepted_at?: string;
  payment_status?: 'cash' | 'upi' | 'pending';
}

type PaymentMethod = 'cash' | 'upi' | 'pending';

const AcceptedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState<number>(0);

  useEffect(() => {
    fetchAcceptedOrders();
  }, []);

  const fetchAcceptedOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      // Filter only accepted orders
      const acceptedOrders = data
        .filter((o: any) => o.status === 'accepted')
        .map((o: any) => ({ ...o, id: o._id ? o._id : o.id }));
      setOrders(acceptedOrders);
      setAcceptedCount(acceptedOrders.length);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch accepted orders");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (order: Order) => {
    setSelectedOrder(order);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSelect = async (method: PaymentMethod) => {
    if (!selectedOrder) return;

    try {
      // Only send necessary fields to update
      const updateData = {
        status: method === 'pending' ? 'accepted' : 'completed',
        payment_status: method,
        completed_at: method === 'pending' ? null : new Date().toISOString()
      };

      const res = await fetch(apiPath(`/api/orders/${selectedOrder.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to update order');
      }

      if (method === 'pending') {
        toast.info('Order marked as payment pending');
      } else {
        toast.success(`Order completed successfully with ${method.toUpperCase()} payment`);
      }

      // Refresh orders list to remove completed orders and update count
      await fetchAcceptedOrders();
      toast.info(`${acceptedCount - 1} orders remaining`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order. Please try again.');
    } finally {
      setPaymentDialogOpen(false);
      setSelectedOrder(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!selectedDate) return matchesSearch;

    const orderDate = new Date(order.order_date);
    const selected = new Date(selectedDate);
    
    return matchesSearch && 
      orderDate.getDate() === selected.getDate() &&
      orderDate.getMonth() === selected.getMonth() &&
      orderDate.getFullYear() === selected.getFullYear();
  });

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
                  <CardTitle className="text-2xl text-primary">Accepted Orders</CardTitle>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {orders.length} Orders
                  </div>
                </div>
                <CardDescription>View all accepted orders and generate bills</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[250px]"
                  />
                </div>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="px-2"
                  >
                    Clear date
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No accepted orders found</p>
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
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                {order.area} • {order.owner_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Accepted: {order.accepted_at ? format(new Date(order.accepted_at), "dd/MM/yy HH:mm") : 'Not recorded'}
                              </p>
                            </div>
                          </div>
                          <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {order.status}
                          </div>
                        </div>

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
                          <div className="flex gap-2">
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
                            <Button
                              size="sm"
                              onClick={() => handleComplete(order)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Complete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Order</DialogTitle>
              <DialogDescription>
                Select the payment method for this order
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-4">
              <Button
                variant="outline"
                className="h-12"
                onClick={() => handlePaymentSelect('cash')}
              >
                Cash Payment
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => handlePaymentSelect('upi')}
              >
                UPI Payment
              </Button>
              <Button
                variant="secondary"
                className="h-12"
                onClick={() => handlePaymentSelect('pending')}
              >
                Mark as Pending
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
};

export default AcceptedOrders;