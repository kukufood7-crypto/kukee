import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { apiPath } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Package, CalendarIcon, ArrowUp, ArrowDown, Box, History, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PacketTransaction {
  id: string;
  date: string;
  added: number;
  removed: number;
  balance: number;
}

interface Stock {
  _id: string;
  item_name: string;
  category: 'biscuit' | 'pouch';
  type: 'raw_material' | 'finished_good';
  quantity: number;
  unit: string;
}

const FullPacket = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [addQuantity, setAddQuantity] = useState<number | ''>();
  const [removeQuantity, setRemoveQuantity] = useState<number | ''>();
  const [transactions, setTransactions] = useState<PacketTransaction[]>([]);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [maxPossibleStock, setMaxPossibleStock] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await fetchStockData();
        await fetchTransactions();
      } catch (error) {
        console.error('Failed to initialize data:', error);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Set up interval to refresh stock data every 5 seconds
    const interval = setInterval(() => {
      fetchStockData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch transactions when date changes
  useEffect(() => {
    fetchTransactions();
  }, [selectedDate]);

  const fetchStockData = async () => {
    try {
      // First, get both biscuit and pouch counts
      const stockResponse = await fetch(apiPath('/api/stocks'));
      if (!stockResponse.ok) throw new Error('Failed to fetch stock data');
      const stockData = await stockResponse.json();
      
      const biscuit = stockData.find((item: any) => 
        item.type === 'raw_material' && item.category === 'biscuit'
      );
      const pouch = stockData.find((item: any) => 
        item.type === 'raw_material' && item.category === 'pouch'
      );
      
      const pouchCount = pouch?.quantity || 0;
      const biscuitKgs = biscuit?.quantity || 0;
      
      // Calculate how many pouches we can make with available biscuits
      const biscuitPouchCapacity = Math.floor((biscuitKgs * 1000) / 30); // 30g per pouch
      
      // Set maximum possible to match available pouches (limited by both pouches and biscuit capacity)
      const maxPossible = Math.min(pouchCount, biscuitPouchCapacity);

      console.log('Calculating max capacity:', {
        pouchCount,
        maxPossible
      });
      
      // Update the maximum capacity based on both biscuits and pouches
      await fetch(apiPath('/api/finish-god/max'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pouches: pouchCount,
          maxFinishGod: maxPossible,
          size: '30gm',
          date: new Date().toISOString()
        }),
      });

      // Then fetch current packet balances
      const packetResponse = await fetch(apiPath('/api/finish-god/current'));
      if (!packetResponse.ok) throw new Error('Failed to fetch current balances');
      const balanceData = await packetResponse.json();
      
      // Get current stock of 30gm packets
      const currentStock = balanceData.balances?.['30gm'] || balanceData.balance || 0;
      
      setAvailableStock(currentStock);
      setMaxPossibleStock(pouchCount); // Set max possible to exactly match pouch count

      return true;
    } catch (error) {
      console.error('Error fetching stock:', error);
      throw error;
    }
  };

  const fetchTransactions = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(apiPath(`/api/finish-god/transactions?date=${formattedDate}`));
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      
      // Filter transactions for 30gm size only (for full packets)
      const filteredTransactions = data.filter((t: any) => !t.size || t.size === '30gm');
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    }
  };

  const handleAddPackets = async () => {
    if (!addQuantity || addQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (addQuantity > maxPossibleStock) {
      toast.error(`Cannot add more than ${maxPossibleStock} packets. Maximum is limited by available pouches.`);
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(apiPath('/api/finish-god/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: addQuantity,
          date: selectedDate.toISOString(),
          size: '30gm'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add packets');
      }

      // Calculate biscuit to be reduced (30g per packet)
      const biscuitKgsToReduce = (addQuantity * 30) / 1000;

      // Get current biscuit stock
      const stockResponse = await fetch(apiPath('/api/stocks'));
      const stockData = await stockResponse.json();
      const biscuitStock = stockData.find((item: any) => 
        item.type === 'raw_material' && item.category === 'biscuit'
      );
      const biscuitStockId = biscuitStock?._id;

      if (biscuitStockId) {
        await fetch(apiPath(`/api/stocks/${biscuitStockId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: (biscuitStock?.quantity || 0) - biscuitKgsToReduce,
            ignoreOrders: true
          }),
        });
      }

      const data = await response.json();
      setAvailableStock(data.balance);
      if (typeof (data as any).maxFinishGod === 'number') {
        setMaxPossibleStock((data as any).maxFinishGod as number);
      } else {
        await fetchStockData();
      }
      setAddQuantity('');
      
      toast.success(`Added ${addQuantity} packets`);
      await fetchTransactions();
    } catch (error) {
      console.error('Error adding packets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add packets');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePackets = async () => {
    if (!removeQuantity || removeQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (removeQuantity > availableStock) {
      toast.error(`Cannot remove more than available stock (${availableStock} packets)`);
      return;
    }

    // No need to increase raw materials or pouches when removing packets

    setActionLoading(true);
    try {
      const response = await fetch(apiPath('/api/finish-god/remove'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: removeQuantity,
          date: selectedDate.toISOString(),
          size: '30gm'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add packets');
      }

      // Get current biscuit stock
      const stockResponse = await fetch(apiPath('/api/stocks'));
      const stockData = await stockResponse.json();
      const biscuitStock = stockData.find((item: any) => 
        item.type === 'raw_material' && item.category === 'biscuit'
      );
      const biscuitKgs = biscuitStock?.quantity || 0;

      // Calculate biscuit to be reduced (30g per packet)
      const biscuitKgsToReduce = ((removeQuantity as number) * 30) / 1000;

      // Update biscuit stock
      if (biscuitStock?._id) {
        await fetch(apiPath(`/api/stocks/${biscuitStock._id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: biscuitKgs - biscuitKgsToReduce,
            ignoreOrders: true
          }),
        });
      }

      const data = await response.json();
      setAvailableStock(data.balance);
      if (typeof (data as any).maxFinishGod === 'number') {
        setMaxPossibleStock((data as any).maxFinishGod as number);
      } else {
        await fetchStockData();
      }
      setRemoveQuantity('');
      
      toast.success(`Removed ${removeQuantity} packets`);
      await fetchTransactions();
    } catch (error) {
      console.error('Error removing packets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove packets');
    } finally {
      setActionLoading(false);
    }
  };

  const getTransactionsForDate = (date: Date) => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getDate() === date.getDate() &&
        transactionDate.getMonth() === date.getMonth() &&
        transactionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const selectedDateTransactions = getTransactionsForDate(selectedDate);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Hero Section with Stats */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <h1 className="text-4xl font-bold text-primary mb-4">Full Packet Management</h1>
            <p className="text-muted-foreground text-lg mb-6">Track and manage your full packet inventory efficiently</p>
            
            {/* Stock Information */}
            <div className="mb-6">
              <div className="p-4 rounded-lg border border-primary bg-primary/10">
                <div className="text-lg font-medium">Full Packets</div>
                <div className="text-3xl font-bold text-primary mt-2">Current Stock: {availableStock}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Maximum Possible: {maxPossibleStock} 
                  <span className="ml-1">(based on available pouches)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Management Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  Packet Management
                </CardTitle>
                <CardDescription>Add or remove full packets from inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Action Tabs */}
                  <div className="flex rounded-lg border border-primary/20 p-1">
                    <motion.button
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'add' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                      onClick={() => setActiveTab('add')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowUp className="w-4 h-4" />
                      Add Packets
                    </motion.button>
                    <motion.button
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'remove' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                      onClick={() => setActiveTab('remove')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowDown className="w-4 h-4" />
                      Remove Packets
                    </motion.button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === 'add' ? (
                      <motion.div
                        key="add"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Add Full Packets</label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={addQuantity || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : '';
                                setAddQuantity(value);
                              }}
                              placeholder="Enter quantity to add"
                              min="0"
                              max={maxPossibleStock}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleAddPackets}
                              className="bg-green-500 hover:bg-green-600"
                              disabled={actionLoading}
                            >
                              {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              <span className="ml-2">Add</span>
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Maximum possible: {maxPossibleStock} packets
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="remove"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Remove Full Packets</label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={removeQuantity || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : '';
                                setRemoveQuantity(value);
                              }}
                              placeholder="Enter quantity to remove"
                              min="0"
                              max={availableStock}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleRemovePackets}
                              variant="destructive"
                              disabled={actionLoading}
                            >
                              {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Minus className="w-4 h-4" />
                              )}
                              <span className="ml-2">Remove</span>
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Available stock: {availableStock} packets
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction History Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <div className="flex items-center justify-between w-full">
                    <span>Transaction History</span>
                    <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {selectedDateTransactions.length} Entries
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>View and track inventory changes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Transactions List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : selectedDateTransactions.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transactions for this date
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {selectedDateTransactions.map((transaction, index) => (
                        <motion.div
                          key={`${transaction.id}-${transaction.date}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "p-4 rounded-lg border transition-colors",
                            transaction.added > 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {transaction.added > 0 ? (
                                <div className="p-2 rounded-full bg-green-500/10">
                                  <ArrowUp className="w-4 h-4 text-green-500" />
                                </div>
                              ) : (
                                <div className="p-2 rounded-full bg-red-500/10">
                                  <ArrowDown className="w-4 h-4 text-red-500" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">
                                  {transaction.added > 0 ? (
                                    <span className="text-green-500">+{transaction.added}</span>
                                  ) : (
                                    <span className="text-red-500">-{transaction.removed}</span>
                                  )}
                                  <span className="text-muted-foreground"> packets</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(transaction.date), "h:mm a")}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">Balance</div>
                              <div className="text-lg font-bold text-primary">
                                {transaction.balance}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FullPacket;