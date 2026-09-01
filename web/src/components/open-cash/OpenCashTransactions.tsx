import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { getImageUrl, handleImageError } from "@/utils/imageUrl";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, ImageIcon } from "lucide-react";
import type { OpenCashRequestDTO } from "@/types";

interface OpenCashTransactionsProps {
  requests: OpenCashRequestDTO[];
}

export function OpenCashTransactions({ requests }: OpenCashTransactionsProps) {
  const { t } = useTranslation();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return formatLocalizedDate(parsed, { withTime: true });
  };

  return (
    <>
      <div className="overflow-x-auto">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("no_transactions", {
              defaultValue: "No transactions found.",
            })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("request_date", { defaultValue: "Request Date" })}
                </TableHead>
                <TableHead>
                  {t("direction", { defaultValue: "Direction" })}
                </TableHead>
                <TableHead className="text-right">
                  {t("amount", { defaultValue: "Amount" })}
                </TableHead>
                <TableHead>
                  {t("receipt_image", { defaultValue: "Receipt Image" })}
                </TableHead>
                <TableHead>
                  {t("requester", { defaultValue: "Requester" })}
                </TableHead>
                <TableHead>
                  {t("approver", { defaultValue: "Approver" })}
                </TableHead>
                <TableHead>
                  {t("status", { defaultValue: "Status" })}
                </TableHead>
                <TableHead>
                  {t("decision_date", { defaultValue: "Decision Date" })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.direction === "allocation" ? "default" : "outline"}
                      className="gap-1"
                    >
                      {r.direction === "allocation" ? (
                        <ArrowDownToLine className="h-3 w-3" />
                      ) : (
                        <ArrowUpFromLine className="h-3 w-3" />
                      )}
                      {r.direction === "allocation"
                        ? t("allocation", { defaultValue: "Allocation" })
                        : t("return", { defaultValue: "Return" })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(r.amount || 0).toLocaleString()} ETB
                  </TableCell>
                  <TableCell>
                    {r.receiptUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs"
                        onClick={() => setReceiptUrl(getImageUrl(r.receiptUrl))}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {t("view_receipt", { defaultValue: "View" })}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.requesterName || r.requesterId || "-"}
                  </TableCell>
                  <TableCell>
                    {r.approverName || r.approverId || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status === "approved"
                        ? t("approved", { defaultValue: "Approved" })
                        : r.status === "rejected"
                          ? t("rejected", { defaultValue: "Rejected" })
                          : t("pending", { defaultValue: "Pending" })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(r.decidedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(receiptUrl)} onOpenChange={() => setReceiptUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("receipt_image", { defaultValue: "Receipt Image" })}
            </DialogTitle>
          </DialogHeader>
          {receiptUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={receiptUrl}
                alt={t("receipt_image", { defaultValue: "Receipt" })}
                className="max-h-[60vh] w-auto rounded-md border"
                onError={handleImageError}
              />
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                {t("open_in_new_tab", { defaultValue: "Open in new tab" })}
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OpenCashTransactions;
