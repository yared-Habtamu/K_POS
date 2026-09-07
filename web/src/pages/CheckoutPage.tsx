import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  CreditCard,
  Building2,
  Upload,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type PaymentMethod = {
  id: string;
  method: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
};

type HardwareDetail = {
  id: string;
  name: string;
  count: number;
  unitPrice: number;
};

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const {
    martId,
    martName = "Your Supermarket",
    packageName = "1 Month",
    packageMonths = 1,
    packagePrice = 1000,
    hardwareDetails = [] as HardwareDetail[],
  } = state;

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // fetch active payment methods
    const fetchMethods = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/subscriptions/payment-methods`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPaymentMethods(data);
            setSelectedMethod(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load payment methods", err);
      }
    };
    fetchMethods();
  }, [API_BASE]);

  const isFreePackage = Number(packageMonths) === 0;
  
  // Calculate hardware total from the hardware selected earlier in the flow
  const hardwareTotal = hardwareDetails.reduce((sum, hd) => sum + hd.count * hd.unitPrice, 0);
  
  const hasHardware = hardwareDetails.length > 0;
  const grandTotal = packagePrice + hardwareTotal;
  // Free package with no hardware requires no payment/screenshot
  const skipPayment = isFreePackage && !hasHardware;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard", description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const submitPayment = async (withReceipt: boolean) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("martId", String(martId || ""));
      formData.append("packageMonths", String(packageMonths));
      formData.append("paymentMethod", selectedMethod ? selectedMethod.method : "Bank Transfer");
      formData.append("paymentReference", paymentReference);
      
      // Send hardware details as JSON (selected earlier in the flow)
      formData.append("hardwareDetails", JSON.stringify(hardwareDetails));
      
      if (withReceipt && receiptFile) {
        formData.append("receipt", receiptFile);
      }

      // Get user token if logged in
      const authUserStr = localStorage.getItem("auth-storage");
      let token = "";
      if (authUserStr) {
        try {
          const parsed = JSON.parse(authUserStr);
          token = parsed?.state?.user?.token || "";
        } catch {}
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/subscriptions/pay`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to submit payment screenshot.");
      }

      setIsSuccess(true);
      if (skipPayment) {
        toast({
          title: "Free Plan Registration Submitted!",
          description: "Your free 7-day plan request has been sent for admin approval.",
        });
      } else {
        toast({
          title: "Payment Screenshot Submitted!",
          description: "Your payment receipt has been uploaded and sent for admin review.",
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Submission Error",
        description: err.message || "Could not submit payment screenshot.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    // For free package with no hardware, no screenshot is required
    if (!skipPayment && !receiptFile) {
      toast({
        title: "Screenshot Required",
        description: "Please upload your payment transfer receipt/screenshot.",
        variant: "destructive",
      });
      return;
    }
    await submitPayment(!skipPayment);
  };

  const handleSkipPayment = async () => {
    await submitPayment(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full">
          <Card className="border-emerald-500/30 shadow-xl text-center">
            <CardContent className="pt-8 pb-8 px-6 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {skipPayment ? "Free Plan Registration Submitted!" : "Order & Payment Submitted!"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Thank you for registering <strong className="text-foreground">{martName}</strong>. Your {skipPayment ? "free 7-day plan" : "subscription & hardware request"} is under review by our System Admin team.
                </p>
              </div>

              <div className="bg-emerald-500/5 rounded-xl p-4 text-left border border-emerald-500/20 text-sm space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground font-semibold">Total Payable Amount:</span>
                  <span className="font-extrabold text-lg text-emerald-600">
                    {grandTotal === 0 ? "Free" : `${grandTotal.toLocaleString()} ETB`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subscription Package:</span>
                  <span className="font-medium">
                    {packageName} {packagePrice > 0 ? `(${packagePrice.toLocaleString()} ETB)` : "(Free)"}
                  </span>
                </div>
                {hasHardware && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Hardware Add-ons:</span>
                    <span className="font-medium">
                      {hardwareDetails.map(hd => `${hd.count} ${hd.name}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/login")}>
                  Proceed to Login
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Badge variant="outline" className="px-3 py-1 bg-primary/10 text-primary border-primary/20 gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-primary" /> Secure Checkout
          </Badge>
        </div>

        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Complete Your Payment</h1>
          <p className="text-muted-foreground text-sm">
            Transfer the total payable amount via bank / mobile wallet and upload your payment screenshot.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Order Summary Column */}
          <div className="md:col-span-5 space-y-6">
            <Card className="shadow-sm border-border">
              <CardHeader className="bg-muted/40 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Order Summary
                </CardTitle>
                <CardDescription>Target Mart: <strong className="text-foreground">{martName}</strong></CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Subscription Item */}
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="font-semibold text-sm">{packageName} Subscription</p>
                    <p className="text-xs text-muted-foreground">Kiya POS ERP License</p>
                  </div>
                  <p className="font-bold text-sm">{packagePrice.toLocaleString()} ETB</p>
                </div>

                {/* Hardware Add-ons (read-only summary) */}
                <div className="space-y-3 pt-2 border-b border-border/50 pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hardware Add-ons</p>
                  
                  {hasHardware ? (
                    hardwareDetails.map((hd) => (
                      <div key={hd.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold">{hd.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {hd.unitPrice.toLocaleString()} ETB / unit
                          </p>
                        </div>
                        <p className="text-xs font-bold">
                          {hd.count} × {hd.unitPrice.toLocaleString()} ETB
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No hardware add-ons selected</p>
                  )}
                </div>

                {/* Total Payable Amount */}
                <div className="pt-2 bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Payable Amount:</span>
                  <span className="text-2xl font-black text-primary block">
                    {grandTotal === 0 ? "Free" : `${grandTotal.toLocaleString()} ETB`}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Includes {packageName} Subscription {packagePrice > 0 ? `(${packagePrice.toLocaleString()} ETB)` : "(Free)"}
                    {hardwareDetails.map(hd => ` + ${hd.name} (${(hd.count * hd.unitPrice).toLocaleString()} ETB)`).join('')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 shadow-none">
              <CardContent className="p-4 flex gap-3 text-xs text-foreground">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Fast Account Activation</p>
                  <p className="text-muted-foreground">Once system admins review your payment receipt, your mart status will update to active immediately.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment & Upload Column */}
          <div className="md:col-span-7 space-y-6">
            {!skipPayment && (
            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Select Transfer Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedMethod(pm)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedMethod?.id === pm.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="font-semibold text-xs text-foreground truncate">{pm.method}</span>
                        {selectedMethod?.id === pm.id && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{pm.bankName}</p>
                    </button>
                  ))}
                </div>

                {selectedMethod && (
                  <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Bank Name</span>
                      <span className="font-semibold text-foreground">{selectedMethod.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Account Name</span>
                      <span className="font-semibold text-foreground">{selectedMethod.accountName}</span>
                    </div>
                    <div className="flex items-center justify-between bg-card p-2.5 rounded-lg border border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="font-mono font-bold text-base text-primary">{selectedMethod.accountNumber}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => handleCopy(selectedMethod.accountNumber, "accNo")}
                      >
                        {copiedKey === "accNo" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-primary" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{selectedMethod.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            <Card className="shadow-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {skipPayment ? "Free Plan Registration" : "Payment & Upload"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {skipPayment ? (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20 text-sm space-y-1">
                      <p className="font-semibold text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Free 7-Day Plan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        No payment is required for the free plan. Your registration will be sent for admin approval to activate your 7-day free trial.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleSkipPayment}
                      disabled={isSubmitting}
                      className="w-full text-base h-12 shadow-lg font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...
                        </>
                      ) : (
                        "Complete Free Registration"
                      )}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="paymentReference">Transaction Reference / FT Number (Optional)</Label>
                      <Input
                        id="paymentReference"
                        placeholder="e.g. FT240831092 or Telebirr Trans ID"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Payment Receipt / Screenshot <span className="text-destructive">*</span></Label>
                      <div className="border-2 border-dashed border-border hover:border-primary rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-muted/20">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          required
                        />
                        {receiptPreview ? (
                          <div className="space-y-2">
                            <img src={receiptPreview} alt="Receipt preview" className="max-h-48 mx-auto rounded-lg shadow-sm border" />
                            <p className="text-xs text-primary font-medium">Click to change screenshot image</p>
                          </div>
                        ) : (
                          <div className="space-y-2 py-4">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                            <p className="text-sm font-medium">Drag and drop or click to upload receipt</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG or WebP up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full text-base h-12 shadow-lg font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting Screenshot...
                        </>
                      ) : (
                        "Submit Payment Receipt"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
