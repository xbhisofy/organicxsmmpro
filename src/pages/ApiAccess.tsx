import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Key,
    Copy,
    RefreshCw,
    Eye,
    EyeOff,
    Code2,
    CheckCircle2,
    Globe,
    ShoppingCart,
    Wallet,
    ListOrdered,
    ChevronRight,
    Zap,
    Shield,
    AlertCircle,
} from 'lucide-react';

// Detect Supabase project URL for showing API base URL
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1/public-api`;

function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export default function ApiAccess() {
    const { user, profile, refreshProfile } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const apiKey: string | null = (profile as any)?.api_key ?? null;

    const handleGenerateKey = async () => {
        if (!user) return;
        setIsGenerating(true);
        try {
            const newKey = generateApiKey();
            const { error } = await supabase
                .from('profiles')
                .update({ api_key: newKey })
                .eq('user_id', user.id);

            if (error) throw error;
            await refreshProfile();
            toast.success('API Key generated successfully!');
            setShowKey(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate API key');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const maskedKey = apiKey
        ? apiKey.slice(0, 8) + '••••••••••••••••••••••••••••••••' + apiKey.slice(-6)
        : null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-10">
                {/* Header */}
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/80 via-card to-card border border-border p-6 sm:p-8">
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg shrink-0">
                            <Code2 className="h-7 w-7 text-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-normal">API Access</h1>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                                Generate your API key and use it in your own panel — same services, same rates.
                            </p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
                </div>

                {/* API Key Card */}
                <div className="rounded-lg bg-secondary border border-border p-6 space-y-5">
                    <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <h2 className="text-base font-semibold text-foreground">Your API Key</h2>
                    </div>

                    {apiKey ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary border border-border group">
                                <code className="flex-1 text-[13px] font-mono text-primary truncate select-all">
                                    {showKey ? apiKey : maskedKey}
                                </code>
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="shrink-0 text-muted-foreground hover:text-muted-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
                                    title={showKey ? 'Hide key' : 'Show key'}
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => handleCopy(apiKey)}
                                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10"
                                    title="Copy"
                                >
                                    {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                <Shield className="h-3.5 w-3.5 text-warning" />
                                <span>Keep this key secret. Never share it with anyone.</span>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateKey}
                                disabled={isGenerating}
                                className="text-muted-foreground border-border hover:text-foreground hover:bg-secondary hover:border-border"
                            >
                                {isGenerating ? (
                                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                )}
                                Regenerate Key
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-10 space-y-4">
                            <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto">
                                <Key className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-foreground font-medium">No API key yet</p>
                                <p className="text-sm text-muted-foreground mt-1">Generate one with the button below</p>
                            </div>
                            <Button
                                onClick={handleGenerateKey}
                                disabled={isGenerating}
                                className="bg-primary hover:bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            >
                                {isGenerating ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Zap className="h-4 w-4 mr-2" />
                                )}
                                Generate API Key
                            </Button>
                        </div>
                    )}
                </div>

                {/* API Base URL */}
                <div className="rounded-lg bg-secondary border border-border p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-accent" />
                        <h2 className="text-base font-semibold text-foreground">API Base URL</h2>
                    </div>
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary border border-border">
                        <code className="flex-1 text-[13px] font-mono text-accent break-all">{API_BASE}</code>
                        <button
                            onClick={() => handleCopy(API_BASE)}
                            className="shrink-0 text-muted-foreground hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-accent/10"
                        >
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* API Documentation */}
                <div className="rounded-lg bg-secondary border border-border p-6 space-y-6">
                    <div className="flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-success" />
                        <h2 className="text-base font-semibold text-foreground">API Endpoints</h2>
                    </div>

                    {/* Notice */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/5 border border-warning/20">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                        <p className="text-xs text-warning">
                            Saare requests ko <code className="bg-warning/10 px-1 py-0.5 rounded text-warning">POST</code> method se bhejein aur body mein <code className="bg-warning/10 px-1 py-0.5 rounded text-warning">key</code> field zaroori hai.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* services */}
                        <EndpointCard
                            icon={<ListOrdered className="h-4 w-4 text-success" />}
                            method="POST"
                            action="services"
                            label="Services List"
                            description="Sare available services aur unke rates dekkhein"
                            request={`{\n  "key": "YOUR_API_KEY",\n  "action": "services"\n}`}
                            response={`{\n  "status": "ok",\n  "services": [\n    {\n      "service": 1001,\n      "name": "Instagram Followers",\n      "category": "Instagram",\n      "rate": "0.50",\n      "min": 100,\n      "max": 50000\n    }\n  ]\n}`}
                            onCopyRequest={() =>
                                handleCopy(`{\n  "key": "${apiKey || 'YOUR_API_KEY'}",\n  "action": "services"\n}`)
                            }
                        />

                        {/* add */}
                        <EndpointCard
                            icon={<ShoppingCart className="h-4 w-4 text-primary" />}
                            method="POST"
                            action="add"
                            label="Place Order"
                            description="Place a new order (amount is deducted from your wallet)"
                            request={`{\n  "key": "YOUR_API_KEY",\n  "action": "add",\n  "service": 1001,\n  "link": "https://instagram.com/p/...",\n  "quantity": 1000\n}`}
                            response={`{\n  "status": "ok",\n  "order": 78432\n}`}
                            onCopyRequest={() =>
                                handleCopy(
                                    `{\n  "key": "${apiKey || 'YOUR_API_KEY'}",\n  "action": "add",\n  "service": 1001,\n  "link": "https://instagram.com/p/...",\n  "quantity": 1000\n}`
                                )
                            }
                        />

                        {/* status */}
                        <EndpointCard
                            icon={<ChevronRight className="h-4 w-4 text-accent" />}
                            method="POST"
                            action="status"
                            label="Order Status"
                            description="Check the status of any order"
                            request={`{\n  "key": "YOUR_API_KEY",\n  "action": "status",\n  "order": 78432\n}`}
                            response={`{\n  "status": "ok",\n  "order": {\n    "order_number": 78432,\n    "status": "processing",\n    "quantity": 1000,\n    "remains": 250,\n    "service": "Instagram Followers"\n  }\n}`}
                            onCopyRequest={() =>
                                handleCopy(
                                    `{\n  "key": "${apiKey || 'YOUR_API_KEY'}",\n  "action": "status",\n  "order": 78432\n}`
                                )
                            }
                        />

                        {/* balance */}
                        <EndpointCard
                            icon={<Wallet className="h-4 w-4 text-warning" />}
                            method="POST"
                            action="balance"
                            label="Check Balance"
                            description="Check your wallet balance"
                            request={`{\n  "key": "YOUR_API_KEY",\n  "action": "balance"\n}`}
                            response={`{\n  "status": "ok",\n  "balance": "2120.90",\n  "currency": "INR"\n}`}
                            onCopyRequest={() =>
                                handleCopy(`{\n  "key": "${apiKey || 'YOUR_API_KEY'}",\n  "action": "balance"\n}`)
                            }
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// --- Helper Component ---

interface EndpointCardProps {
    icon: React.ReactNode;
    method: string;
    action: string;
    label: string;
    description: string;
    request: string;
    response: string;
    onCopyRequest: () => void;
}

function EndpointCard({
    icon,
    action,
    label,
    description,
    request,
    response,
    onCopyRequest,
}: EndpointCardProps) {
    const [tab, setTab] = useState<'request' | 'response'>('request');

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/60">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
                <span className="text-[10px] font-mono bg-secondary text-muted-foreground px-2 py-1 rounded-md border border-border">
                    action: "{action}"
                </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-secondary">
                <button
                    onClick={() => setTab('request')}
                    className={`flex-1 py-2 text-[12px] font-medium transition-colors ${tab === 'request' ? 'text-foreground border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-muted-foreground'
                        }`}
                >
                    Request
                </button>
                <button
                    onClick={() => setTab('response')}
                    className={`flex-1 py-2 text-[12px] font-medium transition-colors ${tab === 'response' ? 'text-foreground border-b-2 border-success bg-success/5' : 'text-muted-foreground hover:text-muted-foreground'
                        }`}
                >
                    Response
                </button>
            </div>

            {/* Code block */}
            <div className="relative bg-card p-4 group">
                <pre className="text-[12px] font-mono text-muted-foreground whitespace-pre overflow-x-auto">
                    {tab === 'request' ? request : response}
                </pre>
                {tab === 'request' && (
                    <button
                        onClick={onCopyRequest}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-muted-foreground p-1.5 rounded-lg hover:bg-secondary"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
