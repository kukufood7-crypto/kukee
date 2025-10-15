import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiPath } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { Search, MapPin, Phone, User, Truck, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const AllShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchArea, setSearchArea] = useState("");
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch(apiPath('/api/shops'));
      if (!res.ok) throw new Error('Failed to fetch shops');
      const data = await res.json();
      setShops(data.map((s: any) => ({ ...s, id: s._id ? s._id : s.id })));
    } catch (error) {
      console.error('Error fetching shops:', error);
      toast.error('Failed to fetch shops');
    }
  };

  const handleDeleteShop = async (shop: Shop) => {
    try {
      setLoading(true);
      const res = await fetch(apiPath(`/api/shops/${shop.id}`), {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete shop');
      }
      
      // Remove shop from local state
      setShops(shops.filter(s => s.id !== shop.id));
      
      // Show success message
      toast.success('Shop has been permanently deleted', {
        description: `${shop.shop_name} has been removed from the system.`,
        duration: 4000,
      });
      
      // Close the dialog
      setShopToDelete(null);
      
      // Refresh the shops list to ensure our data is in sync
      fetchShops();
    } catch (error) {
      console.error('Error deleting shop:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete shop', {
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = searchArea
    ? shops.filter((shop) => shop.area.toLowerCase().includes(searchArea.toLowerCase()))
    : shops;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl text-primary">All Shops</CardTitle>
                <CardDescription>View and search all registered shops</CardDescription>
              </div>
              <div className="text-xl font-semibold text-primary">
                Total Shops: {shops.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by area (e.g., Puna Gam)"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {searchArea ? "No shops found in this area" : "No shops registered yet"}
            </div>
          ) : (
            filteredShops.map((shop) => (
              <Card 
                key={shop.id} 
                className="border-primary/20 hover:border-primary transition-colors cursor-pointer group"
                onClick={() => navigate(`/dashboard/all-shops/${shop.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {shop.shop_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shop.area}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-muted"
                          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking dropdown
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click when clicking delete
                            setShopToDelete(shop);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Shop</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
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
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    {shop.shop_address}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={!!shopToDelete} onOpenChange={() => !loading && setShopToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Permanently Delete Shop</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="font-medium">You are about to delete: {shopToDelete?.shop_name}</p>
                <p className="text-destructive">⚠️ Warning: This action is permanent and cannot be undone!</p>
                <p>This will:</p>
                <ul className="list-disc list-inside">
                  <li>Remove the shop permanently from the system</li>
                  <li>Delete all shop information</li>
                  <li>Cannot be recovered once deleted</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>No, Keep Shop</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => shopToDelete && handleDeleteShop(shopToDelete)}
                className="bg-destructive hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, Permanently Delete Shop"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AllShops;
