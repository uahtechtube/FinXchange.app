import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Filter, Download, Search, Calendar, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionList from "@/components/transactions/transaction-list";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, Wallet } from "@shared/schema";

const transactionTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'bank_transfer', label: 'Bank Transfers' },
  { value: 'wallet_transfer', label: 'Wallet Transfers' },
  { value: 'airtime', label: 'Airtime' },
  { value: 'data', label: 'Data' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'cable_tv', label: 'Cable TV' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

export default function Transactions() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const filteredTransactions = (transactions || []).filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt!).getTime();
    const dateB = new Date(b.createdAt!).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const getTransactionStats = () => {
    if (!transactions) return { total: 0, success: 0, pending: 0, failed: 0 };
    
    return transactions.reduce((stats: { total: number; success: number; pending: number; failed: number }, transaction) => {
      stats.total++;
      const status = transaction.status || 'pending';
      if (status === 'success') stats.success++;
      else if (status === 'pending') stats.pending++;
      else if (status === 'failed') stats.failed++;
      return stats;
    }, { total: 0, success: 0, pending: 0, failed: 0 });
  };

  const handleExportTransactions = () => {
    toast({
      title: "Export Started",
      description: "Your transaction history is being prepared for download.",
    });
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance || "0");
    return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const stats = getTransactionStats();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Transaction History</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTransactions}
            className="flex items-center gap-2"
            data-testid="button-export"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Balance Summary */}
        <Card className="gradient-primary text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Current Balance</p>
              <h2 className="text-3xl font-bold mb-4" data-testid="current-balance">
                ₦{formatBalance(wallet?.balance || "0")}
              </h2>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs opacity-90">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.success || 0}</p>
                  <p className="text-xs opacity-90">Success</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending || 0}</p>
                  <p className="text-xs opacity-90">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-transactions"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2"
                data-testid="button-sort"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>
            </div>

            {/* Active Filters */}
            {(typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {typeFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Type: {transactionTypes.find(t => t.value === typeFilter)?.label}
                    <button onClick={() => setTypeFilter('all')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {statusFilters.find(s => s.value === statusFilter)?.label}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs"
                  data-testid="clear-filters"
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </CardTitle>
              {filteredTransactions.length !== transactions?.length && (
                <span className="text-sm text-muted-foreground">
                  of {transactions?.length || 0} total
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">Failed to load transactions</p>
                <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
              </div>
            ) : (
              <TransactionList
                transactions={filteredTransactions}
                showAll={true}
                onTransactionClick={(transaction) => {
                  toast({
                    title: "Transaction Details",
                    description: `${transaction.description} - ₦${parseFloat(transaction.amount).toLocaleString()}`,
                  });
                }}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
