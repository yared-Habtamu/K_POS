// src/pages/manager/Assets.tsx
import { useState, useEffect } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ManagerAssets() {
  const [assets, setAssets] = useState<{ id: string; name: string; quantity: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('manager_assets') || '[]'); } catch { return []; }
  });
  const [name, setName] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  useEffect(() => { 
    localStorage.setItem('manager_assets', JSON.stringify(assets)); 
  }, [assets]);

  const add = () => {
    if (!name || qty === '' || Number(qty) <= 0) return;
    setAssets(a => [...a, { id: String(Date.now()), name, quantity: Number(qty) }]);
    setName(''); 
    setQty('');
    setCurrentPage(1); // Reset to first page after adding
  };

  const exportCSV = () => {
    if (!assets.length) return;
    const keys = ['id','name','quantity'];
    const csv = [keys.join(','), ...assets.map(a => `${a.id},"${a.name}",${a.quantity}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'assets.csv'; 
    a.click(); 
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const html = `<h1>Assets</h1><table border="1" cellpadding="8"><tr><th>ID</th><th>Name</th><th>Quantity</th></tr>${assets.map(a=>`<tr><td>${a.id}</td><td>${a.name}</td><td>${a.quantity}</td></tr>`).join('')}</table>`;
    const w = window.open('', '_blank'); 
    if (!w) return; 
    w.document.write(html); 
    w.document.close(); 
    w.print(); 
    w.close();
  };

  // ✅ Pagination logic
  const totalPages = Math.ceil(assets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAssets = assets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
    <RoleLayout allowedRoles={["manager","owner"]}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asset Registration</h1>
            <p className="text-muted-foreground">Register company assets quickly</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} size="sm">Export CSV</Button>
            <Button variant="outline" onClick={printList} size="sm">Print</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input 
                placeholder="Quantity" 
                value={qty === '' ? '' : String(qty)} 
                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g,'') === '' ? '' : Number(e.target.value.replace(/[^0-9]/g,'')))} 
              />
              <Button onClick={add}>Add</Button>
            </div>
            
            <div className="mt-4 space-y-2">
              {paginatedAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets registered</p>
              ) : (
                paginatedAssets.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-accent/50">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {a.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setAssets(s => s.filter(x => x.id !== a.id))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ✅ PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                  Showing <span className="font-medium">{startIndex + 1}</span>–
                  <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, assets.length)}</span> of 
                  <span className="font-medium"> {assets.length}</span> assets
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
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  
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