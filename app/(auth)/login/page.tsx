'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f8] p-5">
      <Card className="w-full max-w-[390px] rounded-[26px] border-black/[.06] bg-white p-2 shadow-[0_18px_70px_rgba(0,0,0,.08)]">
        <CardHeader className="pt-8">
          <div className="mb-6 grid size-9 place-items-center rounded-xl bg-black text-sm font-semibold text-white">F</div>
          <CardTitle className="text-[29px] tracking-[-.05em]">Welcome back.</CardTitle>
          <CardDescription className="pt-1">Sign in to continue your progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="mt-2 w-full rounded-full bg-black" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-black underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
