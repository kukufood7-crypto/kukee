import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { FileText, Search, Calendar as CalendarIcon, CreditCard, Banknote } from "lucide-react";
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
  payment_status?: 'cash' | 'upi';
  completed_at?: string;
}

const CompletedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      
      // Calculate date 90 days ago
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      // Filter only completed orders from last 90 days
      const completedOrders = data
        .filter((o: any) => {
          const orderDate = new Date(o.completed_at || o.order_date);
          return o.status === 'completed' && orderDate >= ninetyDaysAgo;
        })
        .map((o: any) => ({ ...o, id: o._id ? o._id : o.id }));
      
      setOrders(completedOrders);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch completed orders");
    } finally {
      setLoading(false);
    }
  };

  const generateBulkPDF = (orders: Order[]) => {
    // Create a merged PDF with all orders
    const ordersData = orders.map(order => ({
      shopName: order.shop_name,
      ownerName: order.owner_name,
      quantity30gm: order.quantity_30gm,
      quantity60gm: order.quantity_60gm,
      quantity500gm: order.quantity_500gm,
      quantity1kg: order.quantity_1kg,
      totalPrice: order.total_price,
      orderDate: format(new Date(order.completed_at || order.order_date), 'PPP')
    }));

    // Add date range to filename
    const fromDate = dateRange.from ? format(dateRange.from, 'dd-MM-yyyy') : '';
    const toDate = dateRange.to ? format(dateRange.to, 'dd-MM-yyyy') : '';
    const filename = `completed-orders-${fromDate}-to-${toDate}.pdf`;

    generateBill({
      ...ordersData[0], // Include first order details for basic structure
      isMultipleOrders: true,
      ordersData,
      dateRange: {
        from: fromDate,
        to: toDate
      }
    }, filename);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!dateRange.from && !dateRange.to) return matchesSearch;

    const orderDate = new Date(order.completed_at || order.order_date);
    
    if (dateRange.from && dateRange.to) {
      return matchesSearch && 
        orderDate >= dateRange.from &&
        orderDate <= dateRange.to;
    }

    if (dateRange.from) {
      return matchesSearch && orderDate >= dateRange.from;
    }

    if (dateRange.to) {
      return matchesSearch && orderDate <= dateRange.to;
    }

    return matchesSearch;
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
                <CardTitle className="text-2xl text-primary">Completed Orders</CardTitle>
                <CardDescription>View completed orders from the last 90 days</CardDescription>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !dateRange.from && !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                          </>
                        ) : (
                          format(dateRange.from, "PPP")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {(dateRange.from || dateRange.to) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                    className="px-2"
                  >
                    Clear dates
                  </Button>
                )}
                {dateRange.from && dateRange.to && filteredOrders.length > 0 && (
                  <Button
                    variant="default"
                    onClick={() => generateBulkPDF(filteredOrders)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Download All Orders
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed orders found</p>
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
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                              order.payment_status === 'cash' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {order.payment_status === 'cash' ? (
                                <>
                                  <Banknote className="h-3 w-3" />
                                  Cash
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-3 w-3" />
                                  UPI
                                </>
                              )}
                            </div>
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
                                orderDate: format(new Date(order.completed_at || order.order_date), 'PPP'),
                              }, `${order.shop_name}-bill.pdf`);
                            }}
                            className="gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            Generate Bill
                          </Button>
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

export default CompletedOrders;