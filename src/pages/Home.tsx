import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  Plus
} from "lucide-react";

interface DashboardStats {
  pendingOrders: number;
  totalShops: number;
  totalRevenue: number;
  lowStockItems: number;
}

// Function to get current pending orders count
const getPendingOrdersCount = async () => {
  try {
    const response = await fetch(apiPath('/api/orders?status=pending'));
    if (!response.ok) {
      throw new Error('Failed to fetch pending orders');
    }
    const orders = await response.json();
    return orders.length;
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return 0;
  }
};

const quickActions = [
  { title: "New Order", icon: Plus, color: "bg-green-500", link: "/orders" },
  { title: "View Shops", icon: Store, color: "bg-blue-500", link: "/all-shops" },
  { title: "Stock Check", icon: Package, color: "bg-purple-500", link: "/stock" },
];

const AnimatedParticles = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/10 rounded-full"
          animate={{
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
            ],
            y: [
              Math.random() * window.innerHeight,
              Math.random() * window.innerHeight,
            ],
          }}
          transition={{
            duration: Math.random() * 10 + 20,
            repeat: Infinity,
            ease: "linear",
          }}
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
        />
      ))}
    </div>
  );
};

const Home = () => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    totalShops: 0,
    totalRevenue: 0,
    lowStockItems: 0,
  });

  // Function to fetch just the pending orders count
  const fetchPendingOrders = async () => {
    try {
      const response = await fetch(apiPath('/api/orders'));
      if (!response.ok) throw new Error('Failed to fetch orders');
      const orders = await response.json();
      // Filter only pending orders (same logic as PendingOrders page)
      const pendingOrders = orders.filter((o: any) => o.status === 'pending');
      return pendingOrders.length;
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      return 0;
    }
  };

  // Function to fetch total shops count
  const fetchTotalShops = async () => {
    try {
      const response = await fetch(apiPath('/api/shops'));
      if (!response.ok) throw new Error('Failed to fetch shops');
      const shops = await response.json();
      return shops.length;
    } catch (error) {
      console.error('Error fetching total shops:', error);
      return 0;
    }
  };

  // Function to calculate today's revenue from orders
  const fetchTodayRevenue = async () => {
    try {
      const response = await fetch(apiPath('/api/orders'));
      if (!response.ok) throw new Error('Failed to fetch orders');
      const orders = await response.json();
      
      // Get today's date at midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter orders for today and calculate total revenue
      const todayRevenue = orders
        .filter((order: any) => {
          const orderDate = new Date(order.order_date);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime() && order.status === 'accepted';
        })
        .reduce((total: number, order: any) => total + (order.total_price || 0), 0);
      
      return todayRevenue;
    } catch (error) {
      console.error('Error fetching today revenue:', error);
      return 0;
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Get the current pending orders count
      const pendingCount = await fetchPendingOrders();
      
      // Get the total shops count
      const totalShops = await fetchTotalShops();

      // Get today's revenue
      const todayRevenue = await fetchTodayRevenue();
      
      // Update all our accurate counts
      setStats(prevStats => ({
        ...prevStats,
        pendingOrders: pendingCount,
        totalShops: totalShops,
        totalRevenue: todayRevenue
      }));
      
      // Then fetch other stats
      const res = await fetch(apiPath('/api/dashboard/stats'));
      if (res.ok) {
        const data = await res.json();
        // Update other stats but keep our accurate counts
        setStats(prevStats => ({
          ...data,
          pendingOrders: pendingCount,
          totalShops: totalShops,
          totalRevenue: todayRevenue
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  // Refresh stats every minute to keep pending orders count updated
    // Update stats every 30 seconds to ensure pending orders are current
  useEffect(() => {
    fetchDashboardStats(); // Initial fetch
    
    // Set up polling interval for frequent updates
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 5000); // Check every 5 seconds to keep pending orders count more accurate
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Shops",
      value: stats.totalShops,
      icon: Store,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Today's Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <AnimatedParticles />
      <div className="relative z-10 space-y-8">
        {/* Greeting Section */}
        <div className="text-center p-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg backdrop-blur-sm">
          <motion.h1 
            className="text-4xl font-bold text-primary mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Welcome to Kuku Pup Palace
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Manage your orders, inventory, and shops all in one place
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                    onClick={() => window.location.href = action.link}
                  >
                    <div className={`p-2 rounded-full ${action.color}`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">{action.title}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>


      </div>
    </DashboardLayout>
  );
};

export default Home;