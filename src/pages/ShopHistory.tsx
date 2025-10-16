import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiPath } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Phone, User, Truck, History, IndianRupee, Calendar, Package, Eye } from "lucide-react";
import { format } from "date-fns";

interface Shop {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_number: string;
  owner_name: string;
  area: string;
  delivery_boy: string;
  last_visit_date: string;
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
  payment_method?: string;
  payment_status?: string;
}

// Product prices
const PRICES = {
  PER_KG: 180,
  PACK_30GM: 5,
  PACK_60GM: 10,
  PACK_500GM: 90,
};

const ShopHistory = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiPath('/api/shops'));
      if (!res.ok) throw new Error('Failed to fetch shops');
      const data = await res.json();
      setShops(data.map((s: any) => ({ ...s, id: s._id ? s._id : s.id })));
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl text-primary">Shop History</CardTitle>
                <CardDescription>View order history for all registered shops</CardDescription>
              </div>
              <div className="text-xl font-semibold text-primary">
                Total Shops: {filteredShops.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shop name or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-primary/20">
                <CardContent className="p-6">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 bg-primary/10 rounded w-3/4"></div>
                    <div className="h-4 bg-primary/10 rounded w-1/2"></div>
                    <div className="h-4 bg-primary/10 rounded w-2/3"></div>
                    <div className="h-4 bg-primary/10 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {searchTerm ? "No shops found matching your search" : "No shops registered yet"}
              </div>
            ) : (
              filteredShops.map((shop) => (
                <Card 
                  key={shop.id} 
                  className="border-primary/20 hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => navigate(`/dashboard/shop-history/${shop.id}`)}
                >
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {shop.shop_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {shop.area}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">Owner:</span>
                        <span>{shop.owner_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-medium">Contact:</span>
                        <span>{shop.shop_number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-medium">Delivery:</span>
                        <span>{shop.delivery_boy}</span>
                      </div>
                      {shop.last_visit_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <History className="h-4 w-4 text-primary" />
                          <span className="font-medium">Last Visit:</span>
                          <span>{new Date(shop.last_visit_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShopHistory;