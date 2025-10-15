import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Using REST API instead of Supabase
import { toast } from "sonner";
import { apiPath } from "@/lib/api";
import { Trash2, Calculator } from "lucide-react";

interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  month: number;
  year: number;
  description: string;
  created_at: string;
  photo_url?: string;
  name: string;
  date: string;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formData, setFormData] = useState({
    expenseType: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  const fetchExpenses = async () => {
  const res = await fetch(apiPath(`/api/expenses?month=${selectedMonth}&year=${selectedYear}`));
    const data = await res.json();
    setExpenses(data.map((e: any) => ({ ...e, id: e._id ? e._id.$oid || e._id : e.id })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(apiPath('/api/expenses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_type: formData.expenseType,
          amount: parseFloat(formData.amount),
          month: selectedMonth,
          year: selectedYear,
          description: formData.description,
          date: formData.date,
        }),
      });
      if (!res.ok) throw new Error('Failed to add expense');

      toast.success("Expense added successfully!");
      setFormData({
        expenseType: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    }
  };

  const handleDelete = async (id: string) => {
    try {
  const res = await fetch(apiPath(`/api/expenses/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');

      toast.success("Expense deleted");
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Expense Management</CardTitle>
            <CardDescription>Track all business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseType">Expense Type *</Label>
                <Input
                  id="expenseType"
                  value={formData.expenseType}
                  onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                  placeholder="e.g., Light Bill, Loan Charge, Shop Rent"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full">Add Expense</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Expenses for {months[selectedMonth - 1]} {selectedYear}</span>
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-5 w-5" />
                <span className="text-xl font-bold">₹{totalExpenses.toFixed(2)}</span>
              </div>
            </CardTitle>
            <CardDescription>Total monthly expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses recorded for this month</p>
              ) : (
                expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{expense.expense_type}</h3>
                      {(expense.description || expense.date) && (
                        <p className="text-sm text-muted-foreground">
                          {expense.date && <span className="mr-2">{new Date(expense.date).toLocaleDateString()}</span>}
                          {expense.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-primary">₹{expense.amount.toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Expenses;
