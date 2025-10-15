import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminRoute } from "@/components/AdminRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Home";
import Shops from "./pages/Shops";
import Orders from "./pages/Orders";
import AllOrders from "./pages/AllOrders";
import AcceptedOrders from "./pages/AcceptedOrders";
import CompletedOrders from "./pages/CompletedOrders";
import PendingOrders from "./pages/PendingOrders";
import AllShops from "./pages/AllShops";
import Stock from "./pages/Stock";
import StockManagement from "./pages/StockManagement";
import Expenses from "./pages/Expenses";
import Reminders from "./pages/Reminders";
import OrderHistory from "./pages/OrderHistory";
import ShopOrderHistory from "./pages/ShopOrderHistory";
import Revenue from "./pages/Revenue";
import ShopHistory from "./pages/ShopHistory";
import ShopDetails from "./pages/ShopDetails";
import QRCode from "./pages/QRCode";
import FullPacket from "./pages/FullPacket";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/dashboard/shops" element={<AdminRoute><Shops /></AdminRoute>} />
          <Route path="/dashboard/orders" element={<AdminRoute><Orders /></AdminRoute>} />
          <Route path="/dashboard/all-orders" element={<AdminRoute><AllOrders /></AdminRoute>} />
          <Route path="/dashboard/accepted-orders" element={<AdminRoute><AcceptedOrders /></AdminRoute>} />
          <Route path="/dashboard/completed-orders" element={<AdminRoute><CompletedOrders /></AdminRoute>} />
          <Route path="/dashboard/pending-orders" element={<AdminRoute><PendingOrders /></AdminRoute>} />
          <Route path="/dashboard/all-shops" element={<AdminRoute><AllShops /></AdminRoute>} />
          <Route path="/dashboard/stock" element={<AdminRoute><StockManagement /></AdminRoute>} />
          <Route path="/dashboard/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
          <Route path="/dashboard/reminders" element={<AdminRoute><Reminders /></AdminRoute>} />
          <Route path="/dashboard/revenue" element={<AdminRoute><Revenue /></AdminRoute>} />
          <Route path="/dashboard/qr-code" element={<AdminRoute><QRCode /></AdminRoute>} />
          <Route path="/dashboard/full-packet" element={<AdminRoute><FullPacket /></AdminRoute>} />
          <Route path="/dashboard/shop-history" element={<AdminRoute><ShopHistory /></AdminRoute>} />
          <Route path="/dashboard/shop-history/:shopId" element={<AdminRoute><ShopDetails /></AdminRoute>} />
          <Route path="/order-history" element={<AdminRoute><OrderHistory /></AdminRoute>} />
          <Route path="/order-history/:shopId" element={<AdminRoute><ShopOrderHistory /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
