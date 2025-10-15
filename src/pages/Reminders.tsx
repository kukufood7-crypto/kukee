import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiPath } from "@/lib/api";
// Using REST API instead of Supabase
import { toast } from "sonner";
import { Bell, CheckCircle, Clock } from "lucide-react";

interface Reminder {
  id: string;
  shop_id: string;
  shop_name: string;
  reminder_date: string;
  is_completed: boolean;
  created_at: string;
}

interface Shop {
  id: string;
  shop_name: string;
  last_visit_date: string;
}

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    fetchReminders();
    checkAndCreateReminders();
  }, []);

  const fetchReminders = async () => {
  const res = await fetch(apiPath('/api/reminders'));
    const data = await res.json();
    const now = new Date(); 
    const upcoming = data.filter((r: any) => !r.is_completed && new Date(r.reminder_date) <= now);
    setUpcomingReminders(upcoming);
    setReminders(data.map((r: any) => ({ ...r, id: r._id ? r._id.$oid || r._id : r.id })));
  };

  const checkAndCreateReminders = async () => {
  const shopsRes = await fetch(apiPath('/api/shops'));
  const shops = await shopsRes.json();

    if (shops) {
      const now = new Date(); 
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const shop of shops) {
        const lastVisit = new Date(shop.last_visit_date);
        
        if (lastVisit < oneWeekAgo) {
          // Check if reminder already exists
          const remindersRes = await fetch(apiPath(`/api/reminders`));
          const reminders = await remindersRes.json();
          const existingReminder = reminders.find((r: any) => r.shop_id === shop.id && !r.is_completed);
          if (!existingReminder) {
            await fetch(apiPath('/api/reminders'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop_id: shop.id, shop_name: shop.shop_name, reminder_date: now.toISOString() }),
            });
          }
        }
      }
      fetchReminders();
    }
  };

  const handleComplete = async (reminderId: string, shopId: string) => {
    try {
      await fetch(apiPath(`/api/reminders/${reminderId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      });

      // update shop last_visit_date
      await fetch(apiPath(`/api/shops/${shopId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_visit_date: new Date().toISOString() }),
      });

      toast.success("Reminder marked as completed!");
      fetchReminders();
    } catch (error: any) {
      toast.error(error.message || "Failed to update reminder");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {upcomingReminders.length > 0 && (
          <Card className="border-accent bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Bell className="h-5 w-5 animate-pulse" />
                Active Reminders ({upcomingReminders.length})
              </CardTitle>
              <CardDescription>Shops that need a visit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 border border-accent/20 rounded-lg bg-background"
                >
                  <div>
                    <h3 className="font-semibold text-lg">{reminder.shop_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(reminder.reminder_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleComplete(reminder.id, reminder.shop_id)}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Visited
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">All Reminders</CardTitle>
            <CardDescription>Complete history of shop visit reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reminders yet</p>
              ) : (
                reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-4 border rounded-lg ${
                      reminder.is_completed
                        ? "bg-muted/50 opacity-60"
                        : "hover:bg-muted/50"
                    } transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{reminder.shop_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(reminder.reminder_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          reminder.is_completed
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {reminder.is_completed ? "Completed" : "Pending"}
                      </span>
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

export default Reminders;
