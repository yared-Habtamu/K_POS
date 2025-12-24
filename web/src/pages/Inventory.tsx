// src/pages/Inventory.tsx
import { useState, useEffect } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useProductStore } from "@/stores/productStore";

const ITEMS_PER_PAGE = 7; // ✅ 7 items per page

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // ✅ Pagination state
  const { products, isLoading, fetchProducts, fetchError } = useProductStore();

  // ensure store is refreshed when this page mounts
  useEffect(() => {
    (async () => {
      try {
        await fetchProducts?.();
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchProducts]);

  // map store fields into local-friendly naming (products already normalized in store)
  const loading = isLoading;
  const error = fetchError || null;

  const filteredProducts = search
    ? products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode || "").includes(search) ||
          (p.category || "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // ✅ Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <RoleLayout allowedRoles={["owner", "manager", "store_keeper"]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search by name, barcode or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Inventory Table */}
            {loading && (
              <div className="py-6 text-center">Loading products...</div>
            )}
            {error && (
              <div className="py-6 text-center text-destructive">{error}</div>
            )}
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[10%]">Img</TableHead>
                    <TableHead className="text-xs w-[30%]">Name</TableHead>
                    <TableHead className="text-xs w-[25%]">Category</TableHead>
                    <TableHead className="text-xs w-[15%]">Sold</TableHead>
                    <TableHead className="text-xs w-[20%]">Remain</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product) => {
                      // prefer computed sold (_sold) if present (from sales aggregation)
                      const sold = Math.max(0, Number(product._sold || 0));

                      // product.quantity is authoritative remaining (backend decrements it on sale)
                      const remaining = Number(product.quantity ?? product.supermarketQuantity ?? product.storeQuantity ?? 0);

                      return (
                        <TableRow
                          key={product.id}
                          className="h-20 align-middle"
                        >
                          <TableCell className="py-4">
                            {product.pictureUrl ? (
                              <img
                                src={product.pictureUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted" />
                            )}
                          </TableCell>

                          <TableCell className="text-xs py-4">
                            {product.name}
                          </TableCell>

                          <TableCell className="text-xs py-4">
                            {product.category}
                          </TableCell>

                          <TableCell className="text-xs py-4">{sold}</TableCell>

                          <TableCell className="text-xs py-4">
                            {remaining}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-muted-foreground"
                      >
                        {search ? "No products found" : "No products available"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ✅ PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                  Showing <span className="font-medium">{startIndex + 1}</span>–
                  <span className="font-medium">
                    {Math.min(
                      startIndex + ITEMS_PER_PAGE,
                      filteredProducts.length
                    )}
                  </span>{" "}
                  of
                  <span className="font-medium">
                    {" "}
                    {filteredProducts.length}
                  </span>{" "}
                  products
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    )
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
