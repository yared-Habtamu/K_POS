import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL) || 'support@smartpos.example';
const SUPPORT_PHONE =
  (import.meta.env.VITE_REGISTER_SUPPORT_PHONE as string | undefined) ||
  (import.meta.env.VITE_SUPPORT_PHONE as string | undefined) ||
  '+251-900-000-000';

export default function RegisterWaiting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('pending');
  const [mart, setMart] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/marts/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await res.json();
        if (!mounted) return;
        setMart(data);
        setStatus(data.status || 'pending');
        if (data.status === 'approved') {
          toast({ title: 'Approved', description: 'Your mart was approved. Please login to access owner features.' });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [id]);

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Registration Status</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'pending' && (
            <div>
              <p className="mb-4">Thank you — your registration is under review by the system administrator. This page will update automatically.</p>
              <p className="mb-4">We will contact you at the phone number you provided when the request is processed. If you need help, contact:</p>
              <p className="font-medium">Email: {SUPPORT_EMAIL}</p>
              <p className="font-medium mb-4">Phone: {SUPPORT_PHONE}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div>
              <p className="mb-4">Your mart has been approved. You can now login and access owner features.</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigate('/login')}>Go to Login</Button>
              </div>
            </div>
          )}

          {(status === 'disabled' || status === 'rejected') && (
            <div>
              <p className="mb-4">We're sorry — your registration was not approved.</p>
              <p className="mb-4">Please contact the system administrator for details:</p>
              <p className="font-medium">Email: {SUPPORT_EMAIL}</p>
              <p className="font-medium mb-4">Phone: {SUPPORT_PHONE}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
