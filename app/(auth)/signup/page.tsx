'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f7f8] p-5">
        <Card className="w-full max-w-[390px] rounded-[26px] border-black/[.06] p-2 shadow-[0_18px_70px_rgba(0,0,0,.08)]">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f8] p-5">
      <Card className="w-full max-w-[390px] rounded-[26px] border-black/[.06] bg-white p-2 shadow-[0_18px_70px_rgba(0,0,0,.08)]">
        <CardHeader className="pt-8">
          <div className="mb-6 grid size-9 place-items-center rounded-xl bg-black text-sm font-semibold text-white">F</div>
          <CardTitle className="text-[29px] tracking-[-.05em]">Begin improving.</CardTitle>
          <CardDescription className="pt-1">Create your Framewise account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="mt-2 w-full rounded-full bg-black" disabled={loading}>
              {loading ? 'Creating account...' : 'Continue'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-black underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
