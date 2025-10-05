import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from "@/lib/offline-storage";

export interface OfflineTransaction {
  id: string;
  type: 'bank_transfer' | 'wallet_transfer' | 'airtime' | 'data';
  amount: string;
  description: string;
  recipientDetails: any;
  metadata?: any;
  timestamp: number;
  status: 'queued' | 'processing' | 'failed';
}

export function useOfflineQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queuedTransactions, setQueuedTransactions] = useState<OfflineTransaction[]>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Processing queued transactions...",
      });
      processQueuedTransactions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Transactions will be queued for processing when you're back online.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queued transactions on mount
  useEffect(() => {
    if (user) {
      loadQueuedTransactions();
    }
  }, [user]);

  const loadQueuedTransactions = async () => {
    if (!user) return;
    
    try {
      const queue = await getOfflineQueue(user.id);
      setQueuedTransactions(queue);
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  };

  const addTransactionToQueue = useCallback(async (transaction: Omit<OfflineTransaction, 'id' | 'timestamp' | 'status'>) => {
    if (!user) return;

    const queuedTransaction: OfflineTransaction = {
      ...transaction,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'queued',
    };

    try {
      await addToOfflineQueue(user.id, queuedTransaction);
      setQueuedTransactions(prev => [...prev, queuedTransaction]);
      
      toast({
        title: "Transaction Queued",
        description: "Your transaction has been saved and will be processed when you're back online.",
      });
    } catch (error) {
      console.error('Failed to queue transaction:', error);
      toast({
        title: "Queue Failed",
        description: "Failed to save transaction for offline processing.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const processQueuedTransactions = async () => {
    if (!user || !isOnline || isProcessing || queuedTransactions.length === 0) return;

    setIsProcessing(true);

    for (const transaction of queuedTransactions) {
      if (transaction.status !== 'queued') continue;

      try {
        // Update status to processing
        setQueuedTransactions(prev => 
          prev.map(t => t.id === transaction.id ? { ...t, status: 'processing' } : t)
        );

        // Determine endpoint based on transaction type
        let endpoint = '';
        switch (transaction.type) {
          case 'bank_transfer':
            endpoint = '/api/transfer/bank';
            break;
          case 'wallet_transfer':
            endpoint = '/api/transfer/wallet';
            break;
          case 'airtime':
          case 'data':
            endpoint = '/api/bills/purchase';
            break;
          default:
            throw new Error('Unknown transaction type');
        }

        // Make API request
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ...transaction.recipientDetails,
            amount: transaction.amount,
            description: transaction.description,
            ...transaction.metadata,
          }),
        });

        if (response.ok) {
          // Transaction successful - remove from queue
          await removeFromOfflineQueue(user.id, transaction.id);
          setQueuedTransactions(prev => prev.filter(t => t.id !== transaction.id));
          
          toast({
            title: "Transaction Processed",
            description: `${transaction.description} completed successfully.`,
          });
        } else {
          // Transaction failed - mark as failed
          setQueuedTransactions(prev => 
            prev.map(t => t.id === transaction.id ? { ...t, status: 'failed' } : t)
          );
          
          toast({
            title: "Transaction Failed",
            description: `${transaction.description} could not be processed.`,
            variant: "destructive",
          });
        }

      } catch (error) {
        console.error('Failed to process queued transaction:', error);
        
        // Mark as failed
        setQueuedTransactions(prev => 
          prev.map(t => t.id === transaction.id ? { ...t, status: 'failed' } : t)
        );
      }

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    
    // Refresh data after processing
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  };

  const retryFailedTransaction = async (transactionId: string) => {
    setQueuedTransactions(prev => 
      prev.map(t => t.id === transactionId ? { ...t, status: 'queued' } : t)
    );
    
    if (isOnline) {
      processQueuedTransactions();
    }
  };

  const removeTransaction = async (transactionId: string) => {
    if (!user) return;

    try {
      await removeFromOfflineQueue(user.id, transactionId);
      setQueuedTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      toast({
        title: "Transaction Removed",
        description: "Transaction removed from queue.",
      });
    } catch (error) {
      console.error('Failed to remove transaction:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove transaction from queue.",
        variant: "destructive",
      });
    }
  };

  const clearQueue = async () => {
    if (!user) return;

    try {
      for (const transaction of queuedTransactions) {
        await removeFromOfflineQueue(user.id, transaction.id);
      }
      
      setQueuedTransactions([]);
      
      toast({
        title: "Queue Cleared",
        description: "All queued transactions have been removed.",
      });
    } catch (error) {
      console.error('Failed to clear queue:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear transaction queue.",
        variant: "destructive",
      });
    }
  };

  return {
    isOnline,
    isProcessing,
    queuedTransactions,
    queueCount: queuedTransactions.length,
    failedCount: queuedTransactions.filter(t => t.status === 'failed').length,
    addTransactionToQueue,
    processQueuedTransactions,
    retryFailedTransaction,
    removeTransaction,
    clearQueue,
    loadQueuedTransactions,
  };
}
