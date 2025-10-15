import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ShoppingCart, Package, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { apiPath } from "@/lib/api";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalShops: 0,
    pendingOrders: 0,
    totalStock: 0,
    monthlyExpenses: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [shopsRes, ordersRes, stockRes, expensesRes] = await Promise.all([
        fetch(apiPath('/api/shops')),
        fetch(apiPath('/api/orders')),
        fetch(apiPath('/api/stock')),
        fetch(apiPath(`/api/expenses?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`)),
      ]);

      const shops = await shopsRes.json();
      const orders = await ordersRes.json();
      const stock = await stockRes.json();
      const expenses = await expensesRes.json();

      const totalStock = (stock.reduce((acc: any, item: any) => acc + Number(item.total_stock_kg || 0), 0)) || 0;
      const monthlyExpenses = (expenses.reduce((acc: any, item: any) => acc + Number(item.amount || 0), 0)) || 0;
      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

      setStats({
        totalShops: shops.length || 0,
        pendingOrders,
        totalStock,
        monthlyExpenses,
      });
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-primary">Welcome to KUKU Dashboard</h2>
          <p className="text-muted-foreground mt-2">Manage your dog biscuit business efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
              <Store className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalShops}</div>
              <p className="text-xs text-muted-foreground mt-1">Active registered shops</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Orders awaiting action</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.totalStock.toFixed(2)} kg</div>
              <p className="text-xs text-muted-foreground mt-1">Available inventory</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">₹{stats.monthlyExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">This month's total</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>What would you like to do today?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/dashboard/shops" className="p-4 border rounded-lg hover:bg-muted transition-colors">
              <Store className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Add New Shop</h3>
              <p className="text-sm text-muted-foreground">Register a new shop</p>
            </a>
            <a href="/dashboard/orders" className="p-4 border rounded-lg hover:bg-muted transition-colors">
              <ShoppingCart className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Create Order</h3>
              <p className="text-sm text-muted-foreground">Place a new order</p>
            </a>
            <a href="/dashboard/stock" className="p-4 border rounded-lg hover:bg-muted transition-colors">
              <Package className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Update Stock</h3>
              <p className="text-sm text-muted-foreground">Manage inventory</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
