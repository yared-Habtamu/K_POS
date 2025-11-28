import { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProductStore } from '@/stores/productStore';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const { products, searchProducts } = useProductStore();

  const filteredProducts = search ? searchProducts(search) : products;

  return (
    <RoleLayout allowedRoles={['owner', 'manager', 'store_keeper']}>
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
                  {filteredProducts.map((product) => {
                    const sold = Math.max(
                      0,
                      (product.storeQuantity ?? 0) -
                        (product.supermarketQuantity ?? 0)
                    );

                    const remaining =
                      product.supermarketQuantity ??
                      product.quantity ??
                      0;

                    return (
                      <TableRow key={product.id} className="h-20 align-middle">
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
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
