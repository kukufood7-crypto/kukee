import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Store, Search, MapPin, Phone, User, History } from "lucide-react";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";

interface Shop {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_number: string;
  owner_name: string;
  area: string;
  delivery_boy: string;
}

const OrderHistory = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
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
      toast.error('Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  const handleShopClick = (shop: Shop) => {
    navigate(`/order-history/${shop.id}`, { state: { shop } });
  };

  const filteredShops = shops.filter(shop => 
    shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-primary">Order History</h1>
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Shop List</CardTitle>
                  <CardDescription>Select a shop to view its order history</CardDescription>
                </div>
                <div className="text-xl font-semibold text-primary">
                  Total Shops: {shops.length}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shops by name, area, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    Loading shops...
                  </div>
                ) : filteredShops.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    {searchTerm ? "No shops found matching your search" : "No shops registered yet"}
                  </div>
                ) : (
                  filteredShops.map((shop) => (
                    <Card 
                      key={shop.id}
                      className="border-primary/20 hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => handleShopClick(shop)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Store className="h-5 w-5 text-primary" />
                          {shop.shop_name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shop.area}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">Owner:</span>
                          <span>{shop.owner_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{shop.shop_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <History className="h-4 w-4 text-primary" />
                          <span>Click to view order history</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderHistory;