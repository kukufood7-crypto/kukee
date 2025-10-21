import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer } from "@/components/ui/chart";
import { Tooltip as ChartTooltip } from "recharts";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { apiPath } from "@/lib/api";
import { format, eachDayOfInterval, subDays, isWithinInterval, startOfDay, endOfDay, getMonth, getYear } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

interface RevenueStats {
  totalRevenue: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  revenueByPackSize: {
    '30gm': number;
    '60gm': number;
    '500gm': number;
    '1kg': number;
  };
  chartData: {
    date: string;
    revenue: number;
    rawDate: Date;
  }[];
}

const Revenue = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [selectedChartYear, setSelectedChartYear] = useState<string>(String(getYear(new Date())));
  const [selectedChartMonth, setSelectedChartMonth] = useState<string>("all");
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    revenueByPackSize: {
      '30gm': 0,
      '60gm': 0,
      '500gm': 0,
      '1kg': 0
    },
    chartData: []
  });
  
  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    calculateRevenue(selectedDate);
  }, [orders, selectedDate, selectedChartYear, selectedChartMonth]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(apiPath('/api/orders'));
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.map((o: any) => ({ ...o, id: o._id ? o._id : o.id })));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const calculateRevenue = (date: Date = new Date()) => {
    const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const weekStart = new Date(selectedDay.getTime() - (selectedDay.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);

    const revenueByPackSize = {
      '30gm': 0,
      '60gm': 0,
      '500gm': 0,
      '1kg': 0
    };

    let totalRevenue = 0;
    let dailyRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    // Create chart data based on view type
    const chartYear = parseInt(selectedChartYear);
    let chartData;

    if (selectedChartMonth === 'all') {
      // Monthly view - show all months in the selected year
      chartData = Array.from({ length: 12 }, (_, month) => ({
        date: format(new Date(chartYear, month, 1), 'MMM'),
        revenue: 0,
        rawDate: new Date(chartYear, month, 1)
      }));
    } else {
      // Daily view - show all days in the selected month
      const chartMonth = parseInt(selectedChartMonth);
      const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate();
      chartData = Array.from({ length: daysInMonth }, (_, day) => ({
        date: String(day + 1).padStart(2, '0'),
        revenue: 0,
        rawDate: new Date(chartYear, chartMonth, day + 1)
      }));
    }

    orders.forEach(order => {
      if (order.status === 'accepted' || order.status === 'completed') {
        // Calculate revenue by pack size
        revenueByPackSize['30gm'] += order.quantity_30gm * 5;
        revenueByPackSize['60gm'] += order.quantity_60gm * 10;
        revenueByPackSize['500gm'] += order.quantity_500gm * 90;
        revenueByPackSize['1kg'] += order.quantity_1kg * 180;

        totalRevenue += order.total_price;

        const orderDate = new Date(order.order_date);
        const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        
        // Calculate daily revenue
        if (orderDay.getTime() === selectedDay.getTime()) {
          dailyRevenue += order.total_price;
        }
        
        // Calculate weekly revenue
        if (orderDay >= weekStart && orderDay <= selectedDay) {
          weeklyRevenue += order.total_price;
        }
        
        // Calculate monthly revenue
        if (orderDay >= monthStart && orderDay <= selectedDay) {
          monthlyRevenue += order.total_price;
        }

        // Add revenue to chart data based on view type
        if (orderDay.getFullYear() === chartYear) {
          if (selectedChartMonth === 'all') {
            // Monthly view - aggregate by month
            const orderMonth = orderDay.getMonth();
            chartData[orderMonth].revenue += order.total_price;
          } else {
            // Daily view - only include orders for selected month and match by day
            const chartMonth = parseInt(selectedChartMonth);
            if (orderDay.getMonth() === chartMonth) {
              const dayOfMonth = orderDay.getDate() - 1; // Array is 0-based
              chartData[dayOfMonth].revenue += order.total_price;
            }
          }
        }
      }
    });

    setStats({
      totalRevenue,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      revenueByPackSize,
      chartData
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary">Revenue Dashboard</h1>
            <p className="text-muted-foreground">Track and analyze your business revenue</p>
          </div>
          
          {/* Date Selection Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-primary mb-1">Selected Date</p>
                <p className="text-xl font-bold">{format(selectedDate, 'PPPP')}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-primary/20">
              <CardContent className="p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-0"
                />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Revenue Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Daily Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.dailyRevenue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedDate, 'MMM d, yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Weekly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.weeklyRevenue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">Current Week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedDate, 'MMMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">All Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Pack Size */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Revenue by Pack Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-primary mb-2">30gm Packets</p>
                  <p className="text-2xl font-bold">₹{stats.revenueByPackSize['30gm'].toLocaleString()}</p>
                  <div className="h-1 w-full bg-primary/20 rounded-full mt-4"></div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-primary mb-2">60gm Packets</p>
                  <p className="text-2xl font-bold">₹{stats.revenueByPackSize['60gm'].toLocaleString()}</p>
                  <div className="h-1 w-full bg-primary/20 rounded-full mt-4"></div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-primary mb-2">500gm Packets</p>
                  <p className="text-2xl font-bold">₹{stats.revenueByPackSize['500gm'].toLocaleString()}</p>
                  <div className="h-1 w-full bg-primary/20 rounded-full mt-4"></div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-primary mb-2">1kg Packets</p>
                  <p className="text-2xl font-bold">₹{stats.revenueByPackSize['1kg'].toLocaleString()}</p>
                  <div className="h-1 w-full bg-primary/20 rounded-full mt-4"></div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold text-primary">Revenue Trend</CardTitle>
                <CardDescription>
                  {selectedChartMonth === 'all' 
                    ? `Monthly revenue for year ${selectedChartYear}`
                    : `Daily revenue for ${format(new Date(parseInt(selectedChartYear), parseInt(selectedChartMonth)), 'MMMM yyyy')}`
                  }
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-primary">Year</label>
                  <Select value={selectedChartYear} onValueChange={setSelectedChartYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-primary">Month</label>
                  <Select value={selectedChartMonth} onValueChange={setSelectedChartMonth}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      <SelectItem value="0">January</SelectItem>
                      <SelectItem value="1">February</SelectItem>
                      <SelectItem value="2">March</SelectItem>
                      <SelectItem value="3">April</SelectItem>
                      <SelectItem value="4">May</SelectItem>
                      <SelectItem value="5">June</SelectItem>
                      <SelectItem value="6">July</SelectItem>
                      <SelectItem value="7">August</SelectItem>
                      <SelectItem value="8">September</SelectItem>
                      <SelectItem value="9">October</SelectItem>
                      <SelectItem value="10">November</SelectItem>
                      <SelectItem value="11">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ChartContainer 
                className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-border [&_.recharts-cartesian-grid-vertical_line]:stroke-border"
                config={{
                  revenue: {
                    label: "Revenue",
                    color: "#4ade80"
                  }
                }}
              >
                <AreaChart 
                  data={stats.chartData}
                  margin={{ top: 10, right: 30, left: 50, bottom: 30 }}
                >
                  <defs>
                    <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    label={{ value: 'Date', position: 'bottom', offset: 20 }}
                  />
                  <YAxis 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                    label={{ value: 'Amount (₹)', angle: -90, position: 'left', offset: 35 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="url(#revenue-gradient)"
                    dot={{ fill: "#4ade80", r: 4 }}
                  />
                  <ChartTooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Date
                              </span>
                              <span className="font-bold">
                                {payload[0].payload.date}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Revenue
                              </span>
                              <span className="font-bold">
                                ₹{payload[0].value}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Revenue;