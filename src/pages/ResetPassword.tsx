import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    const t = setTimeout(() => setReady((r) => { if (!r) setError('This reset link is invalid or expired. Please request a new one.'); return r; }), 6000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password.length > 512) return setError('Password is too long');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => navigate('/engagement-order', { replace: true }), 1500);
  };

  const inputClass = "h-12 rounded-xl bg-white/[0.04] border border-white/10 focus:border-purple-400/60 !text-white font-medium px-4 placeholder:text-white/65";

  return (
    <div className="min-h-screen w-full bg-[#030303] text-white flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.03] p-7">
        <h1 className="!text-white text-3xl font-extrabold tracking-tight mb-1.5">Set new password</h1>
        <p className="text-[13px] mb-7 text-white/80">Choose a new password for your account.</p>
        {done ? (
          <p className="text-[13px] font-medium text-emerald-300">Password updated! Redirecting…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-[12px] font-semibold mb-1.5 block text-white/70">New password</Label>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-11`} placeholder="••••••••" disabled={!ready} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/75">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-semibold mb-1.5 block text-white/70">Confirm password</Label>
              <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="••••••••" disabled={!ready} />
            </div>
            {error && <p className="text-[13px] font-medium text-red-400">{error}</p>}
            <button type="submit" disabled={busy || !ready} className="w-full h-11 rounded-xl text-[13px] font-semibold text-black bg-white hover:bg-purple-50 flex items-center justify-center gap-2 disabled:opacity-70">
              {busy || !ready ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Update password <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
            <Link to="/auth" className="block text-center text-[13px] text-white/80 hover:text-white">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
