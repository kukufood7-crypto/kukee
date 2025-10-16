import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/api";
import { toast } from "sonner";
import { Package, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockItem {
  _id: string;
  item_name: string;
  quantity: number;
  unit: string;
  type: 'raw_material' | 'finished_good';
  category?: 'biscuit' | 'pouch';
  packageSize?: number; // in grams for finished goods
  created_at: string;
  updated_at: string;
}

const PACKAGE_SIZES = [
  { label: '30g Pack', value: 30 },
  { label: '60g Pack', value: 60 },
  { label: '500g Pack', value: 500 },
  { label: '1kg Pack', value: 1000 }
];

const StockManagement = () => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [newItem, setNewItem] = useState({
    quantity: 0,
    unit: "kg",
    type: "raw_material" as const,
    category: "biscuit" as ("biscuit" | "pouch"),
    item_name: "Biscuit"
  });
  
  const updateFinishedGoods = async () => {
    const rawMaterials = stocks.filter(item => item.type === 'raw_material');
    const pouches = rawMaterials.find(item => item.category === 'pouch')?.quantity || 0;
    
    // Set maximum possible directly to the number of available pouches without any adjustments
    const maxPossible30g = pouches;

    try {
      // Update maximum capacity without considering orders
      const maxResponse = await fetch(apiPath('/api/finish-god/max'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pouches,
          maxFinishGod: maxPossible30g,
          size: '30gm',
          date: new Date().toISOString(),
          ignoreOrders: true // Add flag to indicate this is raw stock update
        }),
      });
      
      if (!maxResponse.ok) {
        throw new Error('Failed to update finished goods stock');
      }

    } catch (error) {
      console.error('Error updating finished goods:', error);
      toast.error('Failed to update maximum possible packets');
      return; // Exit early if max update fails
    }
    
    // Update finished goods stock for each package size
    for (const size of PACKAGE_SIZES) {
      const possibleProducts = pouches; // Use raw pouch count
      
      const existingProduct = stocks.find(
        item => item.type === 'finished_good' && item.packageSize === size.value
      );
      
      if (existingProduct) {
        await fetch(apiPath(`/api/stocks/${existingProduct._id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            quantity: possibleProducts,
            ignoreOrders: true // Add flag to indicate this is raw stock update
          }),
        });
      } else {
        await fetch(apiPath('/api/stocks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: `${size.label} Finished Product`,
            quantity: possibleProducts,
            unit: "pieces",
            type: "finished_good",
            packageSize: size.value,
            ignoreOrders: true // Add flag to indicate this is raw stock update
          }),
        });
      }
    }
    
    await fetchStocks();
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch(apiPath('/api/stocks'));
      if (!res.ok) throw new Error('Failed to fetch stocks');
      const data = await res.json();
      setStocks(data);
    } catch (error) {
      toast.error("Failed to fetch stocks");
    }
  };

  const initializeFixedStocks = async () => {
    const rawMaterials = stocks.filter(item => item.type === 'raw_material');
    const biscuit = rawMaterials.find(item => item.category === 'biscuit');
    const pouch = rawMaterials.find(item => item.category === 'pouch');

    if (!biscuit) {
      await fetch(apiPath('/api/stocks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: "Biscuit",
          quantity: 0,
          unit: "kg",
          type: "raw_material",
          category: "biscuit"
        }),
      });
    }

    if (!pouch) {
      await fetch(apiPath('/api/stocks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: "Pouch",
          quantity: 0,
          unit: "pieces",
          type: "raw_material",
          category: "pouch"
        }),
      });
    }

    await fetchStocks();
  };

  useEffect(() => {
    const init = async () => {
      await fetchStocks();
      await initializeFixedStocks();
    };
    init();
  }, []);

  const handleAddStock = async () => {
    if (!newItem.item_name || newItem.quantity <= 0) {
      toast.error("Please enter valid item name and quantity");
      return;
    }

    try {
      const res = await fetch(apiPath('/api/stocks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!res.ok) throw new Error('Failed to add stock');
      toast.success("Stock added successfully");
      setNewItem({
        item_name: "",
        quantity: 0,
        unit: "pieces",
        type: "raw_material",
        category: "biscuit"
      });
      await fetchStocks();
      await updateFinishedGoods();
    } catch (error) {
      toast.error("Failed to add stock");
    }
  };

  const handleUpdateStock = async (id: string, quantity: number) => {
    try {
      const res = await fetch(apiPath(`/api/stocks/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity,
          ignoreOrders: true // Add flag to indicate this is raw stock update
        }),
      });

      if (!res.ok) throw new Error('Failed to update stock');
      
      await fetchStocks();
      
      // Update finished goods only when raw materials are updated
      const updatedItem = stocks.find(item => item._id === id);
      if (updatedItem && updatedItem.type === 'raw_material') {
        await updateFinishedGoods();
      }
      
      toast.success("Stock updated successfully");
    } catch (error) {
      toast.error("Failed to update stock");
      console.error('Stock update error:', error);
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      const itemToDelete = stocks.find(item => item._id === id);
      if (itemToDelete && (itemToDelete.category === 'biscuit' || itemToDelete.category === 'pouch')) {
        toast.error("Cannot delete fixed stock items");
        return;
      }

      console.log('Deleting stock with id:', id);
      const res = await fetch(apiPath(`/api/stocks/${id}`), {
        method: 'DELETE',
      });

      const data = await res.json();
      console.log('Delete response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete stock');
      }
      
      toast.success("Stock deleted successfully");
      fetchStocks();
    } catch (error) {
      console.error('Error deleting stock:', error);
      toast.error(error.message || "Failed to delete stock");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Stock Management</CardTitle>
            <CardDescription>Track and manage your inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Manage your biscuit and pouch inventory below
            </div>
          </CardContent>
        </Card>

        <div>
          {/* Raw Materials Box */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Raw Materials</CardTitle>
              <CardDescription>Current stock of biscuits and pouches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Get biscuit and pouch items */}
              {stocks
                .filter(item => item.type === 'raw_material' && (item.category === 'biscuit' || item.category === 'pouch'))
                .reduce((uniqueItems, item) => {
                  const existingItem = uniqueItems.find(ui => ui.category === item.category);
                  if (!existingItem) {
                    uniqueItems.push(item);
                  }
                  return uniqueItems;
                }, [] as StockItem[])
                .map((item) => (
                <div key={item._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-medium">{item.category === 'biscuit' ? 'Biscuit' : 'Pouch'}</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="text-2xl font-bold text-primary">
                      {item.category === 'biscuit' ? `${item.quantity.toFixed(2)} KGs` : `${Math.floor(item.quantity)} pieces`}
                    </p>
                  </div>
                  {item.category === 'biscuit' ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Enter KGs to add"
                            id={`add-${item._id}`}
                          />
                          <Button 
                            variant="default"
                            onClick={async () => {
                              const input = document.getElementById(`add-${item._id}`) as HTMLInputElement;
                              const value = parseFloat(input.value || "0");
                              if (value > 0) {
                                const newQuantity = item.quantity + value;
                                await handleUpdateStock(item._id, newQuantity);
                                input.value = "";
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <Button variant="outline" onClick={async () => {
                          const newQuantity = item.quantity - 0.1;
                          if (newQuantity >= 0) {
                            await handleUpdateStock(item._id, newQuantity);
                          }
                        }}>-0.1</Button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Enter KGs to remove"
                            className="border-destructive/50"
                            id={`remove-${item._id}`}
                          />
                          <Button 
                            variant="destructive"
                            onClick={async () => {
                              const input = document.getElementById(`remove-${item._id}`) as HTMLInputElement;
                              const value = parseFloat(input.value || "0");
                              if (value > 0 && value <= item.quantity) {
                                const newQuantity = item.quantity - value;
                                await handleUpdateStock(item._id, newQuantity);
                                input.value = "";
                              } else {
                                toast.error("Invalid quantity to remove");
                                input.value = "";
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <Button 
                          variant="destructive" 
                          className="whitespace-nowrap"
                          onClick={async () => {
                            const newQuantity = item.quantity - 1;
                            if (newQuantity >= 0) {
                              await handleUpdateStock(item._id, newQuantity);
                            }
                          }}
                        >
                          -1
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Enter pouches to add"
                            id={`add-${item._id}`}
                          />
                          <Button 
                            variant="default"
                            onClick={async () => {
                              const input = document.getElementById(`add-${item._id}`) as HTMLInputElement;
                              const value = parseFloat(input.value || "0");
                              if (value > 0) {
                                const newQuantity = item.quantity + value;
                                await handleUpdateStock(item._id, newQuantity);
                                input.value = "";
                                toast.success(`Added ${value} pouches successfully. This will update maximum possible packets in FullPacket.`);
                              } else {
                                input.value = "";
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <Button variant="outline" onClick={async () => {
                          const newQuantity = item.quantity - 1;
                          if (newQuantity >= 0) {
                            await handleUpdateStock(item._id, newQuantity);
                          }
                        }}>-1</Button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Enter pouches to remove"
                            className="border-destructive/50"
                            id={`remove-${item._id}`}
                          />
                          <Button 
                            variant="destructive"
                            onClick={async () => {
                              const input = document.getElementById(`remove-${item._id}`) as HTMLInputElement;
                              const value = parseFloat(input.value || "0");
                              if (value > 0 && value <= item.quantity) {
                                const newQuantity = item.quantity - value;
                                await handleUpdateStock(item._id, newQuantity);
                                input.value = "";
                                toast.success(`Removed ${value} pouches successfully. This will update maximum possible packets in FullPacket.`);
                              } else {
                                toast.error(value > item.quantity ? "Not enough pouches available" : "Please enter a valid quantity");
                                input.value = "";
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        <Button 
                          variant="destructive" 
                          className="whitespace-nowrap"
                          onClick={async () => {
                            const newQuantity = item.quantity - 10;
                            if (newQuantity >= 0) {
                              await handleUpdateStock(item._id, newQuantity);
                            }
                          }}
                        >
                          -10
                        </Button>
                      </div>
                    </div>
                  )}
                  {item.category === 'biscuit' && (
                    <div className="mt-4 p-3 bg-secondary/5 rounded-lg">
                      <p className="text-sm font-medium mb-2">Available Package :</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PACKAGE_SIZES.map(size => (
                          <div key={size.value} className="text-sm text-muted-foreground">
                            ≈ {Math.floor((item.quantity * 1000) / size.value)} x {size.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Removed Possible Pouches Required section */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StockManagement;