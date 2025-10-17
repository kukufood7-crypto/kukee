import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Store,
  ShoppingCart,
  Package,
  Wallet,
  Bell,
  Home,
  DogIcon,
  ClipboardList,
  CheckCircle,
  QrCode,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Add Shop", url: "/dashboard/shops", icon: Store },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "All Orders", url: "/dashboard/all-orders", icon: ShoppingCart },
  { title: "Accepted Orders", url: "/dashboard/accepted-orders", icon: CheckCircle },
  { title: "Completed Orders", url: "/dashboard/completed-orders", icon: ClipboardList },
  { title: "Pending Orders", url: "/dashboard/pending-orders", icon: ClipboardList },
  { title: "All Shops", url: "/dashboard/all-shops", icon: Store },
  { title: "Stock Management", url: "/dashboard/stock", icon: Package },
  { title: "Full Packet", url: "/dashboard/full-packet", icon: Package },
  { title: "Revenue", url: "/dashboard/revenue", icon: Wallet },
  { title: "Expenses", url: "/dashboard/expenses", icon: Wallet },
  { title: "Reminders", url: "/dashboard/reminders", icon: Bell },
  { title: "QR Code", url: "/dashboard/qr-code", icon: QrCode },
  { title: "Shop History", url: "/dashboard/shop-history", icon: History },
];

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-[258px]"}>
      <SidebarContent>
        <div className="pt-4 px-4 flex items-center gap-3 justify-center">
          <img 
            src="/img/logobg.png" 
            alt="KUKEE Logo"
            className={cn(
              "transition-all duration-200",
              collapsed ? "w-14 h-14" : "w-50 h-50 -ml-4"
            )}
          />
        </div>

        <div className="h-2" />
        <div className="h-2" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title} className="px-2">
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        cn(
                          "flex items-center px-4 py-3 rounded-lg transition-colors",
                          "text-lg font-medium",
                          isActive
                            ? "bg-primary/20 text-primary font-semibold"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-primary"
                        )
                      }
                    >
                      <item.icon className="mr-4 h-6 w-6" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center px-4">
            <SidebarTrigger />
            <h1 className="ml-4 text-xl font-bold text-primary">
              KUKEE Biscuit Management
            </h1>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
