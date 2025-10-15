import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DogIcon, CheckCircle2 } from "lucide-react";

const ADMIN_CREDENTIALS = {
  email: "kuku@admin",
  password: "kuku@123"
};

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      navigate("/dashboard");
    }
    return () => clearInterval(timer);
  }, [showSuccess, countdown, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem("adminAccess", "true");
      setShowSuccess(true);
    } else {
      toast.error("Invalid email or password");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <Card className="w-full max-w-md mx-4 shadow-2xl border-primary">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-bounce">
              <DogIcon className="w-12 h-12 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Welcome to KUKEE</CardTitle>
            <CardDescription className="text-base">Sign in to manage your dog biscuit business</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
              <Button type="submit" className="w-full" size="lg">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccess} onOpenChange={(open) => {
        if (!open) {
          navigate("/dashboard");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-500 animate-bounce" />
              Access Granted!
            </DialogTitle>
            <DialogDescription className="text-lg">
              Welcome to KUKU Biscuit Management System
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <div className="w-24 h-24 mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 bg-primary/40 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <DogIcon className="w-12 h-12 text-primary animate-bounce" />
              </div>
            </div>
            <p className="text-center text-muted-foreground">
              Redirecting to dashboard in <span className="font-bold text-primary">{countdown}</span> seconds...
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto"
            >
              Enter Now
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccess(false);
                setEmail("");
                setPassword("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Auth;
