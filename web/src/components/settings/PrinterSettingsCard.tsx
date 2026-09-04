import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";
import type { UserRole } from "@/types";
import { CheckCircle, XCircle, Loader2, Search } from "lucide-react";

type PrinterSettingsCardProps = {
  role: UserRole;
  title?: string;
  description?: string;
};

export function PrinterSettingsCard({
  role,
  title = "Device / Printer",
  description,
}: PrinterSettingsCardProps) {
  const { toast } = useToast();
  const printNodeId = useSettingsStore((s) => s.printNodeId);
  const setPrintNodeId = useSettingsStore((s) => s.setPrintNodeId);

  const [printNodeStatus, setPrintNodeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [printNodePrinters, setPrintNodePrinters] = useState<{ id: number; name: string }[]>([]);
  const [autoDetecting, setAutoDetecting] = useState(false);

  // Check PrintNode status and auto-detect printer if needed
  useEffect(() => {
    const check = async () => {
      try {
        const health = await printNodeBridge.getPrintNodeHealth();
        setPrintNodeStatus(health.reachable ? "online" : health.configured ? "offline" : "offline");
        
        if (health.reachable) {
          const printers = await printNodeBridge.listPrinters();
          setPrintNodePrinters(printers.map((p) => ({ id: p.id, name: p.name })));
          
          // Auto-detect printer if none is set
          if (!printNodeId && printers.length > 0) {
            setPrintNodeId(printers[0].id);
            toast({
              title: "Printer auto-detected",
              description: `Using: ${printers[0].name}`,
            });
          }
        }
      } catch {
        setPrintNodeStatus("offline");
      }
    };
    check();
  }, []);

  // Manual auto-detect
  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      const printers = await printNodeBridge.listPrinters();
      setPrintNodePrinters(printers.map((p) => ({ id: p.id, name: p.name })));
      
      if (printers.length > 0) {
        setPrintNodeId(printers[0].id);
        toast({
          title: "Printer found",
          description: `Using: ${printers[0].name}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "No printers found",
          description: "Ensure PrintNode Client is running with a connected printer",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Detection failed",
        description: "Cannot connect to PrintNode",
      });
    } finally {
      setAutoDetecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 max-w-xl">

          {/* Status Bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {printNodeStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {printNodeStatus === "online" && <CheckCircle className="h-4 w-4 text-green-500" />}
            {printNodeStatus === "offline" && <XCircle className="h-4 w-4 text-orange-500" />}
            <span className="text-sm font-medium">
              {printNodeStatus === "online" ? "PrintNode Connected" : printNodeStatus === "offline" ? "PrintNode Offline" : "Checking..."}
            </span>
            {printNodeStatus === "online" && <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">Active</Badge>}
          </div>

          {/* Printer Selection */}
          <div>
            <Label>Printer</Label>
            
            {/* Current printer display */}
            {printNodeId ? (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm">
                  Using printer ID: <span className="font-mono font-bold">{printNodeId}</span>
                </p>
                {printNodePrinters.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {printNodePrinters.find(p => p.id === printNodeId)?.name || "Unknown printer"}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm text-muted-foreground">
                  {autoDetecting ? "Detecting printer..." : "No printer detected"}
                </p>
              </div>
            )}
            
            {/* Auto-detect button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              disabled={autoDetecting || printNodeStatus !== "online"}
              className="mt-2"
            >
              {autoDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {printNodeId ? "Detect Different Printer" : "Auto-Detect Printer"}
            </Button>
            
            {/* Available printers list */}
            {printNodePrinters.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium">Available printers:</p>
                {printNodePrinters.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPrintNodeId(p.id)}
                    className={`block w-full text-left text-xs p-2 rounded border ${
                      printNodeId === p.id ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    {p.name} (ID: {p.id})
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              Ensure PrintNode Client is running on this computer with a connected printer.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            PrintNode sends print jobs from the cloud to the PrintNode Client on this computer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
